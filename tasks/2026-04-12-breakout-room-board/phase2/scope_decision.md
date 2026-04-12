# Phase 2 — Scope Decision (BR-1 ~ BR-4)

task_id: 2026-04-12-breakout-room-board
slug: breakout-room-board
decision_at: 2026-04-12

## 1. 스코프 (IN)
- **BR-1**: Prisma 스키마 확장 — BreakoutTemplate / BreakoutAssignment / BreakoutMembership + User/Section/Student 관계 필드 + Board.layout zod 확장
- **BR-2**: 시스템 템플릿 8종 시드 (`prisma/seed-breakout-templates.ts`) + `package.json` script
- **BR-3**: 교사 개설 플로우 — `CreateBreakoutBoardModal.tsx` + `POST /api/boards` 확장 (layout="breakout" 분기) + `BreakoutBoard.tsx` 교사 렌더
- **BR-4**: "모든 모둠에 복제" — `POST /api/breakout/assignments/[id]/copy-card` + BreakoutBoard UI 버튼

## 2. 스코프 (OUT — 다음 agent로 이월)
- BR-5: deployMode 런타임 분기 (link-fixed/self-select/teacher-assign)
- BR-6: own-only/peek-others 학생 WS 게이팅
- BR-7: 교사 학생 배정 관리 UI
- BR-8: 학생 명단 CSV import
- BR-9: 분석/통계 대시보드
- 월드카페 템플릿 (v2 파킹)
- Tier 결제 연동 (UI gating만 stub)

## 3. 수용 기준 (15개)
1. [ ] BreakoutTemplate 모델에 key, name, description, tier, requiresPro, scope, ownerId, structure(JSON), recommendedVisibility, defaultGroupCount, defaultGroupCapacity 필드 존재
2. [ ] BreakoutAssignment 모델에 boardId(unique), templateId, deployMode, groupCount, groupCapacity, visibilityOverride, status 필드 존재
3. [ ] BreakoutMembership 모델에 assignmentId, sectionId, studentId, role, joinedAt + @@unique([sectionId, studentId]) 존재
4. [ ] Board.layout zod enum에 "breakout" 추가
5. [ ] `prisma db push` 비파괴(Destructive change 0) 적용
6. [ ] 시스템 템플릿 8종 upsert 후 DB에 8행 존재 (key 기준)
7. [ ] Free 3종(kwl_chart, brainstorm, icebreaker) / Pro 5종(pros_cons, jigsaw, presentation_prep, gallery_walk, six_hats)
8. [ ] recommendedVisibility: own-only 6 / peek-others 2 (gallery_walk, presentation_prep)
9. [ ] `CreateBreakoutBoardModal` — 템플릿 그리드(Pro 배지) + 모둠 수(1-10) + 정원(1-6) + 열람 override
10. [ ] 보드 개설 시 BreakoutAssignment 1 + group sections N×S + teacher-pool 1 자동 생성
11. [ ] 교사가 모둠 A 섹션에 카드 추가 시 모둠 B 섹션에 영향 없음 (독립 복사)
12. [ ] BreakoutBoard 교사 뷰: 모든 모둠 탭/그리드 + 카드 컨텍스트 메뉴 "모든 모둠에 복제"
13. [ ] `POST /api/breakout/assignments/[id]/copy-card`: sourceCardId → 모든 group section INSERT (teacher-pool 제외)
14. [ ] Free tier 사용자가 Pro 템플릿 선택 시 업그레이드 CTA 표시
15. [ ] `npx tsc --noEmit` + `npm run build` PASS

## 4. 리스크 & 완화
| 리스크 | 영향 | 완화 |
|---|---|---|
| Prisma migration drift (Supabase) | 배포 실패 | `prisma db push` Dry-run (prisma db diff) 후 실행 |
| structure JSON 역전파 버그 | 템플릿 수정이 기존 보드로 전파 | 개설 시점에 `JSON.parse(JSON.stringify(structure))` deep clone으로 분리 |
| 교사가 Free인데 Pro 템플릿 선택 | 권한 우회 | UI disable + 서버에서 user.tier === "free" && template.requiresPro → 403 |
| 많은 모둠(10) × 많은 섹션(6, 예: 6색 모자) = 최대 60 섹션 | INSERT 성능 | Prisma $transaction + createMany 사용 |
| 카드 일괄 복제가 대량 (N=10) | WS 브로드캐스트 스파이크 | 복제는 단발 액션 — WS 브로드캐스트는 BR-6 scope에서 throttling |
| Tier 엔티티 부재 | gating stub 불완전 | ENV `TIER_MODE=free\|pro` + TODO 주석, BR-5~9 agent가 실제 결제 모델 구현 |

## 5. T0-① 재사용 전략 (필수)
- Section.accessToken **재마이그레이션 금지** — 이미 `20260412_add_section_access_token`에 존재
- `/board/[id]/s/[sectionId]/page.tsx` **수정 금지** — 학생 Breakout 뷰 재사용
- `src/lib/rbac.ts::viewSection` **수정 금지**
- BreakoutMembership 생성 시 section.accessToken을 rotate할 필요 없음 (교사가 별도로 관리)
- **학생 뷰 진입**: `/board/[id]/s/[sectionId]?token=...` URL은 BR-5에서 teacher가 배포

## 6. 수용 기준 ≥ 10개 + 리스크 분석 ✅
