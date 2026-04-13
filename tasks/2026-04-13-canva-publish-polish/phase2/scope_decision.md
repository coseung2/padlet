# Scope Decision — canva-publish-polish

task_id: `2026-04-13-canva-publish-polish`
change_type: `enhancement`

## 1. 선택한 UX 패턴

**채택:**
- **P1 `author-footer-compact`** — 카드 하단 text-xs muted 한 줄, 모든 카드 유형 균일 적용 (research_pack §"P1 채택 권장", 기존 Aura-board 카드 레이아웃과 정합)
- **P3 `oembed-rich-iframe`** — 기존 `isCanvaDesignUrl` 경로 재사용해 Canva view_url을 iframe으로 직렌더 (research_pack §"P3 채택, phase3 iframe 차단 실증 전제")
- **P4 `ephemeral-url-refresh`** — `canvaDesignId` 영속 저장, 서버 lazy refresh로 30일 TTL 대응 (research_pack §"P4 채택 설계 반영 필수")
- **P5 `manual-refresh-button`** — `updated_at` 기반 "새 버전 있음" 배지 + 새로고침 버튼 (success_metric (3)과 직결)

**기각:**
- **P2 `author-overlay-corner`** — iframe 위 겹침 시 pointer-events/터치 간섭 문제, P1로 귀속 충분 (research_pack §"P2 기각")

## 2. MVP 범위

### 포함 (IN)
1. 모든 카드 컴포넌트에 작성자 푸터 렌더 (`externalAuthorName` 우선, 없으면 `studentAuthorId → student.name`, 둘 다 없으면 `author(teacher).name` fallback)
2. `/api/external/cards` POST에 Option B 분기 추가: `embedUrl`(Canva view_url) + `canvaDesignId` 저장 → 기존 PNG export 경로는 남기되 Content Publisher 앱은 Option B로 변경
3. 카드 DB 스키마 확장: `canvaDesignId String?`, `embedUrl String?`, `canvaUpdatedAt DateTime?` (prisma migrate — 사용자 승인 후 실행)
4. 보드 카드 렌더: `isCanvaDesignUrl(embedUrl)` 분기로 iframe 렌더 (기존 경로 재사용)
5. "Canva에서 업데이트됨" 배지 — 카드의 `canvaUpdatedAt` < 실시간 조회 Design.`updated_at`이면 표시
6. 수동 새로고침 버튼 — 카드 호버/탭 시 노출, 클릭 시 서버에서 view_url 재발급 + `canvaUpdatedAt` 갱신
7. view_url 만료 감지 (iframe load error 또는 서버 fetch 실패) → 자동 재발급 후 재렌더

### 제외 (OUT)
- **멀티 아이덴티티 OAuth (교사 게시 허용)** — 별도 task `role-model-and-multi-identity-oauth`로 예정. 본 task는 학생 OAuth 경로만 유지.
- **실시간 자동 폴링** — 배지는 사용자가 카드를 다시 열 때 갱신. 웹소켓 폴링 불필요 (solo project 리소스 절약).
- **작성자 아바타 이미지** — 이름 텍스트만. 아바타는 별도 프로필 시스템 필요.
- **멀티페이지 디자인 분할 카드** — Option B 라이브 임베드 채택 시 자동 해소(iframe이 페이지 네비게이션 제공). 추가 분할 UI는 하지 않음.
- **Canva Users API 호출(owner.user_id → 이름 조회)** — 학생 OAuth 세션의 student.name 사용으로 대체.

## 3. 수용 기준 (Acceptance Criteria)

