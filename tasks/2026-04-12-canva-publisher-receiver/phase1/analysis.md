# Phase 1 — Analysis

Rewrite existing P0-② v1 (`external-auth.ts`, `/api/external/cards`, `/api/account/tokens`, `/account/tokens` UI) per Seed 8. New format `aurapat_{prefix}_{secret}`, SHA-256+PEPPER, prefix O(1) lookup, legacy slow path, 3-axis Upstash rate limit, streaming Vercel Blob, dual tier defense, 12 error codes, new teacher UI at `/(teacher)/settings/external-tokens`, 4MB body guard, Stage 1 migration (nullable prefix). Deps to add: @upstash/redis, @upstash/ratelimit, @vercel/blob — all with graceful env fallback.
