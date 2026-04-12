# Phase 7 — Implementation Notes

## 변경 파일
- `prisma/schema.prisma`: BreakoutTemplate/BreakoutAssignment/BreakoutMembership + 관계
- `prisma/seed-breakout-templates.ts`: 8종 시드 (Free 3 + Pro 5)
- `package.json`: `seed:breakout` 스크립트 추가
- `src/lib/tier.ts`: Tier gating stub
- `src/lib/breakout.ts`: structure zod 스키마 + cloneStructure
- `src/app/api/boards/route.ts`: layout="breakout" 분기 (트랜잭션 생성)
- `src/app/api/breakout/templates/route.ts`: GET 템플릿 목록
- `src/app/api/breakout/assignments/[id]/copy-card/route.ts`: 일괄 복제
- `src/components/CreateBreakoutBoardModal.tsx`: 3-step 개설 모달
- `src/components/BreakoutBoard.tsx`: 교사 풀뷰
- `src/components/CreateBoardModal.tsx`: 모둠 학습 레이아웃 추가
- `src/app/board/[id]/page.tsx`: breakout 렌더 분기

## DB 마이그레이션
- `prisma db push` 비파괴 적용 (Supabase ap-northeast-2) — 3 tables CREATE, 0 DROP
- `prisma migrate diff`로 확인 후 적용

## 시드 결과
```
inserted=8 updated=0 system_total=8
```

## 결정
- **Tier gating stub**: User 엔티티에 tier 필드 없어 `process.env.TIER_MODE`를 stub으로 사용. BR-5~9에서 실제 결제 연동 필요.
- **teacher-pool 식별**: template.structure.sharedSections 의 title set과 match. 개설 시점에 template이 deep clone되므로 이후 불변.
- **카드 일괄 복제의 origin section 제외**: 동일 섹션에 중복 생성 방지. 총 복제 수 = (group section count - 1).

## 타입체크 / 빌드
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS (9.2s 컴파일)
