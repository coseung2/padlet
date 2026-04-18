# Manifest — 2026-04-12-parent-viewer-access

- **Topic**: Aura-board 전반에 걸친 학부모(Parent/Viewer) 역할 본체 구현 — 자녀(학생) 한정 열람 전용 접근 기능을 인증·RBAC·공유 정책 레이어에서 cross-cutting 하게 도입
- **Motivation**: 그림보드(Seed 1)·식물관찰일지(Seed 4) 등 개별 시드에서 "학부모가 자녀 것은 공유 여부 무관 항상 열람"이 이미 결정돼 있으나, 정작 학부모 계정·로그인 경로·자녀 매핑·RBAC 분기·디바이스(스마트폰) UX가 부재해 약속한 기능이 작동 불가. BoardMember.role 확장('parent' 추가 고려)도 예정 상태로만 메모리에 남아있어 실제 배포 차단 중.
- **Scope**: full_exploration
- **Destination**: padlet INBOX
- **Routing reason**: scope=full_exploration + topic="Aura-board 학부모 뷰(Parent/Viewer) cross-cutting" — _registry.md의 padlet 트리거 키워드("Aura-board", "학생·교사·보드") 직접 매칭. 7개 미결 질문 해소 및 Seed 1·3·4·6과의 cross-cutting 통합 특성상 Aura-board 상위 feature 파이프라인(padlet/prompts/feature)이 유일 수용 지점.
- **Seed ID**: `seed_37b35654542f` (ambiguity 0.074, 임계 0.20 통과)
- **Interview ID**: `interview_20260412_111153`
- **Delivered at**: 2026-04-12T20:35:00+09:00
- **Supersedes**: —

## Related canva project docs

- `plans/parent-viewer-roadmap.md` — Seed 7 SSOT (§0~§11, §5 자녀 범위 cross-cutting 매트릭스 정본)
- `plans/drawing-board-library-roadmap.md` — Seed 1: 학부모 열람 범위(StudentAsset studentId ∈ parent.children, presigned 썸네일)
- `plans/plant-journal-roadmap.md` — Seed 4: §3.4 학부모 뷰 PJ-8 Seed 7 이관
- `plans/event-signup-roadmap.md` — Seed 3: 학급 이벤트 메타 허용, 자녀 본인 Submission만, 참가자 명단·득점 마스킹
- `plans/breakout-room-roadmap.md` — Seed 6: §8 BreakoutMembership 필터, teacher-pool 제외, 자녀 모둠 한정
- `plans/tablet-performance-roadmap.md` — 스마트폰 PWA/갤럭시 탭 S6 Lite TTI·이미지·썸네일 성능 예산 승계
- `plans/seeds-index.md` — Seed 7 등록 및 cross-cutting 의존성 맥락
- `plans/phase0-requests.md` — PV-1~PV-12 padlet 진입 JSON 블록 원본
- `plans/implementation-roadmap.md` — 전체 implementation 맥락

## 포함 파일

- `MANIFEST.md` (본 문서)
- `request.json` — padlet feature phase0 포맷
- `handoff_note.md` — padlet feature Phase 0 analyst 수신자용 가이드
- `seed.yaml` — Seed 7 전문 (4종 신규 모델 + evaluation_principles + exit_conditions)
- `decisions.md` — Phase 3 미결 7건 + 파생 8건 + 보충 2건 해소 요약
- `context_links.md` — canva project 내 관련 문서 상대 경로 지도

## 소비 가이드 (padlet 측)

1. `handoff_note.md` 상단 "참조 문서 필수 독해 순서" 8개를 순서대로 소화
2. `request.json`을 padlet `tasks/2026-04-12-parent-viewer-access-impl/phase0/request.json`으로 이식 → feature 파이프라인 phase0 analyst 실행
3. `seed.yaml`의 acceptance_criteria 14개 및 E2E 게이트(403/404/≤60s revoke)를 padlet phase9 검증 게이트에 반영
4. SSOT 준수: cross-cutting 매트릭스 충돌 시 `parent-viewer-roadmap.md §5`가 정본

## 삭제 가능 조건

padlet feature 파이프라인 phase0~phase9 완료 및 PV-1~PV-12 구현 착수 이후 자유롭게 삭제 가능. 본 INBOX는 자립 설명 문서이며 원본은 canva project/tasks/2026-04-12-parent-viewer-access/ 에 보존됨.
