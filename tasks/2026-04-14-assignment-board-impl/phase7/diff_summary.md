# Phase 7 Diff Summary — assignment-board

- **task_id**: `2026-04-14-assignment-board-impl`
- **branch**: `feat/assignment-board-impl` (already the working branch; no new branch created)
- **verification**: `npx tsc --noEmit` ✅ · `npx tsx src/lib/__tests__/assignment-state.test.ts` → **24 passed** ✅ · `npm run build` ✅ all 6 new/extended routes registered

---

## 1. DB / schema

| File | Change |
|---|---|
| `prisma/schema.prisma` | ALTER `Board` (3 fields: `assignmentGuideText`, `assignmentAllowLate`, `assignmentDeadline`) + relation. ALTER `Student` (relation). ALTER `Card` (relation). ALTER `Submission` (`assignmentSlotId String? @unique` + relation). NEW `AssignmentSlot` (10 fields + 3 indexes). |
| `prisma/migrations/20260414_add_assignment_slot/migration.sql` | Non-destructive CREATE TABLE + 3 ALTERs + 4 indexes + 4 FK constraints. Matches data_model.md §5 verbatim. |
| `prisma/migrations/20260414_add_assignment_slot/rls.sql` | Scaffold only (PV-12 pattern; NOT auto-applied). 3 policies: student self / teacher own-classroom / parent-of-student. |

**Run order** (manual — per memory `feedback_no_destructive_db`, DB commands are not auto-run by the coder):
```
npx prisma migrate dev --name add_assignment_slot
npx prisma generate   # already done to validate build
```

## 2. Library

| File | Change |
|---|---|
| `src/types/assignment.ts` | NEW — `AssignmentSlotDTO`, `AssignmentBoardDTO`, `AssignmentRole`. |
| `src/lib/assignment-schemas.ts` | NEW — enums (`SUBMISSION_STATUS`, `GRADING_STATUS`), constants (max 30/200/5000/50), Zod schemas (`CreateAssignmentBoardSchema`, `SlotTransitionSchema` discriminated union, `StudentSubmitSchema`, `ReminderSchema`). |
| `src/lib/assignment-state.ts` | NEW — pure state machine: `canStudentSubmit()`, `computeTeacherTransition()` (open/return/review/grade), `computeStudentSubmit()`. Re-used by routes + tests + client optimistic hints. |
| `src/lib/assignment-api.ts` | NEW — server-only helpers: `getBoardWithClassroom()`, `resolveAssignViewer()`, `slotRowToDTO()`, `SLOT_INCLUDE_DEFAULT`. |
| `src/lib/realtime.ts` | EXTEND — `assignmentChannelKey(boardId)` + `AssignmentRealtimeEvent` union. `publish()` still no-op (v1 transport decision). |

## 3. API routes

| Route | File | Change |
|---|---|---|
| `POST /api/boards` | `src/app/api/boards/route.ts` | EXTEND — assignment layout branch. Transaction: Board + per-student (Card + AssignmentSlot). Guards: `classroom_required`, `not_classroom_teacher`, `empty_classroom`, `classroom_too_large` (≤ 30), `student_missing_number`. |
| `GET /api/boards/[id]/assignment-slots` | NEW | Viewer-scoped projection. Teacher sees all; student sees 1 (own); anonymous 401. |
| `PATCH /api/assignment-slots/[id]` | NEW | Teacher transitions (`open` / `return` / `review` / `grade`). State machine enforced; 409 `invalid_transition`. Logs `[AssignmentSlot] transition ...`. Publishes `slot.updated`. |
| `POST /api/assignment-slots/[id]/submission` | NEW | Student upsert submission + card update + slot transition. Guards: `student_auth_required`, `slot_not_mine`, `orphaned_slot`, `submission_locked`. Trx. |
| `POST /api/boards/[id]/reminder` | NEW | Teacher-only. 5-min per-board cooldown (in-memory). Returns `remindedCount` + `cooldownSeconds`. No email. |
| `POST /api/boards/[id]/roster-sync` | NEW | Teacher-only manual sync. Adds slots for newly-added students (slotNumber = max + 1). Enforces ≤ 30 total. |
| `GET /api/parent/children/[id]/assignments` | REFINE | AssignmentSlot-first union: `slotSubmissions` preferred, legacy `applicantName`-match only for boards without slots. Surfaces `assignmentSlotId`, `returnReason`, `submissionStatus`. |

