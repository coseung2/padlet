# Phase 8 — Code Review (Self-Review as Orchestrator)

## 체크리스트

### 보안
- [x] **교사 전용 액션 (BR-4 copy-card)**: role === "owner" 강제. editor는 403.
- [x] **Tier 서버 검증**: `/api/boards` breakout 분기에서 requiresPro && tier==="free" 시 403.
- [x] **구조 주입 공격**: `structure` JSON은 `TemplateStructureSchema` zod 검증 후 deep clone. 악의적 필드 차단.
- [x] **SQL/Prisma 주입 없음** — 모든 쿼리 파라미터화.
- [x] **Cross-board 카드 복제 방지**: sourceCard.boardId !== assignment.boardId 체크.
- [x] **Template 없음 시 404**: 조용한 실패 방지.

### 정확성 (수용 기준 대응)
- [x] Board.layout zod에 "breakout" 포함
- [x] 3모델 + 관계 필드 모두 선언 (User.templatesOwned, Section.breakoutMemberships, Student.breakoutMemberships, Board.breakoutAssignment)
- [x] 8종 시드 upsert로 멱등
- [x] tier/requiresPro 매핑: free 3 (kwl_chart, brainstorm, icebreaker) / pro 5 (pros_cons, jigsaw, presentation_prep, gallery_walk, six_hats)
- [x] recommendedVisibility: own-only 6 (kwl, brainstorm, icebreaker, pros_cons, jigsaw, six_hats) / peek-others 2 (presentation_prep, gallery_walk)
- [x] 보드 개설: Board + Assignment + N×S group sections + 1 teacher-pool (있을 때) + defaultCards
- [x] 독립성: JSON.parse(JSON.stringify) deep clone, Section 각각 INSERT → 모둠 간 완전 격리
- [x] 템플릿 역전파 없음: cloneStructure 호출 시점에 분리됨
- [x] "모든 모둠에 복제": teacher-pool 제외, origin 제외, 모든 group section에 INSERT

### 성능
- [x] 트랜잭션으로 일괄 INSERT (N=10 × S=6 + 1 = 61 row 최악)
- [x] groupSectionIds 사전 계산 (한 번의 findMany)
- [ ] N=10 × S=6 카드 per section 시 복제는 순차 — 대량일 때 느릴 수 있음. (foundation 스코프 내 accept)

### 코드 품질
- [x] zod 스키마는 `src/lib/breakout.ts`에 단일 소스
- [x] Tier gating 단일 진입점 `getCurrentTier()` — BR-5~9에서 실제 User.tier 필드로 swap 용이
- [x] `groupSectionTitle()`로 "모둠 N · 섹션명" 포맷 통일 — BreakoutBoard parseGroupSection과 대칭
- [x] 기존 라우트 (`/api/boards` non-breakout) 동작 변경 없음
- [x] 기존 컴포넌트 (ColumnsBoard 등) 변경 없음

### 미결 (BR-5~9로 이월)
- ~ Student 뷰에서 own-only/peek-others WS 게이팅 (BR-6)
- ~ BreakoutMembership 생성 (BR-5: self-select / teacher-assign)
- ~ deployMode 런타임 분기 (BR-5)
- ~ 실제 Tier/결제 모델 (BR-5~9 전체 스펙)

### 빌드 / 타입
- `npx tsc --noEmit` PASS
- `npm run build` PASS (9.2s)

## 결론: REVIEW_OK
