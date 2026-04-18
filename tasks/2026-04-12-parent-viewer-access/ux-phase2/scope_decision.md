# Phase 2 — Scope Decision

## In-scope (PV-6 ~ PV-12)

### PV-6 PWA shell
- `/parent/layout.tsx` — viewport meta, manifest link, session guard wrapper hint
- `public/parent-manifest.json` — name, icons (reuse `/favicon.svg` as fallback), standalone, theme
- `/parent/home` — real child-card list w/ last-activity badges
- Bottom nav component (자녀 선택 / 알림 / 계정)

### PV-7 Child-scope feature views (5 domains)
- `/parent/child/[studentId]/plant` + API
- `/parent/child/[studentId]/drawing` + API (StudentAsset where studentId)
- `/parent/child/[studentId]/assignments` + API — **Limitation**: Submission has no studentId; filter by `applicantName + applicantGrade + applicantClass + applicantNumber` match against Student row. Document in code.
- `/parent/child/[studentId]/events` + API — EventSignup via Board.accessMode=="public-link" Submissions, applicant* match
- `/parent/child/[studentId]/breakout` + API — BreakoutMembership filter; section-scoped card return

### PV-8 Teacher management tab
- UI additive to classroom view (new tab, minimal integration: standalone `<ParentManagementTab>` component + API driven, can be plugged into classroom)
- `DELETE /api/parent/links/[id]` — soft delete + revoke all parent's sessions

### PV-9 Revoke SLA
- Parent client fetch wrapper that auto-clears + redirects on 401
- `/parent/logged-out` page
- Server already returns null on `sessionRevokedAt` in `getCurrentParent`

### PV-10 Weekly email
- `/api/cron/parent-weekly-digest/route.ts` — gated by `PARENT_EMAIL_ENABLED`, Pro-only, skip-if-zero
- `vercel.json` crons entry (09:00 KST = 00:00 UTC Mon)
- Email sending: stubbed (console.log + optional log row) — real provider deferred

### PV-11 Self-withdraw + anonymize cron
- `/parent/account/withdraw` page
- `POST /api/parent/account/withdraw` — sets parentDeletedAt, revokes sessions, soft-deletes links
- `/api/cron/parent-anonymize/route.ts` — daily

### PV-12 E2E script
- `scripts/test-parent-isolation.ts` — runnable tsx, hits live /api endpoints, asserts AC-5/6/7

## Acceptance Criteria (12 items)

1. AC-3: 5 domain pages load child data without leaking siblings
2. AC-4: every `/api/parent/*` route calls `requireParentScope*` before DB read (grep-verified)
3. AC-5: parent A token + student B studentId path → 403
4. AC-6: parent A token + parent B link id path → 404
5. AC-7: teacher revoke → next poll (within 60s) returns 401 and client redirects
6. AC-8: 401 handler redirects to `/parent/logged-out`
7. AC-9: Weekly cron runs Monday 09 KST, Pro only, skips 0-activity
8. AC-10: Withdraw → parentDeletedAt set, sessions revoked, links soft-deleted; 90d cron anonymizes PII (SHA-256)
9. AC-11: PWA manifest served; `/parent/*` viewport has `maximum-scale=1`
10. AC-13: Event API excludes other students' applicant records
11. AC-14: Breakout API enforces `session.studentId ∈ parent.children`
12. Build + typecheck PASS; E2E script PASS AC-5/6/7

## Risks

- **Submission↔Student mapping gap**: no FK, must use applicant* fields. Mitigation: match on `classroomId` (via Board.classroomId) + applicantName + applicantNumber; document false-positive risk (homonyms) as known limitation.
- **Cron platform**: Vercel Cron via `vercel.json`. If not on Vercel, route is manually triggerable.
- **Email provider**: no Resend/SES integration; digest logs payload to console + optional DB row. Real send is TODO.
- **Teacher pool in Breakout**: schema has no explicit teacher-pool flag. Parent view returns only memberships where the child is a member — matches spec (teacher-pool excluded organically since teachers aren't in BreakoutMembership).
- **PWA service-worker**: optional per scope; ship manifest + viewport only for MVP to stay in perf budget.

## Out-of-scope
- Real email provider integration (log-only stub)
- Service worker offline cache (manifest registration only)
- Full classroom management UI rewrite (standalone tab component)
