# Phase 9 — QA Smoke Report

##환경 한계

이 샌드박스 환경에는 `.env`가 없어 `DATABASE_URL` 미설정 → board 페이지 SSR이 `PrismaClientInitializationError`로 500. 카드 추가/이동/삭제의 실 e2e는 사용자 개발 환경에서 수행 필요.

## 자동 가능했던 검증 (PASS)

- `npm run typecheck` — 0 errors.
- `npm run build` — 성공, `/api/boards/[id]/stream` 라우트가 빌드 매니페스트에 등록됨 (`ƒ /api/boards/[id]/stream`).
- `GET /api/boards/non-existent/stream` (no auth) → **401** (가드 정상).
- 기존 `/` 라우트는 `/login`으로 307 리다이렉트 — 서버 정상 부팅.

## 사용자 환경 e2e 권장 시나리오

수용 기준 (phase2 scope_decision.md) 기준 체크리스트:

1. **AC1 — 타 클라이언트 추가 반영**: 브라우저 A/B에 같은 columns 보드 열기 → A에서 카드 추가 → B에서 새로고침 없이 ≤3초 안에 표시.
2. **AC2 — 이동/수정/삭제 반영**: 동일 보드에서 A의 PATCH/DELETE가 B에 ≤3초 반영.
3. **AC3 — 정렬 즉시 반영**: 칼럼 헤더 select에서 "최신" 선택 → 해당 칼럼만 createdAt desc로 즉시 정렬, 다른 칼럼 영향 없음.
4. **AC4 — 정렬 영속**: 새로고침 후 칼럼별 정렬 선택 유지 (localStorage `aura.columnSort.{boardId}`).
5. **AC5 — 폴링 절약**: 빈 보드에서 DevTools Network 탭의 SSE 메시지가 30초+ 침묵 후 keepalive `: ping`만 흐르는지 확인 (변경 없으면 snapshot 안 보냄).
6. **AC6 — 비-manual 시각 표시**: manual 외 모드일 때 select에 accent 배경 적용되어 사용자가 정렬 모드를 인지.

## 결정

`QA_OK.marker`를 자동으로 만들지 않음. 사용자 dev 환경에서 위 6개 AC 통과 후 본인이 마커 생성 또는 후속 task로 e2e 자동화. 빌드/타입/SSE 가드 단계는 통과.
