# Phase 0 — Analyst notes

## Codebase signals found
- Next.js 16 App Router, Prisma (Postgres), NextAuth 5, React 19, TS — confirmed via `src/app` + `prisma/schema.prisma`.
- Auth helper: `src/lib/auth.ts` → `getCurrentUser()` combines NextAuth session + mock-user "as" cookie (dev).
- RBAC: `src/lib/rbac.ts` → `requirePermission(boardId, userId, "edit"|"view"|"delete_any")`. Throws `ForbiddenError` (status=403). Editor/owner can create cards. Viewer cannot.
- Existing card create: `src/app/api/cards/route.ts` — same shape to mirror for external route (schema, Canva oEmbed enrichment, create columns).
- Token generation + timing-safe compare already exist in `src/lib/event/tokens.ts`: `issueToken()` (21-char base64url), `tokensEqual()`, `hashIp()`.
- No `@vercel/blob` dependency yet — external images: write to `public/uploads/` (current pattern in `src/app/api/upload/route.ts`) as graceful fallback. Blob `put()` if `BLOB_READ_WRITE_TOKEN` env is set, else filesystem + log TODO.
- No `bcrypt` yet — use Node `crypto` sha256 with salt (faster, no native dep). Token is already high-entropy random, so a keyed sha256 is acceptable against hash theft (brute-force guessing a 22-char base64url secret is infeasible).
- Throttle pattern: `src/lib/event/throttle.ts` — count-based; for rate-limit we'll do in-memory fixed-window since it's per-token and short-lived.

## Stack constraints
- No destructive Prisma. `prisma migrate dev --name add-external-access-token` only; never `db push --force-reset`.
- Port 3000 only.
- Vercel region icn1 (vercel.json); Supabase ap-northeast-2. No region changes needed.

## Unknowns to clarify in phase1 research
- Token format: plaintext prefix (e.g., `aura_pat_<22>`) vs raw 32-byte → pick for UX + searchability
- Hash scheme: sha256(salt + token) keyed by `NEXTAUTH_SECRET` (no bcrypt) is sufficient given token entropy
- Rate limit store: in-memory Map keyed by token hash — OK for single-instance; document as known limit
- Card create path: share core logic with existing `POST /api/cards` or duplicate-simple? Duplicate-simple is safer (external input surface different).

## Scope confirmation
- Canva app + portal registration is EXTERNAL — out of scope. We build the receiving API + teacher token UI only.
- Image handling: data URL → decoded Buffer → write to blob OR `public/uploads/`. PNG only per spec.

## Blockers to surface
1. Canva Apps SDK project (`canva project/content-publisher-app/`) — user creates.
2. Canva Developer Portal registration + team deploy (광릉초6학년1반) — user executes.

## Stakeholders
- Solo project (심보승). Direct merge OK per project rules.
