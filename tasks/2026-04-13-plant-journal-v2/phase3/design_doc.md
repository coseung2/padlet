# Design Doc — plant-journal-v2

## 1. 데이터 모델 변경

**NONE.** Prisma schema untouched.
- All required fields for Part B (teacher-on-behalf edits) already exist on `StudentPlant`, `PlantObservation`, `PlantObservationImage`.
- Audit/attribution columns (editorId / editedAt) are intentionally deferred (see phase2 §OUT). No migration.
- DB state stays identical pre/post deploy. `prisma db push` not required.

## 2. API 변경

### 2.1 `PATCH /api/student-plants/[id]` (NEW handler in existing route file)
- **Purpose**: allow nickname edit from both student-owner and board-owner (teacher drill-down).
- **Request**: `{ nickname: string (1..40) }`
- **Response**: `{ studentPlant: StudentPlantDTO }` (same shape GET returns) — 200.
- **Auth**: `resolvePlantActor()` → `canAccessStudentPlant()` → allow if `ownedByActor` (student) **or** `actor.kind === "teacher"` (already gated by `canAccessStudentPlant` which verified teacherId matches classroom).
- **Validation**: Zod `PatchStudentPlantSchema = { nickname: z.string().min(1).max(40).trim() }` (add to `lib/plant-schemas.ts`).

### 2.2 `POST /api/student-plants/[id]/observations` (existing — permission widening)
- Change the `if (!gate.ownedByActor) return 403` guard to: allow when `gate.ownedByActor` OR `actor.kind === "teacher"`.
- No response shape change.

### 2.3 `PATCH /api/student-plants/[id]/observations/[oid]` (existing — permission widening)
- Change `gateOwnership()` helper to return ok when `gate.ownedByActor OR actor.kind==="teacher"`.
- No response shape change.

### 2.4 `DELETE /api/student-plants/[id]/observations/[oid]` (existing — permission widening)
- Same change as 2.3.

### 2.5 `POST /api/student-plants/[id]/advance-stage` (existing — permission widening)
- Change `if (!gate.ownedByActor) return 403` to allow teacher actor.
- No response shape change.

### 2.6 Routes — no new REST endpoints beyond 2.1. Drill-down is a server page, not an API.

## 3. 컴포넌트 변경

### 3.1 NEW — `src/app/board/[id]/student/[studentId]/page.tsx`
Server component. Data loading:
1. `params` → `{ id, studentId }`.
2. Resolve board via `OR: [{ id }, { slug: id }]` (consistent with `board/[id]/page.tsx`).
3. `getCurrentUser()` — required. If null → 403 (render `<ForbiddenView/>` with a link back to the board).
4. Classroom ownership: fetch `classroom.teacherId` via `board.classroomId` (and fallback to `student.classroomId`). Require match with current user id.
5. Fetch `studentPlant` by `studentId` + `boardId`. If plant null → render "아직 식물을 고르지 않았어요" empty state with a link back.
6. Serialize into `StudentPlantDTO` using the same shape `/api/student-plants/[id]` GET returns (reuse a server helper `serializeStudentPlant`).
7. Render `<TeacherStudentPlantView initial={dto} boardId={board.id} studentName={student.name}/>` — a small client wrapper that renders `<RoadmapView plant={...} canEdit onPlantUpdated={...}/>` plus a teacher banner "교사 모드 — {학생이름}의 관찰일지".

### 3.2 MODIFIED — `src/components/plant/RoadmapView.tsx`
- Convert horizontal subway layout → **vertical timeline**:
  - Root container `.plant-timeline` (flex column).
  - Each stage rendered as `.plant-stage-row` (grid: `rail | body`).
  - Left rail: `.plant-stage-rail` with `.plant-stage-node` (reusing `data-state` semantics: visited/active/upcoming) + connector line above/below (pseudo-element or sibling).
  - Right body: `.plant-stage-body`
    - header: stage order/name/description
    - observation point list (unchanged from StageDetailSheet §points)
    - inline observation cards grid (reuses existing `.plant-obs-card` etc.)
    - footer actions: when `canEdit && (stage===current OR actor is teacher)`, "관찰 추가" button; when current stage, "다음 단계로" button.
- Remove `selectedStageId` / `selectedStage` state and `StageDetailSheet` import. Retain `ObservationEditor`, `NoPhotoReasonModal`, lightbox overlay.
- Keep refetch/create/patch/delete/advance handlers as-is.
- New prop (optional) `editAnyStage?: boolean` — defaults to `false`. When true, composer is visible on every stage (teacher mode). We can derive it from `canEdit && !plant.ownedByActor` or pass explicitly from caller.

### 3.3 MODIFIED — `src/components/plant/TeacherSummaryView.tsx`
- Add `boardId` prop.
- Wrap each `<tr>` cells in a clickable affordance: simplest is to make the whole row `onClick` + `cursor: pointer` → navigate via `useRouter()`. But cleaner + a11y: render a `<Link>` in the first cell (name column) styled as full-row link, and add `onClick` on the row that calls `router.push()`. We'll adopt **per-row Link**: convert row cells — except "상태" — into `<Link>` children. Actually simpler & valid HTML: wrap each row's primary cell in `<Link>` and add an `onClick` navigator to the row background (keeping table semantics). Final choice: **row-level `onClick` + `role="link"` + keyboard handler + `<Link>` wrapping "이름" cell for visible anchor**.
- Demote "매트릭스 뷰" button → render as `<Link>` with secondary styling (outline, muted bg).

### 3.4 MODIFIED — `src/components/PlantRoadmapBoard.tsx`
- Drop sheet-related wiring. No structural changes beyond passing props.
- Pass `boardId` into `TeacherSummaryView`.

