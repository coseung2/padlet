# Scope Decision — initial-padlet-app

**승인 상태**: 오케스트레이터 셀프 승인 (2026-04-09, 사용자 사전 위임)

## 1. 선택한 UX 패턴

- `wall-layout` + `card-grid-fallback` 병행 — 카드에 position(x,y)이 있으면 wall, 없으면 grid
- `optimistic-drag` — dnd-kit 기반
- `url-theme-switcher` — 3개 테마 비교용
- `rbac-middleware` — owner/editor/viewer 서버 측 체크

## 2. MVP 범위

### IN
- Next.js 16 App Router 초기 스캐폴드
- SQLite + Prisma (schema, migrate, seed)
- 데이터 모델: User / Board / BoardMember(role) / Card
- 시드 데이터: 3 users (owner/editor/viewer), 1 데모 보드, 카드 12개 (wall 상 각기 다른 position)
- API: GET `/api/boards/[id]`, POST `/api/cards`, PATCH `/api/cards/[id]`, DELETE `/api/cards/[id]`
- RBAC 유틸 (`requirePermission(boardId, userId, action)`)
- 모의 인증 (`?as=owner|editor|viewer` 쿼리 파라미터로 currentUser 전환, 쿠키 저장)
- 보드 페이지 (`/board/[id]`) — 카드 렌더, 드래그, 생성, 삭제
- 3개 테마 CSS 변수 + Theme Switcher 컴포넌트
- globals.css + 테마별 오버라이드
- README (run 절차)
- dev 실행: `npm install && npm run db:push && npm run seed && npm run dev`

### OUT (이번 task 아님)
- 실제 인증 (NextAuth 등) — 별도 feature task
- 실시간 동기화 (WebSocket / Liveblocks / Yjs) — 별도 research
- 이미지/파일 첨부 업로드 — 별도 feature task (text-only 카드만)
- 보드 목록, 보드 생성 UI (시드 데모 보드 1개로 충분)
- 프로덕션 배포 — `docker compose up`은 docker-compose.yml만 작성하고 기동은 안 함

## 3. 수용 기준 (Acceptance Criteria)

- [ ] 저장소 클론 후 `npm install && npm run db:push && npm run seed && npm run dev` 3커맨드로 dev 서버 기동
- [ ] `http://localhost:3000` → `/board/demo`로 리디렉트
- [ ] `/board/demo` 에 시드 카드 12개가 렌더됨
- [ ] 카드 중 하나를 드래그 → 다른 위치로 이동 → 페이지 새로고침 시 위치 유지
- [ ] `?theme=figma` → `?theme=miro` → `?theme=notion` 전환 시 색/타이포/반경 즉시 변경
- [ ] `?as=viewer` 상태에서 "카드 추가" 버튼이 안 보이거나 disabled, POST `/api/cards` 403
- [ ] `?as=editor` 상태에서 카드 추가/이동 가능, DELETE 403
- [ ] `?as=owner` 상태에서 카드 CRUD 전부 가능
- [ ] `npm run seed` 는 여러 번 실행해도 멱등 (upsert)

## 4. 스코프 결정 모드

**Selective Expansion** — 원래 "3개 디자인만 고르기"에서 시작했지만 사용자가 "실제로 작동하게 + RBAC + 시드" 를 추가하면서 구현 범위가 확장됨. 하지만 인증/실시간/파일 등 큰 피처는 명시적 OUT.

## 5. 위험 요소

| 위험 | 완화 |
|---|---|
| dnd-kit + App Router hydration | board 페이지 전체를 client component로 격리, server component는 데이터 fetch만 |
| SQLite WAL 동시성 | 솔로 dev 환경이라 무시. Postgres 이행 시 해소 |
| 3개 테마 시각차 부족 | 색/반경/폰트/섀도우 4축 모두 차별화. 단순 색만 바꾸지 말 것 |
| 시드 멱등성 | Prisma upsert 사용. User/Board는 고정 CUID로 지정 |
| mock 인증의 보안 오해 | README에 "prod 절대 금지" 문구 명시 |
