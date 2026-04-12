# Phase 9 — QA report (curl smoke tests against localhost:3000)

Dev server: Next.js 16.2.3 Turbopack, port 3000. Mock auth via `Cookie: as=owner|viewer`.
External API tested with real issued tokens (plaintext returned once from POST /api/account/tokens).

## Results — all AC verified

| AC | Test | Result |
|---|---|---|
| 1 | GET /account/tokens as owner → HTTP 200, page rendered ("내 외부 연동 토큰", "새 토큰 발급") | ✅ |
| 2 | POST /api/account/tokens → plaintext returned; DB has only hash (verified via Prisma query); revokedAt set after DELETE | ✅ |
| 3 | POST /api/external/cards with Bearer token → `{success:true, cardId, cardUrl:"/board/demo?card=…"}` | ✅ |
| 4a | POST without Authorization → HTTP 401 | ✅ |
| 4b | POST with unknown token `aura_pat_TOTALLYFAKE…` → HTTP 401 | ✅ |
| 4c | Malformed header `Authorization: Basic abc` → HTTP 401 | ✅ |
| 4d | Revoked token → HTTP 401 (verified post-DELETE) | ✅ |
| 5 | Viewer-role user's token on owner/editor-required board → HTTP 403 | ✅ |
| 6 | `imageDataUrl` PNG (1×1 px test) → `Card.imageUrl = /uploads/ext-…png`; non-PNG data URL → HTTP 400 | ✅ |
| 7 | Burst 65 POSTs with same token → 56 × 200 + 9 × 429 (window already partially consumed by earlier tests; boundary correct at 60/min) | ✅ |
| 8 | `docs/external-api.md` has curl examples + all 11 error codes documented | ✅ |
| 9 | `npx tsc --noEmit` clean; `npm run build` clean (all 60+ routes built, no warnings) | ✅ |
| 10 | Issue 10 tokens → 11th POST returns HTTP 400 body `{"error":"token_limit_exceeded"}` | ✅ |
| extra | `boardId: "does_not_exist"` → HTTP 404 (board_not_found) | ✅ |

## Raw output (captured during run)
```
=== AC3: POST card with valid token ===
{"success":true,"cardId":"cmnvnantr0003vs2rfrysceh4","cardUrl":"/board/demo?card=cmnvnantr0003vs2rfrysceh4"}
=== AC4a: missing auth -> 401 ===   HTTP 401
=== AC4b: bad token -> 401 ===        HTTP 401
=== AC4c: malformed auth -> 401 ===   HTTP 401
=== AC5: viewer -> 403 ===            HTTP 403
=== AC: board_not_found -> 404 ===    HTTP 404
=== AC6: image data URL ===           Card.imageUrl = /uploads/ext-1775991202323-aa3ded7d.png
=== AC6b: unsupported image type ===  HTTP 400
=== AC7: rate limit 65 burst ===      56 × 200 + 9 × 429
=== AC10: 11th token -> 400 ===       {"error":"token_limit_exceeded"}
=== List after revoke ===
{"tokens":[{"id":"cmnvn9xxm0001vs2rj6wlh8um","name":"QA smoke test token",
  "createdAt":"2026-04-12T10:52:30.346Z",
  "lastUsedAt":"2026-04-12T10:53:31.642Z",
  "revokedAt":"2026-04-12T10:53:44.648Z"}]}
```

## Cleanup
All 12 test tokens and 58 test cards (QA-happy, image test, viewer tries, after revoke, rl-1..65) deleted from DB.

## Verdict
All 10 acceptance criteria + edge cases PASS. Ready for deploy.
