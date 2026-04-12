# Event-Signup — Phase 10 Deploy Log

Deferred to orchestrator. Merge to main → Vercel auto-deploy. Supabase migration via `prisma db push` on deploy.

No env vars required for baseline. Optional:
- `CLOUDFLARE_STREAM_API_TOKEN` — enables video upload path (ES-7)
- `HCAPTCHA_SECRET` — enables captcha challenge (ES-11 enhancement)
