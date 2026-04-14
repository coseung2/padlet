# API Contract — assignment-board

Companion to `architecture.md` and `data_model.md`. No implementation code — only interface specs.

Auth conventions:
- **TeacherReq**: NextAuth session + `classroom.teacherId === user.id` (or board.members owner).
- **StudentReq**: student-auth HMAC cookie → `getCurrentStudent()` returns Student row.
- **ParentReq**: parent-session cookie → `parentScopeForStudent(studentId)` middleware (existing).

Errors:
- Standard JSON shape `{ "error": "<snake_code>", "detail"?: "..." }`.
- HTTP status: 400 validation, 401 unauth, 403 forbidden, 404 not-found, 409 conflict, 429 rate, 500 internal.

---

## 1. `POST /api/boards` (EXTEND)

**Existing endpoint — add `layout:"assignment"` branch.** File: `src/app/api/boards/route.ts`.

### Request (new fields for assignment)
```ts
{
  title: string;                     // max 200
  layout: "assignment";
  description?: string;              // max 2000
  classroomId: string;               // REQUIRED for assignment
  assignmentGuideText?: string;      // max 5000
  assignmentAllowLate?: boolean;     // default true
  assignmentDeadline?: string;       // ISO8601; optional
}
```
### Response 200
```ts
{
  board: { id, slug, title, layout, classroomId, assignmentGuideText, assignmentAllowLate, assignmentDeadline },
  slots: number  // = N students
}
```
### Errors
- 400 `classroom_required` — classroomId missing
- 400 `classroom_too_large` `{ max: 30, actual: N }` — N > 30
- 400 `empty_classroom` — 0 students
- 400 `student_missing_number` `{ studentIds: string[] }` — any student.number null
- 403 `not_classroom_teacher` — classroom.teacherId != user.id

### Transaction (pseudocode)
```ts
db.$transaction(async (tx) => {
  const students = await tx.student.findMany({
    where: { classroomId }, orderBy: [{ number: "asc" }, { createdAt: "asc" }]
  });
  // guards …
  const board = await tx.board.create({ … });
  for (const [i, s] of students.entries()) {
    const col = (s.number - 1) % 5;
    const row = Math.floor((s.number - 1) / 5);
    const card = await tx.card.create({
      data: { boardId: board.id, authorId: user.id, studentAuthorId: s.id,
              externalAuthorName: s.name, title: "", content: "",
              x: col * CARD_W, y: row * CARD_H, width: CARD_W, height: CARD_H }
    });
    await tx.assignmentSlot.create({
      data: { boardId: board.id, studentId: s.id, slotNumber: s.number,
              cardId: card.id, submissionStatus: "assigned",
              gradingStatus: "not_graded" }
    });
  }
  return board;
});
```

---

## 2. `GET /api/boards/[id]/assignment-slots`

List slots for a board, scoped by role.

### Query params
- `?view=grid|matrix` (matrix requires teacher+desktop UA hint — soft)

### Auth branches
- **Teacher** (board owner or classroom teacher): returns ALL slots.
- **Student** (student-auth): returns 1 slot where `studentId = me`.
- **Parent** (parent-session + studentId scope): returns 1 slot where `studentId ∈ parent.children AND slot.studentId = ?studentId`.
- Anonymous / mismatched: 403.

### Response 200
```ts
{
  board: { id, slug, title, assignmentGuideText, assignmentAllowLate, assignmentDeadline },
  slots: Array<{
    id: string;
    slotNumber: number;
    studentId: string;
    studentName: string;     // denormalized from Student.name
    submissionStatus: "assigned"|"submitted"|"viewed"|"returned"|"reviewed"|"orphaned";
    gradingStatus: "not_graded"|"graded"|"released";
    grade?: string;
    viewedAt?: string;
    returnedAt?: string;
    returnReason?: string;
    card: {
      id: string;
      content: string;
      imageUrl?: string;
      thumbUrl?: string;     // 160x120 webp
      linkUrl?: string;
      fileUrl?: string;
      updatedAt: string;
    }
  }>
}
```

