# Phase 3 — Interview Decisions: Roster-Bound Assignment Collection Board

- **task_id**: `2026-04-14-assignment-board-impl`
- **session_id**: `interview_20260414_131412`
- **final ambiguity**: **0.08** (목표 ≤ 0.2 통과)
- **인터뷰 라운드**: 3 (질문 Q2 → 묶음 Q1/Q3/Q4/Q5/Q6 + Q5 최종 확인 → 파생 Q7)
- **답변자**: 에이전트 자율 (memory · 북극성 5 primitive · phase2 초벌 결정 · 공개 레퍼런스 근거)
- **사용자 에스컬레이션**: 0건 (AskUserQuestion 미사용, 자율 위임 방침 준수)

---

## 1. 고정 전제 (인터뷰 중 재확인, 변경 없음)

### 1.1 북극성 5 Primitive (phase1 §3.1)
1. 학급 로스터 기반 카드 자동 생성 (Classroom StudentSubmission 모델)
2. 제출/미제출 시각 구분 (Seesaw 썸네일 + Moodle 이원 상태 배지)
3. 카드 클릭 → 전체화면 모달 (태블릿 세로폭 제약, 사이드패널 제외)
4. 교사 가이드 영역 + 학생 영역 분리 (상단 owner-only + 하단 격자)
5. 번호순 5×6 정형 격자 (Student.number 기반 결정적 배치)

### 1.2 phase2 §1.2 초벌 결정 (인터뷰에서 전부 유지)
- ① `Board.layout="assignment"` 확장 (신규 BoardType 아님)
- ② `AssignmentSlot` 신규 엔티티 + 기존 Card 재사용
- ③ Submission 재사용, status enum 확장
- ④ Classroom/Student 재사용, 신규 0개
- ⑥ 5×6 격자 결정적 (v1 교사 커스텀 금지)
- ⑦ 전체화면 모달
- ⑧ 썸네일 160×120 WebP + lazy + IntersectionObserver

---

## 2. 확정 결정 (Q1 ~ Q7)

### Q1 — 교사 가이드 영역 모델링
**결정: `Board.assignmentGuideText` 단일 텍스트 필드 채택.**
- Section(role="guide") + Card 재사용은 v2 파킹.
- 근거: v1 단순화 원칙(신규 필드 ≤ 필수), 가이드는 마감·짧은 지시·샘플 링크 수준으로 충분. 동영상·여러 카드 수요는 v2에서 Section role 확장으로 승격 가능 (기존 Section 스키마 무수정, 후방호환 확보).
- 영향: phase2 §2.3 Section.role 확장안 폐기, §2.2 Board.assignmentGuideText만 채택.

### Q2 — 재제출 정책
**결정: 상태 조건부 허용 (아래 매트릭스).**

| 상태 조건 | 학생 재제출 동작 |
|---|---|
| gradingStatus="not_graded" & 마감 전 | Card 내용 in-place 갱신, Submission.updatedAt 갱신, 이력 보존 불필요 |
| gradingStatus="not_graded" & 마감 후 | `assignmentAllowLate=true` 시 허용, `false` 시 차단 |
| gradingStatus="graded"\|"released" | 재제출 버튼 비활성 (교사 returned 액션 필요) |
| submissionStatus="returned" | 학생 수정 허용, 제출 시 `returned → submitted` 재전이, gradingStatus="not_graded" 리셋 |

- 근거: Moodle 이원 상태 정책 + 평가 무결성(교사 채점 후 임의 변경 금지) + 교사 로드 감소(마감 전 자율 수정 허용).
- v1: SubmissionHistory 엔티티 신설하지 않음 (덮어쓰기). v2 승격 여지만 남김 (Submission.updatedAt 유지).
- 코멘트 시스템은 v2. v1은 Q7의 "반려 사유 1줄"만 지원.

