# Scope Decision — performance-assessment-autograde (MVP-0)

task_id: 2026-04-16-performance-assessment-autograde
scope_mode: **Reduction** (roadmap 8~10주 → MVP-0 1~2주로 축소)

## 0. 축소 사유 요약

phase1/research_pack.md 의 코드베이스 audit 결과, ideation roadmap 이 전제하는 6개 인프라 (Supabase Realtime / PGMQ / RLS 실적용 / Gemini provider / IndexedDB / FeatureFlag) 중 **4개가 부재**. 이들을 MVP-0 과 함께 동시 구축하면 실 타임라인이 로드맵의 ~2배로 팽창한다. solo 프로젝트 현실상 **단계적 출시**로 전환:

| 단계 | 포함 | 목표 기간 |
|---|---|---|
| **MVP-0 (이번 task)** | MCQ 출제 → 응시 → 결정론 채점 → 교사 확정 → 학생 조회 | 1~2 세션 |
| MVP-1 (별 task) | SHORT + Gemini provider + 매트릭스 교사 수동 보정 | 1~2 주 |
| MVP-2 (별 task) | 화면이탈 잠금 + Supabase Realtime + ProctorEvent | 2~3 주 |
| MVP-3 (별 task) | FeatureFlag/Tier gate + PGMQ retry + 감사 로그 보관 | 1 주 |
| MVP-4 (별 task) | S-Pen 캔버스 + OCR + 동의서 플로우 + RLS 실적용 | 2~3 주 |

seed `exit_conditions.scope_overflow` 는 **OX·NUMERIC·ESSAY 구현/자동 처벌/LLM 프로바이더 교체/잠금 해제 권한 확장** 을 스코프 오버플로우로 정의. MVP-0 은 이 금지 항목을 하나도 건드리지 않으며, **시드 `goal` 의 정점 달성은 MVP-2 누적 시점에 가능**. MVP-0 자체가 시드 완수가 아님을 명시.

## 1. 선택한 UX 패턴 (phase1 ux_patterns.json)

MVP-0 에서 채택:

| pattern_id | 채택 | 사유 |
|---|---|---|
| **AG-4-matrix-sticky** | ✅ | `src/components/quiz/QuizReportModal.tsx` 재활용 (phase1 §3.1). 교사 gradebook 의 학생×문항 매트릭스 UX 를 그대로 옮김. |
| **AG-5-autoScore-vs-manual** | ✅ (단순화) | MCQ 만이라 `autoScore === finalScore`. manualScore 열 UI 는 노출하지만 MVP-0 에서 실 편집 불가. 릴리스 버튼만 동작. |
| **AG-6-draft-autosave** | ✅ (서버만) | 300ms debounce 서버 PATCH. IndexedDB 병행은 MVP-1. |
| **AG-7-release-broadcast** | ✅ (polling) | 릴리스 후 학생 뷰는 Supabase Realtime 없이 **마운트 시 refetch + 10초 polling** 으로 대체. MVP-2 에서 realtime 전환. |

채택하지 않음 (OUT):

| pattern_id | 사유 |
|---|---|
| AG-1-lazy-question-mount | MVP-0 문항 ≤ 10 가정 — 성능 여유. MVP-1 에서 ≥ 20 문항 사용 시 재평가. |
| AG-2-lock-on-visibility | Realtime 엔진 미선정 — MVP-2. |
| AG-3-short-4field-rubric | SHORT 자체가 MVP-1. |

## 2. MVP-0 범위

### IN — 이번 task 에서 구현

**2.1 데이터 모델 (Prisma)**

- `AssessmentTemplate` (id, classroomId, boardId?, title, durationMin, createdById, createdAt, updatedAt)
- `AssessmentQuestion` (id, templateId, order, kind="MCQ", prompt, payload JSON {choices[], correctChoiceIds[]}, maxScore, createdAt)
- `AssessmentSubmission` (id, templateId, studentId, status "in_progress"|"submitted", startedAt, endAt, submittedAt?, createdAt)
- `AssessmentAnswer` (id, submissionId, questionId, payload JSON {selectedChoiceIds[]}, autoScore?, updatedAt)
- `GradebookEntry` (id, submissionId @unique, finalScore, releasedAt?, createdById, createdAt, updatedAt)
- `Classroom.gradebookReleasePolicy` 기본 "teacher_manual" (roadmap §1.3)
- `Board.layout` 에 "assessment" 값 허용 (기존 enum 확장만)

**OUT** (MVP-1+): `ProctorEvent`, `FeatureFlag`, `Classroom.schoolManagedDevices`, `AssessmentSubmission.isLocked/lockedReason/localDraftHash`, `AssessmentAnswer.autoRawResponse/manualScore`, `AssessmentTemplate.rubricText/gradingProvider/kioskMode/tierGate`, `AssessmentQuestion.rubric/aiGeneratedBy/aiSourcePrompt`, `GradebookEntry.visibleToStudent/releasedById`.

