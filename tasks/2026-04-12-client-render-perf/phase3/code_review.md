# Code Review — client-render-perf (staff engineer)

Reviewer: staff engineer (Opus 4.6)
Track: B — client-render-perf
Branch: `fix/client-render-perf` (5 hotfix commits + 2 artifact commits)
Base: `main`

## Scope reviewed

5 hotfix commits against `main`:

| SHA | Subject | Area |
|---|---|---|
| `1f088ad` | `xlsx` dynamic import | `AddStudentsModal.tsx` |
| `eb8a586` | `ColumnsBoard` cardsBySection + drag classList | `ColumnsBoard.tsx`, `boards.css` |
| `1b4e104` | `CardAttachments` `React.memo` | `CardAttachments.tsx` |
| `763ad02` | Optimistic bulk-student add | `AddStudentsModal.tsx`, `ClassroomDetail.tsx` |
| `a40c15d` | `max-height` keyframe → `transform: scaleY` | `modal.css` |

Artifact commit (`3bb5f00`) reviewed only for task-dir hygiene; no source changes.

Diff stat:
```
src/components/AddStudentsModal.tsx   |  27 +-
src/components/CardAttachments.tsx    |   9 +-
src/components/ClassroomDetail.tsx    |  37 +-
src/components/ColumnsBoard.tsx       |  27 +-
src/styles/boards.css                 |   7 +
src/styles/modal.css                  |   7 +-
```

Inputs compared against:

- `phase1/diagnosis.md` §3 (root causes 3-1 … 3-7)
- `phase2/hotfix_design.md` (5-axis hotfix plan + conscious exclusions)

## Root-cause coverage (§3 of diagnosis)

| Diagnosis § | Root cause | Addressed? | Commit |
|---|---|---|---|
| 3-1 | `router.refresh()` on bulk student add | YES (partial, see below) | `763ad02` |
| 3-2 | XLSX static import | YES | `1f088ad` |
| 3-3 | `getCardsForSection()` filter+sort per render | YES | `eb8a586` |
| 3-4 | `React.memo` / `useCallback` missing | PARTIAL — `CardAttachments` only | `1b4e104` |
| 3-5 | QR code dynamic-import + per-row generation | NO (deferred — schema change) | — |
| 3-6 | Drag DOM style mutation | YES | `eb8a586` |
| 3-7 | `max-height` keyframe | YES | `a40c15d` |

Exclusions (3-4 partial, 3-5 full) are explicitly documented in `hotfix_design.md` with scope-rationale (DraggableCard requires API reshape; QR cache needs Prisma migration + coordinate with server-query-perf track). This is acceptable hotfix discipline — out-of-scope items are labeled, not silently dropped.

§3-1 note: `refresh = useCallback(() => router.refresh())` was removed. The `useRouter()` hook is still imported and used for `router.push(...)` on L348 (board navigation), so the hook retention is legitimate. No residual `router.refresh()` call remains in `ClassroomDetail.tsx` (verified by grep). Diagnosis claim "last remaining `router.refresh()` path" in the commit message is accurate for this file.

## Scope discipline

No unrelated refactors detected.

- `AddStudentsModal` changes are strictly: remove top-level xlsx import; make `parseFileData` take XLSX as a parameter; `handleFile` becomes async; propagate created-student list up.
- `ColumnsBoard` changes are strictly: import `useMemo`; replace `getCardsForSection` internals with Map; swap two `style.opacity` writes for `classList`.
- `CardAttachments` changes are strictly: `memo` wrapper with identical exported binding name.
- `ClassroomDetail` changes are strictly: drop `useCallback` + `refresh`; add `handleStudentsAdded` merge; rewire `onAdded` callback.
- CSS changes limited to added `.column-card.is-dragging` rule and rewritten `@keyframes attachIn` / `transform-origin` on `.modal-attach-section`.

The scaffold/artifact commits (`3aafe53`, `3bb5f00`) only touch `tasks/...`. No production-code bleed.

## Correctness — findings (by severity)

### BLOCKER — none

### HIGH — none

### MEDIUM

**M1. Drag-abort / unmount cleanup for `is-dragging` class.**
HTML5 DnD does fire `dragend` on Escape-abort and on drop-outside, so the base case is safe. However there are two residual edge cases:

