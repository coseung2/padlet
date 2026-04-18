# Regression test notes

이 저장소는 수동 QA 기반(unit/e2e 자동화 없음). 본 task의 회귀 체크리스트:

1. `/board/columns-demo?as=owner` — DOM에 `board-settings-trigger` 1개, `section-actions-trigger` 0개, `ctx-menu-trigger` = 섹션수 + 카드수
2. `/board/columns-demo?as=viewer` — DOM에 `board-settings-trigger` 0개, `section-actions-trigger` 0개
3. `POST /api/sections/s_todo/share?as=owner` — 200 + accessToken 응답
4. `/board/columns-demo/s/s_todo/share?as=owner` — 배너에 "보드 설정 → 브레이크아웃", "보드 페이지" 문구
5. `/board/columns-demo/s/s_todo/share?as=viewer` — "접근 불가" 메시지

`scripts/` 에 자동화가 추가되면 위 5개를 bash smoke test로 이식.
