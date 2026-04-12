# Phase 10 — Deploy Plan

## Pre-push

- Build: PASS (phase9)
- Typecheck: PASS (phase9)
- Marker chain: REVIEW_OK.marker + QA_OK.marker present
- Branch: `feat/image-pipeline-t0-4` (no push here — orchestrator handles merge)

## Vercel deploy notes (for later merge)

- `images.remotePatterns` addition doesn't require env changes.
- `/api/canva/thumbnail` is a serverless function. Region pinning stays `icn1` via `vercel.json` (no changes needed — route inherits default runtime).
- No env vars required.
- CSP unchanged (our thumbnail host for `img-src` is same-origin after `_next/image` rewrites).

## Rollback plan

1. Revert branch merge.
2. The `/api/canva/thumbnail` route removal is trivial (no consumers in this change — it exists as a hardening path, not a required client dependency).
3. Rolling back `next/image` usage requires restoring the raw `<img>` tags — tracked by git.

## Deferred to staging verification

- Actual per-image payload on Galaxy Tab S6 Lite (DevTools Network inspection).
- 3G Fast time-to-first-image measurement.
