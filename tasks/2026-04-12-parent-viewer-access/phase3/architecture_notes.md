# Phase 3 — Architecture Notes (Stack Inherited)

Stack locked at first feature task; this agent does not revise it.

## New modules

### Libraries (src/lib)
- **parent-codes.ts** — Crockford Base32 6-char generator + normalizer + verifier. No bcrypt; uses `crypto.createHash('sha256')` + `timingSafeEqual`. `generateCode(): {code, codeHash}`, `verifyCode(input, hash): boolean`, `normalizeCode(input): string`.
- **parent-magic-link.ts** — HMAC-signed token `{parentId, exp}` with `AUTH_SECRET`. `signToken(parentId): string`, `verifyToken(token): {parentId} | null`. 15-min TTL.
- **parent-session.ts** — `createParentSession(parentId, req)`, `getCurrentParent()`, `revokeParentSession(sessionId)`. Cookie name `parent_session`. 7-day TTL. Server-side ParentSession row with tokenHash (sha256).
- **parent-scope.ts** — `requireParentScope(req)` → returns Parent, or throws 401/403. `requireParentScopeForStudent(req, studentId)` → also verifies ParentChildLink active. Helper `requireParentTeacherInvite(req, studentId)` for the inverse (teacher issuing invite for student they own/edit).
- **parent-rate-limit.ts** — in-memory sliding window per IP + DB-backed per-code counter.

### API routes
- `POST /api/students/[id]/parent-invites` — teacher-only; creates ParentInviteCode; returns `{code, qrPngDataUrl, expiresAt, maxUses}`.
- `DELETE /api/parent-invites/[id]` — teacher-only; soft-revokes (sets revokedAt).
- `POST /api/parent/redeem-code` — public; rate-limited; validates code; creates/upserts Parent; creates ParentChildLink; dispatches magic link (dev: returns URL in response).
- `GET /parent/auth/callback?token=...` — page route handler; verifies magic-link HMAC; creates ParentSession; sets cookie; redirects `/parent/home`.
- `GET /api/parent/test/children` — dummy guarded by `requireParentScope` — lists parent.children (for middleware smoke-test).
- `GET /api/parent/test/cross-isolation?studentId=...` — dummy that enforces `requireParentScopeForStudent`; returns 403 or 404 for unlinked/other-parent students.

### Components
- `src/components/ParentInviteButton.tsx` — button + modal integrated into ClassroomDetail student row. Shows generated code + QR + countdown + uses counter + revoke button.

### Pages
- `src/app/parent/join/page.tsx` — simple form: code input + email → POST redeem.
- `src/app/parent/home/page.tsx` — placeholder that reads getCurrentParent and shows linked children list. (Full PWA shell in PV-6.)
- `src/app/parent/auth/callback/route.ts` — the magic-link callback (NOT a page — it's a GET route handler that sets cookie + redirects).

### RLS SQL scaffold
- `prisma/migrations/20260412_add_parent_viewer/rls.sql` — `ALTER TABLE "ParentChildLink" ENABLE ROW LEVEL SECURITY;` + policies. Documented as "not applied in this phase" in deploy_log.

## Data flow
```
Teacher UI (ClassroomDetail → ParentInviteButton)
  → POST /api/students/[id]/parent-invites
  → parent-codes.generateCode() → DB INSERT ParentInviteCode {code, codeHash, expiresAt=+48h, maxUses=3}
  → return {code, qrPngDataUrl, expiresAt}

Parent UI (/parent/join)
  → POST /api/parent/redeem-code {code, email}
  → rate-limit check (IP + per-code)
  → parent-codes.verifyCode → ParentInviteCode valid?
  → upsert Parent by email → create/find ParentChildLink
  → parent-magic-link.signToken → send email (dev: return in response)

Parent email click
  → GET /parent/auth/callback?token=...
  → parent-magic-link.verifyToken → parentId
  → parent-session.createParentSession → INSERT ParentSession {sessionToken, tokenHash, expiresAt=+7d}
  → Set-Cookie parent_session=token; HttpOnly; SameSite=Lax; Secure(prod)
  → 302 /parent/home

Subsequent /api/parent/* request
  → parent-scope.requireParentScope(req) reads cookie → finds ParentSession by tokenHash → validates expiry + revocation
  → if studentId in URL/body: requireParentScopeForStudent confirms ParentChildLink exists (deletedAt null) for this parent
```

## Decisions not in prompt — capturing here
- Use sha256 + `timingSafeEqual` rather than bcrypt for `codeHash`/`tokenHash`. Bcrypt adds runtime cost + dep; sha256 is sufficient since (a) tokens are 6-char codes with lockout + 48h TTL; (b) session tokens are 32-byte random with 7-day TTL; (c) sha256 of short secrets is fine under lockout conditions. Documented in security_audit.md.
- Use `failedAttempts` column (not in prompt's schema block but mentioned in the "10회 실패 즉시 revoke" requirement). Added.
- Dev magic-link fallback: when `PARENT_EMAIL_ENABLED !== 'true'`, redeem-code returns `devMagicLinkUrl` in the response body + logs it. Production deployment must set email backend first.
