# Phase 8 — Security audit (parent UX)

## Scope-guard enforcement on /api/parent/*

Grepped all parent API routes for a scope helper call. Result:

| Route | Helper used |
|---|---|
| `/api/parent/children/[id]/plant` | `withParentScopeForStudent` (403 on mismatch) |
| `/api/parent/children/[id]/drawing` | `withParentScopeForStudent` |
| `/api/parent/children/[id]/assignments` | `withParentScopeForStudent` |
| `/api/parent/children/[id]/events` | `withParentScopeForStudent` |
| `/api/parent/children/[id]/breakout` | `withParentScopeForStudent` |
| `/api/parent/links/[id]` DELETE | `getCurrentUser` (teacher-only) + `classroom.teacherId === user.id` ownership check |
| `/api/parent/account/withdraw` POST | `withParentScope` (401 on missing) |
| `/api/parent/session/status` GET | `withParentScope` |
| `/api/classroom/[id]/parent-links` GET | `getCurrentUser` + `teacherId` ownership 404 |

Verdict: every parent-surfaced API route passes through a scope helper before any DB read. **AC-4 PASS**.

## Cross-student isolation (AC-5)

`withParentScopeForStudent` throws `ParentScopeError(403, "forbidden_student")` when `studentId ∉ parent.childIds`. E2E script `scripts/test-parent-isolation.ts` asserts 403 for parent A + student B.

## Cross-parent isolation (AC-6)

`requireParentChildLinkOwned` returns 404 when a linkId belongs to another parent. Not currently surfaced in a public route (no parent-facing /api endpoint takes a linkId), but the helper is unit-testable and is exercised indirectly by PV-12 when parent A probes parent B's studentId.

## Revoke SLA (AC-7, AC-8)

- Server: `getCurrentParent()` returns null on `sessionRevokedAt`, forcing 401 on any scoped route.
- Teacher revoke: `DELETE /api/parent/links/[id]` sets `deletedAt` + revokes all sessions in a transaction.
- Client: `SessionWatchdog` polls `/api/parent/session/status` every 45s. On 401 → `router.replace("/parent/logged-out")`. Custom event bus (`parent-auth-lost`) gives sub-45s latency for in-flight fetches via `parentFetch()`.
- Worst case: 45s polling + 1 RTT = well under the 60s SLA.

## DOM masking

Each child-scope page re-calls `requireParentScopeForStudent` at the page level (layer 2 defence). If the layout guard ever regresses, pages still return 403 before rendering a single byte of child data.

Event tab (AC-13) groups Submissions by `board.id` and attaches ONLY the parent's own child's submissions (filter `applicantName + applicantNumber`). No foreign rows included in the response payload — verified in `events/route.ts:61-87`.

Breakout tab (AC-14) queries `BreakoutMembership WHERE studentId = ctx.params.id`. Teacher-pool absent from the schema → organically excluded. Cards are pulled per-section (child's section only).

## Cron authorization

Both cron routes (`parent-weekly-digest`, `parent-anonymize`) gate via:
- Production: `x-vercel-cron` header OR `?secret=<CRON_SECRET>` query
- Dev: open (easier to test)

Manual trigger from ops requires the secret. **No unauthenticated mutation path exposed.**

## PII / anonymization

- Withdraw: soft-delete only (`parentDeletedAt`), sessions revoked, links soft-deleted. No hard delete — audit trail preserved.
- 90-day sweep: replaces `email` with `anonymized_<sha256-24>@deleted.invalid`, `name` with `"탈퇴한 이용자"`, sets `anonymizedAt`.
- Deletes any stray sessions as defensive cleanup.

## Known gaps / deferred

1. **Observability**: the linter repeatedly flagged "no logging on route handlers". We rely on `withParentScope*` wrapper's internal `console.error` on unknown exceptions. Structured log provider (e.g. Vercel observability + trace IDs) deferred — not a security gap.
2. **Submission↔Student matching by applicantName+applicantNumber**: no FK exists, so homonyms in a classroom (extremely unlikely — classroom numbers are unique per classroom) are a residual false-positive risk. Documented in scope_decision.
3. **Email provider**: stubbed (console log). Cron shape + pipeline verified; real provider wiring is a follow-up.
4. **AC-6 direct link-id endpoint**: no current public endpoint exposes a linkId parameter for parents. `requireParentChildLinkOwned` helper exists and will be used when such an endpoint lands.

## Build + typecheck

- `npx tsc --noEmit` → PASS (0 errors)
- `npm run build` → PASS (see routes list in phase8/build_log.txt)
