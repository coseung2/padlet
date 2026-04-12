# Aura-board External API

External integrations (Canva content-publisher app, custom scripts, etc.)
can create cards on a teacher's board via a Personal Access Token (PAT).

---

## 1. Get a token

1. Sign in to Aura-board as the owner/editor of the boards you want to write to.
2. Navigate to **/account/tokens**.
3. Click **새 토큰 발급**, give the token a label (e.g. `내 Canva 앱 v1`).
4. **Copy the plaintext token shown in the dialog — it is displayed only once.**
5. Store it in your integration's secret store (e.g. Canva app env var).

Token format: `aura_pat_<22 base64url chars>` (~132 bits entropy).

Up to **10 active tokens** per account. Revoke from the same page.

---

## 2. `POST /api/external/cards`

### Headers

| Header | Value |
|---|---|
| `Authorization` | `Bearer aura_pat_…` (required) |
| `Content-Type` | `application/json` |

### Request body

```json
{
  "boardId": "ckxyz…",
  "sectionId": "ckabc…",           // optional
  "title": "수업 요약 카드",           // required, ≤ 200 chars
  "content": "오늘 배운 내용…",        // optional, ≤ 5000 chars
  "imageDataUrl": "data:image/png;base64,iVBOR…",   // optional, PNG only, ≤ 5 MB decoded
  "linkUrl": "https://example.com/x",  // optional
  "canvaDesignId": "DAGxxxxxxxx"       // optional; server resolves to canonical URL + oEmbed
}
```

Notes:

* Exactly one of `content`, `imageDataUrl`, `linkUrl`/`canvaDesignId` is sufficient, but the only strictly required field is `title`.
* `sectionId`, if provided, must belong to `boardId`.
* `imageDataUrl` accepts only `data:image/png;base64,…`. Other MIME types → 400.
* When `BLOB_READ_WRITE_TOKEN` is configured on the Aura-board server, images are uploaded to Vercel Blob. Otherwise they are written to `/public/uploads/`. In both cases `card.imageUrl` is populated.

### Success (200)

```json
{
  "success": true,
  "cardId": "ckCARD…",
  "cardUrl": "/board/<slug>?card=ckCARD…"
}
```

### Error codes

| HTTP | `error` | Meaning |
|---|---|---|
| 400 | `invalid_json` | Body is not valid JSON |
| 400 | `validation_failed` | zod validation failed (see `issues` array) |
| 400 | `section_mismatch` | `sectionId` does not belong to `boardId` |
| 400 | `unsupported_image_type` | `imageDataUrl` is not `data:image/png;base64,…` |
| 400 | `invalid_base64` | base64 decode failed |
| 401 | `unauthorized` | Missing / malformed / revoked / unknown token |
| 403 | `forbidden` | Token user has no edit permission on the board |
| 404 | `board_not_found` | `boardId` does not exist |
| 413 | `image_too_large` | Decoded image > 5 MB |
| 429 | `rate_limited` | >60 requests in the current minute for this token. Response body includes `retryAfter` (seconds); header `Retry-After` also set. |
| 500 | `image_store_failed` | Image persistence failed (fs/blob outage) |
| 500 | `internal` | Unexpected server error |

### Rate limit

* Per token: **60 requests / minute** (fixed window, in-memory per server instance).
* Revoked tokens never count — they fail at 401 immediately.

---

## 3. Example: curl

```bash
# 1. Happy path — text-only card
curl -sS https://aura.example.com/api/external/cards \
  -H "Authorization: Bearer aura_pat_REPLACE_ME" \
  -H "Content-Type: application/json" \
  -d '{
    "boardId": "ckxyz…",
    "title": "API로 생성된 카드",
    "content": "Canva 앱에서 전송"
  }'

# 2. Image (PNG data URL)
curl -sS https://aura.example.com/api/external/cards \
  -H "Authorization: Bearer aura_pat_REPLACE_ME" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "boardId": "ckxyz…",
  "title": "디자인 시안",
  "imageDataUrl": "data:image/png;base64,$(base64 -w0 my-image.png)"
}
JSON

# 3. Canva design link (server resolves thumbnail + title via oEmbed)
curl -sS https://aura.example.com/api/external/cards \
  -H "Authorization: Bearer aura_pat_REPLACE_ME" \
  -H "Content-Type: application/json" \
  -d '{ "boardId": "ckxyz…", "title": "캔바 디자인", "canvaDesignId": "DAGxxxxxxxx" }'
```

---

## 4. Security guidance for integrators

* **Never commit the token to source control.** Store it in your integration's secret store.
* **Rotate immediately** if you suspect a leak — revoke in `/account/tokens`, issue a new one.
* Only the last 4 chars are ever logged by Aura-board; full header values are never written to logs.
* TLS is enforced by Vercel; never use over HTTP.
* A token grants the ability to create cards on any board where the issuing user has edit permission. Use separate tokens per integration so one leak can be scoped-revoked.

---

## 5. Known limitations

* Rate-limit is per-server-instance. In a multi-replica deployment the effective limit may be `60 × replicas`. A Redis-backed limiter is future work.
* No per-board scoping — out of scope for P0. Planned for P1.
* Image URL, once returned, is unauthenticated (Vercel Blob public URL or `/uploads/<filename>`). Keep this in mind for sensitive content.
