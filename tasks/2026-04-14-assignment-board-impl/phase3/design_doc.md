# Design Doc — assignment-board

This task's phase3 output is split across three complementary files to
separate concerns. This file is the standard **feature-pipeline design_doc**
and indexes into them.

| File | Contents |
|---|---|
| `architecture.md` | 7-section standard + perf budget + RBAC 3-layer + rollback |
| `data_model.md` | Prisma schema delta + migration SQL + enum lock |
| `api_contract.md` | Endpoint specs + realtime channel + zod + rate limits |

---

## 1. 데이터 모델 변경

See `data_model.md`.

Summary:
- **NEW** `AssignmentSlot` entity — 10 fields, 4 indexes. 1:1 with pre-created Card.
- **ALTER** `Board` — 3 new columns (`assignmentGuideText`, `assignmentAllowLate`, `assignmentDeadline`).
- **ALTER** `Submission` — 1 nullable FK (`assignmentSlotId @unique`).
- **Migration**: non-destructive. `prisma migrate dev --name add_assignment_slot`. NO `db push --force-reset`.

## 2. API 변경

See `api_contract.md`.

Summary:
- **EXTEND** `POST /api/boards` — assignment layout branch (roster snapshot + trx).
- **NEW** 5 endpoints for slots / submission / reminder / roster-sync.
- **REFINE** `/api/parent/children/[id]/assignments` — AssignmentSlot-aware.
- Realtime: `assignmentChannelKey()` helper + 3 event types; `publish()` no-op for v1.

## 3. 컴포넌트 변경

See `architecture.md` §3.

Summary:
- **REWRITE** `src/components/AssignmentBoard.tsx` (keep filename; replace Submission+BoardMember logic with AssignmentSlot logic).
- **NEW** `<AssignmentFullscreenModal>`, `<AssignmentSlotCard>`, `<AssignmentGridView>`, `<AssignmentStudentView>`, `<ReturnReasonBanner>`, `<ParentAssignmentView>`.
- State: server components for initial load, `useOptimistic` (React 19) for in-flight transitions, `router.refresh()` post-mutation.

## 4. 데이터 흐름 다이어그램

See `architecture.md` §4 (board creation / student submit / teacher review).

## 5. 엣지케이스

See `architecture.md` §5 (E1–E10, ≥ required 5).

## 6. DX 영향

See `architecture.md` §6:
- New files: `src/types/assignment.ts`, `src/lib/assignment-schemas.ts`, `src/lib/assignment-state.ts`, `src/lib/__tests__/assignment-state.test.ts`.
- Dependency `sharp` needs `package.json` explicit declaration (already transitive).
- Non-destructive migration — zero downtime on Supabase `ap-northeast-2`.

## 7. 롤백 계획

See `architecture.md` §7:
1. Feature flag `ASSIGNMENT_V2_ENABLED` at UI layer.
2. Disable new endpoints (404) at API layer.
3. Destructive DB drop requires 30-day backup + user approval (memory `feedback_no_destructive_db`).

---

## 8. Phase 3 판정

**PASS** — 데이터 모델/API/컴포넌트/다이어그램/엣지(10건)/DX/롤백 7섹션 모두 충족. RBAC 3-레이어와 탭 S6 Lite 성능 예산 기준 명시. phase1 blocker 8건 전체에 정합 decision 반영. phase3 재실행 불필요.

**Gate**: phase4 design_planner 진입은 `phase4/BLOCKED.marker` 정책에 따라 **사용자 리뷰 필요** — complex UI + 탭 perf tradeoff + grid/modal UX 상세가 사용자 결정 영역.
