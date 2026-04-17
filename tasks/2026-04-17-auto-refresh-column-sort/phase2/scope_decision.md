# Phase 2 — Scope Decision

## task_id
`2026-04-17-auto-refresh-column-sort`

## 포함

1. **Columns 보드 자동 동기화** — 같은 보드를 열어둔 다른 클라이언트의 카드/섹션 추가·이동·수정·삭제가 새로고침 없이 반영.
2. **칼럼별 정렬 토글** — 각 칼럼 헤더에 정렬 select. 옵션: `manual`(기본), `newest`, `oldest`, `title`. 선택은 브라우저 localStorage에 보존.
3. **드래그 reorder 안전장치** — 정렬이 manual이 아닌 칼럼은 inline reorder를 막거나 무시(이동 자체는 허용, 같은 칼럼 내 순서 강제는 manual에서만).

## 비포함

- 다른 레이아웃(freeform/grid/stream/quiz/plant)에는 적용 안 함. 추후 별도 task.
- 보드 단위 글로벌 정렬, 다중 정렬 키, 사용자 간 정렬 동기화.
- 카드 단위 패치 diff (전체 스냅샷 재전송으로 시작).
- WebSocket 전환.

## 수용 기준 (acceptance)

1. 보드 A에서 카드 추가 → 같은 보드를 열어둔 보드 B에서 ≤3초 안에 카드가 나타남(새로고침 불필요).
2. 보드 A에서 카드 이동/수정/삭제 → 보드 B에 ≤3초 안에 반영.
3. 칼럼 헤더의 정렬 select에서 "최신순" 선택 → 즉시(<100ms) 해당 칼럼만 createdAt desc 정렬, 다른 칼럼은 영향 없음.
4. 페이지 새로고침 후에도 칼럼별 정렬 선택이 유지됨.
5. SSE 연결이 끊어진 후 EventSource가 자동 재연결(브라우저 기본 동작)하고, 빈 보드에서 폴링 빈도 ≤1req/3s.
6. 정렬 모드가 manual이 아닌 칼럼에서는 카드 inline 순서 변경(같은 칼럼 내) 시 시각적 안내가 보임.

## 리스크

- **부하**: 모든 뷰어가 3초마다 DB 풀 카드/섹션 조회 → N뷰어 × 카드수 / 3s. 완화: 변경 hash만 1차 비교, 변경 시에만 전체 페이로드.
- **권한 누수**: SSE 라우트가 `requirePermission(boardId, view)` 체크 누락 시 비공개 보드 누수. 완화: 라우트 진입 직후 1회 + 60초마다 재검증.
- **옵티미스틱 충돌**: SSE로 받은 스냅샷이 진행 중인 옵티미스틱 작업을 덮어쓸 위험. 완화: pending mutation 셋 유지하고 해당 카드 ID는 스냅샷 머지 시 스킵.
- **정렬 모드 혼동**: manual이 아닌 칼럼에서 드래그 → DB order는 바뀌는데 화면 정렬은 안 바뀌어 사용자 혼란. 완화: 비-manual 칼럼은 같은 칼럼 내 inline reorder 시 안내 메시지 + 시각적 disabled.

## 변경 영향

- `src/components/ColumnsBoard.tsx` (편집)
- `src/app/api/boards/[id]/stream/route.ts` (신규)
- `src/styles/*.css` 또는 inline (정렬 select 스타일 — style_only 추가 토큰 없음)
- `docs/architecture.md` (API surface, components)
- `docs/current-features.md` (columns 항목 보강)

## change_type

`new_feature` (SSE 라우트 신규 + UI 패턴 신규).
