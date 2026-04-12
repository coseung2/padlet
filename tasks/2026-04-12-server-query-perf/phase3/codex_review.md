# Cross-Model Review — server-query-perf (Codex / GPT-5-class)

> Re-review after commit `d0ea159` addressed the three FAIL blockers from
> the first Codex pass (layout gating for cards+sections, force-dynamic
> claim revision, index rationale revision). Original Codex run could
> not write to this worktree from its sandbox, so the orchestrator
> persisted the review body here verbatim.
>
> First pass (verdict FAIL) is preserved in git history — see phase3
> review-files commit prior to `d0ea159`.

## Inputs consumed
- `tasks/2026-04-12-server-query-perf/phase1/diagnosis.md`
- `tasks/2026-04-12-server-query-perf/phase2/hotfix_design.md` (revised sections on indexes, force-dynamic, board query split)
- `git show d0ea159` (the fix commit that addresses the three FAIL items)
- `src/app/board/[id]/page.tsx` (updated layout gating at lines 51–76)
- `src/app/page.tsx`, `src/app/classroom/[id]/page.tsx`, `src/app/classroom/page.tsx`, `src/app/student/page.tsx`, `src/app/quiz/[code]/page.tsx`, `src/app/qr/[token]/page.tsx`
- `src/components/BoardCanvas.tsx`, `src/components/GridBoard.tsx`, `src/components/StreamBoard.tsx`, `src/components/ColumnsBoard.tsx`, `src/components/AssignmentBoard.tsx`, `src/components/QuizBoard.tsx`
- `src/lib/auth.ts`, `src/lib/auth-config.ts`
- `prisma/schema.prisma`, `prisma/migrations/20260412_add_perf_indexes/migration.sql`
- `next.config.ts`
- `src/app/api/boards/route.ts` (layout enum)
- `@auth/prisma-adapter/index.js` (hot-path verification)

## Independent findings

### Re-verification of the three prior FAIL items

- **1. FIXED** — `src/app/board/[id]/page.tsx:51–67` now says
  `const needsCards = !needsAssignmentData && !needsQuizData;` and
  `const needsSections = board.layout === "columns";`, with
  `cardsPromise` / `sectionsPromise` set to `null` when not needed.
  That removes the prior unconditional fetch on `assignment` and `quiz`.

- **2. REVISED** — `hotfix_design.md:66–69` now says `force-dynamic`
  removal does not guarantee Router Cache benefit and frames it as
  "시맨틱 클린업". That matches `next.config.ts:3–6` having no
  `experimental.staleTimes`, plus the board page still calling
  auth/cookie-backed helpers at `src/app/board/[id]/page.tsx:37–42`
  and `src/lib/auth-config.ts:15` (`session: { strategy: "jwt" }`).

- **3. REVISED** — `hotfix_design.md:11–17` now says the hot path is
  `(provider, providerAccountId)`, `Session` is not hot-read under
  JWT, and `Card.authorId` has no current filter query. That matches
  `@auth/prisma-adapter/index.js:8–13, 66–69`, `src/lib/auth-config.ts:15`,
  and the absence of any `findMany` / `findFirst` filter on `authorId`
  in `rg -n '\bauthorId\b' src prisma`.

### Correctness of the new layout gating

- `src/app/board/[id]/page.tsx:88–101` normalizes all optional
  results with `?? []`, and the render switch at `src/app/board/[id]/page.tsx:172–234`
  covers `grid`, `stream`, `columns`, `assignment`, `quiz`, `freeform`,
  and `default`.
- `columns` fetches both cards and sections: `page.tsx:53–67`.
- `assignment` skips cards/sections: `page.tsx:51–54, 68–76, 179–203`,
  and `AssignmentBoard.tsx:29–38` is safe on empty arrays.
- `quiz` skips cards/sections and `QuizBoard.tsx:41–42, 133–156`
  handles `[]` via `const quiz = quizzes[0] ?? null; if (!quiz) return ...`.
- `grid`, `stream`, `freeform`, and `columns` all tolerate empty
  arrays via `useState(initial...)` plus empty-state rendering
  in `GridBoard.tsx:16–18, 77–82`, `StreamBoard.tsx:16–18, 77–82`,
  `BoardCanvas.tsx:22, 130–139`, and `ColumnsBoard.tsx:35–38,
  192–193, 345–418`.
- Unknown layouts fall back to `BoardCanvas` at `page.tsx:232–234`,
  and normal creation is still constrained to the six known layouts
  by `src/app/api/boards/route.ts:6–9`:
  `z.enum(["freeform", "grid", "stream", "columns", "assignment", "quiz"])`.

### Non-blocking follow-ups

- Older, overstated commentary still present in source comments even
  though the phase2 design doc is corrected:
  - `src/app/page.tsx:8–10`
  - `src/app/board/[id]/page.tsx:17–18`
  - `prisma/migrations/20260412_add_perf_indexes/migration.sql:4–10`

  These comments still claim index-related hot-path wins that the
  design doc has since recanted. Not blocking — the authoritative
  rationale now lives in `hotfix_design.md`.

## Verdict

**PASS**

- All three prior FAIL items are resolved (one by code fix, two by
  design-doc revision).
- Layout gating is branch-complete: cards, sections, and layout-
  specific relations are now only fetched when the renderer reads
  them, and every layout's render path is safe on empty arrays.
- No new correctness bugs were introduced by the gating.
- Remaining follow-ups are stale inline comments; the authoritative
  rationale lives in `hotfix_design.md`.