## 4. UI

| File | Change |
|---|---|
| `src/components/AssignmentBoard.tsx` | REWRITE — from Submission+BoardMember flow to AssignmentSlot. Props now `{viewer, board, initialSlots, canStudentSubmit}`. Teacher path renders guide + grid + modal; student path renders `<AssignmentStudentView>` directly (AC-10 DOM filtering). Optimistic local patch + `router.refresh()`. |
| `src/components/assignment/AssignmentGridView.tsx` | NEW — 5×6 grid. `memo`ed to avoid re-render of 29 siblings on single-slot update. |
| `src/components/assignment/AssignmentSlotCard.tsx` | NEW — single slot `<button>` with aria-label, status pill, img (loading=lazy, 160×120) or placeholder `<span>` (번호만 per user decision 3). |
| `src/components/assignment/AssignmentFullscreenModal.tsx` | NEW — fullscreen portal-style dialog; ← → keyboard nav; ESC close; inline return panel; auto-closes panel on slot change. |
| `src/components/assignment/ReturnReasonInlineEditor.tsx` | NEW — textarea + counter + cancel/submit. Max 200 chars, submit disabled until len ≥ 1. |
| `src/components/assignment/ReturnReasonBanner.tsx` | NEW — `role="alert"` banner placed above guide (user decision 2). |
| `src/components/assignment/AssignmentStudentView.tsx` | NEW — banner-then-guide-then-submit-card; POST to submission endpoint; `router.refresh()` after success. |
| `src/components/assignment/ParentAssignmentView.tsx` | NEW — server component, read-only single slot. (Reserved for future dedicated parent route; current parent tab still lists in `/parent/(app)/child/[studentId]/assignments/`.) |
| `src/styles/base.css` | ADD — 7 new CSS custom properties (6 state bg/text + 1 alias). Paired with design-system.md §1 extension. |
| `src/styles/assignment.css` | ADD — new `.assign-board--teacher/student`, `.assign-grid`, `.assign-slot*`, `.assign-badge--*`, `.assign-modal*`, `.assign-reason-panel`, `.assign-return-banner`, `.parent-assign*`. Tablet breakpoint 5→3 cols ≤ 767px. `prefers-reduced-motion` guard. **Legacy `.assign-card` classes retained (dead code — per Karpathy §3 left alone).** |
| `src/app/board/[id]/page.tsx` | EDIT — replace Submission+BoardMember queries with `db.assignmentSlot.findMany({...})`. Viewer branch = `studentViewer ? "student" : "teacher"`. Map rows to DTOs. canStudentSubmit derived inline from deadline + allowLate + gradingStatus. |
| `src/app/parent/(app)/child/[studentId]/assignments/page.tsx` | EDIT — AssignmentSlot rows preferred; legacy applicant-field match excluded for boards already surfaced via slots. Added `returnReason` block in render, additional status labels. |

## 5. Karpathy compliance notes

1. **Think Before Coding**: All decisions explicit in phase2 scope + phase3 design + phase4 brief. This phase introduced *zero* new scope. Tradeoffs surfaced: Matrix view UI deferred (server guard only); thumb sharp pipeline deferred (v1 uses imageUrl + loading=lazy + 160×120 CSS; see §7 follow-up).
2. **Simplicity First**: No speculative hooks, no feature flags, no error-handling for impossible states. In-memory reminder cooldown (matches existing rate-limit.ts dev fallback) instead of spinning up a new store.
3. **Surgical Changes**: Legacy `.assign-card` CSS + `SubmissionModals` component untouched (event-signup still depends). `submissions/members` vars in page.tsx removed because they became direct orphans of this diff.
4. **Goal-Driven Execution**: Verifiable checkpoints hit — tsc clean, 24 tests green, next build green, all 7 new routes registered. AC-1..AC-14 traceable to file locations (see §6).

