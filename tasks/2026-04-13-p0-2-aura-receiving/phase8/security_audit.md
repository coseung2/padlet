# Phase 8 — Security audit

## Scope
All code introduced in phase 7 — `src/lib/external-auth.ts`,
`src/app/api/external/cards/route.ts`, `src/app/api/account/tokens/**`,
`src/app/account/tokens/**`.

## Threat model walk-through

### T1. Token leak paths
| Path | Mitigated? | Notes |
|---|---|---|
| Raw token in server logs | ✅ | `maskToken()` exposed; we never `console.log` the Authorization header or plaintext. Only `lastUsedAt` timestamps + hash-derived `tokenId` touched in `external-auth.ts`. |
| Raw token in client-side error toast | ✅ | Token is returned by POST /api/account/tokens only and is kept in `useState`. No `throw` path that leaks to console. |
| Raw token in URL | ✅ | Never placed in query string; always in Bearer header. |
| Token in git history | ✅ | Tokens are runtime artifacts; no fixtures. |
| Hash theft → guess plaintext | ✅ | 132-bit entropy makes brute force infeasible; SHA-256 keyed with `NEXTAUTH_SECRET`. |

### T2. Authentication bypass
| Vector | Mitigated? | Notes |
|---|---|---|
| Missing Bearer header | ✅ | `parseBearer` returns null → `verifyToken` returns null → 401. |
| Case-mismatched scheme ("BEARER", "bearer") | ✅ | Regex `/^bearer\s+/i`. |
| Token without `aura_pat_` prefix | ✅ | Early rejection in `parseBearer`. |
| Revoked token reused | ✅ | `verifyToken` checks `revokedAt !== null`. |
| Timing attack on existence | ✅ | Hash computed before any DB call; `findUnique` by unique column (single query, constant work); additional `timingSafeEqual` between stored and computed hash. |
| Replay attack | Partial | HTTPS on Vercel defends in transit; no nonce — acceptable for idempotent-ish POST. |

### T3. Authorization / privilege escalation
| Vector | Mitigated? | Notes |
|---|---|---|
| Owner/editor token used on viewer-only board | ✅ | `requirePermission(boardId, user.id, "edit")` throws 403. |
| Cross-user revoke (guess another user's token id) | ✅ | `revokeToken(id, userId)` uses `findFirst({where:{id, userId}})` — scoped. |
| Student-auth user attempting /account/tokens | ✅ | `getCurrentUser()` is NextAuth-scoped; students have a separate `studentToken` cookie path (`student-auth.ts`), untouched here. |
| Section belonging to other board | ✅ | Explicit `sec.boardId !== board.id` check → 400. |

### T4. Resource exhaustion / DoS
| Vector | Mitigated? | Notes |
|---|---|---|
| Flood of requests per token | ✅ | 60/min fixed-window per tokenId. |
| Many tokens per user | ✅ | `TOKEN_CAP_PER_USER = 10`. |
| Oversized image payload | ✅ | 5 MB decoded cap; 413 returned. |
| Oversized JSON body | Partial | Vercel default body limit applies; not further capped. Acceptable. |
| Parallel image writes filling disk | Partial | Filesystem fallback writes to `public/uploads/`. On Vercel this is ephemeral per function; production should use Blob. Documented. |

### T5. Input validation
| Surface | Mitigated? | Notes |
|---|---|---|
| `CreateExternalCardSchema` | ✅ | `.strict()` rejects unknown keys; lengths capped; URL type-checked. |
| `imageDataUrl` regex | ✅ | Only `data:image/png;base64,<base64>` accepted. |
| SQL injection | ✅ | Prisma parameterizes all queries. |
| XSS in title/content | ✅ | Same sanitization surface as `POST /api/cards`; no new risk. |

### T6. Storage & transport
| Concern | Mitigated? | Notes |
|---|---|---|
| Hashes at rest | ✅ | `tokenHash @unique` only; plaintext never persisted. |
| Env secret rotation | ✅ | Rotating `NEXTAUTH_SECRET` invalidates all tokens — document in ops runbook. |
| HTTPS enforcement | ✅ | Platform level. |

## Code-level findings

### F1. INFO — Rate-limit map unbounded growth
`buckets` Map in `external-auth.ts` grows one entry per unique tokenId seen. Max size = number of issued tokens (≤ 10 × N users); bounded and acceptable. No action required.

### F2. INFO — Fire-and-forget `lastUsedAt` update
`verifyToken` updates `lastUsedAt` asynchronously without awaiting. On a cold DB failure we log nothing. Acceptable — `lastUsedAt` is informational; a silent failure doesn't block the request.

### F3. SUGGESTION — Document `NEXTAUTH_SECRET` rotation
Added a sentence in `docs/external-api.md` §4 describing rotation impact. Operational runbook update tracked outside this task.

### F4. INFO — `@vercel/blob` optional dep
Dynamic import with `["@vercel", "blob"].join("/")` specifier avoids TS resolution. On Vercel, install the package and set `BLOB_READ_WRITE_TOKEN` to enable. Fallback path (`public/uploads/`) works in any Node environment.

## Verdict
APPROVE. All phase2 risk-table mitigations land in code; no new high-severity issues. Proceed to phase 9 (QA).
