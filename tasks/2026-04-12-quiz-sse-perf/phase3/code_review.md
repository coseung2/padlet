# Code Review — quiz-sse-perf (staff engineer)

## Scope reviewed

- Branch: `fix/quiz-sse-perf` (2 hotfix commits on top of `main`)
  - `f471946` — SSE route: delta-based emit, questions cache, count-gated distribution, cancel flag
  - `65fb78a` — QuizBoard: extract `Distribution` + `PlayerList` as `React.memo`, memoize `sorted`
- Files touched:
  - `src/app/api/quiz/[id]/stream/route.ts`
  - `src/components/QuizBoard.tsx`
- Cross-referenced:
  - `src/app/api/quiz/answer/route.ts` (answer creation semantics)
  - `src/components/QuizPlay.tsx` (client EventSource lifecycle)
  - `prisma/schema.prisma` (QuizAnswer uniqueness, QuizPlayer fields)
- Diagnosis §3 mapping:
  - §3-1 per-second full-quiz polling → addressed (slim `select`, questions cache, count gate)
  - §3-2 delta absence → addressed (hash-based player delta, count-gated answer delta, status/currentQ delta)
  - §3-3 broad QuizBoard re-render → addressed (Distribution + PlayerList memo split)
  - §3-4 EventSource cleanup weakness → explicitly deferred (design doc §3: existing `es.close()` cleanup already present; no cleanup gap found in current client code)

## Findings (by severity)

### BLOCKER
_None._

### MAJOR
_None._

### MINOR

**M1. `lastAnswerCount` not reset when `currentQ` regresses to < 0**
- Location: `route.ts` poll loop
- Current behavior: `lastAnswerCount` is reset to `-1` only inside the "new current-question" branch which requires `quiz.currentQ >= 0 && quiz.currentQ < questionsCache.length`. If a quiz transitions from `active → waiting` (or `currentQ` goes negative), the distribution block is skipped but `lastAnswerCount` carries over. On the next active question it would be reset correctly anyway because the `currentQ` delta fires first. Confirmed non-issue — state transition ordering makes this safe. Flagging only as a brittleness note.
- Recommendation: Consider moving the `lastAnswerCount = -1` reset into the `currentQ` delta branch regardless of value, or leave as-is. Low value.

**M2. Questions cache is per-connection and never invalidated**
- Location: `route.ts:71-85`
- Behavior: `questionsCache` lives for the lifetime of the SSE connection. Admin edits to a `QuizQuestion` row (via some future endpoint, or a manual DB edit) are not picked up until the client reconnects.
- Assessment: Acceptable. The codebase exposes no "edit question while quiz is live" flow. `QuizQuestion` is only ever written at quiz-creation time via the question-bank and quiz-create paths (outside the scope of this review). The design doc explicitly states questions are immutable during a running quiz, which matches product intent.
- Recommendation: Leave as-is for this hotfix. If an admin edit-during-live feature lands later, add either (a) a version field on `Quiz` that the tick query reads and uses to bust the cache, or (b) move to Supabase Realtime / pub-sub as the follow-up research task notes.

**M3. Player hash delimiter choice**
- Location: `route.ts:118-120`
- `players.map((p) => \`${p.id}:${p.score}\`).join(",")` uses `,` as the outer delimiter and `:` between `id` and `score`.
- Prisma `@default(cuid())` IDs are alphanumeric — no collision. Reviewed.
- Nickname changes are NOT captured by the hash, but `QuizPlayer.nickname` has no update path in the codebase (confirmed: no `quizPlayer.update({ data: { nickname } })` call anywhere). The `join` route writes nickname once on create. Non-issue.

