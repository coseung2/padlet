# Scope Decision — breakout-section-isolation

## 1. 선택한 UX 패턴

`signed_share_url` + `server_scoped_query` + `realtime_channel_per_section` (helper only).

- 근거: `phase1/research_pack.md` §장단점 분석 A안. Padlet 상류에 부재한 기능으로 차별 포인트 확보(§벤치마크 개요). 학생 세션은 이미 classroomId 경계를 가지므로 token + classroom 이중 방어 가능.
- 제외한 대안:
  - JWT(B안): 회전 비용/폭발 반경 때문에 MVP 부적합.
  - Section Membership 테이블(C안): Student 모델 연동에 추가 스키마 필요 → 범위 초과.

## 2. MVP 범위

### IN (이번 task)
- `Section.accessToken String?`(nullable, unique when set) 컬럼 추가 + Prisma migration.
- `GET /api/sections/[id]/cards` — sectionId scope만 카드 반환.
- `POST /api/sections/[id]/share` — accessToken 생성/회전(owner 전용). payload 없이 호출하면 신규 토큰, `{ rotate: true }` 시에도 신규 토큰 발급(의미는 동일, 명시성).
- `src/app/board/[id]/s/[sectionId]/page.tsx` — 섹션 격리 server component. 보드 전체 카드 쿼리 금지.
- `src/lib/realtime.ts` — `sectionChannelKey(bid, sid)`, `boardChannelKey(bid)` helper 정의 (pub/sub 엔진은 TODO 문서화).
- `src/lib/rbac.ts` — `viewSection(userId | null, sectionId, token?)` 비동기 함수 + 기존 API 비파괴적 확장.
- 교사 share UI: `/board/[id]/s/[sectionId]/share` 최소 페이지 — 링크 표시 + 복사 버튼 + 재생성 버튼. owner만 접근.
- phase9 smoke: dev 서버 기동, 경로 200, Network 탭(또는 curl) payload 검증, 비회원 403.

### OUT (후속 task)
- 실시간 pub/sub 엔진 채택 (Supabase Realtime vs PartyKit vs Pusher): research task 필요.
- 학생이 토큰 없이 멤버 자격만으로 접근하는 invite 플로우 고도화.
- 카드 생성/편집 API의 섹션 격리(지금은 기존 엔드포인트가 boardId 기반이므로 격리 라우트에선 read-only 플로우만 MVP).
- share 링크 만료/사용 횟수 제한 (DB 컬럼만으로 충분한 상태).
- Section 단위 QR 프린트(후속 classroom 작업과 묶어서).
- shotgun 4~6안 디자인 변형(share page UI가 단순 링크 카피 UI라 variant 생성이 과도 — phase5에서 SKIP 사유 기록).

## 3. 수용 기준 (Acceptance Criteria)

1. `prisma migrate dev`로 `Section.accessToken` 컬럼이 추가되고, 기존 Section row 는 `null` 유지.
2. owner 계정(mock `u_owner`)이 `POST /api/sections/{id}/share` 호출 시 응답 body에 32자 이상 base64url 토큰과 shareUrl이 담기고, DB Section.accessToken 값이 갱신된다.
3. 동일 엔드포인트를 editor/viewer가 호출하면 HTTP 403을 받는다.
4. `GET /api/sections/{id}/cards?token=…`를 올바른 토큰과 함께 호출하면 해당 섹션 카드만 JSON 배열로 반환되며, 타 섹션 카드는 포함되지 않는다.
5. 동일 엔드포인트를 잘못된 토큰 + 비로그인으로 호출하면 HTTP 403을 반환한다.
6. `/board/{id}/s/{sectionId}?token=…` 페이지가 200으로 로드되고, 서버 응답 HTML(및 브라우저 Network/소스)에 다른 섹션의 카드 title 문자열이 나타나지 않는다.
7. 기존 `/board/{id}` (columns layout) 진입 시 전체 섹션이 정상 렌더되고 카드 목록에 회귀가 없다.
8. `sectionChannelKey("b1","s1")`은 정확히 `"board:b1:section:s1"` 문자열을 반환하고 unit test로 검증된다.
9. `viewSection(null, sectionId, wrongToken)`은 `ForbiddenError`를 throw한다.
10. `npm run typecheck` + `npm run build` 둘 다 성공한다.

## 4. 스코프 결정 모드

**Selective Expansion** — 섹션 격리의 최소 골격(schema + API + route + helper)만 넣고 실시간/학생멤버십은 후속 task로 분리.

## 5. 위험 요소

| 리스크 | 완화 |
|---|---|
| Prisma migration이 prod DB에 영향 | dev-only migration으로 확인. `phase10/DEPLOY_PLAN.md`에 prod 실행 순서 기록. force-reset 금지 (memory 규칙). |
| 토큰 유출 시 classroomId 안전망 부재 | MVP 한정 — 학생 세션 있으면 classroom 검사 추가. token-only 접근도 허용(교사가 의도적으로 외부 공유할 수 있도록). 문서에 trade-off 명시. |
| 기존 columns 뷰 회귀 | `/board/[id]` route는 건드리지 않음. rbac 기존 API는 확장만(기존 시그니처 유지). |
| 실시간 helper가 채널 키만 제공 → 사용처 혼동 | 코드 주석 + `docs/architecture.md`에 "publish/subscribe는 후속" 명시. |
| TypeScript strict null on accessToken | Prisma 생성 타입이 `string | null` → 토큰 비교 로직에서 명시적 체크. |
| `s/[sectionId]` route 충돌(sectionId가 board 소속이 아닐 때) | 서버에서 section.boardId === board.id 확인 후 404. |
