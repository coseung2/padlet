# Phase 10 — Deploy Log (BR-5 ~ BR-9)

## Branch
- `feat/breakout-room-runtime` (worktree: `.claude/worktrees/agent-a8a0c4a4`)
- Base: `main` tip `24cb887` (BR-1~4 Foundation merge)

## 배포 상태
- **NOT pushed / merged per agent instruction.**
- Prisma 스키마 변경 없음 → DB 마이그레이션 불필요 (BreakoutMembership 등은 Foundation phase에서 적용됨)
- 새로 추가된 파일 / 수정된 파일:

### 신규 API routes
- `src/app/api/breakout/assignments/[id]/route.ts` (PATCH)
- `src/app/api/breakout/assignments/[id]/membership/route.ts` (POST)
- `src/app/api/breakout/assignments/[id]/membership/[mid]/route.ts` (PATCH, DELETE)
- `src/app/api/breakout/assignments/[id]/my-access/route.ts` (GET)
- `src/app/api/breakout/assignments/[id]/roster-import/route.ts` (POST)

### 신규 페이지
- `src/app/b/[slug]/select/page.tsx`
- `src/app/board/[id]/archive/page.tsx`

### 신규 컴포넌트
- `src/components/BreakoutSelectClient.tsx`
- `src/components/BreakoutAssignmentManager.tsx`

### 수정
- `src/lib/rbac.ts` — `assertBreakoutVisibility`, `maybeAutoJoinLinkFixed` 추가
- `src/app/api/sections/[id]/cards/route.ts` — breakout 가시성 가드 추가
- `src/app/board/[id]/page.tsx` — breakout 전용 로더 확장 (memberships + roster)
- `src/app/board/[id]/s/[sectionId]/page.tsx` — link-fixed auto-join + visibility gate
- `src/components/BreakoutBoard.tsx` — 교사 대시보드 확장
- `src/components/SectionBreakoutView.tsx` — auto-join warning prop

## 커밋 요약 (10개)
1. `docs(breakout-runtime): phase0-3 scope + architecture for BR-5~9`
2. `feat(breakout-runtime): phase7 BR-5 deploy modes — membership API + self-select page + link-fixed auto-join + BR-6 visibility gate in viewSection`
3. `feat(breakout-runtime): phase7 BR-7 teacher dashboard — assignment manager modal + per-group members + link-fixed link copy + session archive button`
4. `feat(breakout-runtime): phase7 BR-8 CSV roster import — multipart parser + classroom-scoped student upsert`
5. `feat(breakout-runtime): phase7 BR-9 archive view — read-only per-group summary + card list + activity timestamps`
6. `docs(breakout-runtime): phase8 REVIEW_OK — security audit for BR-5~9`
7. `docs(breakout-runtime): phase9 QA_OK — smoke for 3 deploy modes + visibility + archive + CSV import`
8. (phase10 — this log)
9. (phase11 — doc sync)

## 배포 검증 게이트
- `npm run build` ✓ PASS
- `npx tsc --noEmit` ✓ PASS
- `REVIEW_OK.marker` ✓
- `QA_OK.marker` ✓

## 다음 단계 (배포 담당자)
1. `feat/breakout-room-runtime` 브랜치를 사용자가 review 후 `main`에 merge
2. Vercel Production 배포는 main push 시 자동
3. 운영 Supabase (ap-northeast-2)에는 이미 Foundation phase에서 3 테이블 적용됨 — 추가 DB 변경 없음
