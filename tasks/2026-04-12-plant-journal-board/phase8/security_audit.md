# Security Audit — plant-journal-board

Changed surfaces: 12 API routes + 1 page + file-upload reuse. Scope covers auth, DB writes, and external input.

## STRIDE

| Threat | Mitigation | Status |
|---|---|---|
| Spoofing (act as another student) | Student session cookie is HMAC-signed + `sessionVersion` pinned; `canAccessStudentPlant` cross-checks ownership. | PASS |
| Spoofing (act as teacher) | NextAuth session → userId; classroom teacher check in all teacher routes. | PASS |
| Tampering (body) | Zod parse on every POST/PUT/PATCH/DELETE. | PASS |
| Repudiation | Prisma writes get `createdAt`/`updatedAt`. | PASS |
| Information disclosure | `/api/student-plants/:id` requires actor = student owner or classroom teacher; matrix requires owner. | PASS |
| DoS (large uploads) | Reuses `/api/upload` (50MB cap, typed allow-list). Observation create caps images to 10. | PASS |
| Elevation of privilege | RBAC gate decides `canEdit`; advance-stage and write-observation routes require `ownedByActor`. | PASS |

## Client-forgeable controls
- `X-Client-Width` in matrix route: forgeable. Purpose is UX (prevent teacher opening cramped view on iPad), NOT security. Documented.

## Secrets
No secrets introduced. Reuses existing `AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`.

## Verdict
PASS — no new high/critical findings.
