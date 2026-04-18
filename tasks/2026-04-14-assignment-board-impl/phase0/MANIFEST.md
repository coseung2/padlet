# Manifest — 2026-04-14-assignment-board-impl

- **Topic**: Aura-board에 "과제 배부·수거" 전용 보드 타입(`Board.layout="assignment"`)을 신설하여, 교사가 학급 로스터로부터 1-클릭 보드 생성 시 학생 수(N≤30)만큼 카드가 Student.number 순 결정론적 5×6 격자로 자동 인스턴스화되고, 제출/미제출이 썸네일+이진 상태 뱃지로 시각 구분되며, 풀스크린 모달이 제출물 검토·반려의 유일한 상호작용 표면이 되는 과제 수집 워크플로
- **Motivation**: 기존 일반 보드(post 방식)로는 "누가 냈고 누가 안 냈는지"를 교사가 직관적으로 확인하기 어려워 roster 대조·수동 집계·미제출 독려의 페인 포인트가 크므로, 보드 자체가 roster 기반 수거함 역할을 하도록 구조화
- **Scope**: full_exploration
- **Destination**: padlet INBOX
- **Routing reason**: scope=`full_exploration` + topic이 Aura-board 보드 타입 신설(교사/학생 저마찰 교실 학습 플로우)로 padlet destination 트리거 "Aura-board · 교실 학습 · Board/Card/Submission 스키마" 정확 매칭
- **Seed ID**: `seed_38c34e91bf28` (ambiguity 0.083, exit_conditions 4건 모두 충족)
- **Parent seed**: — (신규 시드, 기존 시드 대체 없음)
- **Delivered at**: 2026-04-14T14:20:00+09:00
- **Supersedes**: — (Seed 3 event-signup·Seed 6 Breakout·Seed 7-v2 parent-viewer 모두 병존 확장, supersede 관계 없음)
- **Related ideation docs**:
  - `plans/assignment-board-roadmap.md` (신규 살아있는 설계 문서, 12개 절)
  - `plans/tablet-performance-roadmap.md` (§2a 신규 절 — 30-카드 5×6 성능 예산)
  - `plans/event-signup-roadmap.md` (Submission 네임스페이스 분리 합의 절)
  - `plans/parent-viewer-roadmap.md` (§5 자녀 범위 매트릭스 + §6 `/parent/child/[id]/assignment` 라우트)
  - `plans/seeds-index.md` (Seed 11 섹션 + 의존성 그래프 5건)
  - `plans/phase0-requests.md` (assignment-board AB-1 + AB-2~AB-10)
  - `plans/implementation-roadmap.md` (Canva 시너지 참조)
  - `canva-assignment-pdf-merge/SKILL.md` (Canva 과제 PDF 병합 스킬 관계)

## Delivered files (6)

| File | Source | Purpose |
|---|---|---|
| `request.json` | phase6/padlet_phase0_request.json | padlet feature 파이프라인 phase0 진입 포맷 |
| `handoff_note.md` | phase6/handoff_note.md | 배경·필수 독해 순서·수용 기준 체크리스트·주의사항 |
| `seed.yaml` | phase4/seed.yaml | Ouroboros 시드 (SSoT, ambiguity 0.083) |
| `decisions.md` | phase3/decisions.md | Ouroboros interview 결정 로그 (Q1~Q7, 자율 답변) |
| `context_links.md` | (신규) | ideation 기준 상대 경로 문서 맵 |
| `MANIFEST.md` | (신규) | 본 배송 매니페스트 |

## Quality gates passed

- ambiguity_score 0.083 ≤ 0.2 (exit_conditions all_questions_resolved)
- 5개 필수 파일 + MANIFEST 동시 존재
- context_links.md는 ideation 기준 상대 경로 사용 (`plans/...`)
- seeds-index.md에 Seed 11 등재 완료 (phase5 integrator 처리)
- padlet_phase0_request.json context_refs 10개 모두 실재 파일 (phase6 handoff-writer 검증)
- 기존 INBOX 폴더와 slug 충돌 없음 (신규 폴더 생성)

## Next step (padlet 측)

padlet feature 파이프라인 phase0 analyst가 `request.json` 소비 → phase1~phase10 순차 진행. 임의 결정 금지, seed 범위 밖 항목은 ideation 오케스트레이터 에스컬레이션 (handoff_note.md §주의사항 참조).
