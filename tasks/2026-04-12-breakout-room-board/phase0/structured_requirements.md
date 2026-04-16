# Phase 0 — Structured Requirements (BR-1 ~ BR-4)

task_id: 2026-04-12-breakout-room-board
slug: breakout-room-board
type: feature
sub_scope: **BR-1 ~ BR-4** (foundation only)
deferred_to_followup_agent: BR-5 ~ BR-9

## 1. 문제 정의
- 교사는 협력학습을 "모둠 1/2/3/4" 식으로 분리된 작업공간에 배포할 수 없다
- 템플릿(KWL, 브레인스토밍, 찬반 토론 등)을 재사용할 표준 카탈로그가 없다
- 모둠 간 작업 격리(한 모둠 수정이 다른 모둠에 새지 않음) 구조가 없다

## 2. 사용자 목표
- **교사**: 3클릭 내 모둠 보드 개설, 카드 일괄 배포, 모둠별 독립 관리
- **학생(foundation 이후)**: 자기 모둠 섹션만 보이는 격리 뷰(T0-①로 이미 구축됨)

## 3. 입력 (핸드오프 참조)
- `decisions.md` Q1~Q7 확정
- `seed.yaml` acceptance_criteria 12개
- `handoff_note.md` 수용 기준 체크리스트
- `breakout-room-roadmap.md §2` Prisma 모델 사양

## 4. 출력 (foundation)
- Prisma 3개 모델 + 관계 필드
- 시스템 템플릿 8종 upsert 시드
- `POST /api/boards` 확장 (layout="breakout")
- `POST /api/breakout/assignments/[id]/copy-card` 신규
- `BreakoutBoard.tsx` 교사 뷰
- `CreateBreakoutBoardModal.tsx` 개설 모달

## 5. 비기능 요구
- SQLite→Postgres 포터블 스키마 유지
- 갤럭시 탭 S6 Lite 기준 성능 예산 (이 agent는 foundation만 → WS 성능 측정은 BR-5/6에서)
- Tier gating (Free=3 / Pro=8), 업그레이드 CTA

## 6. 제약
- **BreakoutGroup 신설 금지**. Section 재활용
- **T0-① (Section.accessToken) 재마이그레이션 금지**
- **템플릿 복사 방식**: 템플릿 원본 수정이 기존 Board로 역전파되지 않음
- **teacher-pool은 보드 레벨 단일 섹션**
- 월드카페 템플릿은 v2 파킹

## 7. 수용 기준 (12개, handoff 1:1)
- [ ] BreakoutTemplate에 id/name/tier/structure/recommendedVisibility/defaultGroupCount/defaultGroupCapacity 존재
- [ ] BreakoutAssignment에 id/boardId/templateId/deployMode/groupCount/groupCapacity/visibilityOverride/status 존재
- [ ] 배포모드 enum 3종 저장 검증 (런타임 분기는 BR-5)
- [ ] visibilityOverride + recommendedVisibility 열람 모드 저장/기본값
- [ ] 기본 4모둠·정원 6명·상한 10모둠 적용
- [ ] 시스템 템플릿 8종 (Free 3 + Pro 5) 등록
- [ ] Free 3 / Pro 5 Tier gating (선택 UI에서 잠금)
- [ ] recommendedVisibility own-only 6 / peek-others 2 세팅
- [ ] 한 모둠 섹션 수정 시 타 모둠 영향 없음 (복사 독립성)
- [ ] "모든 모둠에 이 카드 복제" 버튼 + 서버 액션
- [ ] 템플릿 원본 수정 역전파 없음 (structure deep-copy)
- [ ] isPublic 반 공개 기본값 유지
- [ ] `prisma db push` 비파괴 적용
- [ ] `tsc --noEmit` + `next build` PASS

## 8. out-of-scope (다음 agent)
- BR-5: deployMode 런타임(link-fixed/self-select/teacher-assign) 링크 배포·학생 배정 UI
- BR-6: own-only/peek-others WS 게이팅
- BR-7: 교사 배정 관리 UI
- BR-8: 학생 명단 import
- BR-9: 분석/통계