---

## 3. `PATCH /api/assignment-slots/[id]`

Teacher state transitions + grading.

### Auth: TeacherReq (board.classroomId.teacherId = user.id)

### Request
```ts
// discriminated by `transition`
| { transition: "open" }                                   // → viewed (idempotent)
| { transition: "return"; returnReason: string /* 1..200 */ }  // → returned
| { transition: "review" }                                  // → reviewed
| { transition: "grade"; grade: string /* ≤50 */; gradingStatus?: "graded"|"released" }
```

### Response 200
```ts
{ slot: SlotDTO }
```

### Guard matrix
| transition | valid from | invalid → |
|---|---|---|
| open | submitted, returned, reviewed | assigned, orphaned → 409 `invalid_transition` |
| return | submitted, viewed, reviewed | assigned, returned, orphaned → 409 |
| review | viewed, submitted | assigned, returned, orphaned → 409 |
| grade | any except orphaned | orphaned → 409 |

### Errors
- 400 `returnReason_required` — returnReason missing on transition=return
- 400 `returnReason_too_long` — >200 chars
- 403 `not_classroom_teacher`
- 409 `invalid_transition` `{ from, to }`
- 404 `slot_not_found`

### Side effects
- Updates AssignmentSlot (status, timestamps, returnReason, grade, gradingStatus).
- `publish({ channel: "board:${boardId}:assignment", type: "slot.updated", … })` — no-op v1.

---

## 4. `POST /api/assignment-slots/[id]/submission`

Student submit / re-submit.

### Auth: StudentReq, `slot.studentId === currentStudent.id`

### Request
```ts
{
  content?: string;    // max 5000
  linkUrl?: string;    // validated url
  fileUrl?: string;    // blob url
  imageUrl?: string;   // blob url (full-res; thumbUrl server-derived)
}
```

### Response 200
```ts
{ slot: SlotDTO, submission: { id, status, updatedAt } }
```

### Behavior
- Guard: `canStudentSubmit(slot, board)` — see state machine (architecture.md §1.4).
- Update `Card(slot.cardId)` with content/linkUrl/fileUrl/imageUrl. If imageUrl new → enqueue thumb generation (sync for v1 via `src/lib/blob.ts` sharp pipeline).
- Upsert `Submission` by `assignmentSlotId`:
  - Create if none: `{ boardId, userId:null, assignmentSlotId, content, status:"submitted" }`.
  - Update if exists: set status=submitted, updatedAt=now.
  - **Note**: Submission.userId is intentionally null for student submissions (NextAuth User ≠ Student identity). Use `assignmentSlotId` for student resolution.
- Update slot:
  - `assigned → submitted`, `returned → submitted` (also reset `gradingStatus` if was returned).
- `publish()` no-op.

### Errors
- 401 `student_auth_required`
- 403 `slot_not_mine`
- 403 `submission_locked` — gradingStatus ∈ {graded, released} OR (deadline passed AND !allowLate)
- 409 `orphaned_slot`

---

## 5. `POST /api/boards/[id]/reminder`

Bulk in-app reminder for unsubmitted students.

### Auth: TeacherReq

### Request
```ts
{
  studentIds?: string[];   // optional subset; default = all slots with status=assigned
  message?: string;        // max 200 chars; default "과제를 제출해 주세요"
}
```

### Response 200
```ts
{ remindedCount: number, cooldownSeconds: number }
```

### Behavior
- Rate limit: 5 min / board (existing `rate-limit.ts`). 429 on exceeded.
- Writes in-app badge rows (reusing existing badge/notification system — interface TBD in phase4 if unclear). No email outbound.

### Errors
- 429 `reminder_cooldown` `{ retryAfter: number }`
- 403 `not_classroom_teacher`

---

## 6. `POST /api/boards/[id]/roster-sync`

Add new students to existing assignment board (manual trigger, decisions §Q6).

### Auth: TeacherReq

### Request: `{}` (no body)

