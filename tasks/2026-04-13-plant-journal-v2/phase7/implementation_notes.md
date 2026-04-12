# Phase 7 — Implementation notes

## Files touched

### New
- `src/app/board/[id]/student/[studentId]/page.tsx` — server component. Owner-only gate via `getCurrentUser` + `classroom.teacherId`. Returns 403 view for non-owner / non-logged-in. Empty-state view when student hasn't chosen a plant. Serialises `StudentPlantDTO` inline (mirrors the GET /api/student-plants/[id] shape).
- `src/components/plant/TeacherStudentPlantView.tsx` — client wrapper. Renders banner + `<RoadmapView canEdit editAnyStage>`.

### Modified
- `src/components/plant/RoadmapView.tsx` — rewrote as vertical timeline (`.plant-timeline` with `.plant-stage-row` grid `48px 1fr`). Dropped `StageDetailSheet` import. Added inline nickname edit (PATCH /api/student-plants/[id]) for `canEdit` actors. Added new `editAnyStage` prop: when true, "관찰 추가" CTA visible on every stage (teacher mode). Preserved observation editor, no-photo reason modal, lightbox. Removed activeNodeRef/scrollIntoView (not needed — all stages visible now).
- `src/components/plant/TeacherSummaryView.tsx` — added `boardId` prop. Each student row now `role="link"` + `onClick` navigating via `useRouter()` to `/board/{boardId}/student/{studentId}`. Name cell wraps `<Link>` for AT users. "매트릭스 뷰" button → demoted to `.plant-matrix-secondary-link` (outline, muted).
- `src/components/PlantRoadmapBoard.tsx` — passes `boardId={state.board.id}` into `TeacherSummaryView`. No other changes.
- `src/lib/plant-schemas.ts` — added `PatchStudentPlantSchema` (nickname only).
- `src/app/api/student-plants/[id]/route.ts` — new `PATCH` handler for nickname (200). Permission: student owner OR classroom teacher (already gated by `canAccessStudentPlant`).
- `src/app/api/student-plants/[id]/observations/route.ts` — POST permission widened: teacher allowed (in addition to owner student).
- `src/app/api/student-plants/[id]/observations/[oid]/route.ts` — PATCH/DELETE permission widened via `gateOwnership()`: teacher allowed.
- `src/app/api/student-plants/[id]/advance-stage/route.ts` — permission widened: teacher allowed.
- `src/styles/plant.css` — appended v2 section with `.plant-timeline`, `.plant-stage-row/rail/node/connector/body`, `.plant-teacher-banner/back`, `.plant-student-row-link/name`, `.plant-matrix-secondary-link`, nickname-edit classes, responsive + reduced-motion. Legacy `.plant-line*`, `.plant-sheet*`, `.plant-node*` retained (not deleted) for possible future reuse. `StageDetailSheet.tsx` file retained but no longer imported in student flow.

## Deferred items
- `canva project/plans/plant-journal-roadmap.md` §3.1 update: that file is not present in this worktree (likely lives in the Obsidian vault side, outside the tracked src/). Noted for phase11 doc sync — if the file surfaces there, update to "vertical timeline"; otherwise log as intentionally deferred because the source doc is out of repo scope.

## Build/typecheck
- `npx tsc --noEmit`: PASS (no output).
- `npm run build`: Compiled successfully in 8.4s, all 30 pages generated, new `/board/[id]/student/[studentId]` shows up as dynamic route.
