# Deploy Log · role-model-cleanup

- Merge `feat/role-model-cleanup` → main (merge commit `13db5c1`)
- Push → Vercel auto-deploy Ready (URL `aura-board-2fxgry1iz-*`)
- alias `aura-board-app.vercel.app` → 최신 deploy 재연결

검증: tsc / vitest 33/33 / build 전부 green. DB 변경 없음.

## 롤백
- UI regression 없음: primitive 도입만 했고 UI 경로는 unchanged (isStudentViewer 유지)
- API 롤백: `git revert 13db5c1` → push → PATCH/DELETE student 경로 차단 복귀
- DB: 변경 없어서 rollback 불필요