### Q3 — 학급 N 상한
**결정: v1 **N ≤ 30 하드 제한**. N > 30은 v1 불가, 분반 가이드.**
- 5×8(N=40) 자동 확장은 v2 파킹.
- 근거: 북극성 5의 "자리표처럼 번호 기억" 인지 모델이 5×6 위에서 설계됨. 격자 크기 가변화 시 학생 공간 기억 학습 비용 증가. 탭 S6 Lite DOM 예산은 여유 있으나 UX 의미가 깨짐.
- 영향: 보드 생성 시 classroom의 Student 수 > 30이면 생성 차단 + "분반 또는 v2 대기" 안내.

### Q4 — 미제출 독려 채널
**결정: v1 **인앱 배지·알림 전용**. 학부모 이메일 경유 알림 v1 제외.**
- 근거: 학생 본인에게 닿는 채널은 인앱이 유일 (학생 이메일 없음, 태블릿·학교 공용 단말 가정). 학부모 이메일 경유는 parent-viewer-roadmap §1.3 주간 이메일 별도 컨텍스트로 격리 유지. v1 범위 팽창 방지.
- 구현: 교사가 격자 뷰에서 "미제출 필터" → "일괄 독려" 액션 → 미제출 학생 본인 계정에 인앱 알림 (기존 알림 인프라 재사용 가정).
- v2 파킹: 학부모 이메일 연계·학생별 독려 빈도 쿨다운.

### Q5 — 학생 간 상호 열람
**결정: v1 **비공개 고정**. 갤러리 워크 토글 v2 이월.**
- 근거:
  1. 아동 보호·업계 표준(Classroom·Seesaw 모두 비공개 기본).
  2. RBAC 단순성 (v1 3경로 유지: owner / 본인 editor / parent-of-child viewer). 갤러리 허용 시 "same-classroom editor" 읽기 스코프 추가되어 3중 RLS가 4중화.
  3. 태블릿 성능: 갤러리 모드 시 카드 간 swipe 탐색으로 모달 lazy-mount 전략 재설계 필요 → 탭 S6 Lite 메모리 500MB 초과 위험.
  4. 대체 플로우: 교사가 우수작을 일반 Padlet 보드에 복제 공유 → 권한·수업 통제 측면에서도 오히려 안전.
- v2 스키마 예약: `Board.galleryMode: boolean`, `Board.galleryReleasedAt: DateTime?`. 교사 명시 "공개" 액션 이후에만 same-classroom editor 읽기 허용.

### Q6 — slotNumber ↔ Student.number 동기화
**결정: **생성 시점 스냅샷** (Student.number 변경 시 이동하지 않음).**
- slot.slotNumber는 AssignmentSlot 생성 시 `Student.number`를 복사한 독립 값. 이후 Student.number가 바뀌어도 해당 보드의 slot 좌표는 불변.
- 근거:
  1. 결정적 좌표: 학기 중 번호 재부여가 발생해도 이미 진행된 과제 보드의 자리·제출 이력 해석이 안정적.
  2. 평가 무결성: 번호 변경이 과거 제출물의 좌표를 이동시키면 교사 누적 기록·학부모 열람 링크(자녀 slot 식별)가 깨짐.
  3. 신규 학생 추가 시: 교사 "Roster 동기화" 버튼 수동 트리거로 새 slot 추가(신규 slotNumber 부여). 기존 slot 보존.
  4. 삭제된 학생 시: slot을 삭제하지 않고 `submissionStatus="orphaned"` (신규 enum 값) 또는 별도 소프트 삭제 플래그로 마킹. 교사 UI에서는 dimmed·읽기 전용.
- R1 리스크 완화 (phase2 §6)와 정합.

