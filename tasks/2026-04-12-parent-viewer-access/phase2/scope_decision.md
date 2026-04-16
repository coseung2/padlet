# Phase 2 — Scope Decision: Parent Viewer Access PV-1 ~ PV-5

## Decision
**IN_SCOPE** for this agent: PV-1 (schema + migration + RLS SQL) · PV-2 (teacher invite UI + API + Crockford code) · PV-3 (parent redeem + magic link email) · PV-4 (magic link callback + 7-day session) · PV-5 (parentScopeMiddleware scaffold).

**OUT_OF_SCOPE** (deferred): PV-6 PWA shell · PV-7 child-scope matrix · PV-8 teacher management tab · PV-9 revoke SLA client · PV-10 weekly email · PV-11 self-withdraw + 90-day Cron · PV-12 E2E security gate.

## Acceptance Criteria (this agent)
- **AC-1** Teacher can issue a Crockford Base32 6-char code (+ QR) from student card modal. Stored as `code` (display) + `codeHash` (verify). Expires 48h, maxUses=3.
- **AC-2** Parent can submit code + email on `/parent/join` → server validates → issues magic link (15-min TTL). Callback creates `ParentSession` (HttpOnly cookie, 7-day).
- **AC-3** Teacher can **revoke** an active invite code (DELETE endpoint) → sets `revokedAt`. Revoked codes return 410 on redeem.
- **AC-4** Per-IP rate-limit (5 failures / 15 min) AND per-code counter (`failedAttempts` → 10 triggers instant revoke).
- **AC-5** `ParentSession` cookie is HttpOnly, SameSite=Lax, Secure in prod, 7-day expiry, server-side token-hash check.
- **AC-6** `parentScopeMiddleware`/`requireParentScope(studentId)` verifies active session + active ParentChildLink. Returns 401 on no/revoked session, 403 on cross-student, 404 on non-linked students to prevent existence leak.
- **AC-7** RLS policy SQL scaffold file is authored (`prisma/migrations/20260412_add_parent_viewer/rls.sql`). Enablement deferred (documented in deploy_log).
- **AC-8** `npx tsc --noEmit` passes; `npm run build` passes.
- **AC-9** Cross-parent isolation verified: test route `/api/parent/test/cross-isolation` returns 404 (not 403) when parent A tries to read parent B's ParentChildLink — existence is not confirmable.
- **AC-10** Timing-safe verification used for code + session-token comparison (`crypto.timingSafeEqual`).

## Risks
| Risk | Severity | Mitigation |
|---|---|---|
| IP rate-limit using in-memory Map does not survive restarts or serverless cold-starts | M | Per-code `failedAttempts` is the primary guard (persistent). In-memory IP limit is a secondary, best-effort soft-lock. Flagged for Upstash upgrade in `security_audit.md`. |
| RLS not applied → single layer of defence via middleware | H | SQL scaffold authored + documented. Middleware enforced on every `/api/parent/*` via wrapper. |
| Email delivery infra absent → magic link may not reach parent | M | Dev fallback: return magic-link URL directly in response + log with `[DEV_MAGIC_LINK]` prefix. Production requires Resend setup before PV-2 go-live (NOT this agent's scope). |
| Timing attack on code verification | L | Use bcrypt-compare or timingSafeEqual on equal-length sha256 buffers. We'll use sha256 + timingSafeEqual (simpler, no bcrypt dep). |
| Cross-parent enumeration via ParentChildLink id | L | Middleware query always scoped by parentId from session; 404 returned on miss. |
| Cookie tampering | L | `sessionToken` stored in cookie; server verifies against `tokenHash` (sha256) in DB. Revocation updates `sessionRevokedAt`, middleware checks on each request. |
| Code entropy | L | 32^6 ≈ 1.07 × 10^9 combinations, plus per-code lockout after 10 fails makes brute-force infeasible. |

## Security Threat Model (phase2 draft — full review in phase8)
1. **Code brute-force**: Mitigated by (a) per-code `failedAttempts` counter → auto-revoke at 10, (b) per-IP 5-per-15min soft-lock, (c) 32^6 entropy, (d) 48h expiry.
2. **Magic link replay**: HMAC-signed token with 15-min expiry. A replay within 15 min creates a new session tied to the same parent — acceptable (not privilege escalation).
3. **Session hijack**: HttpOnly cookie prevents JS access; Secure flag prevents plaintext transport in prod; tokenHash check prevents stolen-cookie tampering.
4. **Cross-parent leak**: middleware scopes every query by `session.parentId`; test `/api/parent/test/cross-isolation` returns 404.
5. **Cross-student leak**: `requireParentScope(studentId)` verifies studentId in parent.children (ParentChildLink WHERE deletedAt IS NULL).
6. **Timing attacks**: `timingSafeEqual` on equal-length buffers.
7. **CSRF on redeem**: redeem endpoint writes state → same-site lax cookie is not present yet at redeem time (redeem creates the session), so CSRF is limited to creating an unwanted magic-link. Acceptable: email binding mitigates.
8. **Enumeration via email → redeem**: rate-limited; also the `code` must match, and we never disclose whether email exists.

## Dependencies
- No new npm packages required. `qrcode` already present.
- No destructive migration.
- No new env vars required; reuses `AUTH_SECRET`.
