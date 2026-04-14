# Handoff Note — Assignment Board v1 (Seed 11)

- **task_id**: `2026-04-14-assignment-board-impl`
- **seed_id**: `seed_38c34e91bf28` (ambiguity 0.083)
- **parent_seed_id**: null (신규 시드, 기존 시드 대체 없음)
- **작성일**: 2026-04-14
- **목적지**: padlet feature 파이프라인 phase0 진입

---

## 배경

Aura-board에 **학급 로스터 기반 과제 수집 보드**(`Board.layout = "assignment"`)를 신설한다. 교사는 학급 명렬표로부터 1-클릭으로 보드를 생성하고, 학생 수 N(≤30)만큼 카드가 Student.number 순 5×6 격자로 자동 배치된다. 제출/미제출은 썸네일(Seesaw) + 이진 상태 뱃지(Moodle) 하이브리드로 표시되며, 카드 클릭 시 풀스크린 모달이 유일한 검토·반려 진입점이다. 기존 `Board.layout` 확장 패턴과 `Submission` 엔티티 재사용을 통해 태블릿(갤럭시 탭 S6 Lite) 성능을 보전하면서 v1 신규 엔티티는 `AssignmentSlot` 단 1개로 제한한다.

---

## 참조 문서 필수 독해 순서

1. `tasks/2026-04-14-assignment-board-impl/phase4/seed.yaml` — **Seed 원문**. goal·constraints(18건)·acceptance_criteria(14건)·ontology_schema(AssignmentBoardDomain 15필드)·evaluation_principles(5축)·exit_conditions(4건) 확정. 이 문서가 단일 진실 원천(SSoT).
2. `plans/assignment-board-roadmap.md` — **살아있는 설계 문서**. 12개 절(핵심 명제 5 primitive / Board 확장 스키마 / AssignmentSlot 스키마 / 상태 머신 전이도·재제출 매트릭스 / UI 엔트리포인트 표 / 역할별 흐름 / 태블릿 체크리스트 / 관련 로드맵 / 작업 분할 AB-1~AB-10 / 수용 기준 13종 / v2+ 파킹 / 리스크). padlet phase1 이후 설계 확장 시 첫 독해 대상.
3. `plans/tablet-performance-roadmap.md` (§2a 신규 절) — **30-카드 5×6 정형 격자 성능 예산**: DOM ≤30카드 · 카드당 자식 ≤6 · 썸네일 160×120 WebP · CSS 상태 토글 · S-Pen 카드 금지 · iframe v1 금지 · WebSocket `board:${id}:assignment` 단일 채널 등 12개 지표 + phase9 QA 게이트 7개. 구현 중 성능 회귀 판정 기준.
4. `tasks/2026-04-14-assignment-board-impl/phase3/decisions.md` — Ouroboros `/interview` 로그 (ambiguity 0.083 수렴). Q1~Q7 의사결정 근거(참여 보드 기준 복사 vs AssignmentSlot 신규 · N≤30 하드리밋 · 5×6 결정론 vs 자유 드래그 · 반려 사유 필수 · Submission.feedback 재사용 등).
5. `tasks/2026-04-14-assignment-board-impl/phase2/sketch.md` — 데이터 모델 초안·사용자 흐름·미결 질문. phase3 인터뷰의 원재료.
6. `tasks/2026-04-14-assignment-board-impl/phase1/exploration.md` — 비교 레퍼런스 6종(Google Classroom · Microsoft Teams · Seesaw · Canvas · Moodle · Padlet + TriDis) 장단점. UX 결정의 근거.
7. `plans/event-signup-roadmap.md` (Submission 공유 절) — `Submission.status`(event-signup 6값) ↔ `AssignmentSlot.submissionStatus`(assignment 6값) 네임스페이스 분리 합의. Zod layout 기반 분기 정책.
8. `plans/parent-viewer-roadmap.md` (§5 매트릭스 + §6 라우트) — 학부모 자녀 범위: `AssignmentSlot.studentId ∈ parent.children` 서버 필터, 5×6 미렌더, `/parent/child/[id]/assignment`. 구현은 기존 PV-7에서 처리.
9. `plans/seeds-index.md` (Seed 11 섹션) — 다른 시드와의 의존성 그래프(Board.layout 패턴 · Submission 네임스페이스 분리 · 자녀 범위 매트릭스 · tablet §2a · Canva 시너지).
10. `plans/phase0-requests.md` (assignment-board 섹션) — AB-1 마이그레이션 + AB-2~AB-10 통합 feature 2개의 JSON 등재본.

