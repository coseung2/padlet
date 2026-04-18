# Context Links — Assignment Board v1 (Seed 11)

경로 기준: **ideation 루트** (`../ideation/` 상대, padlet 소비자가 그대로 복사해 사용 가능)

## 1. Task 산출물 (감사 이력)

- `tasks/2026-04-14-assignment-board-impl/phase0/request.json` — 최초 ideation 요청
- `tasks/2026-04-14-assignment-board-impl/phase1/exploration.md` — 비교 레퍼런스 6종(Google Classroom · Microsoft Teams · Seesaw · Canvas · Moodle · Padlet + TriDis) 장단점
- `tasks/2026-04-14-assignment-board-impl/phase2/sketch.md` — 데이터 모델 초안·사용자 흐름·미결 질문
- `tasks/2026-04-14-assignment-board-impl/phase3/decisions.md` — Ouroboros interview 로그 (ambiguity 0.083 수렴, Q1~Q7)
- `tasks/2026-04-14-assignment-board-impl/phase4/seed.yaml` — **SSoT 시드**
- `tasks/2026-04-14-assignment-board-impl/phase5/updated_docs.md` — 갱신된 plan 5건 요약
- `tasks/2026-04-14-assignment-board-impl/phase5/new_docs.md` — 신규 plan 1건 요약
- `tasks/2026-04-14-assignment-board-impl/phase6/padlet_phase0_request.json` — padlet 진입 포맷 원본
- `tasks/2026-04-14-assignment-board-impl/phase6/handoff_note.md` — 핸드오프 노트 원본

## 2. 살아있는 설계 문서 (plans/)

필수 독해 순서 (handoff_note.md §"참조 문서 필수 독해 순서"와 동일):

1. `plans/assignment-board-roadmap.md` — **신규 로드맵**. 12개 절 (핵심 명제 / Board 확장 스키마 / AssignmentSlot 스키마 / 상태 머신 / UI 엔트리포인트 / 학급 N 정책 / 역할별 흐름 / 태블릿 체크리스트 / 관련 로드맵 / 작업 분할 AB-1~AB-10 / 수용 기준 / v2+ 파킹 + 리스크)
2. `plans/tablet-performance-roadmap.md` — **§2a 신규 절**: 30-카드 5×6 정형 격자 성능 예산 (DOM ≤30·자식 ≤6·썸네일 160×120 WebP·CSS 상태 토글·S-Pen 금지·iframe 금지·WebSocket `board:${id}:assignment` 단일 채널 + phase9 QA 게이트 7개)
3. `plans/event-signup-roadmap.md` — **Submission 엔티티 공유 절**: `Submission.status`(event-signup 6값) vs `AssignmentSlot.submissionStatus`(assignment 6값) 네임스페이스 분리, Zod layout 기반 분기, `SubmissionHistory` 공통 v2 파킹
4. `plans/parent-viewer-roadmap.md` — **§5 자녀 범위 매트릭스 + §6 라우트 트리**: `AssignmentSlot.studentId ∈ parent.children` 필터, 5×6 미렌더, `/parent/child/[id]/assignment`. 구현은 기존 PV-7 서버 필터에서 처리
5. `plans/seeds-index.md` — **Seed 11 섹션**: 핵심 결정 14축, 의존성 그래프 5건 (Board.layout 패턴·Submission 네임스페이스 분리·자녀 범위 매트릭스·tablet §2a·Canva 시너지)
6. `plans/phase0-requests.md` — **assignment-board 섹션**: AB-1 마이그레이션 + AB-2~AB-10 통합 feature 2개의 JSON 등재본
7. `plans/implementation-roadmap.md` — Canva 통합 레퍼런스 (Seed 11과 Canva 시너지 관계)

## 3. 관련 시드·이전 결정

- `tasks/2026-04-12-breakout-room-board/phase4/seed.yaml` — `Board.layout` 확장 패턴(Seed 6) 선례
- `tasks/2026-04-13-parent-class-invite-refine/phase2/delta.md` — 학부모 뷰 요건 (Seed 7-v2) 델타
- `canva-assignment-pdf-merge/SKILL.md` — Canva 과제 PDF 병합 스킬 (Seed 11 Canva 시너지)

## 4. 메모리 (프로젝트 상수)

- 기준 디바이스: 갤럭시 탭 S6 Lite (Chrome Android + S-Pen). iPad 아님
- 태블릿 성능 최우선 제약 (Padlet·Canva 모두 태블릿 렉)
- 매트릭스 뷰는 owner+데스크톱 전용 (editor·viewer·태블릿 제외)
- Aura-board 타겟: 학생·교사
- Padlet 상위 폴더는 읽기 전용 (dispatcher의 INBOX/ 쓰기만 예외)

## 5. 경로 변환 참고

이 INBOX는 `{Obsidian Vault}/padlet/INBOX/2026-04-14-assignment-board-impl/`에 위치. padlet 파이프라인에서 ideation 문서를 참조할 때:

- padlet 기준 상대 경로: `../../../ideation/plans/assignment-board-roadmap.md`
- 절대 경로: `/mnt/c/Users/심보승/Desktop/Obsidian Vault/ideation/plans/assignment-board-roadmap.md`

본 파일의 모든 상대 경로는 **ideation 루트 기준**이므로, padlet 소비자는 앞에 `../ideation/`을 붙이거나 절대 경로로 해석해야 한다.
