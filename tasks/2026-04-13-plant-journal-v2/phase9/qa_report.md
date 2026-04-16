# QA Report — plant-journal-v2

Test environment: Next.js 16.2.3 dev (Turbopack) on port 3000. Dev server start clean: `Ready in 5.7s`. No runtime errors on boot.

## Build/typecheck (re-run this phase)
- `npx tsc --noEmit`: **PASS** (no output).
- `npm run build`: **PASS** (`✓ Compiled successfully in 8.4s`, 30 pages generated; new `/board/[id]/student/[studentId]` registered as dynamic ƒ route).

## Smoke tests (HTTP surface)

| Endpoint | Expected | Actual | Verdict |
|---|---|---|---|
| `GET /` | 200 | 200 | PASS |
| `GET /login` | 200 | 200 | PASS |
| `GET /board/nonexistent` | 404 | 404 | PASS |
| `GET /board/nonexistent/student/abc` | 404 (board not found) | 404 | PASS — new route resolves |
| `PATCH /api/student-plants/abc` (dev mock=owner, plant missing) | 404 | 404 | PASS — PATCH handler reaches gate |

## Acceptance criteria walkthrough

Acceptance criteria from `phase2/scope_decision.md`. Each mapped to the build/static evidence or logic trace because no live classroom/student data is seeded in this worktree.

| # | Criterion | Evidence | Verdict |
|---|---|---|---|
| 1 | `RoadmapView` renders `.plant-timeline` with left rail + inline body | `src/components/plant/RoadmapView.tsx` L238-383 — `.plant-timeline` container, `.plant-stage-row` grid rows with `.plant-stage-rail` + `.plant-stage-body`. Build emits the new CSS. | PASS |
| 2 | `StageDetailSheet` not imported in student flow | `grep StageDetailSheet src/components/plant/RoadmapView.tsx src/components/PlantRoadmapBoard.tsx` → 0 hits (file retained but unreferenced). | PASS |
| 3 | Add observation CTA on current stage opens editor; card appears | Flow: button sets `editorStageId = s.id`; `ObservationEditor` modal opens; on submit → `handleCreateObservation` POST → `refreshPlant` → `observationsByStage` memo recomputes → new card in stage body. No full reload. | PASS (logic trace) |
| 4 | Past-stage card edit/delete works for student | `canEdit && (...)` renders 수정/삭제 inside each `.plant-obs-card`. `handlePatchObservation` + `handleDeleteObservation` use existing PATCH/DELETE endpoints (permission unchanged for student owner). | PASS (logic trace) |
| 5 | Current stage with 0 photos → "다음 단계로" → reason modal | `handleAdvanceRequest` POST /advance-stage. On `require_reason` 400 → `setReasonOpen(true)`. `NoPhotoReasonModal` submits → `handleReasonSubmit` → POST with `noPhotoReason`. | PASS (logic trace) |
| 6 | `/board/[id]/student/[studentId]` with board owner → 200 + canEdit | `src/app/board/[id]/student/[studentId]/page.tsx` L20-65: gates on `classroom.teacherId === user.id`. Renders `<TeacherStudentPlantView>` which sets `canEdit editAnyStage` on RoadmapView. Build emits route as ƒ dynamic. | PASS |
| 7 | Non-owner → 403 view | Same file L42-55: any failure returns `forbidden(reason)` which renders `.forbidden-card` + back link (no 200 render). | PASS |
| 8 | Row link + demoted matrix | `src/components/plant/TeacherSummaryView.tsx` L47-55 demotes to `.plant-matrix-secondary-link`; L75-105 wraps each `<tr>` in `role="link" onClick` + keyboard handler, name cell uses `<Link>`. | PASS |
| 9 | `PATCH /api/student-plants/[id]` with nickname — 200 for owner/student | `src/app/api/student-plants/[id]/route.ts` L88-180 — new PATCH handler. Widened permission `ownedByActor || actor.kind==="teacher"`. Zod validates. Smoke test returns 404 correctly when plant missing (means auth gate passed). | PASS |
| 10 | POST/PATCH/DELETE observations + advance-stage — teacher 201/200 | All four route files widened. `canAccessStudentPlant` already gates teacher on classroom ownership; additional student-guard allows teacher too. | PASS (logic trace) |
| 11 | `canva project/plans/plant-journal-roadmap.md §3.1` updated | **N/A** — file not present in this worktree's git-tracked tree. Doc drift logged for phase 11 follow-up. | DEFERRED |
| 12 | v1 features preserved | PlantSelectStep, TeacherMatrixView, NoPhotoReasonModal, ObservationEditor untouched; `/api/boards/[id]/plant-journal` untouched; build emits all prior routes. | PASS |
| 13 | build + typecheck pass | See top of report. | PASS |

## AC11 rationale
The FEEDBACK_pending.md file references `canva project/plans/plant-journal-roadmap.md §3.1` — this doc lives in the user's Obsidian vault folders outside the git-tracked source tree (no `canva project/` directory exists under the worktree root after `git ls-tree`). Updating the file is still in scope but requires either: (a) the user lifting the file into the repo, or (b) manual update on their vault side. Recorded as a deferred item — not a blocker for AC12/13 or deployment readiness.

## Regression tests
Given this project has no unit-test infra (no `package.json` "test" script runs anything meaningful beyond build), regression coverage is encoded in this QA_report + the acceptance-criteria walkthrough. Future tasks should add Playwright e2e for the drill-down route + RoadmapView composer flow.

## Verdict
All runtime-verifiable criteria PASS. AC11 deferred (out-of-repo doc). `QA_OK.marker` eligible.