### Q7 (파생) — Returned 트리거 UI + 반려 사유
**결정: **전체화면 모달 전용 + 반려 사유 1줄(≤200자) 필수**.**
- UI 엔트리포인트: 교사가 카드 클릭 → 전체화면 모달 → "반려" 버튼 클릭. 격자 뷰 롱탭·우클릭 컨텍스트 메뉴 도입 안 함.
- 반려 사유: v1에서도 필수 입력(≤200자). 학생 모달 재진입 시 상단 고정 배너로 표시.
- 데이터 모델: `AssignmentSlot.returnReason String?` 1필드 추가 (또는 기존 `Submission.feedback` 재사용 가능 시 0필드).
- 근거:
  1. 태블릿 인터랙션 일관성 — 카드 onTap 핸들러 단일화, S-Pen 오인식 방지.
  2. bulk 반려 불필요 — 건별 판단 액션. bulk 수요는 미제출 독려 쪽에 이미 해결.
  3. "왜 반려됐는지 모름" UX 실패 방지 — 풀 코멘트 시스템(스레드·멘션)은 v2, v1은 단문 사유로 하한선 확보.
  4. Q4 인앱 배지 전용 결정과 일관: 반려 알림 = 인앱 배지 + 모달 상단 배너.

---

## 3. 데이터 모델 최종 조정 (phase2 §2 대비 델타)

| 항목 | phase2 초안 | phase3 확정 |
|---|---|---|
| `Board.assignmentGuideText` | 있음 (Q1 미결 대비) | **확정 채택** |
| `Section.role` 필드 | 추가(대안) | **제거** (Q1로 불필요) |
| `AssignmentSlot.returnReason` | 없음 | **신규 추가** (String?, ≤200자) |
| `AssignmentSlot.submissionStatus` enum | assigned/viewed/submitted/returned/reviewed | +`orphaned` (Q6 삭제 학생 처리) |
| `Board.assignmentAllowLate` | `@default(true)` | 유지 |
| `Board.galleryMode` / `galleryReleasedAt` | 언급 없음 | v2 파킹, v1 스키마 미포함 |

**신규 엔티티**: 1 (`AssignmentSlot`)
**수정 엔티티**: 1 (`Board` — 필드 3 + 관계 1)
**재사용**: Classroom, Student, Card, Submission, BoardMember, Section(무수정)

---

## 4. v2/차기 파킹 항목

- Section(role="guide") + Card 재사용으로 교사 가이드 영역 확장 (동영상·여러 카드·첨부 필요 시)
- SubmissionHistory 엔티티 승격 (재제출 이력 보존)
- 5×8 / N>30 격자 확장 (자동 vs 교사 커스텀 좌석 모두 검토)
- 학부모 이메일·푸시 독려 채널 (parent-viewer-roadmap §1.3와 통합)
- 갤러리 워크 모드 (Board.galleryMode, 교사 공개 액션 기반)
- 풀 코멘트 시스템 (스레드·멘션·읽음 처리)
- Roster 자동 동기화 (Student CRUD 트리거 기반, v1은 수동 버튼)
- matrix 뷰(owner+데스크톱 전용): v1 제외 유지, v2에서 별도 라우트 신설

---

## 5. 새로 드러난 분기 (현 세션 편입 금지)

**없음.** 인터뷰 중 가격·수익·큰 방향 전환 이슈 발생 안 함. 모든 분기가 북극성·기존 seed·제약에서 자율 추론 가능 범위였음.

---

## 6. 다음 단계

- **Phase 4 seed-generator**: `ooo seed` 스킬 또는 `mcp__plugin_ouroboros_ouroboros__ouroboros_generate_seed`로 `session_id=interview_20260414_131412` 기반 Seed 생성.
- **Seed 입력 재료**:
  - 본 decisions.md §2·§3 (확정 결정·스키마 델타)
  - phase2 sketch.md §2~§6 (Prisma 초안·사용자 흐름·태블릿 체크리스트·리스크·Canva 시너지)
  - phase1 exploration.md §3.1 (북극성 5 primitive)
- **검증 게이트**: Ouroboros ambiguity ≤ 0.2 이미 달성 (0.08).
