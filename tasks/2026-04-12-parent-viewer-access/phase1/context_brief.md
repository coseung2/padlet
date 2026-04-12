# Phase 1 — Analyst Context Brief

## Scope (this agent)
PV-1 through PV-5 of the Parent Viewer Access roadmap. PV-6 through PV-12 deferred to follow-up agents.

## Existing codebase anchors
- **Prisma schema**: `prisma/schema.prisma` — Postgres (Supabase), cuid ids, already has `Student`, `Classroom`, `User`, `BoardMember(role string)`. No RLS currently enforced in Prisma; roles are app-layer.
- **Student auth pattern**: `src/lib/student-auth.ts` — HMAC-signed cookie `student_session`, `createHmac('sha256', AUTH_SECRET)`, `timingSafeEqual` compare, 30-day cookie. The parent-session pattern must mirror this but use `parent_session` cookie, store server-side `ParentSession` row, 7-day expiry, and keyed off session-token hash (extra revoke safety).
- **Auth secret**: `process.env.AUTH_SECRET` (also used as NEXTAUTH_SECRET via next-auth). Fallback `dev-secret`.
- **Existing external token pattern**: `src/app/api/external/*` uses `tokenHash` via sha256; good precedent for storing hashed secrets rather than plaintext.
- **Migration style**: raw SQL in `prisma/migrations/{YYYYMMDD_name}/migration.sql` — existing `20260412_add_section_access_token/` only contains `migration.sql` (no `migration_lock.toml` at that level — prisma uses `db push` elsewhere). This repo uses `prisma db push` for dev, but keeps tracked SQL under `prisma/migrations/` as auditable records.
- **Route handler pattern**: `NextResponse.json`, zod schemas, try/catch with `ZodError → 400`, generic `internal → 500`.
- **Components**: `src/components/ClassroomDetail.tsx` is where student rows live; this is where the "학부모 초대" button must attach.

## Key constraints
1. Additive-only Prisma migration (no destructive flags).
2. Crockford Base32 6-char code alphabet — `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (excludes I, L, O, U).
3. 48h expiry + maxUses=3 on ParentInviteCode.
4. Double-rate-limit: per-IP 5 failures / 15 min + per-code 10 failures → auto-revoke.
5. HttpOnly, SameSite=Lax, Secure-in-prod cookie. 7-day session. Server-side hash for tamper resistance.
6. Magic link = HMAC-signed JWT-ish token, 15-min TTL.
7. RLS SQL file scaffolded but not applied (documented in deploy_log — Supabase RLS needs separate enablement).
8. `parentScopeMiddleware` verifies session + studentId belongs to parent.children.
9. Design system tokens only (no hard-coded colors).

## Dependencies
- `qrcode` already installed (classroom QR use case).
- No `@upstash/redis` currently — for PV-3 rate limit, use in-memory Map fallback + document RLS-gap-style deferral for Upstash upgrade. For persistent rate-limit, we'll instead use `ParentInviteCode.failedAttempts` for per-code + DB-backed `ParentRateLimit` table OR use a simple LRU (acceptable for v1 where per-code is the stronger guard).
- Decision: store `failedAttempts` on InviteCode (already in roadmap). For IP rate limit, implement minimal in-memory Map gated behind an env flag with TODO for Upstash upgrade — document in security_audit.md.

## Threat model surface (early)
- Timing attack on code verification → always do constant-time compare on codeHash.
- Cookie theft → HttpOnly + SameSite=Lax + Secure; server-side `ParentSession` row revokable.
- Code brute-force → per-code counter + per-IP sliding window.
- Magic-link replay → token embeds expiry + single-use marker (we'll persist a used-flag OR set 15-min window + one-time callback creating session; replay would just create another session, which is still scoped to same parent — acceptable with short TTL).
- Cross-parent isolation → RLS SQL scaffold + middleware query scoping.

## Agreements with user prompt (authoritative)
The prompt spec is the authoritative model. It differs slightly from `parent-viewer-roadmap.md §2` (simpler — no `failedAttempts` here, but we'll add it as it's in the code block's comment about per-code 10-fail lockout). Reconcile:
- Keep `boundToEmail` (prompt) — optional.
- Keep `codeHash` + `tokenHash` + `ipHash` + `userAgent` (prompt).
- Add `failedAttempts Int @default(0)` because the AC explicitly requires "코드당 10회 실패 시 즉시 revoke" which needs the counter.
- Keep `parentDeletedAt` naming from prompt (not `deletedAt`) since prompt text uses both interchangeably but spec block uses `parentDeletedAt`.