**2.2 API 엔드포인트**

- `POST /api/assessment/templates` — 템플릿 + MCQ 문항 일괄 생성. 교사 Classroom owner 검증.
- `GET /api/assessment/templates/[id]` — 교사·본인 학생 조회.
- `POST /api/assessment/templates/[id]/submissions` — 학생 "응시 시작" (startedAt/endAt 결정).
- `PATCH /api/assessment/submissions/[id]/answer` — 학생 답안 autosave (300ms debounce 클라이언트).
- `POST /api/assessment/submissions/[id]/submit` — 학생 제출 + MCQ 결정론 채점 즉시 실행 (LLM 없음).
- `GET /api/assessment/templates/[id]/gradebook` — 교사 매트릭스 JSON (학생×문항 + autoScore).
- `POST /api/assessment/submissions/[id]/finalize` — 교사 GradebookEntry INSERT (finalScore = 총 autoScore).
- `POST /api/assessment/submissions/[id]/release` — 교사 "릴리스" (releasedAt SET).
- `GET /api/assessment/submissions/[id]/result` — 학생 본인 결과 조회 (releasedAt IS NOT NULL 게이트).

**2.3 UI 컴포넌트**

- `src/components/assessment/AssessmentBoard.tsx` — Board layout="assessment" 진입 셸. 교사/학생 뷰 분기.
- `src/components/assessment/AssessmentComposer.tsx` — 교사 출제 UI. MCQ 문항 카드 (보기 N개 + correctChoiceIds 체크박스).
- `src/components/assessment/AssessmentTake.tsx` — 학생 응시 UI. 타이머, 문항 리스트, 답안 라디오/체크박스, "제출" 버튼.
- `src/components/assessment/AssessmentGradebook.tsx` — 교사 매트릭스 뷰 + 릴리스 버튼. QuizReportModal 의 매트릭스 스타일 재활용.
- `src/components/assessment/AssessmentResult.tsx` — 학생 결과 조회. releasedAt 전 이면 "공개 대기 중" 빈 상태.

**2.4 권한**

- `src/lib/assessment-permissions.ts` — `canManageAssessment(templateId, ids)` + `canTakeAssessment(submissionId, ids)` + `canViewResult(submissionId, ids)`. 교사=Classroom owner, 학생=submission.studentId 본인. 부모는 MVP-0 에서 result 조회 제외.

**2.5 채점**

- `src/lib/assessment-grading.ts` — `gradeMcq(question, answer): autoScore` 단순 함수. `correctChoiceIds === selectedChoiceIds` (순서무관 set 비교). submit 시 동기 실행.

**2.6 테스트**

- vitest — grading 단위 (정답/오답/부분정답 케이스 5), permissions happy+deny.
- phase9 regression — API e2e (create → take → submit → finalize → release → student view).

### OUT — MVP-1 이후로 연기

| 항목 | 연기 사유 | 대상 MVP |
|---|---|---|
| SHORT 문항 + Gemini 채점 | provider 인프라 부재 (phase1 §2) | MVP-1 |
| 화면이탈 잠금 + ProctorEvent | Realtime 엔진 미선정 | MVP-2 |
| Realtime broadcast | 〃 | MVP-2 |
| Feature flag / Pro 티어 게이트 | FeatureFlag 모델 부재, 베타 `false` 기본이라 당장 불필요 | MVP-3 |
| PGMQ grading_retry + retry_exhausted 배지 | 큐 인프라 부재, MCQ 는 실패 경로가 거의 없음 | MVP-3 |
| S-Pen 캔버스 800×400 | SHORT 연기에 종속 | MVP-4 |
| OCR 클라우드 오프로드 | 손글씨 연기 | MVP-4 |
| 동의서 미제출 학생 비활성화 | 손글씨 연기 + 개인정보 플로우 별도 설계 | MVP-4 |
| 감사 로그 보관 (Free=1학기/Pro=학년) | 티어 게이트 종속 | MVP-3 |
| react-virtual 매트릭스 | MVP-0 학생×문항 ≤ 30×10 = 300 셀 — 기본 table 로 충분 | MVP-1 |
| IndexedDB 드래프트 이중화 | 300ms 서버 autosave 로 1차 보장, 네트워크 단절 대응은 MVP-1 | MVP-1 |
| 학부모 결과 조회 뷰 (parent-viewer 연계) | parent-viewer-v2 로드맵 §12.1 미결 분기 | MVP-2/3 |
| RLS DB-level 실적용 | 기존 프로젝트도 scaffold 만 유지 중 — application-layer 권한 체크로 MVP-0 정합 | MVP-4 (전체 RLS 재시작 task) |
| AI 문항 생성 보조 (paste → Gemini 초안) | Gemini provider 부재 | MVP-1 |
| Admin LLM cost 대시보드 | LLM 사용 자체가 MVP-1 이후 | MVP-3 |

## 3. 수용 기준 (Acceptance Criteria — 자동 검증 가능)