---

## 기준 단말 · 제약

- **기준 디바이스**: 갤럭시 탭 S6 Lite (Chrome Android + S-Pen). iPad 아님. 500MB 메모리 예산.
- **DOM 예산**: 보드당 카드 30개 이하, 카드당 자식 노드 6개 이하 (총 ≤180 노드).
- **썸네일**: 서버 리사이즈 160×120 WebP + `loading=lazy` + IntersectionObserver 필수.
- **S-Pen**: 카드 표면 상호작용 금지. 모달 내부에서만 허용.
- **매트릭스/그리드 뷰**: owner + desktop 전용. editor(학생)·viewer(학부모)·태블릿 전면 제외.
- **RBAC/RLS**: API + DOM + RLS 3-레이어에서 학생 간 교차 열람 차단. `AssignmentSlot.studentId` 기반 격리.
- **Padlet 폴더 읽기 전용**: 참조만, 직접 수정 금지 (ideation 원칙).
- **학급 크기**: N ≤ 30 하드 리밋 (초과 시 v2 5×8 파킹).
- **BoardType 신규 금지**: `Board.layout = "assignment"` 값 확장으로만 해결.
- **신규 엔티티 최소화**: `AssignmentSlot` 1개만 신규. Classroom·Student·Card·Submission 재사용.

---

## 이번 작업 (seed.goal)

> Implement Assignment Board (layout="assignment") on Aura-board — a roster-bound assignment collection board where teachers create boards from classroom rosters, cards are auto-instantiated per student, submission/non-submission states are visually distinguished, and teachers review submissions via fullscreen modal.

---

## 수용 기준 체크리스트

seed.yaml `acceptance_criteria` 14개 항목과 1:1 매칭. padlet phase9(verify)에서 전수 통과 필수.

- [ ] 교사가 학급 로스터로부터 과제 보드를 생성하면 N≤30 카드가 Student.number 순 결정론적 5×6 격자로 자동 인스턴스화된다.
- [ ] 제출/미제출 카드가 시각적으로 구분된다 (Seesaw 스타일 썸네일 + Moodle 스타일 이진 상태 뱃지).
- [ ] 카드 클릭 시 풀스크린 모달이 열리며(사이드 패널 없음), 모달은 제출 검토·반려 액션의 유일한 상호작용 표면이다.
- [ ] 교사 가이드 영역(`Board.assignmentGuideText`)이 owner 전용 상단 섹션에 표시되고, 학생 슬롯 격자는 하단 섹션에 표시된다.
- [ ] `submissionStatus` 전이가 올바르게 동작: `assigned → submitted → viewed → returned → submitted`(재제출) 및 `assigned → submitted → reviewed`.
- [ ] `gradingStatus`가 재제출을 게이팅: `not_graded + before-deadline` → in-place overwrite 허용 / `graded | released` → 학생 편집 버튼 차단 / `returned` → 학생 편집 재개방.
- [ ] 반려(return) 액션은 풀스크린 모달 내부에서만 가능하며 `returnReason`(≤200자)이 필수로 `AssignmentSlot.returnReason` 또는 `Submission.feedback`에 저장된다.
- [ ] 학생이 재진입 시 반려 사유가 모달 상단 고정 배너로 표시된다.
- [ ] `returned` 상태 카드는 격자 뷰에서 "!" 뱃지를 표시한다.
- [ ] 학생은 다른 학생의 제출물을 볼 수 없다 (자기 슬롯만, RBAC를 API+DOM+RLS 3-레이어에서 강제).
- [ ] 미제출 리마인더는 in-app 뱃지로 발급된다 (외부 이메일 채널 없음).
- [ ] 썸네일이 160×120 WebP로 서버 리사이즈되고 IntersectionObserver로 lazy-load된다.
- [ ] `assignmentAllowLate` 플래그가 `gradingStatus = not_graded`일 때 마감 이후 overwrite 가능 여부를 제어한다.
- [ ] 매트릭스/그리드 뷰는 owner + desktop에서만 접근 가능하며, 태블릿과 비-owner 역할은 제외된다.

