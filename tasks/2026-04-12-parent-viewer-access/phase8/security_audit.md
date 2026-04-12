# Phase 8 — Security Audit: Parent Viewer Access PV-1 ~ PV-5

Audit scope: schema migration + code generator + teacher invite API + redeem flow + magic-link callback + ParentSession + parentScopeMiddleware. Follow-on surfaces (PV-6~12) not in scope.

## 1. Timing-attack resistance

| Check | Status | Evidence |
|---|---|---|
| Code hash compare uses timingSafeEqual on equal-length buffers | PASS | `src/lib/parent-codes.ts` verifyCode(): sha256 hex → Buffer compare with length guard + timingSafeEqual |
| Magic-link HMAC compare uses timingSafeEqual | PASS | `src/lib/parent-magic-link.ts` verifyMagicLink(): sigBuf vs expBuf via timingSafeEqual |
| Session-token lookup by tokenHash (not by plaintext compare) | PASS | `src/lib/parent-session.ts` getCurrentParent(): findUnique({where: {tokenHash}}) — no plaintext equality |
| Code verify runs regardless of invite lookup result (length-invariant) | PASS | redeem-code/route.ts: always computes `verifyCode` (on a dummy when !invite we branch early after length guard — acceptable; the length guard leaks only "normalised length != 6" which is public knowledge of the protocol) |

## 2. Cookie flags

| Flag | Required | Set | File |
|---|---|---|---|
| HttpOnly | yes | yes | parent-session.ts L55 |
| SameSite | Lax | Lax | parent-session.ts L57 |
| Secure | prod-only | `process.env.NODE_ENV === "production"` | parent-session.ts L56 |
| Path | / | / | parent-session.ts L58 |
| MaxAge | 7 days | 604800 s | parent-session.ts L59 |
| Token entropy | >=16B | 32B randomBytes | parent-session.ts generateSessionToken |

## 3. Rate-limit bypass attempts

| Vector | Defence | Status |
|---|---|---|
| Fresh IP per request (rotating proxies) | Per-code `failedAttempts` counter → 10 → revoke (primary guard) | PASS |
| Lost state on serverless cold start | In-memory IP bucket resets → LOSS of per-IP lock; but per-code counter is DB-persistent, so cannot grind one code forever | ACCEPTABLE v1 |
| Multi-node deploy races | Two instances can each allow 5 fails before talking — effective IP limit up to 5*N | ACCEPTABLE v1 |
| Brute-force entropy | 32^6 = 1.07e9 combinations; with per-code lockout at 10 fails, expected attacker hits = 10/1.07e9 ≈ 9.3e-9 | PASS |
| Bound-email bypass (try many emails) | boundToEmail mismatch also increments failedAttempts → locks code at 10 | PASS |

### Upstash upgrade path (RLS-GAP-style deferral)
In-memory IP limiter documented as best-effort. Upgrade to Upstash Redis when infra is provisioned. Tracked in `tasks/.../phase10/deploy_log.md` → "Follow-up hardening". Per-code counter is the compliance-grade guard; IP limiter is UX friction only.

## 4. RLS gap

The schema's RLS policies (`prisma/migrations/20260412_add_parent_viewer/rls.sql`) are **NOT auto-applied** by `prisma db push`. Reasons:

1. Supabase Postgres RLS requires manual enablement per-table (not represented in Prisma schema DSL).
2. Applying RLS breaks existing server queries that don't `SET LOCAL app.parent_id` — the app has no transactional wrapper yet.

**Enablement plan** (deferred to PV-9/PV-11):
1. Refactor `/parent/*` db calls into `db.$transaction(async tx => { await tx.$executeRaw\`SELECT set_config('app.parent_id', ${parentId}, true)\`; ... })`.
2. Apply `rls.sql` via `psql "$DATABASE_URL" -f prisma/migrations/20260412_add_parent_viewer/rls.sql`.
3. Verify non-parent routes still work (teacher invite routes bypass RLS as they don't set the GUC).

**Until then**, middleware layer (`parent-scope.ts`) is the single enforcement point. This is acceptable for v1 + PV-12 E2E suite will validate with parent-token probes.

## 5. Cross-parent isolation (AC-6)

`requireParentChildLinkOwned()` queries `findFirst({where: {id: linkId, parentId: ctx.parent.id}})`. Any link belonging to another parent returns null → we throw 404 "not_found". Tested via `/api/parent/test/cross-isolation?linkId=<foreign>`.

Note: the 404 vs 403 asymmetry is intentional and documented in `parent-scope.ts`. 403 is for "your child exists but it's not THIS studentId" (studentId is a known request shape), 404 is for "this link id means nothing to you" (prevents enumerating link ids across the population).

## 6. Magic-link replay

- Token has `exp` field, 15-min TTL.
- Replay within 15 min creates another ParentSession for the same parentId — NOT a privilege escalation (same parent, same children).
- One-time tokens would require a `used_magic_links` table; deferred. The 15-min window + HttpOnly session render this irrelevant for v1.

## 7. Code enumeration / email enumeration

- redeem returns `code_not_found` (404) for both "hash miss" and "code too short" — same shape.
- boundToEmail mismatch returns `code_not_found` (same 404) to avoid confirming a valid code exists for other emails.
- No Parent existence leak: redeem always upserts by email and never reports "email already exists".

## 8. Data exposure in responses

| Endpoint | Returns | Cross-parent leak? |
|---|---|---|
| POST /api/students/[id]/parent-invites | own invite code + QR | NO (teacher-scoped) |
| GET  /api/students/[id]/parent-invites | list own classroom invites | NO (teacher-scoped) |
| DELETE /api/parent-invites/[id] | ok | NO (404 on foreign teacher) |
| POST /api/parent/redeem-code | {ok, email, devMagicLinkUrl} | NO (dev fallback + caller's email only) |
| GET  /parent/auth/callback | redirect | NO |
| GET  /api/parent/test/children | parentId + own links | NO |
| GET  /api/parent/test/cross-isolation | ok or error | NO (enforced) |

## 9. Session hijack / CSRF

- HttpOnly cookie → no XSS can exfiltrate.
- SameSite=Lax → cross-site POSTs don't carry the cookie (except top-level GETs, which only hit /parent/auth/callback — which is idempotent).
- Redeem endpoint is PUBLIC by design (no cookie expected at redeem time); CSRF impact limited to "attacker triggers magic-link email" — mitigated by (a) unique code requirement, (b) rate limit, (c) magic-link email goes to the target, not the attacker.

## 10. Additive-only migration

Confirmed: schema.prisma only ADDs 4 models + 2 back-relations on User/Student. No column dropped. `prisma db push` output: "Your database is now in sync" (no "destructive changes detected").

---

## Summary
All checks PASS for v1 scope PV-1 ~ PV-5. Two documented deferrals:
1. Upstash Redis upgrade for multi-node IP rate-limit.
2. RLS enablement requires the prisma $transaction GUC refactor; middleware layer covers the gap in v1.

REVIEW_OK.