### Response 200
```ts
{ addedSlots: Array<{ id, slotNumber, studentId, studentName }>, skipped: number }
```

### Behavior
- Load classroom students where NOT already in AssignmentSlot(boardId,studentId).
- For each new student:
  - `slotNumber = max(existing slotNumber) + 1`.
  - Transaction: create Card + AssignmentSlot (same as §1 per-student loop).
- If new slot count would bring total > 30: 400 `would_exceed_max`.

### Errors
- 400 `would_exceed_max`
- 403 `not_classroom_teacher`

---

## 7. `GET /api/parent/children/[id]/assignments` (REFINE existing)

File: `src/app/api/parent/children/[id]/assignments/route.ts`. Currently uses fuzzy `applicantName + applicantNumber` match (line 43-51).

### Change
- If `AssignmentSlot` rows exist for the classroom: **prefer** direct join `slot.studentId === child.id`. Fallback to existing heuristic for legacy submissions.

### Response 200 (additive)
```ts
{
  submissions: Array<{
    ... existing fields ...,
    assignmentSlotId?: string;   // NEW — null for legacy rows
    returnReason?: string;       // NEW — from AssignmentSlot (takes precedence over Submission.feedback for display)
    submissionStatus?: string;   // NEW — AssignmentSlot.submissionStatus (preferred over Submission.status for assignment boards)
  }>
}
```

---

## 8. Realtime channel contract

- Channel helper (new): `src/lib/realtime.ts`
  ```ts
  export function assignmentChannelKey(boardId: string): string {
    if (!boardId) throw new Error("assignmentChannelKey: boardId required");
    return `board:${boardId}:assignment`;
  }
  ```
- Message types (declarative, transport-agnostic):
  ```ts
  export type AssignmentRealtimeEvent =
    | { type: "slot.updated"; slotId: string; submissionStatus: string; gradingStatus: string; updatedAt: string }
    | { type: "slot.returned"; slotId: string; returnReason: string; returnedAt: string }
    | { type: "reminder.issued"; boardId: string; studentIds: string[]; issuedAt: string };
  ```
- Publish semantics: **v1 no-op**. API routes call `publish()` declaratively — engine swap is 1-point.
- Subscribe semantics (v1): clients do NOT subscribe. UX relies on `router.refresh()` post-mutation + local optimistic state.

---

## 9. Validation (zod) summary

`src/lib/assignment-schemas.ts` (phase7 creates):
- `CreateAssignmentBoardSchema` — overrides CreateBoardSchema when layout=assignment.
- `SlotTransitionSchema` — discriminated union.
- `StudentSubmitSchema` — content/linkUrl/fileUrl/imageUrl optionals.
- `ReminderSchema` — studentIds optional + message ≤200.

---

## 10. Rate limits

| endpoint | limit | store |
|---|---|---|
| POST /api/boards (layout=assignment) | 10 / min / teacher | existing `rate-limit.ts` |
| POST /api/assignment-slots/[id]/submission | 20 / min / student | existing |
| POST /api/boards/[id]/reminder | 1 / 5min / board | existing |
| PATCH /api/assignment-slots/[id] | 60 / min / teacher | existing |

---

## 11. Observability
- Log `[AssignmentSlot] transition` events with `{ slotId, from, to, actor, actorId }`.
- Counter: `assignment_slot_transitions_total{transition=...}` (if metrics pipeline exists).
- Error counter: `assignment_slot_transition_errors_total{code=...}`.

---

## 12. Security tests (phase9 QA must verify)
- Student A logged in, GET `/api/boards/[id]/assignment-slots` → only slot where studentId=A. (AC-10)
- Student A POST `/api/assignment-slots/[B-slot-id]/submission` → 403.
- Parent P fetches GET `/api/parent/children/[unlinked-student]/assignments` → 403.
- Teacher GET `/board/[id]?view=matrix` from <1024px viewport → 403 or redirect to grid.
- returnReason with 201 chars → 400.
- returnReason empty on transition=return → 400.
