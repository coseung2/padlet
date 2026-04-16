# Phase 1 — Research: PAT + external card creation endpoint

## Problem shape
Canva Apps SDK requires HTTPS endpoint that authenticates via Bearer token and accepts card payload. Token must be issued by the teacher, stored safely, and revocable.

## Industry patterns reviewed
1. **GitHub PAT model**: prefix `ghp_` + 36-char base62; stored as salted SHA-256. Shown once. Revocable. We adopt this pattern.
2. **Stripe restricted keys**: 64-char, prefix `rk_live_`, shown once. Hash-at-rest.
3. **Notion integration tokens**: prefix `secret_` + 43-char base62; stored as-is but rotated on user action.

Pattern: `prefix_<randomHighEntropy>`, SHA-256(salt + token) at rest, constant-time compare.

## Choices for this feature
| Aspect | Choice | Rationale |
|---|---|---|
| Format | `aura_pat_<22char base64url>` | Prefix aids leak detection in logs. 22 chars base64url ≈ 132 bits entropy |
| Hash | `sha256(NEXTAUTH_SECRET + token)` | No native dep; brute-force infeasible at 132-bit entropy; matches existing `tokensEqual` conventions |
| Compare | `timingSafeEqual` on hex strings | Already used in `src/lib/event/tokens.ts` |
| Storage | DB row `ExternalAccessToken { tokenHash @unique }` | Unique hash permits O(1) lookup via `findUnique` |
| Revoke | Set `revokedAt` (soft delete) | Keeps audit trail; `verifyToken` rejects when non-null |
| Rate limit | In-memory fixed-window Map<hash, {count, windowStart}>, 60/min | Single-instance; acceptable for solo-teacher use; document |
| Image | If `BLOB_READ_WRITE_TOKEN` → `@vercel/blob.put`; else write to `public/uploads/` with `ext-<timestamp>-<rand>.png` | Graceful degrade per spec |

## Relevant NPM packages
- `@vercel/blob` — optional dep. Install only if we want blob. Design so it's dynamically imported and optional.
- No bcrypt; use Node `crypto`.
- `zod` — already in use.

## Risks uncovered
- **Token leak in logs**: ensure we never log raw Authorization header. Mask to `aura_pat_****<last4>`.
- **Timing attack on existence check**: always do hash-then-compare; don't short-circuit on "no row with this hash".
- **Data URL size**: cap at 5 MB decoded (≈ 7 MB b64); reject larger to prevent memory exhaustion.
- **Rate limit bypass**: per-token only; user could issue many tokens to bypass. Add per-user cap of 10 active tokens.
- **Blob URL persistence**: blob returns public URL — anyone with link can view. Acceptable for class content; documented in `docs/external-api.md`.

## Edge cases
- Token with trailing whitespace in header → trim before hash
- `Bearer` case-insensitive
- `sectionId` provided but doesn't belong to `boardId` → reject 400
- `boardId` not found → 404
- User has no boards → 403 (helpful error)

## Done definition for phase 2
Strategist converts this + phase0 into scope_decision with ≥8 AC and risk table.
