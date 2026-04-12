# Cross-Model Review — client-render-perf (Codex / GPT-5-class)

> Captured verbatim from the Codex cross-model review run. The original
> Codex process could not write to this worktree from its sandbox, so the
> orchestrator persisted the review body here.

## Inputs consumed
- `tasks/2026-04-12-client-render-perf/phase1/diagnosis.md`
- `tasks/2026-04-12-client-render-perf/phase2/hotfix_design.md`
- Commit `1f088ad` (`fix: load xlsx dynamically in AddStudentsModal`)
- Commit `eb8a586` (`fix: memoize ColumnsBoard card grouping + CSS-driven drag state`)
- Commit `1b4e104` (`fix: memoize CardAttachments with React.memo`)
- Commit `763ad02` (`fix: optimistic update for bulk student add instead of router.refresh`)
- Commit `a40c15d` (`fix: replace max-height keyframe with transform for attach section`)
- `src/components/AddStudentsModal.tsx`
- `src/components/ClassroomDetail.tsx`
- `src/components/ColumnsBoard.tsx`
- `src/components/CardAttachments.tsx`
- `src/components/DraggableCard.tsx`
- `src/components/GridBoard.tsx`
- `src/components/StreamBoard.tsx`
- `src/styles/modal.css`
- `src/styles/boards.css`
- `src/app/api/classroom/[id]/students/route.ts`
- `src/app/api/classroom/[id]/students/batch-delete/route.ts`
- `src/app/api/classroom/[id]/students/[studentId]/route.ts`
- `src/app/api/classroom/[id]/students/[studentId]/reissue/route.ts`
- `prisma/schema.prisma`
- `package.json`

## Independent findings
### Blocker
No findings.

### Major
No findings.

### Minor
- `src/components/AddStudentsModal.tsx:76-93` The new lazy `xlsx` path has no guarded failure path, so a chunk-load/import failure rejects the handler and leaves file upload with no user-facing error.
  Evidence:
  ```ts
  setFileName(file.name);
  // xlsx is ~400 KB minified. Keep it out of the initial bundle and only
  // pay the download cost when the teacher actually picks a spreadsheet.
  const XLSX = await import("xlsx");
  const reader = new FileReader();
  ```
  Recommended fix: Wrap the `await import("xlsx")` and subsequent reader setup in `try/catch`, clear any stale parsed state on failure, and surface a deterministic error. If you want the UX to match submit state, add a dedicated file-loading flag instead of relying only on `busy`.

### Nit
- `src/components/AddStudentsModal.tsx:109-111` The optimistic add path introduces an unchecked JSON cast, so the client loses static/runtime verification of the `201 { students }` payload before calling `onAdded`.
  Evidence:
  ```ts
  if (res.ok) {
    const body = (await res.json()) as { students: CreatedStudent[] };
    onAdded(body.students);
  }
  ```
  Recommended fix: Parse the success body with a local schema or a narrow runtime guard before invoking `onAdded`, so malformed payloads fail predictably instead of relying on `as`.

### Review focus coverage
- Rules of Hooks: No issues found. In the touched client components, hooks stay at top level; the only early return I verified is `AddStudentsModal` after its hooks (`src/components/AddStudentsModal.tsx:61-69`).
- React.memo shallow-equality safety on `CardAttachments`: No issues found. The memoized component accepts only primitive/null props (`src/components/CardAttachments.tsx:12-24`), and all reviewed call sites pass only primitive/null card fields (`src/components/DraggableCard.tsx:64-64,96-96`, `src/components/GridBoard.tsx:82-90`, `src/components/StreamBoard.tsx:82-96`, `src/components/ColumnsBoard.tsx:413-413`).
- Type safety: See Nit finding above for the introduced unchecked `res.json()` cast in `AddStudentsModal`.
- Security on optimistic student add merge path: No issues found. The client merges only server-returned rows (`src/components/ClassroomDetail.tsx:49-71`), the route enforces teacher ownership and Zod validation (`src/app/api/classroom/[id]/students/route.ts:18-27`), and duplicate-number races are still guarded by the DB unique constraint (`prisma/schema.prisma:79-93`).
- Accessibility regressions: No issues found in the reviewed hotfixes. The drag-state change is visual-only (`src/components/ColumnsBoard.tsx:176-200`, `src/styles/boards.css:194-199`), and the attach-section animation swap does not remove focusable content or ARIA hooks (`src/styles/modal.css:227-236`).
- Correctness of `useMemo(cardsBySection)`: No issues found. The memo depends on `cards` only (`src/components/ColumnsBoard.tsx:132-145`), and every reviewed add/delete/move/section-reassignment path replaces `cards`, so rebuild timing is correct for those paths (`src/components/ColumnsBoard.tsx:149-173,203-245,250-289,332-339`).
- `xlsx` dynamic import: No SSR leak or top-level-await issue found because the import stays inside a `"use client"` event handler. The only issue I confirmed is the missing guarded failure/loading path in the Minor finding above.

## Verdict
PASS
- No hook-order violations or conditional-hook regressions were introduced in the touched files.
- `CardAttachments` memoization is shallow-equality safe at every reviewed parent call site.
- `cardsBySection` memoization is correctly keyed off `cards`, and I did not confirm a stale-dependency bug in the reviewed move/add/delete paths.
- The optimistic student-add path preserved server authority and duplicate protection; I did not confirm an injection, XSS, trust-of-client-id, or duplicate-race regression.
- The remaining issues are non-blocking robustness/type-safety gaps in `AddStudentsModal`, not merge blockers for this hotfix.
