# Code Review — server-query-perf (staff engineer)

## Scope reviewed

- Commits (main..HEAD, hotfix commits only):
  - `aff1047` fix: add missing perf indexes on Account/Session/Card
  - `25b0725` fix: parallelize independent page-load queries
  - `2c41fe9` fix: split board page query + drop force-dynamic
  - (Plus scaffold/phase-artifact commits `7f01390`, `cd7ab54` — not code, not reviewed.)
- Files touched:
  - `prisma/schema.prisma` (+4 lines — 3 `@@index` directives)
  - `prisma/migrations/20260412_add_perf_indexes/migration.sql` (new, 11 lines)
  - `src/app/page.tsx` (Promise.all + drop force-dynamic)
  - `src/app/board/[id]/page.tsx` (query split + drop force-dynamic)
  - `src/app/classroom/page.tsx` (drop force-dynamic)
  - `src/app/classroom/[id]/page.tsx` (Promise.all + drop force-dynamic)
  - `src/app/student/page.tsx` (drop force-dynamic)
  - `src/app/quiz/[code]/page.tsx` (drop force-dynamic)
  - `src/app/qr/[token]/page.tsx` (drop force-dynamic)

## Findings

### HIGH

_None._

### MEDIUM

- **[MEDIUM] `src/app/board/[id]/page.tsx:41` — `getCurrentUser().catch(() => null)` silently swallows non-auth errors.**
  - Rationale: The previous implementation wrapped `getCurrentUser()` + `getBoardRole()` in a try/catch with a comment scoped to "mock seed missing". The new `.catch(() => null)` catches every rejection — including transient DB errors in `db.user.findUnique` inside `getCurrentUser()` — and proceeds to treat the caller as unauthenticated. A DB blip on the User table can now demote a legitimate teacher to the student-viewer / forbidden path instead of surfacing a 500. Not a regression of the diagnosed problem, but a regression of error observability.
  - Fix suggestion: Narrow the catch to the known "mock seed" error (check `error.message.startsWith('Mock user')`), or leave the throw and let Next.js render `error.tsx`. Low urgency — can defer to a follow-up — but worth documenting.

- **[MEDIUM] `src/app/board/[id]/page.tsx:77-79` — `getCurrentStudent()` and `getBoardRole()` always race even when only one path will win.**
  - Rationale: The old flow was "try teacher; if no role, try student". The new flow launches `getCurrentStudent()` in Round 1 unconditionally and `getBoardRole()` in Round 2 whenever `user` exists. For the common case (authenticated teacher with role), the student-session cookie parse + `student.findUnique` runs every request and the result is discarded. For the student case, `getBoardRole()` still runs with `user.id` from the fallback `u_owner` mock (because `getCurrentUser()` returns the mock user instead of null when no real session exists). This is extra work rather than a bug, and the diagnosis did call out "eager fan-out" as the trade-off — but the commit message's claim of pure perf win is slightly overstated.
  - Fix suggestion: Accept as-is for the hotfix (latency still drops because queries run in parallel, not sequentially). Flag for the caching follow-up.

- **[MEDIUM] `src/app/classroom/[id]/page.tsx:16-29` — `teacherMemberships` query fires before the `teacherId !== user.id` authorization check.**
  - Rationale: A malicious user hitting any classroom URL now triggers a `boardMember.findMany` scoped to their own userId before the `notFound()` short-circuits. Harmless from a data-leak standpoint (query is scoped to `user.id`), but it does expand the attack surface for DB-pressure DoS on unauthorized URLs. Minor.
  - Fix suggestion: Acceptable trade-off for the perf gain. Consider moving the `teacherMemberships` query behind the teacher check once caching lands.

### LOW

- **[LOW] `prisma/migrations/20260412_add_perf_indexes/` — non-standard migration folder name.**
  - Rationale: Prisma `migrate` expects `YYYYMMDDHHMMSS_name`. This folder is `YYYYMMDD_name`. The project has no other migrations and no `migration_lock.toml`, so `prisma db push` (as the design states) is the intended deploy path and this is fine. But if anyone later runs `prisma migrate deploy`, the lexicographic ordering against any newer `YYYYMMDDHHMMSS_*` folder will put this migration first, which is what we want — yet `migrate deploy` will still refuse without a shadow DB. Cosmetic.
  - Fix suggestion: Rename to `20260412104220_add_perf_indexes` to match Prisma convention. Not blocking.

- **[LOW] `src/app/board/[id]/page.tsx:61-76` — `null` sentinel in `Promise.all` tuple works but is less idiomatic than `Promise.resolve(null)`.**
  - Rationale: `Promise.all` accepts a mixed array of `Promise<T> | null` because `null` is treated as a resolved non-thenable. Works. Slightly less ergonomic for future readers who'd expect `Promise.resolve(null)` for uniform typing.
  - Fix suggestion: Nit — leave as-is.

