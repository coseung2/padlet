# Research Pack — canva-publish-polish

## 맥락

task_id: `2026-04-13-canva-publish-polish`

현재 Canva Content Publisher 앱에서 학생이 "지금 게시" 버튼을 누르면 `/api/external/cards`(PAT/학생 OAuth dual auth)가 PNG export → Vercel Blob 업로드 → 카드 `imageUrl` 저장 경로로 동작한다. 사용자 의도는 (A) 작성자 표시 + (B) 라이브 임베드 — Canva design URL을 iframe으로 직접 렌더, 기존 `isCanvaDesignUrl` 경로와 통합.

## 벤치마크 요약

### 1. oEmbed 1.0 (표준)
- `rich` type: `html` 필수, `width`/`height` 필수, `author_name` 선택
- cross-domain iframe 권장 (XSS 방어)
- `cache_age` 필드로 provider가 갱신 간격 힌트 가능

### 2. Canva Connect API — Get Design
**핵심 제약 (구현에 직접 영향):**
- `view_url`: **30일 TTL** — 영구 임베드 URL이 아님
- `thumbnail.url`: **15분 TTL**
- `owner`: `{user_id, team_id}` (이름 없음 — 별도 Users API 호출 필요하거나, 학생 OAuth 흐름에서 Aura의 student.name을 쓰는 것이 단순)
- `updated_at`: Unix timestamp — 보드 카드에 "Canva 수정됨" 배지 표시용
- `view_url` 문서 표현: "designed to support return navigation workflows" — 범용 embed용 공식 보증은 아님 (iframe 차단 정책/X-Frame-Options 리스크 존재 가능)

### 3. Figma Embed
- "live" 표현은 있으나 공식 자동 갱신 보장은 없음
- 패스워드/조직 파일 제약 — 외부 임베드는 항상 인증 경계 이슈 수반
- 시사점: "라이브" 임베드라도 새로고침/상태 UX는 명시적 설계 필요

## 핵심 UX 패턴 — 채택/기각 근거

### P1. author-footer-compact (작성자 푸터)
- **장점**: 기존 Aura-board 카드 레이아웃과 정합. 모든 카드 유형(텍스트/이미지/링크/임베드)에 균일 적용 가능. Galaxy Tab S6 Lite 터치 타겟과 충돌 없음.
- **단점**: iframe/이미지가 카드 영역 대부분을 차지하면 하단 푸터가 눈에 덜 띔.
- **판단**: **채택 권장**. 모든 카드에 일관된 귀속 영역을 확보하는 가장 단순한 선택.

### P2. author-overlay-corner (우하단 오버레이)
- **장점**: 시각적 매체(Canva 디자인·이미지)에 귀속이 겹쳐 보여 연결 강함.
- **단점**: iframe 위 겹침 시 pointer-events 관리 필요, 터치 환경에서 iframe 조작 방해 가능. 저시력/고대비 모드 대비 낮음.
- **판단**: **기각**. 복잡도 대비 이득 낮음. P1로 충분.

### P3. oembed-rich-iframe (iframe 직렌더)
- **장점**: 기존 `isCanvaDesignUrl` 경로 재사용 → Karpathy Simplicity-First 원칙 부합. oEmbed 공식 표준과 호환.
- **단점**: Canva가 view_url에 대해 `X-Frame-Options`를 걸면 차단. 실증 필요 (phase3 architect가 검증).
- **판단**: **채택**. 단, phase3에서 iframe 차단 여부 실증 전에 구현 확정 금지.

### P4. ephemeral-url-refresh (만료 URL 갱신)
- **장점**: 30일 TTL 이슈를 설계 단계에서 선제 해결. `design_id` 영속 저장 + 서버 lazy refresh.
- **단점**: 학생 OAuth 토큰도 만료 가능(기존 OAuthToken 스키마 확인 필요). 리프레시 토큰 플로우가 없으면 학생 재인증 필요.
- **판단**: **채택 (설계 반영 필수)**. 저장 스키마에 `canvaDesignId` 추가.

### P5. manual-refresh-button (수동 새로고침 CTA)
- **장점**: success_metric (3) "수동 새로고침 허용"과 직접 대응. 서버 자원 절약. 사용자 통제감.
- **단점**: 사용자가 "언제 업데이트됐는지" 모르면 누를 동기 없음 → `updated_at` 기반 "새 버전 있음" 배지 병행 권장.
- **판단**: **채택**. 배지+버튼 콤비로 최소 기능 제공.

## 한계 고지

- `/browse` gstack 미사용 → 스크린샷/라이브 렌더 증거 없음. phase6 검수에서 Canva view_url iframe 차단 여부를 실증해야 P3 확정 가능.
- Canva 공식 oEmbed 문서(canva.com/developers/docs/connect-api/oembed) 403 차단 — 표준 oEmbed 스펙 + canva.dev API doc으로 간접 검증. 공식 oEmbed 엔드포인트 존재/경로 확증은 phase3 architect가 실험 필요.

## phase2 권고

- 스코프 축소 후보: P1(작성자 푸터) 단독 우선 출시 → P3/P4/P5(Live embed) 후속. 단, 사용자 요청은 두 묶음을 한 task로 명시했으므로 별도 분리 요구 시 phase2 strategist가 결정.
- 수용 기준 세분화: (a) 푸터 UI, (b) iframe 차단 여부 실증, (c) design_id 영속 + lazy refresh, (d) 수동 새로고침 + updated_at 배지.
