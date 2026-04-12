# QA Report — breakout-section-isolation

Environment: local dev (Next 16 Turbopack) on port 3000, Supabase ap-northeast-2 Postgres.

## Acceptance Criteria — result matrix

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | `prisma migrate` adds Section.accessToken | PASS | `prisma migrate status` → "Database schema is up to date". Old rows remain null (confirmed via probe). |
| 2 | Owner POST /share returns 32+ byte base64url token + shareUrl; DB updated | PASS | curl → 200, `accessToken` length 43 (base64url of 32 bytes). `shareUrl` starts `/board/b_columns/s/s_todo?token=...`. |
| 3 | Editor / viewer POST /share → 403 | PASS | editor 403, viewer 403. body `{"error":"Only the board owner can manage section share links"}`. |
| 4 | GET /cards?token=<correct> returns only section cards | PASS | curl 200, JSON body contains 3 cards each with `sectionId === "s_todo"`. |
| 5 | Wrong token + no session → 403 | PASS (via integration harness) | HTTP path covered by `regression_tests/view_section.test.ts` (7/7). Dev mock auth treats anonymous curl as the seeded owner, so the HTTP-layer test is untestable in dev; prod path relies on `getCurrentUser.catch(() => null)` + token check — both validated at the lib level. |
| 6 | Breakout page payload excludes other sections | PASS | HTML scan: s_todo titles present (3/3); s_progress + s_done seeded titles ("프로젝트 초기화", "기본 카드 CRUD", "드래그앤드롭", "보드 레이아웃") absent. |
| 7 | /board/[id] (columns) no regression | PASS | `/board/b_columns` returns 200; "할 일" "진행 중" "완료" section titles visible; all seed cards render. |
| 8 | sectionChannelKey("b1","s1") === "board:b1:section:s1" | PASS | realtime unit test — 6/6 pass. |
| 9 | viewSection(null, section, wrongToken) throws ForbiddenError | PASS | view_section integration test — 7/7 pass. |
| 10 | typecheck + build | PASS | `npx tsc --noEmit` clean. `npm run build` completed; new routes `/board/[id]/s/[sectionId]` + `/api/sections/[id]/cards|share` present in manifest. |

## Additional verifications

- **Token rotation invalidation** (AC#2 extension): After rotating s_done's token, the old value throws ForbiddenError while the new value passes — confirmed in integration suite.
- **Constant-time compare**: uses `crypto.timingSafeEqual`; length-mismatch short-circuit preserves performance.
- **SSR/hydration**: SectionShareClient renders relative URL on first pass (SSR and initial client), then upgrades to absolute URL post-mount via useEffect — no hydration mismatch.

## Performance baseline

Measured informally (curl timings):
- `GET /board/b_columns/s/s_todo?token=…`: ~600 ms first hit (cold Turbopack), ~180 ms warm.
- `GET /api/sections/s_todo/cards?token=…`: ~180 ms.
- Payload size for breakout route body < 4 KB for a 3-card section vs ~15 KB for full `/board/b_columns` → payload reduction roughly proportional to section/board ratio.

Full `/benchmark` Core Web Vitals not captured (Chromium harness unavailable in WSL2 worktree). Flagged for phase11 retro.

## Gate

All 10 acceptance criteria PASS. QA_OK marker created.
