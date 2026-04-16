# Code Review — plant-journal-v2 (self-review, phase 8)

> No gstack `/review` CLI in this worktree; running staff-engineer review as the coder. Bug fixes applied during review.

## Scope drift check
- design_doc.md §1-§7 requirements fully covered. No additional DB changes (confirmed, schema untouched).
- API contract matches §2 (PATCH /student-plants/[id], widened observations POST/PATCH/DELETE/advance-stage).
- No breakout/quiz/canva code touched.

## Issues found & resolved

### Bug 1 — redundant inner guard in RoadmapView footer (FIXED)
- Found: outer `{canComposeHere && ... {canComposeHere && <button/>} ...}` — inner guard redundant inside outer's scope.
- Fix: removed inner guard, kept the button unconditionally within the already-guarded `.plant-stage-body-actions` block.

### Bug 2 — advance button rendered on non-current stages in teacher mode? (AUDITED, OK)
- `canComposeHere = canEdit && (editAnyStage || isCurrent)` is true on every stage in teacher mode. The footer div is always shown.
- Inside, advance button has its own `isCurrent && canEdit` guard, so it only ever renders on the current stage. Correct.

### Bug 3 — nickname edit empty / same-value handling (AUDITED, OK)
- `handleNicknameSave` trims, returns early if empty or unchanged, closes edit mode. Prevents bogus PATCH.

### Bug 4 — `TeacherSummaryView` row double-navigation (AUDITED, OK)
- Row has `onClick` that pushes; Name cell contains a `<Link>` with `stopPropagation`. Clicking the link follows Link; clicking anywhere else on the row triggers router.push. No double-push.

### Bug 5 — XSS / untrusted HTML (AUDITED, OK)
- No `dangerouslySetInnerHTML`. All user strings rendered via JSX text nodes. `src={img.url}` is a URL string from our DB (validated via Zod on write). Lightbox only opens on user click.

### Bug 6 — missing key warnings (AUDITED, OK)
- All maps use `key={s.id}` / `key={o.id}` / `key={img.id}` / `key={i}` on stable items.

### Bug 7 — stage footer shown for upcoming stages without composer needed? (INTENTIONAL)
- For student mode, canComposeHere=false on upcoming stages → footer hidden. For teacher mode, editAnyStage=true → footer shown on upcoming stages with "관찰 추가" CTA. This is intentional per phase4 S2: teachers can backfill or forward-fill.

### Bug 8 — `canAccessStudentPlant` teacher gate already verifies classroom ownership; do our widened guards introduce any cross-tenant leak? (AUDITED, OK)
- For actor.kind="student": gate returns `ownedByActor=true` only when plant belongs to that student. Our widened check `!gate.ownedByActor && actor.kind !== "teacher"` rejects any student who isn't owner. Unchanged from v1.
- For actor.kind="teacher": gate returns `ownedByActor=false` only after verifying `classroom.teacherId === actor.userId`. Teacher now passes the widened check. No leak.

### Bug 9 — PATCH /student-plants/[id] empty body / invalid zod (AUDITED, OK)
- Falls into `z.ZodError` branch → 400 with message. `PatchStudentPlantSchema` enforces min(1) max(20) via `NicknameSchema`.

### Bug 10 — Accessibility: `<tr role="link" tabIndex=0>` (AUDITED, ACCEPTABLE)
- Tables with interactive rows are non-ideal, but widely used (Google Classroom does the same pattern). Keyboard (Enter/Space) handled. Screen readers will announce row + "link" role + aria-label. Acceptable for this project.

### Bug 11 — plant-head-nickname displays quote marks even in edit mode? (AUDITED, OK)
- Edit mode uses `.plant-head-nickname-edit` container; non-edit mode uses `.plant-head-nickname` with literal quote chars. Ternary swaps cleanly.

## Production readiness
- Build PASS (Compiled in 8.4s, 30 pages).
- Typecheck PASS.
- No console errors expected from rewritten flow.
- Legacy `StageDetailSheet.tsx` retained but unused in student flow → tree-shaken from client bundle via unused-import elimination (not imported anywhere after this change).

## Verdict
**PASS** — proceed to phase 9 QA.