**M4. `totalAnswers` / `totalPlayers` consistency**
- The `answers` event carries `totalAnswers: count` (from the fresh `quizAnswer.count`) and `totalPlayers: quiz.players.length` (from the tick's player list). Both originate in the same poll iteration. No cross-iteration staleness risk.
- Minor observation: `totalAnswers` is also the sum of `distribution.A..D` except for any rows with a malformed `selected` value (the `if (a.selected in distribution)` guard drops them). Keeping the separate count is defensible.

### NITS

**N1. `send()` swallow on enqueue failure**
- `route.ts:35-41`: the `catch {}` around `controller.enqueue` silently flips `cancelled = true`. Good defensive posture. Consider a single debug log (`console.debug("[SSE] enqueue after close for", id)`) for operational visibility. Not blocking.

**N2. `CachedQuestion` type duplicates Prisma-generated shape**
- A local `type CachedQuestion` is defined for the in-memory cache. This is fine and keeps the route decoupled from generated types. Acceptable; Prisma `QuizQuestion` type could also be imported. Style preference only.

**N3. Unused `quiz-status` → `waiting` transition**
- `QuizPlay.tsx:73-74` only handles `status === "waiting"` when in `join|waiting` phase; `active` and `finished` are no-ops. Pre-existing behavior, unchanged by this hotfix. Not in scope.

## Correctness checklist

### 1. Root cause coverage (diagnosis §3)
- [x] §3-1 (per-second full-quiz polling): tick query reduced from nested `questions + answers + players` join to a flat `{ status, currentQ, players(id, nickname, score) }` plus a one-off `quizQuestion.findMany`. Query mass per steady-state tick drops from O(questions × answers + players) to O(players) + O(1) count.
- [x] §3-2 (delta absence): status delta, currentQ delta, players-by-hash delta, answer-count-gated distribution delta — all four independent change signals are now emission-gated.
- [x] §3-3 (broad QuizBoard re-render): Distribution and PlayerList are isolated React.memo components; `sorted` is memoized on `quiz.players`. Verified below.
- [~] §3-4 (EventSource cleanup): design doc §3 defers with "already has es.close()". Verified in `QuizPlay.tsx:151-154` and (per design doc) `QuizBoard.tsx:92-94`. The original diagnosis concern about "cleanup without AbortController" is framed as a robustness improvement, not an active leak; current cleanup terminates the client connection and the new `cancel()` flag now terminates the server loop. Effectively addressed end-to-end without code changes beyond the server `cancel()`.

### 2. Scope discipline
- [x] No changes outside `route.ts` and `QuizBoard.tsx`.
- [x] SSE event contract (`quiz-status`, `question`, `players`, `answers`, `finished`, `error`) is preserved — names, payload shapes, and optional fields unchanged. No client-side changes required.
- [x] Deliberate exclusions (Supabase Realtime, Vercel Workflow, polling interval, reconnect strategy, QuizPlay refactor) are listed in the design doc and not snuck in.

### 3. SSE correctness

**Delta events fire when underlying state changes:**
- `quiz-status`: fires on `quiz.status` change. ✓
- `question`: fires on `quiz.currentQ` change when within valid index range. ✓ `lastAnswerCount` also reset here — correct, because the next tick will re-fetch count for the new question.
- `players`: fires when `id:score` joined hash differs from previous. Captures joins, leaves (player count change), and score updates (the previous bug). ✓ Does not capture nickname changes, but no nickname-update path exists.
- `answers`: fires when `quizAnswer.count(where: questionId)` for the active question changes. ✓

**Questions cache safety:**
- Cache is per-connection, populated on first tick, immutable thereafter. Admin edits mid-connection would not be reflected. Current product has no such admin flow — acceptable. See M2.

**`cancelled` vs `setTimeout` race:**
- Three termination paths, all coherent:
  1. Client disconnect → `ReadableStream.cancel()` → `cancelled = true`. If a poll is mid-await, `send()` is guarded (early return) and `controller.enqueue` wrapped in try/catch which also sets `cancelled`. The tail `if (!cancelled) setTimeout(poll, 1000)` prevents a new iteration.
  2. `quiz` not found → `controller.close()` + `cancelled = true` + `return`.
  3. `quiz.status === "finished"` → `controller.close()` + `cancelled = true` + `return`.
- Edge case: if `cancel()` fires exactly between the `findUnique` resolving and the next `send()`, the first `send()` early-returns, remaining `send()`s likewise, `lastAnswerCount` may get mutated in memory (harmless — the closure is about to be GC'd), and the tail-`setTimeout` is skipped. No leak, no double-close, no enqueue-after-close. ✓
- One minor note: the internal `lastStatus`/`lastCurrentQ`/`lastPlayersHash`/`lastAnswerCount` state updates happen BEFORE the `send()` call in each branch. If `send()` is a no-op due to `cancelled`, we've "committed" to the new delta state but didn't emit it. Since the connection is terminating, this is moot. ✓

**Player hash `${p.id}:${p.score}` — nickname changes:**
- Confirmed: no nickname update path exists (`quizPlayer.update` is only called for `score: { increment }` in `answer/route.ts:41-44`). Non-issue. See M3.

**Count-gated answers — distribution change without count change:**
- Reviewer flagged as "real bug possibility" (e.g., player changes answer).
- **Investigated and refuted**: `answer/route.ts:17-23` has a hard "Already answered" guard. `QuizAnswer` has a `@@unique([questionId, playerId])` constraint (schema.prisma:264). There is no `update` or `upsert` path for QuizAnswer anywhere in the codebase. A player cannot change an answer once submitted.
- Therefore `count` is a strictly monotonic signal for distribution changes on a given question, and the count gate is sound.
- If a future feature allows answer change, this would need to switch to a hash over `playerId:selected` pairs (same pattern as players hash). Worth a comment in the route — noted but non-blocking.

### 4. QuizBoard memoization

**Distribution memo (`memo({ dist, correctIndex })`):**
- `dist` is set via `setDist(d.distribution ?? {})` in the `answers` handler → new object reference per event. Memo is a no-op for identity, but since distribution is only emitted when it actually changed (count-gated), re-renders occur only on genuine distribution changes. ✓
- `correctIndex` is pulled from `curQ.correctIndex`; `curQ` reference changes only when the quiz question index changes → stable across `answers` ticks. ✓
- Inside, `useMemo` for `total` is fine; cheap but consistent.

**PlayerList memo (`memo({ players })`):**
- `players` is the `sorted` array, memoized on `quiz.players`. `quiz.players` reference changes only when the parent handler for `players` event replaces it. ✓
- Net: a `answers` tick updates `dist` state only, `quiz.players` is untouched, `sorted` identity preserved, `PlayerList` does not re-render. This is the intended win and it holds. ✓
- A `players` tick updates `quiz.players`, `sorted` recomputes, `dist` untouched, `Distribution` does not re-render. Symmetric. ✓

**Edge case — question navigation causes a full pass:**
- A `question`/`quiz-status` delta would touch the parent `quizzes` state (setQuizzes in the parent), which replaces the quiz object reference → both `sorted` and `dist` memos re-evaluate. Acceptable because the DOM legitimately needs updating on question change. Not a regression.

### 5. Type safety
- `CachedQuestion` local type is correct and matches the `select` clause field-for-field. ✓
- `select` projections are narrower than before — any downstream consumer that relied on `quiz.questions[i].answers` inside the tick loop would break at compile time. Confirmed no such consumer (distribution now uses the separate `quizAnswer.findMany(select: { selected: true })`). ✓
- `distribution[a.selected as keyof typeof distribution]` cast is the same as before; `selected` is a free-form `String` in schema, so the `a.selected in distribution` guard handles malformed input. ✓
- `answers.addEventListener` handler in `QuizPlay.tsx:120-127` parses but ignores — no type mismatch risk.
- No `any` introduced.

## Performance validation (qualitative)

Taking the design doc's 100 players × 50 questions scenario:
- Steady-state "nothing changed" tick: 2 queries (one small `select` with 101 rows, one `count`) vs. previously 1 huge join query hydrating 50 questions × N answers + 100 players.
- Score-update tick: same 2 queries, players hash detects, `players` event fires with minimal payload.
- Answer-arrival tick: 3 queries (tick + count + distribution findMany on one question's answers only).
- Question-advance tick: 2 queries (cache hit).

Net: per-tick byte and row volume drop by 1–2 orders of magnitude for the common case, and the client re-render surface shrinks from the whole QuizBoard to a single subtree. Matches the design doc's claims.

## Follow-up suggestions (non-blocking, log for a future task)

1. Add a brief comment in `route.ts` at the count-gate explaining the monotonicity assumption ("answers are insert-only; switch to hash if answer-editing ships").
2. Consider exposing a lightweight `X-SSE-Reason` cadence (debug log only) to validate in production that the count-gate actually filters most ticks.
3. `M2` follow-up: if admin edit-during-live ever becomes a real flow, add a `Quiz.questionsVersion` column and compare in the tick.
4. The research tasks already listed in the design doc (Supabase Realtime, Vercel Workflow, WebSocket) cover the real long-term fix — polling is still polling.

## Verdict

**PASS**

The hotfix lands squarely on the diagnosis §3 root causes, respects scope, preserves the SSE client contract, and correctly reasons about the delta-gating invariants. The single reviewer-flagged correctness concern (count-gated distribution missing an answer-change event) was investigated and confirmed a non-issue given the insert-only `QuizAnswer` semantics enforced by both the `answer/route.ts` guard and the `@@unique([questionId, playerId])` constraint. Cancellation/setTimeout coordination is sound. Memoization split on the client is correct and produces the intended render-surface reduction. No blockers. Minor items M1–M4 are either acceptable as-is for a hotfix or worth capturing as follow-up notes.