- If a card node unmounts while a drag is in flight (e.g., parent state mutates `cards` and removes the dragged card), `dragend` still fires on the detached node — React then re-renders, but the stale class write is on an already-unmounted DOM node, so no leak.
- Conversely, because this is a per-element transient class set imperatively rather than from React state, a fast re-render during drag could repaint the card without `.is-dragging` — previously `style.opacity` had the same bug. Net: equal or slightly-better behavior than before. **No regression**, but worth noting for a future follow-up (drive `isDragging` from React state and pass via `className`).

No action required for this hotfix.

**M2. `CreatedStudent.createdAt` is typed `string` but the POST route returns Prisma raw objects.**
`NextResponse.json({ students })` will serialize `Date` → ISO string, so runtime shape matches the type. That contract is only implicit though — if the route is ever changed to `select` fewer fields or to use a custom serializer, the client merge silently breaks sort order. Low risk for this hotfix, but consider tightening the API handler with an explicit `.map(...)` projection in a follow-up.

Also: `number: z.number().int().min(1)` in the Zod schema guarantees no null numbers via this path. The `a.number == null` branches in `handleStudentsAdded` are defensive-only; they won't misbehave, just dead-under-current-contract. Harmless.

**M3. `scaleY(0.8 → 1)` with `transform-origin: top` — aesthetic note.**
`max-height` → `transform` is the right perf move. Two nuances:

- `scaleY(0.8)` scales text content vertically during the 150 ms opening, so glyphs briefly appear ~20% squashed. Users may perceive this as a minor wobble, especially for the attachment thumbnails. The previous `max-height: 0 → 400px` gave a slide-open feel with crisp text at all times.
- `translateZ(0)` is a compositor-hint micro-optimization; harmless, but paired with `scaleY` the transform stack reads slightly oddly. Not blocking.

If the squash is objected to in QA, swap to `opacity`-only or use a wrapper with `clip-path: inset(...)`. **Acceptable for hotfix as-is.**

### LOW

**L1. `CardAttachments` memo — prop safety.**
Props: `imageUrl?: string | null`, `linkUrl?: string | null`, `linkTitle?: string | null`, `linkDesc?: string | null`, `linkImage?: string | null`, `videoUrl?: string | null`. All primitives/nullable. Shallow `Object.is` equality is correct; no callback or object props. Memo is safe and correct.

Callsites pass either `card.imageUrl` (stable reference from card state) or literal strings. Even if parents re-run with new card object references, identical primitive values will short-circuit. Good.

**L2. `cardsBySection` `useMemo` — correctness of grouping.**
- Sort is performed once on `[...cards]` before bucketization, then items are pushed in order into per-section arrays → **order within each section is preserved** (stable across the sort).
- `Array.prototype.sort` is spec-guaranteed stable since ES2019; Node runtime satisfies this.
- `sectionId ?? ""` handles orphan cards into the `""` bucket; a caller with `getCardsForSection("")` can retrieve them. Existing call sites always pass a real `sectionId` so orphan-retrieval isn't exposed, but the behavior is consistent with the previous `filter` (which would also not match `""` unless explicitly asked).
- `cards` dependency is correct — the useMemo recomputes exactly when the array reference changes. Optimistic `setCards` paths already build new arrays, so invalidation fires as expected.

Tiny nit: `map.get(key) ?? (map.set(key, []).get(key))` would be slightly shorter, but the current `if/else` is clearer. Keep as-is.

**L3. XLSX dynamic import — browser coverage.**
`await import("xlsx")` is standard ESM dynamic import, supported by all browsers Next 15 targets. Next.js/Turbopack emits a separate chunk, loaded only from `handleFile`. Bundle ~400 KB no longer in initial chunk. File upload continues to work because `XLSX` is passed to `parseFileData(XLSX, data)` — same API surface.

One observation: the `await import("xlsx")` sits **before** `new FileReader()` is created. If the chunk download is slow, the teacher sees no spinner between "file picked" and "parse result". Previously the XLSX import cost was paid on initial page load so `handleFile` was effectively synchronous. Consider adding a lightweight "파일 분석 중..." state in a follow-up if telemetry shows long chunk fetches. **Not blocking.**

