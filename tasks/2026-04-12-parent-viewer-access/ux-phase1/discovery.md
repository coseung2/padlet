# Phase 1 — Discovery

## Existing infrastructure (inherited from PV-1~5, merged in main)

### Libraries (src/lib/)
- `parent-codes.ts` — Crockford Base32 6-char codes, codeHash verification
- `parent-magic-link.ts` — HMAC-SHA256 signed tokens, 15min TTL
- `parent-rate-limit.ts` — IP 5/15min + code 10 failures → auto-revoke
- `parent-session.ts` — HttpOnly cookie `parent_session`, tokenHash lookup, 7d TTL, `getCurrentParent()`, `clearParentSession()`
- `parent-scope.ts` — `requireParentScope` (401), `requireParentScopeForStudent` (403), `requireParentChildLinkOwned` (404), `withParentScope` + `withParentScopeForStudent` route-handler wrappers

### Routes
- `/parent/join` — pair-code entry
- `/parent/auth/callback` — magic-link verify → cookie set
- `/parent/home` — stub child listing (to be replaced in PV-6)
- `/api/parent-invites/[id]` — teacher invite management
- `/api/redeem-code` — parent pair redemption

### Prisma models (no changes allowed)
- `Parent { id, email, name, tier ("free"|"pro"), parentDeletedAt, anonymizedAt }`
- `ParentChildLink { id, parentId, studentId, deletedAt }`
- `ParentInviteCode { code, codeHash, maxUses, usesCount, failedAttempts, expiresAt, revokedAt }`
- `ParentSession { sessionToken, tokenHash, expiresAt, sessionRevokedAt, lastSeenAt }`

### Feature data models
- `StudentPlant` + `PlantObservation` + `PlantObservationImage` (plant journal, PJ-8 parent view ready)
- `StudentAsset { studentId, classroomId, isSharedToClass }` (drawing library)
- `Submission { boardId, userId, status, applicant*, teamName, teamMembers JSON }` — includes both assignment submissions (userId-scoped) and event signups (submitToken self-auth)
- `BreakoutMembership { assignmentId, sectionId, studentId, role }` — Jigsaw teacher-pool excluded by absence of studentId? No — `role?: "expert"|"home"|null`; need to check presence of teacher pool marker
- `Board { accessMode, classroomId, ... }` — event board meta allowed for parent view

### Reusable UI
- `src/components/plant/RoadmapView.tsx` — accepts `canEdit=false` for read-only
- `src/components/ui/OptimizedImage.tsx` — responsive image w/ blur
- `src/components/ui/SidePanel.tsx` — side panel pattern

## Gaps / work for PV-6~12

1. PWA shell (`layout.tsx` + `manifest.json` + viewport meta)
2. Bottom mobile nav
3. 5 child-scope pages + 5 API routes under `/api/parent/children/[id]/*`
4. Teacher "학부모" management tab + revoke API
5. Client 401 handler → redirect to `/parent/logged-out`
6. Weekly digest Cron (Pro-only)
7. Self-withdraw + 90-day anonymization Cron
8. E2E isolation test script (AC-5/6/7)

## Risks

- Submissions table mixes assignment (userId) and event-signup (submitToken). Parent filter must match `userId → student.user?` or applicant* fields. Students table has no `userId` FK — check Student/User relation.
- BreakoutMembership has no teacher-pool flag — teacher-pool may be sectionId-based or not modelled. Need to check assignment logic.
- No cron platform configured — need vercel.json cron or manual trigger + documented stub.
- AUTH_SECRET for magic link must exist; `PARENT_EMAIL_ENABLED` env flag for weekly digest.