---

## 주의사항

1. **padlet feature 파이프라인 준수** — `padlet/prompts/feature/phase0_analyst.md` 이하 phase1~phase10을 순차 진행. 스킵 금지. 각 phase 산출물은 `padlet/tasks/{task_id}/phase{N}/`에 저장.
2. **임의 결정 금지** — seed.yaml과 `plans/assignment-board-roadmap.md`에 명시되지 않은 설계 결정은 **반드시 ideation 오케스트레이터 또는 사용자에게 에스컬레이션**. 특히 다음 항목은 seed 범위 밖:
   - SubmissionHistory 테이블 도입 (v1 파킹 — overwrite + updatedAt만)
   - 5×8 또는 자유 드래그 격자 (v1 파킹 — 결정론적 5×6 고정)
   - 학생 간 갤러리 모드 / 풀 코멘트 스레드 (v1 파킹)
   - 학부모 이메일 리마인더 (v1 파킹 — in-app 뱃지만)
   - Roster 자동 동기화 (v1 파킹 — 생성 시점 스냅샷)
   - Matrix 뷰 비-owner/태블릿 개방 (영구 금지 — 메모리 MEMORY 참조)
3. **태블릿 성능 평가 필수** — 모든 UI·데이터 결정은 `plans/tablet-performance-roadmap.md §2a` 기준으로 평가. DOM 예산 초과 시 재설계.
4. **Padlet 폴더 쓰기 금지** (ideation 오케스트레이터 관점). **단 padlet 파이프라인 자체는 padlet 폴더 내부에서 실행**되므로 이 핸드오프는 padlet 피처 오케스트레이터에게 전달되며, 해당 오케스트레이터는 padlet 하네스(`padlet/CLAUDE.md`)를 따른다.
5. **Submission 네임스페이스 충돌 주의** — `Submission.status`는 event-signup 도메인이 이미 사용 중. assignment-board는 `AssignmentSlot.submissionStatus`라는 별도 필드로 분리 관리. Zod 스키마에서 `board.layout` 기반 분기 처리 필수 (`plans/event-signup-roadmap.md` Submission 공유 절 참조).
6. **작업 분할 AB-1 ~ AB-10** — `plans/assignment-board-roadmap.md §9` 참조. AB-1(마이그레이션: Board.layout 확장 + AssignmentSlot 테이블 + RLS 정책)은 단독 PR, AB-2~AB-10은 통합 feature로 진행 권장.
7. **외부 프로젝트 INBOX 사용 시** — 이 산출물을 padlet INBOX로 배송하는 건 dispatcher(phase7) 책무. handoff-writer(phase6)는 파일 생성까지만.

---

## 산출 파일

- `tasks/2026-04-14-assignment-board-impl/phase6/padlet_phase0_request.json` — padlet 파이프라인 진입 JSON
- `tasks/2026-04-14-assignment-board-impl/phase6/handoff_note.md` — 본 문서

Phase 7 (dispatcher)에서 `padlet/INBOX/` 배송 후 padlet feature 파이프라인이 phase0 request를 소비한다.