**L4. Type safety — `CreatedStudent`.**
New exported type `CreatedStudent` is a precise supertype of the local `Student` in `ClassroomDetail` (same six fields, same nullability). The `normalized` `.map()` in `handleStudentsAdded` is strictly a projection; it's a no-op spread for current fields but future-proofs against the API adding new fields (they'd be dropped silently — matches existing table's column set). Good defensive choice.

`typeof import("xlsx")` for the `parseFileData` param is accurate; TypeScript infers the module namespace type from the dynamic `import()`. No `any` leakage.

**L5. Accessibility.**
- `React.memo` does not affect focus/ARIA semantics; it only short-circuits reconciliation. No regression.
- `classList.add("is-dragging")` replaces `style.opacity`. Both are visual-only; neither is announced by screen readers. No change to keyboard focus or tab order.
- Drag is mouse-only (no keyboard DnD) in the current implementation, so no new AT regression introduced.

**L6. React 19 compatibility.**
- `useMemo` — unchanged semantics.
- `memo` — unchanged semantics; React 19's new compiler still honors explicit `memo`.
- `useState`/functional `setStudents((prev) => ...)` — unchanged.
- No concurrent-mode foot-guns (no direct DOM mutation inside render; `classList` is in event handlers).
- Optimistic update pattern is compatible with React 19 transitions. It is **not** wrapped in `startTransition`, which `hotfix_design.md` flagged as optional (§5-1). For a bulk add of ≤50 students the sort is trivial; transition wrap is unnecessary.

## Correctness checklist

- [x] XLSX dynamic import: upload flow preserved, browser-compatible, bundle reduced.
- [x] `cardsBySection` `useMemo`: Map grouping correct; sort stability preserved; `cards`-only dep is right.
- [x] `CardAttachments` `React.memo`: primitive-only props → shallow equality safe.
- [x] Drag `classList`: `dragend` fires on abort (HTML5 DnD spec) → class clears; no unmount-mid-drag leak.
- [x] Optimistic student update: merge dedup not needed (API rejects duplicate numbers server-side with 409); sort key handles both numbered and unnumbered; createdAt ISO sort correct.
- [x] `scaleY` animation: composite-only, no clipping in tested sections; cosmetic squash acceptable.
- [x] Type safety: `CreatedStudent` precise; `typeof import("xlsx")` precise; no `any`.
- [x] Accessibility: memo / classList are visual/reconciliation-only, no AT impact.
- [x] React 19: all primitives (`useMemo`, `memo`, functional setState) are API-stable in 19.

## Conscious exclusions (flagged by design, acknowledged)

| Deferred | Reason | OK to defer? |
|---|---|---|
| `DraggableCard` `React.memo` | Requires callback API reshape + parent `useCallback` | YES — documented follow-up |
| QR server-side dataUrl cache (§3-5) | Prisma schema change → coordinate with server-query-perf | YES — cross-track dependency |
| `Dashboard` inline-style cleanup | Pure refactor | YES — not perf-critical |
| `QuizBoard` state split | Different track (C) | YES |

All deferrals are named in `hotfix_design.md` §"의식적으로 제외"; none are silently dropped. No unlabeled gap vs. diagnosis §3.

## Operational notes

- `hotfix_design.md` §수용 기준 lists `typecheck` + `build` PASS; commit `3bb5f00` message asserts both PASS. Not re-executed in this review (review is read-only per instructions); push-gate at phase9 will re-verify.
- No test files added (project has no test framework installed). Manual verification list in `tests_added.txt` is appropriate substitute.
- No `REVIEW_OK.marker` yet — expected to be written as a separate artifact after this review.

## Verdict

**PASS**

Rationale: 6 of 7 diagnosis root causes addressed; the 1 remaining (QR caching) is correctly deferred with cross-track coordination rationale. All five hotfix commits are minimal, scoped, and correct. No blocking correctness or accessibility issues. Medium-severity findings (M1 drag-state imperative model, M2 implicit API shape, M3 scaleY squash) are follow-up candidates, not hotfix blockers. Type safety and React 19 compatibility are clean.
