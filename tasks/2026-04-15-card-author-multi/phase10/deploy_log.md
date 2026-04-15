# Deploy Log · card-author-multi

- Merge `feat/card-author-multi` → main (commit `512471c`)
- DB migration `20260415_add_card_author` applied to Supabase ap-northeast-2
- Vercel prod Ready + alias `aura-board-app.vercel.app` 재연결

검증: tsc / vitest 54/54 / build / migration status up-to-date 전부 green.

## 롤백
- UI: revert merge commit → ⋯ 메뉴에서 "작성자 지정" 사라짐, PUT 404
- API: 동일 revert로 충분
- DB: DROP TABLE CardAuthor CASCADE (비파괴 롤백 — Card 필드 미러 유지되어 기존 카드 작성자 footer 정상)