1. **AC1 (작성자 푸터 렌더)**: 임의의 학급 보드에서 기존 카드 전부에 작성자명이 1줄로 표시된다. externalAuthorName이 있으면 그 값, 없으면 student.name, 없으면 teacher.name (fallback 체인).
2. **AC2 (Option B 게시 성공)**: Canva Content Publisher 앱에서 학생이 "지금 게시" 실행 시, `/api/external/cards` 응답에 `embedUrl`·`canvaDesignId` 포함 200 OK. DB Card row의 `imageUrl`은 null(또는 legacy), `embedUrl`과 `canvaDesignId`가 저장된다.
3. **AC3 (iframe 라이브 렌더)**: 보드 페이지 로드 후 Option B 카드에서 Canva view_url이 cross-domain iframe으로 렌더되고 디자인 내용이 가시화된다 (X-Frame-Options 차단이 없어야 함 — 차단 시 phase3에서 pivot 필요).
4. **AC4 (수정 반영 — 수동)**: Canva에서 디자인 수정 후 보드 카드의 새로고침 버튼을 누르면 서버가 view_url 재발급·`canvaUpdatedAt` 업데이트 후 iframe 재로드되어 수정 내용이 보인다.
5. **AC5 ("업데이트됨" 배지)**: `canvaUpdatedAt < 실시간 updated_at`일 때 카드에 배지가 표시되고, 새로고침 성공 시 배지가 사라진다.
6. **AC6 (URL 만료 자동 복구)**: view_url 30일 초과로 iframe 로드 실패 시, 서버에서 view_url 재발급 후 자동 재렌더 (사용자에게 에러 화면 미노출).
7. **AC7 (태블릿 성능)**: Galaxy Tab S6 Lite 기준, 카드 4개 동시 로드 시점부터 모든 iframe 가시화까지 3초 이내.
8. **AC8 (보안 — 학급 경계 유지)**: Option B 카드 생성 시에도 기존 "학급 일치 검증"(학생 OAuth → 해당 학급 보드만 접근)이 유지된다. 타 학급 보드에 게시 시도 403.

## 4. 스코프 결정 모드

**Selective Expansion** — 원래 요청(작성자 표시 + Live embed)에 만료 URL 자동 복구·업데이트 배지·수동 새로고침 3개를 필수 AC로 추가. 이들은 research_pack이 드러낸 제약(view_url 30일 TTL, Canva 수정 반영 UX)에 대한 선제 대응으로, 빠지면 기능이 실제로 동작하지 않거나 사용자 신뢰를 잃는 수준. 멀티 아이덴티티 OAuth·자동 폴링·아바타는 명시적 OUT.

## 5. 위험 요소

- **R1 (차단 리스크·높음)**: Canva view_url이 `X-Frame-Options: DENY` 또는 `CSP frame-ancestors`로 iframe 임베드를 차단할 수 있다. 공식 문서에 "return navigation용"이라고만 되어 있어 임베드 보증 없음. → **phase3 architect가 가장 먼저 실증**. 차단 시 본 task AC3·AC6 실행 불가 → 기존 PNG export + "Canva에서 열기" 링크 + 수동 "새 버전 올려주세요" 흐름으로 축소 필요.
- **R2 (OAuth 토큰 만료·중)**: 학생 OAuthToken이 만료되면 서버 lazy refresh(view_url 재발급 호출) 실패. 리프레시 토큰 지원 여부 확인 필요. 미지원이면 만료 카드는 "다시 인증" 안내.
- **R3 (DB 마이그레이션·중)**: Card 스키마에 3 필드 추가. prisma db push/migrate는 사용자 동의 필요(메모 "No destructive DB commands"). phase7 구현 시 `prisma migrate dev` 계획을 사용자에게 명시 후 실행.
- **R4 (기존 PNG export 카드·낮음)**: 이전에 생성된 `imageUrl` 기반 카드는 그대로 둔다(푸터만 추가). Option B로 재업로드 강제 안 함 — backward compat 유지.
- **R5 (Canva 수정 vs 복사·낮음)**: Canva에서 학생이 디자인을 "복사"하면 새 design_id가 생기고 기존 카드 view_url은 원본 가리킴. MVP에서는 처리 안 함(사용자가 다시 게시).
- **R6 (태블릿 iframe 다중 로드 성능·중)**: AC7 기준 카드 4개 iframe 동시 로드. Canva iframe 내부가 무거우면 태블릿에서 3초 초과 가능. phase3에서 `loading="lazy"` + 뷰포트 외 카드 지연 로드 설계.

---

## Revision 2026-04-13 — 코드 실증 후 재정의

### 실증 발견

