# Handoff — Breakout Room Board → padlet feature 파이프라인

> task_id: `2026-04-12-breakout-room-board`
> seed_id: `seed_bb1d4eb1c442`
> 작성: 2026-04-12 (canva project · handoff-writer / phase 6)
> 수신: padlet `prompts/feature/phase0_analyst.md` 파이프라인

## 배경

Aura-board 플랫폼에 교사가 모둠 협력학습 보드를 템플릿 기반으로 개설·배포·관리하는 **Breakout Room 보드** 기능을 신설한다. Section 엔티티를 재활용하여 `BreakoutTemplate`·`BreakoutAssignment` 2종만 추가하며, 3배포모드(link-fixed·self-select·teacher-assign)·3열람모드·7종 시스템 템플릿(Free 3 + Pro 4 + Pro 예비 1종) 및 모둠별 독립 복사 모델을 확정 스펙으로 구현한다. 갤럭시 탭 S6 Lite(Chrome Android + S-Pen)가 기준 단말이며, 섹션 격리 뷰(T0-①)가 모든 구현의 선행 전제다.

## 참조 문서 — 필수 독해 순서

1. `canva project/plans/seeds-index.md` — Seed 6(Breakout Room) 행 및 핵심 결정 표(Section 재활용·템플릿 8종·Free 3/Pro 5·own-only 기본·v1 학생이동 불허·복사 방식·teacher-pool 단일·isPublic=true) + 의존성 그래프에서 Seed 6 ↔ T0-① / Seed 1 / Seed 2 관계 파악
2. `canva project/plans/tablet-performance-roadmap.md` §5 `T0-①` — 섹션 격리 Breakout 뷰. **BR-5/BR-6 착수 전 반드시 완료되어야 함.** Section.accessToken 선행 마이그레이션 중복 금지 규칙 포함
3. `canva project/plans/breakout-room-roadmap.md` — 본 feature의 주 로드맵. §1 설계 전제 → §2 Prisma 데이터 모델(BreakoutTemplate·BreakoutAssignment·BreakoutMembership) → §3 작업 분할 BR-1~BR-9 (+파킹 BR-A~D) → §4 의존 로드맵 상호 참조 → §5 수용 기준 → §6 리스크 완화 → §7 파킹
4. `canva project/tasks/2026-04-12-breakout-room-board/phase3/decisions.md` — 인터뷰 Q1~Q7 확정 답변 및 ambiguity score 0.147 근거
5. `canva project/plans/phase0-requests.md` 의 **BR-1 ~ BR-9 블록** — padlet 파이프라인 진입용 9개 JSON 블록. `context_refs`로 `breakout-room-roadmap.md`·`tablet-performance-roadmap.md`(T0-①)·`drawing-board-library-roadmap.md` 링크됨
6. `canva project/plans/drawing-board-library-roadmap.md` 하단 "재사용 포인트 (Seed 6 참조)" — AssetAttachment 복사 패턴·"템플릿 고르기" 모달 UX가 BR-3/BR-4에 승계됨

## 기준 단말 · 제약

- **기준 디바이스**: 갤럭시 탭 S6 Lite(Chrome Android + S-Pen). 태블릿 성능 최우선. TTI < 3s, 4모둠 개설 < 5초 예산 준수
- **선행 의존**: `tablet-performance-roadmap.md` T0-①(섹션 격리 Breakout 뷰) **완료 전** BR-5/BR-6 착수 금지
- **엔티티 최소화**: Section 엔티티 재활용, `BreakoutGroup` 신설 금지. 신규 엔티티는 `BreakoutTemplate`·`BreakoutAssignment` 2종만
- **격리 · 복사 원칙**: 템플릿 복제는 복사 방식(역전파 없음). 모둠 간 완전 격리, GPL(갤럭시 퍼포먼스 로직) 및 own-only 학생은 다른 모둠 WS 이벤트 0건 수신
- **teacher-pool**: 보드 레벨 단일 공유 섹션으로만 존재
- **v1 스코프**: 학생 모둠 이동 불허(교사 재배정만), 월드카페 v2 파킹, 시스템 템플릿 7종 + Pro 예비 1종(6색 모자)
- **Tier**: Free(반 5개·시스템 템플릿 3종·커스텀 3개) / Pro(₩9,900/월·반 무제한·시스템 전체·커스텀 무제한·학교 공용)
- **기본값**: 4모둠·정원 6명·상한 10모둠, isPublic=true, 교사 전체 접근 권한 항상 보장

