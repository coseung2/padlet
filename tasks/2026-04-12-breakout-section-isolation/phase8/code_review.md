# Code Review — breakout-section-isolation (self-review, no external LLM)

Reviewer: Claude orchestrator (staff engineer persona). `/review`, `/codex`, `/cso` slash commands unavailable in worktree → self-review with explicit checklist.

## Scope drift check (vs phase3 design_doc.md)

- [x] Schema: `Section.accessToken String? @unique` — matches.
- [x] Migration file present under `prisma/migrations/`.
- [x] `GET /api/sections/:id/cards?token=…` — matches.
- [x] `POST /api/sections/:id/share` owner-only — matches.
- [x] `src/lib/realtime.ts` exports `boardChannelKey`, `sectionChannelKey`, no-op `publish`. Engine choice deferred (comment flags this).
- [x] `viewSection(sectionId, ctx)` added without breaking existing `getBoardRole`/`requirePermission`.
- [x] `/board/[id]/s/[sectionId]` + `/share` routes added. Existing `/board/[id]` untouched.
- [x] CSS via tokens only (grep-audited `breakout.css` — no `#` hex, only `var(--…)`).

No scope drift detected.

## Findings

### BLOCKER → fixed

1. **Hydration mismatch in `SectionShareClient`**
   - `typeof window` branch built different strings on server vs first-client render → React 19 would emit a hydration mismatch when initialToken is non-null.
   - Fix: moved absolute-URL computation into `useEffect`, initial render shows the relative path then upgrades.

2. **Timing-attack on token compare**
   - `ctx.token === section.accessToken` is not constant-time. Token is base64url(32 bytes) so leakage is limited, but easy to harden.
   - Fix: added `tokensEqual` using `crypto.timingSafeEqual`. Length-mismatch short-circuits (common case for rotated same-length tokens stays fast).

3. **`POST /api/sections/:id/share` 500 path when mock user missing in prod**
   - `getCurrentUser()` throws in prod when no NextAuth session and no seeded mock. Without a catch this returned 500 instead of 403.
   - Fix: `.catch(() => null)` + explicit `ForbiddenError("Sign-in required")` path.

### MAJOR

4. **Race on rotate vs section DELETE** — `findUnique` → `update`. If concurrent DELETE wins, update throws P2025 → 500.
   - Decision: acceptable for MVP (concurrent owner action is rare). Documented in `phase3/design_doc.md §5` and carried to retro.

### MINOR

5. **`SectionViewContext.classroomStudentId` is unused** in the helper body (only `studentClassroomId` is). Kept as a hook for a future "section membership table" plan, commented.
6. **Error-throw stringifies sectionId** (`\`Section ${sectionId} not found or not visible\``) — leaks the id to the client only through log/errorlog, not to the response body (routes translate to `{ error: "forbidden" }`). OK.

## Security-sensitive audit (light /cso in absence of skill)

| Area | Finding |
|---|---|
| Auth | `getCurrentUser` + `getCurrentStudent` reused; no new session primitive. |
| Authz | `viewSection` has explicit deny-by-default + three explicit allow paths. |
| Token generation | `crypto.randomBytes(32).toString("base64url")` — CSPRNG, ~256 bits entropy. |
| Token storage | Stored as-is (not hashed). Trade-off: owner must be able to display the current token so students can keep using the same link. Risk tolerated for MVP; flagged in retro to consider hash+display-once flow later. |
| SSRF / file upload | None introduced. |
| SQL | Prisma parameterized. |
| XSS | Text content rendered via React (escaped). CardAttachments handles link preview as before. |

## Test coverage

- Unit: realtime channel keys — 6 cases pass.
- `viewSection` — DB-backed, not covered by the existing synchronous test harness. Deferred to phase9 integration smoke (curl-based on live dev server).
- TypeScript: `tsc --noEmit` PASS after Prisma regenerate.

## Verdict

**PASS** — Blockers 1–3 resolved in a review-fix commit. Majors/minors documented, acceptable for MVP.

Marker created: `phase8/REVIEW_OK.marker`.
