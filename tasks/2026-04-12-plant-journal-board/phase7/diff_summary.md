# Diff Summary — phase7 plant-journal-board

## Data layer (PJ-1)
- `prisma/schema.prisma`: added 6 models (`PlantSpecies`, `PlantStage`, `ClassroomPlantAllow`, `StudentPlant`, `PlantObservation`, `PlantObservationImage`). Extended `Classroom`/`Student`/`Board` with relation fields. `Board.layout` accepts `"plant-roadmap"`.
- `prisma/plant-catalog.ts`: static catalog — 10 species × 10 stages with observation points.
- `prisma/seed-plant-journal.ts`: idempotent seed that upserts catalog + creates demo classroom (`PLANT1`), 3 demo students, board `b_plant` (layout=plant-roadmap), allow-listed 10 species.
- `package.json`: added `seed:plant` npm script.
- Non-destructive `prisma db push` applied — confirmed by Supabase postgres with no data loss prompt.

## API (PJ-2~6) — 12 routes
| route | methods |
|---|---|
| `/api/species` | GET |
| `/api/classrooms/[id]/species` | GET, PUT |
| `/api/student-plants` | POST |
| `/api/student-plants/[id]` | GET |
| `/api/student-plants/[id]/observations` | GET, POST |
| `/api/student-plants/[id]/observations/[oid]` | PATCH, DELETE |
| `/api/student-plants/[id]/advance-stage` | POST |
| `/api/classrooms/[id]/matrix` | GET (desktop + owner only) |
| `/api/boards/[id]/plant-journal` | GET (aggregate) |

All routes enforce RBAC: `getCurrentStudent()` for student ownership + NextAuth session for teacher. Zod validation on all writes. Matrix route enforces `X-Client-Width >= 1024`.

## UI components (PJ-2~6)
- `src/components/PlantRoadmapBoard.tsx` — dispatcher: teacher summary / student select-step / student roadmap / viewer read-only
- `src/components/plant/PlantSelectStep.tsx` — PJ-2 식물 선택 + 별명
- `src/components/plant/RoadmapView.tsx` — PJ-3 가로 SVG 노선도 + 상태 3단(visited/active/upcoming) + 자동 scrollIntoView
- `src/components/plant/StageDetailSheet.tsx` — 하단 시트 + 관찰 포인트 + 기록 timeline
- `src/components/plant/ObservationEditor.tsx` — PJ-4 사진≤10장 + 메모≤500자
- `src/components/plant/NoPhotoReasonModal.tsx` — PJ-3 사진 미첨부 사유
- `src/components/plant/TeacherSummaryView.tsx` — PJ-5 분포 badge + 학생 table + 정체 경고
- `src/components/plant/TeacherMatrixView.tsx` — PJ-6 행=단계, 열=학생, 칼럼 virtualization (COL_WIDTH/OVERSCAN 기반), desktop check
- `src/components/plant/PlantAllowListModal.tsx` — PJ-2 교사 allow-list

## Integration
- `src/app/board/[id]/page.tsx` — added `case "plant-roadmap"` with server-side fan-out: allows, myPlant, teacher plants, classroom students, distribution.
- `src/app/classroom/[id]/plant-matrix/page.tsx` — standalone matrix page (board-외, 학급 단위 scan).

## Design system
- `src/styles/base.css` — 4 new tokens: `--color-plant-active/visited/upcoming/stalled` (per `phase5/tokens_patch.json`).
- `src/styles/plant.css` — layout CSS.
- `src/app/globals.css` — @import plant.css.

## Verification
- `prisma generate` refreshed client (PlantSpecies etc. types present)
- `npm run typecheck` — PASS
- `npm run build` — PASS (Next.js 16.2.3 turbopack)
- Seed executed — 10 species, 100 stages, 3 students, 1 board written to Supabase

## Tests
No unit test framework is wired in the repo (`__tests__` folder has existing minimal units). End-to-end browser verification deferred to phase9 QA.