1. `src/components/CanvaEmbedSlot.tsx` 에 **썸네일 기본 + 클릭 시 라이브 iframe** UX가 이미 전면 구현됨(LRU 3, 뷰포트 가상화, 8초 타임아웃 폴백, 실패 시 링크 프리뷰 전환).
2. `src/components/CardAttachments.tsx:39` 의 `canRenderCanvaEmbed = Boolean(canvaDesignId && linkImage)` 조건 — **`linkImage`(oEmbed thumbnail_url) 미존재 시 CanvaEmbedSlot 비활성**, 일반 링크 텍스트로 폴백. 사용자 관찰 "디자인 표시 안 됨"의 정체.
3. `/api/external/cards` 는 PNG export → `imageUrl` 만 저장. `canvaDesignId`·`linkUrl` 미저장 → Content Publisher 앱 경로도 CanvaEmbedSlot 입구 조건 불충족.
4. R1 (X-Frame-Options 차단) — `src/lib/canva.ts:408-449` 이미 해소 (`/view?embed&meta` 포맷). 기존 프로덕션 동작 확인됨.

### 재정의된 스코프

**IN (정정):**
1. 모든 카드에 작성자 푸터 렌더 (AC1 변함없음)
2. `/api/external/cards` POST: PNG export 유지 + `canvaDesignId`·`linkUrl` 추가 저장 → 기존 CanvaEmbedSlot UX 자동 활성화
3. DB 스키마: `canvaDesignId String?` 1필드만 추가 (기존 Card 테이블)
4. 링크 붙여넣기 oEmbed 실패 fallback: `resolveCanvaEmbedUrl` 에 Canva Connect `GET /designs/{id}` 분기 추가 (학생 OAuth 토큰 사용, 토큰 없으면 기존 동작 유지)
5. 보안 학급 경계 유지 (AC8 변함없음)

**OUT (정정):**
- ~~PNG export 경로 제거~~ — 유지 (썸네일 공급원)
- ~~iframe 전체 전환~~ — 불필요 (CanvaEmbedSlot이 이미 토글)
- ~~`embedUrl` / `canvaUpdatedAt` 필드~~ — 불필요 (`buildCanvaEmbedSrc` pure 함수, 배지는 후속 task)
- ~~수정 반영 배지·수동 새로고침 버튼~~ — CanvaEmbedSlot의 라이브 토글로 이미 대체
- ~~URL 만료 자동 복구 전용 로직~~ — shareToken URL 영구 + iframe 실패 시 이미 링크 폴백 존재

### 재정의된 AC (축소판)

1. **AC1**: 모든 카드에 작성자명 표시 (fallback chain: externalAuthorName → studentAuthorId.student.name → authorId.teacher.name).
2. **AC2**: `/api/external/cards` 200 응답 후 DB Card row 에 `imageUrl` + `canvaDesignId` + `linkUrl` 저장.
3. **AC3**: Content Publisher 앱으로 게시된 카드가 보드에서 CanvaEmbedSlot(썸네일+라이브 토글) UX 로 표시된다.
4. **AC4**: 링크 붙여넣기 카드에서 oEmbed 실패(타임아웃/비공개/엔드포인트 drift) 시, 학생 OAuth 토큰이 있으면 Canva Connect API 로 썸네일을 얻어 CanvaEmbedSlot 을 활성화한다.
5. **AC8**: 학급 경계 검증 유지 (변함없음).

~~AC5·6·7~~ 제외 (후속 task 또는 비필수).

### 작업량 재추정

- DB migration 1필드
- `/api/external/cards` 라우트 ~15줄 수정
- `resolveCanvaEmbedUrl` Connect API fallback 분기 ~40줄
- 카드 작성자 푸터 영역 ~30줄 (공통 컴포넌트 + CSS)
- 단위/회귀 테스트 ~40줄
- **합계 ~100~150줄**. 기존 CanvaEmbedSlot/CardAttachments 표면적 최소 수정.

### 리스크 재평가

| # | 상태 |
|---|---|
| R1 iframe 차단 | **해소** (기존 코드 증거) |
| R2 OAuth 만료 | **축소** (렌더 시 불필요, 게시/fallback 시만 필요) |
| R3 DB migration | 유지 (1필드) |
| R4 backward compat | 유지 (기존 PNG 카드 그대로) |
| R5 Canva 복사 | OUT 유지 |
| R6 태블릿 성능 | **해소** (CanvaEmbedSlot 이미 LRU-3 + 뷰포트 가상화) |

### Revision 모드
**Reduction** — 초기 Expansion 에서 코드 실증 후 기존 인프라 재사용 방향으로 축소.
