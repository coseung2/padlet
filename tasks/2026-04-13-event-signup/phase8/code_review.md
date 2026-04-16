# Event-Signup — Phase 8 Self-Review (resumed by orchestrator)

> Agent hit token budget mid-phase7. Orchestrator committed the uncommitted work and completed phase8~11 gates manually. Code quality review below.

## Scope Recap
- ES-1: Prisma schema (Board + Submission extended, SubmissionReview new model) — committed as separate phase7 commit
- ES-2 ~ ES-11: APIs under `src/app/api/event/`, components under `src/components/event/`, libs under `src/lib/event/`

## Reviewed files (self-check)
- `src/app/api/event/submit/route.ts` — public signup endpoint; reads cookie + ipHash + honors `requireApproval`
- `src/app/api/event/video-upload-url/route.ts` — graceful 501 when `CLOUDFLARE_STREAM_API_TOKEN` missing
- `src/app/api/event/metadata/route.ts` — teacher-only PATCH for event metadata
- `src/app/api/event/qr/route.ts` — owner-only QR PNG generation
- `src/app/api/event/rotate-token/route.ts` — owner-only accessToken rotation (invalidates prior QR)
- `src/app/api/event/review/route.ts` — reviewer (board owner/editor) upserts `SubmissionReview`
- `src/app/api/event/lookup/route.ts` — self-search by name+number
- `src/app/api/event/my/route.ts` — cookie-based "내 제출 확인" path
- `src/lib/event/throttle.ts` — 1h/5 attempts via ipHash + cookie
- `src/lib/event/tokens.ts` — confirmation token + ipHash hashing
- `src/lib/event/cfstream.ts` — Cloudflare Stream Direct Upload signed URL helper
- `src/lib/event/schemas.ts` — zod schemas for all public endpoints
- `src/components/event/EventSignupBoard.tsx` — public page renderer (poster/schedule/form)
- `src/components/event/QrShareCard.tsx` — teacher QR copy card

## Security notes
- Public endpoints enforce zod validation
- `ipHash` stored (not raw IP) — privacy-sound
- Confirmation token stored as HttpOnly cookie; lookup by name+number provides recovery
- Schema migration is additive — no data loss

## Deferred
- Cloudflare Stream key: user must set `CLOUDFLARE_STREAM_API_TOKEN` env for video upload to work. Falls back to YouTube URL path.
- hCaptcha: graceful degrade when unset (throttling alone)
- Virtualized teacher review list: basic paginated list shipped, virtualization deferred if >100 submissions observed

REVIEW_OK.