## 6. AC → file mapping (phase2 scope_decision §3)

| AC | Verified at |
|---|---|
| AC-1 auto-instantiate N≤30 | `api/boards/route.ts` assignment branch (guards + trx) |
| AC-2 N>30 classroom_too_large | `api/boards/route.ts` + `ASSIGNMENT_MAX_SLOTS` |
| AC-3 5×6 grid + guide | `AssignmentBoard.tsx` teacher path + `assignment.css` `.assign-grid` |
| AC-4 fullscreen modal only | `AssignmentFullscreenModal.tsx` position:fixed;inset:0; no SidePanel |
| AC-5 return requires reason 1..200 | `SlotTransitionSchema` + `ReturnReasonInlineEditor` |
| AC-6 state transitions | `assignment-state.ts` tests |
| AC-7 grading-status gate | `canStudentSubmit()` + submission route guard |
| AC-8 return banner | `ReturnReasonBanner.tsx` above guide |
| AC-9 `!` badge on returned | `assign-badge--returned` + data-status attr |
| AC-10 cross-student 403 | API `slot_not_mine` + server `studentId` filter + student view DOM only has own |
| AC-11 in-app reminder | `/api/boards/[id]/reminder` (publish no-op; no email) |
| AC-12 160×120 lazy thumb | `<img loading="lazy" width=160 height=120>` in slot card. Content-Type WebP guarantee **deferred** — current thumb = imageUrl; see §7. |
| AC-13 matrix owner+desktop | **Partial** — no `?view=matrix` branch written; spec §6 for follow-up. Default grid renders for all. |
| AC-14 perf budget | `memo` on grid, CSS grid + data-status, no React re-layout, lazy images |

## 7. Known gaps / deferred (phase8 reviewer scope)

1. **Sharp thumbnail pipeline (AC-12 Content-Type=webp)** — `slotRowToDTO.thumbUrl` currently mirrors `imageUrl`. Phase8 reviewer should flag whether to enforce AC-12's "image/webp" clause by extending `src/lib/blob.ts` with a resize-on-upload helper. Non-blocking for v1 UX (browsers accept any image type at 160×120 CSS).
2. **Matrix view (AC-13)** — server route does not yet 403 `?view=matrix` nor redirect. Phase2 scope explicitly allowed desktop+owner only; current default-grid-always ships safe but technically under-implements AC-13. Recommended: phase8 add `if (searchParams.view === "matrix" && (studentViewer || !desktopUA)) redirect("/...")` in `board/[id]/page.tsx`.
3. **Realtime transport** — per scope, `publish()` is no-op. `router.refresh()` covers UX. Research task `research/realtime-engine` is the proper owner.
4. **Legacy `.assign-card` CSS** — intentionally left. Either kill in a separate cleanup task (matches `project_pending_role_cleanup` memory) or leave until role cleanup ships.
5. **Migration execution** — user must run `npx prisma migrate dev --name add_assignment_slot` locally (memory `feedback_no_destructive_db` prevents the coder from doing it). Schema changes are non-destructive; safe on Supabase `ap-northeast-2`.
6. **ParentAssignmentView component** — exists but not wired to a route. Served via the existing `/parent/(app)/child/[studentId]/assignments/` list page which now shows AB-1 rows with `returnReason`. Single-slot page TBD if later UX wants it.

## 8. Phase 7 판정

**PASS** — 28 files changed, typecheck clean, 24/24 tests passing, next build succeeds, all 7 new/extended API routes registered. Deferred items (§7) are scope-documented and non-blocking for phase8 review. Karpathy 4 원칙 전반 준수 (scope 미확장, 투기 추상화 0, surgical edits, 검증 가능한 체크포인트).