### 3.5 NEW — `src/components/plant/TeacherStudentPlantView.tsx` (client wrapper)
- Takes initial `StudentPlantDTO`, `boardId`, `studentName`.
- State-holds current plant.
- Renders a header "← 요약으로 돌아가기" link (`/board/{boardId}`), "교사 모드 — {studentName}" banner, then `<RoadmapView plant=... canEdit editAnyStage onPlantUpdated=...>`.

### 3.6 MODIFIED — `src/styles/plant.css`
- Add `.plant-timeline`, `.plant-stage-row`, `.plant-stage-rail`, `.plant-stage-node` (reuse `data-state`), `.plant-stage-connector`, `.plant-stage-body`, `.plant-stage-body-head`, `.plant-stage-body-points`, `.plant-stage-body-obs-grid`, `.plant-stage-body-actions`, `.plant-teacher-banner`, `.plant-summary-row-link` (hover row highlight), `.plant-matrix-secondary` (demoted link).
- Obsolete selectors (`.plant-line`, `.plant-line-scroll`, `.plant-connector`, `.plant-node-wrap`, `.plant-line-cta`, `.plant-sheet*`) — keep for now, `StageDetailSheet` can be retained but not rendered from student flow. Mark with `/* v1 horizontal layout — retained for possible teacher modal */` comment. We will NOT delete the file to avoid breaking any lingering import — but `PlantRoadmapBoard.tsx` won't import it.
- All values via CSS tokens from `docs/design-system.md`.

### 3.7 `lib/plant-schemas.ts` — add `PatchStudentPlantSchema`.

## 4. 데이터 흐름

```
Teacher clicks student row in summary view
  → <Link> /board/:id/student/:studentId
  → Next.js server page.tsx
    → getCurrentUser + classroom ownership check  → 403 or 200
    → db.studentPlant.findFirst(studentId, boardId)
    → serializeStudentPlant → StudentPlantDTO
    → render <TeacherStudentPlantView initial={dto} ...>

Teacher adds observation (inside RoadmapView with canEdit+editAnyStage):
  → ObservationEditor modal submit
  → POST /api/student-plants/:id/observations  (authorised because actor.kind=teacher + classroom ownership)
  → refetch GET /api/student-plants/:id
  → setState(next plant)
  → RoadmapView re-renders with new card in stage body

Student uses roadmap (same flow, only ownedByActor=true branch)
  → same client calls; owner API change does not narrow student access.
```

## 5. 엣지케이스

1. **비-owner가 직접 URL 입력** (`/board/:id/student/:otherStudentId`): server page returns 403. Classroom gate: board.classroomId missing → 403 with message "학급에 연결되지 않은 보드예요".
2. **학생이 아직 식물을 고르지 않은 상태로 교사가 drill-down**: server fetches `studentPlant` returns null → render empty-state "학생이 아직 식물을 선택하지 않았어요" + back link. Do NOT expose species-selection UI to teacher (OUT of scope).
3. **Teacher edits while student simultaneously edits**: Last-write-wins on PATCH observation (no optimistic concurrency field). Acceptable — plant journal isn't high-frequency concurrent write surface. Noted, deferred.
4. **Next-stage advance by teacher on behalf of student**: Works via widened permission. `no-photo reason` flow unchanged.
5. **Observation with zero images on current stage, teacher advance**: same noPhotoReason modal path; no functional difference from student flow.
6. **Very long journal (stage 10, each stage 8+ images)**: inline rendering. Mitigate with `<img loading="lazy" decoding="async">`. Lightbox still loads full size only on click.
7. **board slug-based URL** (`/board/my-class-plants/student/xyz`): server page uses `OR: [{ id: boardParam }, { slug: boardParam }]`.
8. **Teacher deletes observation** and immediately navigates back: summary view fetches fresh via its own `refetch` when the user returns (or re-render on nav). Because summary view lives on the plant-journal board page, revisiting via browser back should trigger a route refresh — we'll rely on Next router cache; if stale, teacher can refresh. Documented.
9. **Student name not present in session** when student logs in: unchanged — RoadmapView used as-is, but the new teacher-only subroute is gated by user session, so student hitting the route → 403.
10. **Vertical timeline on mobile narrow screens**: rail can shrink to 32px; body wraps image grid. CSS will use flex + grid-template-columns with `minmax`.

## 6. DX 영향

- **Types**: Only new local types for the new page's props. `StudentPlantDTO` reused.
- **Lint/TS**: Running `npx tsc --noEmit` after each phase. No new eslint config.
- **Tests**: No unit test infra in repo — QA is manual (phase9 smoke + acceptance). No change.
- **Build**: `npm run build` must pass with new route. Next.js 16 dynamic route.
- **Bundle size**: deleting `StageDetailSheet` usage from client bundle of student flow saves ~2kb. Adding `TeacherStudentPlantView` is tiny.

## 7. 롤백 계획

- Entire v2 lives on branch `feat/plant-journal-v2`. If post-deploy regression found:
  1. `git revert` the PR merge commit (or use Vercel's instant rollback UI).
  2. No DB migration to undo (schema unchanged).
  3. API permission widening is additive (teacher now allowed where previously forbidden); revert strictly narrows — safe.
  4. `StageDetailSheet.tsx` file retained in repo (not deleted), so reverting the client import restores v1 behaviour 1:1.
- Per-feature partial rollback (keep Part A, drop Part B): revert `/board/[id]/student/[studentId]/page.tsx`, `TeacherStudentPlantView.tsx`, and permission widening in API routes; keep RoadmapView changes. Part B is strictly isolated.
