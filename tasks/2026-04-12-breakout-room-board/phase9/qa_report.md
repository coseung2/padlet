# Phase 9 — QA Report

## 실행 환경
- DB: Supabase Postgres (ap-northeast-2)
- Prisma Client v6.19.3
- Node tsx runtime

## 수용 기준 결과 (15개)

| # | 항목 | 상태 | 증거 |
|---|---|---|---|
| 1 | BreakoutTemplate 필드 | PASS | Prisma schema lines 수정 + validate OK |
| 2 | BreakoutAssignment 필드 | PASS | schema + 트랜잭션 생성 성공 |
| 3 | BreakoutMembership + @@unique | PASS | schema |
| 4 | Board.layout zod "breakout" | PASS | POST /api/boards route |
| 5 | prisma db push 비파괴 | PASS | 3 CreateTable, 0 Drop (migrate diff) |
| 6 | 시스템 템플릿 8종 | PASS | smoke assert: 총 8종 |
| 7 | Free 3 / Pro 5 매핑 | PASS | smoke assert: kwl/brainstorm/icebreaker=Free; jigsaw=Pro |
| 8 | recommendedVisibility 2 peek / 6 own | PASS | smoke assert: gallery_walk + presentation_prep = peek-others |
| 9 | 모달 Pro 배지 + 잠금 | PASS | CreateBreakoutBoardModal aria-disabled + 🔒 배지 |
| 10 | N×S + 1 자동 생성 | PASS | smoke: 4*3+1=13 섹션 |
| 11 | 모둠 독립성 | PASS | smoke: 모둠 1에 카드 추가 → 모둠 2 미영향 |
| 12 | BreakoutBoard 뷰 + 컨텍스트 메뉴 | PASS | 빌드 포함, 모든 group section 렌더 |
| 13 | copy-card API | PASS | smoke: 13-1(pool)-1(origin)=11개 복제 |
| 14 | Free tier Pro 템플릿 CTA | PASS | 모달 aria-disabled + 서버 403 검증 |
| 15 | typecheck + build | PASS | tsc 0 err, next build 9.2s OK |

추가 검증:
- 역전파 방지: cloneStructure 수정 → 기존 Section 불변 **PASS**
- Cascade 삭제: Board delete → Assignment/Section/Card 제거 **PASS**
- teacher-pool 제외: copy-card가 '팀 공용 자료' 섹션에 복제하지 않음 **PASS**

## 결론: QA_OK
