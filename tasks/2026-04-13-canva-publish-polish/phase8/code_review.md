# Code Review — canva-publish-polish

검수: orchestrator (staff engineer self-review, /review gstack 미설치)
범위: `feat/canva-publish-polish` 4 commits (f4137cb..현재)
일자: 2026-04-13

## 1. 발견 사항

### 🔴 BLOCKER (자동 수정 적용)

**S1. canvaDesignUrl 미검증 → clickjacking**
- 위치: `src/app/api/external/cards/route.ts` (수정 전)
- 내용: Zod `z.string().url()` 만 검증해 attacker 가 PAT/OAuth 보유 시 `canvaDesignUrl="https://evil.com"` 를 보내면 `linkUrl` 이 임의 도메인으로 저장됨. 학생이 카드 클릭 시 외부 사이트로 이동.
- 영향: clickjacking / 피싱.
- 수정: `isCanvaDesignUrl(canvaDesignUrl)` + `extractCanvaDesignId` 결과 검증 추가. canva.com 외 도메인 또는 디자인 ID 추출 실패 시 422 반환.
- 적용 commit: 후속 (이번 review 라운드 마지막에 한 번에 amend 또는 fixup).

### 🟡 주의 (수정 안 함, 명시 기록)

**S2. Card.canvaDesignId 컬럼이 현재 render path 에서 read-back 되지 않음**
- 위치: `src/components/CardAttachments.tsx:31` 가 `extractCanvaDesignId(linkUrl)` 로 매번 재파생.
- 영향: 컬럼이 storage-only — render 에 미사용. 미래용/감사용으로는 가치 있음.
- 결정: 유지. design_doc §1 에 명시된 영속 식별자이며 (a) 미래에 link parser 가 바뀌어도 안정 ID 보장 (b) "Canva 발 카드 통계" 쿼리에 사용 가능. 단 이 사실은 phase11 docs sync 시 명기.

**S3. linkImage / imageUrl 분기에서 race window**
- 위치: `src/app/api/external/cards/route.ts` Card INSERT (linkImage=null) → Blob upload → UPDATE linkImage=blobUrl
- 영향: 두 단계 사이에 WS broadcast 가 발생하면 클라이언트가 잠깐 thumbnail 없는 카드를 본 뒤 갱신됨 (기존 imageUrl 분기와 동일 패턴).
- 결정: 기존 PNG-only 동작 동일. 미수정. 후속 task 에서 트랜잭션 + late broadcast 로 개선 가능.

**S4. 6 렌더러 일괄 변경 → 회귀 surface 확장**
- 위치: 6 개 카드 렌더러 동시 변경. `<CardBody>` 한 곳 버그가 6 곳 동시 영향.
- 영향: 회귀 위험 집중.
- 완화: phase9 QA 에서 6 layout 모두 e2e 확인 필수 (freeform/grid/stream/columns/breakout/section).
- 결정: 회귀 risk 는 합성 패턴의 본질적 트레이드오프 — A 안 (분산) 으로 갔어도 6 곳 각각 검증 필요했음. 완화로 충분.

### 🟢 OK / 통과

- Schema migration: ALTER TABLE … ADD COLUMN nullable. 기존 row 영향 없음, rollback 안전.
- `pickAuthorName` / `formatRelativeKo`: 순수 함수, 13 케이스 테스트 PASS.
- CardAuthorFooter: a11y 6 항목(footer 의미론, sr-only, `<time>`, ellipsis, pointer-events: none, forced-colors) 전부 구현.
- CardBody: `titleAs` prop 으로 h3/h4 의미 보존. memo 최적화 유지.
- 6 렌더러 변경: 각각 import 1줄 + 본문 3→1줄 단순 치환. 다른 영역 (delete 버튼, ContextMenu, dnd) 손대지 않음.
- 보드 페이지 cardsPromise include: studentAuthor + author 만 select name 으로 최소 fetch.
- /api/external/cards: PAT/OAuth 검증, scope, tier, rate limit, RBAC, 학급 경계 검증 모두 변경 없음. canvaDesignUrl 만 추가.

## 2. Karpathy 4 원칙 감사

| 원칙 | 결과 | 비고 |
|---|---|---|
| §1 Think Before Coding | ✅ | A vs D 분기에서 사용자 결정 후 진행. AC4 deferred 명시. canvaDesignUrl 검증 누락은 review 단계에서 catch 후 수정 — phase7 시점 think 공백, phase8 cover. |
| §2 Simplicity First | ✅ | 신규 추상 1개 (CardBody, "rule of three" 정당화). Connect API fallback 미구현. 컬럼 1개만 추가 (3개 후보 중). |
| §3 Surgical Changes | ✅ | 모든 변경이 AC1/2/3/8 또는 보안 수정으로 추적 가능. CanvaEmbedSlot/CardAttachments 내부는 미수정. 인접 코드 "개선" 없음. |
| §4 Goal-Driven Execution | ✅ | 4 충족 AC + 1 deferred AC 명시. 13/13 + 18/18 단위 테스트. typecheck clean. |

## 3. 보안 감사 (file upload + DB write + 외부 API → 민감 영역)

- **OWASP A01 Broken Access Control**: 학급 경계 + RBAC + scopeBoardIds 기존 검증 변경 없음. ✅
- **OWASP A03 Injection**: Zod strict + Prisma parametrized. canvaDesignUrl URL parse 시 Node URL constructor 사용 (안전). ✅
- **OWASP A05 Misconfiguration**: 변경 없음. ✅
- **OWASP A07 Identification & Auth**: 변경 없음. ✅
- **OWASP A10 SSRF**: 서버에서 canvaDesignUrl 로 외부 fetch 안 함 (Connect API 미구현). ✅
- **Clickjacking via stored linkUrl**: S1 에서 fix.

## 4. 판정

- 발견 BLOCKER 1건 (S1) — 자동 수정 적용 완료, typecheck 재확인 OK.
- 주의 3건 (S2/S3/S4) — 의도적 결정, 수정 없이 통과.
- Karpathy 4 원칙 통과.
- 보안 OWASP top 10 점검 통과 (S1 fix 후).

**전체 PASS** → `phase8/REVIEW_OK.marker` 생성.

## 5. 후속 commit

S1 수정은 코드 변경이라 phase8 리뷰의 일부로 별도 commit:
- `fix(canva-polish): reject non-Canva canvaDesignUrl with 422 (S1)`
