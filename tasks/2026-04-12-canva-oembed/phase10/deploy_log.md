# Deploy Log — canva-oembed

## 1. PR 정보

PR 대신 로컬 머지 → push (solo project convention — CLAUDE.md `main 직접 커밋 금지` 는 유지하고, feat 브랜치를 로컬에서 `--no-ff` merge).

- Merge commit: **`f901684`** — "Merge feat/canva-oembed: live Canva iframe embeds on board cards (P0-①)"
- Merged at: 2026-04-12 (KST, same day as scaffold)
- Branch merged: `feat/canva-oembed`
- Base: `main` (at `b3f97a2` — post Vercel-region fix)

## 2. CI 결과

- `npm run typecheck` — PASS (local)
- `npm run build` — PASS (local; 48 routes)
- `npx tsx src/lib/__tests__/canva-embed.test.ts` — 18/18 PASS
- Vercel build: PASS (49s)

(Repo has no GitHub Actions workflow for this branch; Vercel build is the effective CI gate.)

## 3. 배포 대상

- Environment: **production**
- Deployment URL: https://aura-board-gxzhc5sb0-mallagaenge-1872s-projects.vercel.app
- Alias: https://aura-board-app.vercel.app
- Vercel project: `aura-board` (team `mallagaenge-1872s-projects`)
- Build duration: **49s**
- Status: **● Ready**

Prior production deployment for rollback reference: `https://aura-board-pjvxlvs9q-mallagaenge-1872s-projects.vercel.app` (the Vercel-region pin deploy, 2h before this one).

## 4. 프로덕션 검증

- GET `https://aura-board-app.vercel.app/login` → `HTTP/2 200`. ✅
- Response header confirms CSP active: `content-security-policy: frame-src 'self' https://www.canva.com https://www.youtube.com`. ✅
- Response header confirms region: `x-vercel-id: icn1::vz8b6-...` — Functions still pinned to `icn1` (Seoul). ✅
- `vercel inspect` — all λ entries tagged `[icn1]` (sample: `api/auth/[...nextauth]`, `_not-found`). Middleware remains multi-region (global). ✅
- No Sentry/console errors in the first 3 minutes post-deploy (sampled via direct browser smoke on /login).
- Non-regression: existing YouTube iframe CSP allowlist intact (`https://www.youtube.com` explicitly listed).

phase9 `perf_baseline.json` was qualitative — no Lighthouse delta to compare yet. Next.js build shows no new bundle outliers (client bundle impact estimated <1KB gzipped in baseline).

## 5. 롤백 절차

DB schema unchanged (confirmed phase3 §1). Pure revert sufficient.

```bash
cd "/mnt/c/Users/심보승/Desktop/Obsidian Vault/padlet"
git checkout main
git revert -m 1 f901684    # revert the merge commit, keep -m 1 for "keep main line"
git push origin main
```

Vercel will auto-deploy the revert. Previous known-good production deploy to promote if manual rollback is preferred:
- `aura-board-pjvxlvs9q-mallagaenge-1872s-projects.vercel.app` (pre-Canva, post-region-fix)

CSP removal is idempotent (just drops `next.config.ts` headers block — browser falls back to no-CSP default, no regression).

## 6. 수동 smoke 체크리스트 (post-deploy)

phase9 `qa_report.md` 의 10개 수동 항목을 사용자/QA 가 프로덕션 URL 에서 순차 수행. 특히 먼저:
1. 공개 Canva 디자인 URL 을 보드에 추가 → iframe 임베드 렌더 확인
2. 기존 YouTube 카드 → 여전히 렌더
3. 비공개 Canva / 잘못된 URL → card-link-preview 폴백

Aura-board 대시보드에서 아무 보드 열고 새 카드 추가 → "링크" 섹션에 공개 Canva 디자인 URL 붙여 넣어 체감 확인.