- **[LOW] `src/app/board/[id]/page.tsx:17-18` — comment left where the directive used to live, with no file header context.**
  - Rationale: Reads as a floating explanation disconnected from any declaration. After rebase/context-loss, future editors may delete it assuming dead code.
  - Fix suggestion: Move the note into the `BoardPage` JSDoc or delete the comment and rely on the commit message.

### NIT

- **[NIT] `src/app/board/[id]/page.tsx:157,173,197,200` — `board!` non-null assertions inside `renderBoard()` are no longer necessary because `notFound()` narrows `board` at the outer scope and `renderBoard` is a closure.**
  - Rationale: TypeScript can't see through the closure, so they compile. Purely cosmetic.
  - Fix suggestion: N/A.

- **[NIT] Commit message for `aff1047` references `Card.authorId` being used for "cards I wrote" filtering.** I couldn't find a query path that filters by `authorId` alone today (only `boardId + authorId` for delete-permission checks). The index is still correct because the composite RBAC check can use it, but the justification text is mildly off.

## Correctness checklist

- [x] Root cause addressed — §3-1 (force-dynamic), §3-2 (board include), §3-3 (serial queries), §3-4 (indexes) all covered. §3-5 (API cache headers) consciously deferred, documented in hotfix_design.md.
- [x] Scope minimal — exactly the 3 commits described in phase2. No unrelated refactors. No premature abstractions.
- [x] No regressions — auth-gate semantics preserved (`effectiveRole` gate at line 143 matches prior `role` gate); layout rendering identical because prop shape from `cards`/`sections`/`submissions`/`members`/`quizzes` is unchanged; notFound order for classroom preserved.
- [x] Types correct — Prisma `findMany` returns default-shaped `Card[]`/`Section[]`/etc. with the same fields the renderer reads. Conditional `null` branches for `submissionsPromise` / `membersPromise` / `quizzesPromise` are handled via `?? []`. No implicit `any`.
- [x] Migration safe — `CREATE INDEX IF NOT EXISTS` is idempotent on PostgreSQL. Forward-compatible (no column drops), backward-compatible (indexes are invisible to app logic). Existing sessions unaffected. Lock duration on current data volume is negligible; prod-scale note about `CREATE INDEX CONCURRENTLY` is correctly flagged in phase2.

## Performance claims — sanity check

- **Indexes**: Legitimate win. NextAuth performs `Session.findUnique({ sessionToken })` (already indexed via `@unique`), but session validation also cascades to `Account.findFirst({ where: { userId } })` and `User.accounts`/`User.sessions` relation loads. `@@index([userId])` on both eliminates seq-scans on those paths. Verified against schema.
- **Promise.all parallelization**: Legitimate win. Independent queries, no cross-dependency, no transaction requirement. Latency drops from `sum(q_i)` to `max(q_i)`.
- **Board query split**: Legitimate win for non-assignment/non-quiz boards (most boards). `freeform` / `grid` / `stream` / `columns` now fetch 2 relations (`cards`, `sections`) + role check instead of 5 nested relations. For assignment/quiz boards the total fan-out is the same, but parallel instead of nested hydration — net neutral or slightly better.
- **force-dynamic removal**: Partially legitimate. Because every removed page still calls `cookies()` or `auth()` (which reads `cookies()`), they remain dynamic-rendered — so Data Cache / Full Route Cache do NOT activate. The actual benefit is the client-side Router Cache retaining RSC payloads across back/forward navigation, which the design doc correctly identifies. Does not "move the problem" but the server-side gain is zero; the gain is purely client navigation perceived latency. Commit message and hotfix_design.md state this accurately.

## Consistency with phase2 plan

Perfect. The three commits correspond 1:1 to the three planned changes in hotfix_design.md §1/§2/§3. Deferred items (card pagination, `unstable_cache`, API `Cache-Control`, `React.cache()` wrapping) are all still deferred — no scope creep.

## Verdict

**PASS**

Rationale: All three hotfix commits address the phase1 root causes within the stated scope. Migration SQL is idempotent and deploy-safe. No regressions in auth gating or rendering. The MEDIUM findings (over-broad catch, eager student-session fetch, pre-auth query in classroom page) are scope-appropriate trade-offs for the hotfix or follow-up items — none block deploy. Recommend approving the hotfix and filing a follow-up task for (a) narrowing `getCurrentUser().catch`, (b) lazy student-session resolution, and (c) the deferred caching strategy from phase2.
