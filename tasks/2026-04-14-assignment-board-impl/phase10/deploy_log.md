# Deploy Log — assignment-board (AB-1)

## 1. Merge 정보

- **Branch merged**: `feat/assignment-board-impl` → `main`
- **Merge method**: local no-ff merge + push (solo project — memory `feedback_solo_direct_merge`; no PR)
- **Feature commit**: `acbe8cf feat(assignment-board): AB-1 implementation — AssignmentSlot + 5 endpoints + 7 components`
- **Docs commit**: `661e3b0 docs(assignment-board): phases 4–9 task artifacts`
- **Merge commit**: `d0ff5a3 Merge feat/assignment-board-impl — AB-1 assignment board`
- **Pushed**: `3e315dc..d0ff5a3  main -> main` (2026-04-14 21:44 KST)

## 2. CI / 빌드 결과

| 단계 | 결과 |
|---|---|
| Local `npx tsc --noEmit` | ✅ |
| Local `npm run build` (Next 16.2.3 + Turbopack) | ✅ |
| Local `npx tsx src/lib/__tests__/assignment-state.test.ts` | ✅ 24/24 |
| Local `npx tsx scripts/_smoke_ab1.ts` (DB round-trip) | ✅ |
| Vercel build (from push trigger) | ✅ — Build Completed in 47s |
| Deployment state | ✅ Ready (confirmed via `vercel inspect`) |

## 3. 배포 대상

- **Project**: `mallagaenge-1872s-projects/aura-board`
- **Environment**: Production (auto-promoted from `main` push)
- **Deploy URL**: `https://aura-board-3n9ixr427-mallagaenge-1872s-projects.vercel.app`
- **Region**: `icn1` (Seoul) — matches memory `project_vercel_supabase_region`
- **Note**: Project has no public domain alias in this org at the moment; `aura-board.vercel.app` returns 404 (not aliased to this deploy). `aura-teacher.com` listed via `vercel domains ls` but serves a different app's content — **out of scope for this task; flag for follow-up**.

### Route verification (from deploy logs)

```
├ ƒ /api/assignment-slots/[id]
├ ƒ /api/assignment-slots/[id]/submission
├ ƒ /api/boards/[id]/assignment-slots
├ ƒ /api/boards/[id]/reminder
├ ƒ /api/boards/[id]/roster-sync
```

All 5 new routes present in production build output. Existing `/api/boards` (extended with assignment branch) and `/api/parent/children/[id]/assignments` (refined) also registered unchanged at path level.

## 4. 프로덕션 검증

### 4.1 Health

| 체크 | 결과 |
|---|---|
| Deploy URL reachable (HTTP 401 = Vercel Deployment Protection) | ✅ expected |
| Build completed cleanly | ✅ |
| No TypeScript errors surfaced in deploy logs | ✅ |
| DB migration `20260414_add_assignment_slot` applied to Supabase `ap-northeast-2` prior to push | ✅ |
| Post-migration schema drift | ✅ none (`prisma migrate status` → "up to date") |

### 4.2 Core Web Vitals baseline

phase9 `perf_baseline.json` is `measurement_pending: true` — Galaxy Tab S6 Lite hardware not available this run. Therefore no regression comparison for AC-14. Static architecture signals (memo, CSS grid, lazy img, no realtime JS) recorded; field measurement to follow in `research/device-perf-verify`.

### 4.3 Error monitoring

No new error pathways in Vercel logs for this deploy window. Existing error routes unchanged. The new routes log `[AssignmentSlot] transition ...` structured-ish lines at INFO level.

## 5. 롤백 절차

| 단계 | 명령 |
|---|---|
| **UI-level rollback** | Env var `ASSIGNMENT_V2_ENABLED=false` (phase3 §7.1 플래그 스캐폴드). 현재 UI는 항상 new flow — 플래그 미구현. 실제 rollback 경로는 git revert. |
| **Git revert** | `git revert d0ff5a3` → push. 약 5분 내 Vercel 재배포. |
| **DB rollback (데이터 손실)** | `prisma/migrations/.../migration.sql` 역순 DROP — phase3 §7.1 §3 SQL. returnReason / viewedAt / returnedAt 유실. 30일 backup 필수. |
| **이전 배포 re-promote** | `npx vercel promote <previous-deploy-url>`. 마지막 안정 배포: `aura-board-bnv0h8hx6-mallagaenge-1872s-projects.vercel.app` (Ready, 이 배포 직전). |

## 6. 추적 가능 산출

- commit `acbe8cf`: 29 files, +2861/-249 → feature 전체
- commit `661e3b0`: 24 files, +1371/-1 → phase4~9 산출
- commit `d0ff5a3`: merge

## 7. 판정

**DEPLOY OK** — 배포 완료, 빌드 green, 라우트 전원 등록, DB migration 반영. Core Web Vitals 회귀 측정은 하드웨어 제약으로 defer(§4.2). phase11 doc_syncer 핸드오프 준비 완료.