MVP-0 의 AC 는 seed.yaml 18개 중 **MCQ·릴리스·비공개 게이트** 3개 축만 발췌:

1. **AC-M0-1** AssessmentTemplate 생성 UI 에서 문항 kind 드롭다운이 **MCQ 단일 옵션** 만 노출 (OX/NUMERIC/SHORT/ESSAY 전부 차단). Zod gate 는 create API 에서도 동일.
2. **AC-M0-2** MCQ 채점: `question.payload.correctChoiceIds === answer.payload.selectedChoiceIds` (set 동등) 만 `autoScore = maxScore`, 아니면 0. LLM fetch 호출 0건 (unit test 로 fetch mock 무호출 단언).
3. **AC-M0-3** 교사 Classroom owner 만 템플릿 생성/조회/finalize/release 허용 (403 nonNN-owner / nonTeacher).
4. **AC-M0-4** 학생 본인만 자기 submission 의 답안 PATCH + submit 가능 (403 타학생).
5. **AC-M0-5** 학생 submission 이 `status="submitted"` 이후 answer PATCH 거부 (409).
6. **AC-M0-6** 교사 릴리스 전에는 학생 `/api/.../result` 가 `{ released: false }` 반환, 교사 릴리스 후에는 `{ released: true, finalScore, perQuestion: [...] }` 반환.
7. **AC-M0-7** 교사 gradebook 에 학생×문항 매트릭스 렌더 + 정답 녹/오답 빨/미응답 회색 3색 셀.
8. **AC-M0-8** 타이머: `startedAt + durationMin` 로 `endAt` 결정, 클라이언트는 남은 시간을 초 단위 카운트다운 표시.
9. **AC-M0-9** 답안 입력 시 300ms debounce 후 `PATCH /answer` 호출 (AssessmentAnswer upsert).
10. **AC-M0-10** `Board.layout = "assessment"` 으로 생성된 보드 진입 시 `AssessmentBoard` 컴포넌트가 교사/학생 분기 렌더.

## 4. 스코프 결정 모드

**Reduction**. seed goal 대비 40% 수준(5 primitive 중 MCQ 축만 커버). 후속 task 4건으로 나머지 60% 분할. phase3 architect 는 **MVP-1~4 로 자연 확장 가능한 스키마 + API 인터페이스** 설계 책임.

## 5. 위험 요소

| # | 리스크 | 영향 | 완화 |
|---|---|---|---|
| M0-R1 | Prisma 스키마가 MVP-0 만 담고 MVP-1 에서 재마이그레이션이 많아지는 thrashing | 중 | phase3 architect 가 MVP-0~2 필드를 **nullable 로 1회 추가** 하고 UI 만 MVP-0 에 국한. `ProctorEvent`/`FeatureFlag` 신규 모델은 해당 MVP 에서만 추가. |
| M0-R2 | Classroom 에 학급 학생 관리 UI 가 이미 존재하는지 확인 필요 — 없으면 "응시 학생 선택" UX 가 막힘 | 고 | phase3 에서 `Classroom.students` 연결 상태 확인. 없으면 MVP-0 에서 `Student[]` 전체를 대상으로 응시 시작 버튼 노출 (솔로 프로젝트 허용). |
| M0-R3 | Board layout 추가가 기존 `/board/[id]/page.tsx` switch 분기에 영향 | 저 | 기존 quiz / drawing / event-signup 분기 패턴 그대로 따름. surgical change. |
| M0-R4 | 학생 로그인 플로우 검증 — student-auth 가 assessment 진입에 충분한지 | 중 | phase3 에서 `src/lib/student-auth.ts` 검토. classroom 범위 인증으로 충분해야 함 (기존 DrawingBoard/QuizBoard 와 동일). |
| M0-R5 | 타이머 클라이언트/서버 클럭 드리프트 → endAt 과 클라이언트 카운트다운 불일치 | 저 | phase3 에서 API 응답에 serverTime 동봉해 클라이언트 delta 계산. MVP-0 은 자동 제출 cron 없음 — 학생이 수동 제출 안 하고 시간 초과 시 submit API 가 `endAt < now()` 검사로 거부/경고만. |
| M0-R6 | 이미 AssignmentSlot (과제 보드) 가 있어 "assessment" 는 개념 중복 가능 | 중 | handoff_note: AssignmentSlot 연동은 v2. MVP-0 은 독립 path. scope 경계 유지. |
| M0-R7 | gradebook CSV 다운로드 기대 | 저 | QuizReportModal 패턴 그대로 — phase3 포함 여부 결정. MVP-0 의 AC 에는 없지만 추가 비용 낮음. |

---

## 자가 체크 (phase2 게이트)

- ✅ 수용 기준 ≥ 5 (총 10개)
- ✅ 리스크 분석 ≥ 1 (총 7개)
- ✅ 필수 섹션 5종 포함
- ✅ TODO/TBD 부재
- ✅ scope_mode 명시 (Reduction)