## 이번 작업 (seed.goal)

> Aura-board 플랫폼에 Breakout Room 기능을 설계한다 — **BreakoutTemplate**·**BreakoutAssignment** 두 엔티티를 신설하고, 갤럭시 탭 S6 Lite 기준 3배포모드·3열람모드·7종 시스템 템플릿(Free 3 + Pro 4)·모둠별 독립 복사 모델을 확정 스펙으로 구현한다.

## 수용 기준 체크리스트

아래 항목은 `phase4/seed.yaml`의 `acceptance_criteria`와 1:1 매핑된다.

- [ ] BreakoutTemplate 엔티티에 `id`·`name`·`tier`·`structure`·`recommendedVisibility`·`defaultGroupCount`·`defaultGroupCapacity` 필드가 존재한다
- [ ] BreakoutAssignment 엔티티에 `id`·`boardId`·`templateId`·`deployMode`·`groupCount`·`groupCapacity`·`visibilityOverride`·`status` 필드가 존재한다
- [ ] 배포모드 3종(`link-fixed`·`self-select`·`teacher-assign`)이 모두 동작한다
- [ ] 열람모드 2종(`own-only`·`peek-others`)이 학생 기준으로 적용되며 교사는 항상 전체 접근 가능하다
- [ ] 모둠 기본값: 4모둠·정원 6명·상한 10모둠이 BreakoutAssignment 생성 시 기본 적용된다
- [ ] v1 시스템 템플릿 7종(KWL 차트·브레인스토밍·아이스브레이커·찬반 토론·Jigsaw·모둠 발표 준비·갤러리 워크) + Pro 예비 1종(6색 모자) 총 8종이 등록된다
- [ ] Free 3종(KWL·브레인스토밍·아이스브레이커)은 Free Tier에서 접근 가능하고 나머지 5종은 Pro 전용이다
- [ ] 템플릿별 `recommendedVisibility`가 own-only 5종(KWL·브레인스토밍·찬반 토론·Jigsaw·아이스브레이커)·peek-others 2종(갤러리 워크·모둠 발표 준비)으로 설정된다
- [ ] 교사가 한 모둠 섹션을 수정해도 다른 모둠 복사본에 영향 없다
- [ ] 교사 UI에 "모든 모둠에 이 카드 복제" 단발 액션 버튼이 존재한다
- [ ] 템플릿 원본 수정이 기존 Board에 역전파되지 않는다
- [ ] 반 공개(public) 기본값이 적용된다

## 주의사항

- **padlet feature 파이프라인 준수**: 본 핸드오프는 padlet `prompts/feature/phase0_analyst.md` 진입 지점이다. phase0 → phase1 → … 순서를 건너뛰지 말 것
- **임의 결정 금지**: `phase3/decisions.md`·`breakout-room-roadmap.md`에 명시되지 않은 스펙은 임의로 확정하지 말고 사용자 또는 canva project ideation 파이프라인으로 역질의
- **T0-① 선행 필수**: `tablet-performance-roadmap.md` T0-① (섹션 격리 Breakout 뷰) 완료 전 BR-5(자체 선택 / 교사 배정 런타임)·BR-6(학생 열람모드 WS 게이팅) 착수 금지. Section.accessToken 선행 마이그레이션을 중복 수행하지 말 것
- **Section 재활용**: BreakoutGroup 같은 신규 엔티티 제안 금지. GroupSection은 Section 역할 필드 확장으로 처리
- **복사 방식**: 템플릿 업데이트가 이미 배포된 Board/Assignment로 역전파되지 않아야 한다. "모든 모둠에 이 카드 복제"만 명시적 단발 액션
- **태블릿 성능 예산**: 모든 구현은 갤럭시 탭 S6 Lite에서 TTI < 3s, 4모둠 개설 < 5초, own-only 학생의 타 모둠 WS 수신 0건을 지켜야 한다
- **Tier 가드**: Free Tier에서 Pro 전용 5종 템플릿 접근 차단(BR-2/BR-3에서 검증)

## 핸드오프 산출물

- `canva project/tasks/2026-04-12-breakout-room-board/phase6/padlet_phase0_request.json`
- `canva project/tasks/2026-04-12-breakout-room-board/phase6/handoff_note.md` (본 문서)
