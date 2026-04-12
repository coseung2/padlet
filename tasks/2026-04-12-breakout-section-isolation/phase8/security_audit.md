# Security Audit — breakout-section-isolation

Scope: new endpoints (`/api/sections/:id/cards`, `/api/sections/:id/share`), `viewSection` RBAC helper, token storage.

## STRIDE

| Threat | Status | Notes |
|---|---|---|
| Spoofing | LOW | Token compared with constant-time `timingSafeEqual`. Token entropy ~256 bits. |
| Tampering | LOW | DB is the source of truth; query parameters carried over URL are compared server-side. |
| Repudiation | N/A | No write surface for anonymous callers in this slice. Owner actions use NextAuth. |
| Information disclosure | MEDIUM | MVP stores token in plaintext so owner UI can redisplay it. Trade-off acknowledged — future: store bcrypt hash + show token once. |
| Denial of service | LOW | No expensive operations; `findMany` scoped to single sectionId (indexed). |
| Elevation of privilege | LOW | `viewSection` is deny-by-default; share POST gated on `role === "owner"` (stricter than generic "edit"). |

## OWASP Top 10 (read-only subset)

| Item | Check |
|---|---|
| A01 Broken Access Control | `viewSection` + owner-gate on share. |
| A02 Crypto failures | `crypto.randomBytes(32)` for token; `timingSafeEqual` for compare. |
| A05 Security Misconfig | No new env vars; no secrets committed. |
| A07 Identification and Auth | Reuses existing NextAuth + student_session. |
| A08 Software/Data integrity | Prisma migration is additive; rollback via DROP COLUMN documented. |

No blocking security issues.
