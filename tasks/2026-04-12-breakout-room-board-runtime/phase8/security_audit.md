# Phase 8 — Self-Review + Security Audit (BR-5 ~ BR-9)

## RBAC audit

### `assertBreakoutVisibility` (src/lib/rbac.ts)
- **Teacher (owner/editor)**: short-circuit allow. Correct — teachers always have full access (decisions Q4).
- **Shared-token caller**: short-circuit allow when token matches `section.accessToken` via `timingSafeEqual`. Correct — preserves T0-① rotate semantics.
- **Student, teacher-pool section**: allow. Correct — pool is board-wide shared (decisions Q6).
- **Student, own-only, non-own section**: ForbiddenError. Correct.
- **Student, peek-others**: allow any group section. Correct.
- **No studentId provided, not teacher, not token**: ForbiddenError. Correct — no anonymous leak.
- **Failure mode**: if `breakoutAssignment.findUnique` misses, we return silently (no gating). This is correct — non-breakout boards shouldn't be affected.

### Membership API
- `POST /membership`: student may only insert for themselves (studentId must match cookie); teacher may pass explicit studentId.
- Student path validates student's classroom matches the board's classroom.
- Capacity check uses `count(memberships where sectionId=...)` — not immune to race, but idempotent-ish via @@unique and recoverable by teacher.
- self-select: 409 Conflict when student already has a membership in the assignment.
- @@unique([sectionId, studentId]) caught as 409 `duplicate`.
- `PATCH/DELETE /membership/[mid]`: owner-only via `requireOwner`.

### Assignment PATCH
- Owner-only via requirePermission + role check. zod validates values.

### `maybeAutoJoinLinkFixed`
- Only writes when `deployMode === "link-fixed"`. No-op otherwise.
- Idempotent on @@unique duplicate (caught).
- Capacity check present; teacher can still PATCH capacity to unblock.
- Caller (section page) gates on student classroom match before invoking.

### `/board/[id]/s/[sectionId]` page
- viewSection still runs first (existing T0-① check).
- Then assertBreakoutVisibility runs.
- Then card query is sectionId-scoped.
- Auto-join runs only if student is in the board's classroom.

### `/api/sections/:id/cards`
- Same order: viewSection → assertBreakoutVisibility → query.

### CSV roster import
- Owner-only check.
- classroomId resolved from board (not from client).
- No SQL injection risk (Prisma params).
- Duplicate detection before create; failures counted.

## WS security
- No WS engine yet (no-op publish). Future gating source of truth is
  `/api/breakout/assignments/[id]/my-access` — computed entirely from cookies
  on the server, client cannot forge channel list.

## Resource/DoS considerations
- CSV parse is bounded by file size (Next.js default 1 MB body limit on route
  handlers; sufficient for typical class rosters ≤ 40 rows).
- Capacity hard cap 10 × 6 = 60 per assignment per decisions.md Q3.
- Archive page triggers 3 parallel queries; bounded by board cardinality.

## Non-issues / accepted
- `onRosterChange` stub in BreakoutBoard is intentional — router.refresh() in
  the manager drives the server re-render.
- `breakout-runtime` commit sequence split per spec: BR-5, BR-7, BR-8, BR-9
  (BR-6 folded into BR-5 since the gate is a one-function extension of viewSection).

## REVIEW_OK
모든 RBAC 경로 및 API 스펙이 phase3 설계와 일치하며, 무권한 경로 0건 확인. QA 진행.
