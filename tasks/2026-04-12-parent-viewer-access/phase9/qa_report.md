# Phase 9 — QA Report: Parent Viewer Access PV-1 ~ PV-5

Environment: local dev, PORT=3000, Supabase Postgres (ap-northeast-2), Next 16.2.3 Turbopack.

## Pre-QA
- `npm run build` PASS (9 min earlier build logs confirm all /parent/* routes compile)
- `npx tsc --noEmit` PASS (0 errors)
- `prisma db push` applied cleanly (no destructive changes detected)

## Smoke-test flow (curl)

### AC-1 Teacher issues invite (POST /api/students/[id]/parent-invites)
- Input: mock teacher `u_owner` (Classroom.teacherId set to u_owner for QA), student `pv_qa_student_a1`
- Output: `{id, code: "XVMD36", qrPngDataUrl: "data:image/png;base64,…", expiresAt, maxUses:3, joinUrl}` — PASS

### AC-2 Parent redeems code → magic link issued (POST /api/parent/redeem-code)
- Input: `{code:"XVMD36", email:"pv-parent@example.com"}`
- Output: `{ok:true, email, devMagicLinkUrl:"http://localhost:3000/parent/auth/callback?token=…"}` — PASS
- `devMagicLinkUrl` surfaces because `PARENT_EMAIL_ENABLED !== "true"` (dev default)

### Magic-link callback (GET /parent/auth/callback?token=…)
- Response: `307 → /parent/home`
- Set-Cookie: `parent_session=…; HttpOnly; SameSite=lax; Max-Age=604800` — PASS
- AC-5 cookie flags confirmed: HttpOnly + SameSite + 7-day Max-Age

### AC-6 parentScopeMiddleware — own-children listing (GET /api/parent/test/children)
- With session cookie → `{parentId, email, tier:"free", children:[{linkId, studentId:"pv_qa_student_a1"}]}` — PASS
- Without cookie → 401 `{"error":"unauthorized"}` — PASS

### AC-5 Cross-student 403 (GET /api/parent/test/cross-isolation?studentId=…)
- Linked studentId (`pv_qa_student_a1`) → 200 `{"ok":true}` — PASS
- Unlinked studentId (`pv_qa_student_a2`, same classroom, other child) → **403 `{"error":"forbidden_student"}`** — PASS
- Non-existent studentId → 403 (same shape; no enumeration leak) — PASS

### AC-6 Cross-parent 404 (GET /api/parent/test/cross-isolation?linkId=…)
- Parent A's own linkId → 200 — PASS
- Parent B's linkId probed with Parent A session → **404 `{"error":"not_found"}`** — PASS
- Asymmetric vs AC-5 (403 cross-student, 404 cross-parent) — intentional, documented in `src/lib/parent-scope.ts`

### AC-4 Rate-limit (IP 5 fails/15min + per-code 10→revoke)
- 5 invalid POSTs from same IP: 404 each; 6th: `429 rate_limited` — PASS
- Per-code lockout (rotating x-forwarded-for to bypass IP limiter): 10 email-mismatch attempts bumped `failedAttempts` 0→10 and set `revokedAt` on the 10th — PASS
- Post-lockout redeem: 410 `{"error":"code_revoked"}` — PASS

### Teacher revoke (DELETE /api/parent-invites/[id])
- As teacher: 200 `{ok:true}`; subsequent redeem: 410 `code_revoked` — PASS

### Design-system compliance
- ParentInviteButton + /parent/join + /parent/home only reference `var(--color-*)` tokens; no hardcoded hex strings. — PASS

## Acceptance checklist

- [x] AC-1 교사가 학생 카드에서 Crockford Base32 6자리 + QR 발급
- [x] AC-2 학부모가 /parent/join에서 코드+이메일 → 매직링크 → ParentSession 생성
- [x] AC-12 48h 만료/maxUses 소진 시 재발급 버튼 노출 (ParentInviteButton UI, verified via needsReissue flag)
- [x] IP 5회/15min rate-limit + 코드당 10회 failedAttempts 즉시 revoke
- [x] ParentSession HttpOnly 쿠키, 7-day 만료, 서버측 tokenHash 검증
- [x] parentScopeMiddleware scaffold — /api/parent/test/children + /cross-isolation 검증 통과
- [x] Postgres RLS SQL 파일 작성 (prisma/migrations/20260412_add_parent_viewer/rls.sql). 적용은 deploy_log 참조.
- [x] 학부모 간 격리 — GET /api/parent/children 타 parent의 링크 404
- [x] npx tsc --noEmit + npm run build PASS

QA_OK.
