# Cross-Model Review — server-query-perf (Codex / GPT-5-class)

> Captured verbatim from the Codex cross-model review run. The original
> Codex process could not write to this worktree from its sandbox, so the
> orchestrator persisted the review body here.

## Inputs consumed
- `tasks/2026-04-12-server-query-perf/phase1/diagnosis.md`
- `tasks/2026-04-12-server-query-perf/phase2/hotfix_design.md`
- `tasks/2026-04-12-server-query-perf/phase1/evidence/missing_indexes.txt`
- Commit `aff1047` — add Account/Session/Card indexes
- Commit `25b0725` — parallelize page-load queries
- Commit `2c41fe9` — split board page query + drop force-dynamic on 7 pages
- `prisma/schema.prisma`, `prisma/migrations/20260412_add_perf_indexes/migration.sql`
- `src/app/board/[id]/page.tsx`, `src/app/page.tsx`, `src/app/classroom/[id]/page.tsx`,
  `src/app/classroom/page.tsx`, `src/app/student/page.tsx`, `src/app/quiz/[code]/page.tsx`,
  `src/app/qr/[token]/page.tsx`
- `src/lib/auth.ts`, `src/lib/auth-config.ts`
- `src/proxy.ts`, `next.config.ts`, `tsconfig.json`
- `src/components/AuthHeader.tsx`, `src/components/UserSwitcher.tsx`,
  `src/components/BoardCanvas.tsx`, `src/components/ColumnsBoard.tsx`,
  `src/components/GridBoard.tsx`, `src/components/StreamBoard.tsx`, `src/components/QuizBoard.tsx`
- `@auth/prisma-adapter` (`node_modules/@auth/prisma-adapter/index.js`) to verify actual adapter hot path
- `@auth/core` session actions (`node_modules/@auth/core/lib/actions/session.js`)
- `next-auth` lib (`node_modules/next-auth/lib/index.js`)

## Independent findings

### HIGH — Router Cache claim for `force-dynamic` removal is unsupported for auth-backed pages
All 7 pages where `force-dynamic` was dropped still call `auth()` / `cookies()`. In Next.js 16 the App Router's Router Cache key for dynamic segments with dynamic APIs is not kept warm simply by dropping `force-dynamic`; the route stays dynamic and re-renders per request regardless. The stated gain ("탭 뒤로가기/앞으로가기 시 RSC 트리 재실행을 피할 수 있음") is overstated. There is no `staleTimes` / `experimental` knob in `next.config.ts` that would change this behavior. Effect is at best marginal and only kicks in under specific client-cache preload conditions. Revise the claim to "no performance gain; semantic cleanup only" or verify with a measurable experiment.

### HIGH — Board split still over-fetches on quiz / assignment layouts
Round 2 of the new `BoardPage` always runs `card.findMany` and `section.findMany` even when layout is `assignment` (no cards rendered) or `quiz` (no cards rendered). The conditional branches only cover submissions/members/quizzes — the "always load cards+sections" branch is unconditional. For a quiz or assignment board this is two wasted queries per page load. The diagnosis claim that "freeform/grid/stream/columns 보드는 이제 submissions/members/quizzes 를 한 번도 건드리지 않음" is correct, but the inverse claim — that assignment/quiz save work — is not, because they still pay for cards+sections.

### MEDIUM — Index rationale overstated relative to actual hot paths
Verified via `@auth/prisma-adapter` and `@auth/core`:
- This project uses **JWT session strategy** (per `src/lib/auth-config.ts`), which bypasses `Session` lookups entirely. `Session.userId` index is added but has no hot reader in this codebase.
- PrismaAdapter account lookups use `(provider, providerAccountId)` unique key, not `userId`. `Account.userId` has no hot path except cascade-on-delete of the user row (rare).
- `Card.authorId` has no visible findMany/findFirst filter on `authorId` in `src/app` or `src/lib` — no hot query exists today. Index is speculative.

Indexes are harmless and idempotent, but the diagnosis's performance rationale is wrong. Revise rationale or remove.

### MEDIUM — `getCurrentStudent()` now called unconditionally on every board load
Previously a fallback when teacher auth failed; now always fires in Round 1 `Promise.all`. For authenticated teachers with a stale student cookie this pays an extra `db.student.findUnique` with `classroom` include per page load. For teachers with no student cookie it's a no-op cookie check (fine). Quantify the frequency of stale student cookies in practice; if common, gate the call.

### MEDIUM — `CREATE INDEX` vs `CREATE INDEX CONCURRENTLY`
Migration uses plain `CREATE INDEX IF NOT EXISTS`. At current Supabase scale this is fine — tables are small and brief locks are acceptable. Callout: if the project ever grows to millions of rows, this migration becomes a production lock risk. Either adopt `CONCURRENTLY` now, or document the lock behavior as acceptable at current scale.

### MEDIUM — `getCurrentUser().catch(() => null)` swallows DB errors
The previous code caught only to fall back to the mock-seed path. The new `.catch` swallows any thrown error including DB connectivity failures. A transient DB hiccup now silently renders the board as "no user", potentially showing the 접근 불가 state instead of an error. Narrow the catch to known mock-seed miss cases, or log before returning null.

### LOW — `React.cache()` on `getCurrentUser`/`getBoardRole` left on the table
Within a single render, `getCurrentUser` is called by the page and by multiple auth-dependent utilities (layout, `<AuthHeader>`, etc.). `React.cache()` wrapping would deduplicate these cheaply, but the hotfix intentionally omits it. Worth listing as a low-hanging follow-up.

### LOW — No test framework to validate branching layout logic
The board page now has layout-conditional fetches. Without any test scaffolding, a future layout value change or adding a new layout silently fails to load its relations. Type system does not catch this (layout is a plain string). Consider at minimum a Playwright smoke test per layout, or a local static check.

## Alternative-approaches assessment
- **Promise.all parallelization (25b0725)**: Validated. This is a real fixed-width latency win, roughly `max(t_a, t_b) − (t_a + t_b)` per page. Keep.
- **Board 2-round fan-out vs. selective include**: The split is philosophically cleaner but still pays for an always-on cards+sections fetch. A single `findFirst` with layout-conditional include would have been equivalent in round-trip count and payload for the important cases. Marginal choice.
- **React.cache() for `getCurrentUser`**: Better alternative than Promise.all for deduping across component tree within a single render. Worth adding in a follow-up.
- **Index strategy**: Harmless but mis-justified. Consider `(boardId, authorId)` composite for `Card` if the follow-up query pattern emerges.

## Verdict
**FAIL** — perf claims don't fully hold up; needs revision before merge.

Main review points: `25b0725` is a real latency win, but `2c41fe9` does not support its biggest claim because removing `force-dynamic` is not a documented Router Cache lever for the six auth/cookie-backed pages, and the board split still over-fetches on quiz/assignment layouts by always loading `cards`/`sections` and all quiz rows. `aff1047` is only partially justified in the current codebase because JWT sessions bypass `Session.userId`, adapter account lookups do not target `Account.userId`, and `Card.authorId` is not mapped to a visible hot query.

Minimum set of changes required to flip to PASS:
1. Revise `hotfix_design.md` to accurately scope the `force-dynamic` claim (no router-cache win; semantic cleanup only) or demonstrate a measurable gain.
2. Either gate `cards` + `sections` fetches by layout (skip on quiz/assignment), or revise the claim to state that the over-fetch is intentional and acceptable.
3. Revise the index rationale to reflect actual hot paths (JWT strategy, adapter query shapes) or drop/replace indexes with ones that match real queries.
