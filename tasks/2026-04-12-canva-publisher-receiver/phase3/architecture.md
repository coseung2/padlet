# Phase 3 — Architecture

## Layered design

```
POST /api/external/cards (route.ts)
 ├── [1] Content-Length > 4MB → 413
 ├── [2] verifyPat(authHeader) → {user, token}
 │     ├── parseBearer → aurapat_{prefix}_{secret}
 │     ├── fast path: db.findUnique({tokenPrefix}) + sha256+PEPPER + timingSafeEqual
 │     └── slow path (legacy null prefix): findMany({user}) + dummy compare fallback
 ├── [3] token.revokedAt/expiresAt → 410
 ├── [4] requireTier(user) → Free = 402
 ├── [5] 3-axis rateLimit(tokenId, userId, ip) → 429
 ├── [6] Zod strict parse → 422
 ├── [7] requirePermission(boardId, user.id, "edit") → 403
 ├── [8] uploadPngStream(dataUrl) → Blob URL (multipart stream) OR fs fallback
 ├── [9] db.card.create({...defaults, imageUrl: blobUrl})
 └── [10] 200 {id, url}
```

## Legacy vs new PAT coexistence

- New token: `aurapat_xxxxxxxx_yyyy...` — prefix `xxxxxxxx` → tokenPrefix column (unique index → O(1))
- Legacy token: `aura_pat_zzz` or header without `aurapat_` prefix → fall back to findMany for user, compare each hash; OR return 401 (since the legacy sha256 uses NEXTAUTH_SECRET not PEPPER → hashes don't match)
- Strategy: accept ONLY new format in verifyPat. Legacy tokens will be revoked in Stage 2 with email notice. During 7-day window, we still parse legacy format and return 401 `invalid_token_format` (existing tokens issued under v1 are effectively dead per D4 — Stage 1 we only add the column; Stage 2 mass revoke lives in MIGRATION_PLAN).

Implementation: v1 legacy tokens remain revokable through UI but auth path rejects them (already the security posture in D4).

## Redis fallback

```ts
const redis = env.UPSTASH_REDIS_REST_URL
  ? new Redis({url, token})
  : InMemoryRedisShim;
```

`@upstash/ratelimit` accepts any object implementing the Redis interface. InMemoryRedisShim implements `eval`/`zadd`/`zrange`... or we use a simpler in-mem sliding-window adapter that presents the same `limit()` API.

## Blob fallback

```ts
if (env.BLOB_READ_WRITE_TOKEN) await put(key, stream, {access:"public", contentType:"image/png", multipart:true, token})
else writeFile(public/uploads/key, buffer) → returns /uploads/key
```

## Tier dual defense

- Issue-time (`/api/tokens` POST): `getTier(userId) === "pro"` else 402
- Receive-time (`/api/external/cards`): same check on `token.userId`'s tier

`getTier()` reads `FREE_USER_IDS` env (comma-sep). Default = all Pro.

## Error catalog

12 codes mapped to 6 HTTP status groups in src/lib/external-errors.ts.
