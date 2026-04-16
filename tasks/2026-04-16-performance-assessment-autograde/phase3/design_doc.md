# Design Doc — performance-assessment-autograde (MVP-0)

task_id: 2026-04-16-performance-assessment-autograde
upstream: phase2/scope_decision.md
status: 구현 계획만, 실제 코드는 phase7 에서

## 0. 기존 아키텍처 재확인

- `Board.layout` 은 이미 enum 필드 — `"assessment"` 값 추가만으로 확장.
- `Classroom.teacherId` + `Classroom.students` 관계 기존 존재 → 권한 체크에 그대로 사용.
- `Student.classroomId` → classroom 소속 검증 경로 존재 (`src/lib/student-auth.ts`).
- `Board.classroomId` (nullable) → 교사 보드 owner 추적. 기존 `canAddCardToBoard` 와 동일.
- `src/lib/realtime.ts` 는 **no-op stub** — MVP-0 은 realtime 미사용. polling 또는 refetch 로 충분.
- `src/components/quiz/QuizReportModal.tsx` 의 매트릭스 CSS 재활용 (신규 CSS 최소).

## 1. 데이터 모델 변경

### prisma/schema.prisma — 신규 모델 5종

```prisma
// (1) 평가 템플릿
model AssessmentTemplate {
  id           String   @id @default(cuid())
  classroomId  String
  boardId      String?                     // Board(layout="assessment") 셸 연결, nullable (보드 없이 만들기 허용)
  title        String
  durationMin  Int      @default(30)
  createdById  String                      // 교사 User.id
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  classroom   Classroom               @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  questions   AssessmentQuestion[]
  submissions AssessmentSubmission[]

  @@index([classroomId])
  @@index([boardId])
}

// (2) 평가 문항 — MVP-0 kind = "MCQ"
model AssessmentQuestion {
  id         String @id @default(cuid())
  templateId String
  order      Int
  kind       String                        // "MCQ" | (future) "SHORT" | "OX" | "NUMERIC" | "ESSAY"
  prompt     String
  payload    Json                          // MCQ: { choices: [{id, text}], correctChoiceIds: string[] }
  maxScore   Int    @default(1)
  createdAt  DateTime @default(now())

  template AssessmentTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  answers  AssessmentAnswer[]

  @@unique([templateId, order])
  @@index([templateId])
}

// (3) 학생 제출
model AssessmentSubmission {
  id          String   @id @default(cuid())
  templateId  String
  studentId   String
  status      String   @default("in_progress")   // "in_progress" | "submitted"
  startedAt   DateTime @default(now())
  endAt       DateTime                           // = startedAt + durationMin
  submittedAt DateTime?
  createdAt   DateTime @default(now())

  template        AssessmentTemplate  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  student         Student             @relation(fields: [studentId], references: [id], onDelete: Cascade)
  answers         AssessmentAnswer[]
  gradebookEntry  GradebookEntry?

  @@unique([templateId, studentId])
  @@index([templateId])
  @@index([studentId])
  @@index([status])
}

// (4) 개별 답안
model AssessmentAnswer {
  id           String   @id @default(cuid())
  submissionId String
  questionId   String
  payload      Json                             // MCQ: { selectedChoiceIds: string[] }
  autoScore    Int?
  updatedAt    DateTime @updatedAt

  submission AssessmentSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  question   AssessmentQuestion   @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([submissionId, questionId])
  @@index([submissionId])
}

// (5) 성적부 항목 — 교사 확정 후만 존재
model GradebookEntry {
  id           String    @id @default(cuid())
  submissionId String    @unique
  finalScore   Int
  releasedAt   DateTime?
  createdById  String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  submission AssessmentSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  @@index([releasedAt])
}
```

### Classroom/Student 관계 추가

Student 에 `submissions AssessmentSubmission[]` back-relation 추가(1 line). Classroom 에 `assessments AssessmentTemplate[]` 추가(1 line).

### `Student[]` relation 추가로 인한 다른 영향

없음. Prisma 는 back-relation 선언만 추가하면 됨. 기존 쿼리 변화 없음.

### 마이그레이션

- `20260417_add_assessment_mvp0/migration.sql` — `CREATE TABLE` 5건 + 인덱스.
- **nullable 컬럼**: `boardId`, `submittedAt`, `AssessmentAnswer.autoScore`, `GradebookEntry.releasedAt` → 미래 MVP 필드 추가 시 재마이그레이션 최소화.
- 배포 전 `prisma migrate status` 로 pending 건 확인 (memory `feedback_migration_pending_canva.md` 준수).
- Vercel + Supabase region 정합 (memory `project_vercel_supabase_region.md`).

### 롤백 SQL (migration 파일 헤더 주석)

```sql
-- Manual rollback:
-- DROP TABLE "GradebookEntry" CASCADE;
-- DROP TABLE "AssessmentAnswer" CASCADE;
-- DROP TABLE "AssessmentSubmission" CASCADE;
-- DROP TABLE "AssessmentQuestion" CASCADE;
-- DROP TABLE "AssessmentTemplate" CASCADE;
```

### Board.layout 허용 값 확장

`Board.layout` 은 String 컬럼 — enum 제약이 아니라 값 추가만으로 동작. 스키마 주석 1줄 수정(기존 layout 주석에 "assessment" 추가).

## 2. API 변경

### 신규 엔드포인트 9개

| Method | Path | 용도 | 권한 |
|---|---|---|---|
| POST | `/api/assessment/templates` | 템플릿 + MCQ 문항 일괄 생성. Body: `{classroomId, title, durationMin, boardId?, questions: [{prompt, choices, correctChoiceIds, maxScore?}]}`. Zod gate 에서 `kind="MCQ"` 강제. | Classroom owner |
| GET | `/api/assessment/templates/[id]` | 템플릿 + 문항 조회 (정답 포함 = 교사용 / 정답 제외 = 학생용 분기) | 교사 or 본인 classroom 학생 |
| POST | `/api/assessment/templates/[id]/submissions` | 학생 "응시 시작". 기존 submission 존재 시 그것을 반환 (idempotent). | 본인 classroom 학생 |
| PATCH | `/api/assessment/submissions/[id]/answer` | `{questionId, selectedChoiceIds}` upsert. `status="submitted"` 이면 409. | submission owner 학생 |
| POST | `/api/assessment/submissions/[id]/submit` | `status="submitted"` + MCQ 채점 실행 + autoScore 집계 | submission owner 학생 |
| GET | `/api/assessment/templates/[id]/gradebook` | 교사 매트릭스 payload | 교사 owner |
| POST | `/api/assessment/submissions/[id]/finalize` | GradebookEntry upsert (finalScore = sum(autoScore)) | 교사 owner |
| POST | `/api/assessment/submissions/[id]/release` | `releasedAt = now()` | 교사 owner |
| GET | `/api/assessment/submissions/[id]/result` | 학생 본인 결과. released 전이면 `{ released: false }`. | submission owner 학생 or 교사 |

### 요청/응답 스키마 (발췌)

```ts
// POST /api/assessment/templates
Req = {
  classroomId: string;
  title: string;
  durationMin: number;       // 1~240
  boardId?: string;
  questions: Array<{
    prompt: string;
    choices: Array<{ id: string; text: string }>;   // id 는 "A","B",... 또는 cuid 허용
    correctChoiceIds: string[];                     // choices.id 의 부분집합, 최소 1
    maxScore?: number;                              // default 1
  }>;
};
Res = { template: AssessmentTemplate & { questions: AssessmentQuestion[] } };

// GET /api/assessment/templates/[id]  (학생용 — correctChoiceIds 필드 제거)
StudentQuestion = Omit<AssessmentQuestion, 'payload'> & {
  payload: { choices: Array<{ id: string; text: string }> };
};

// POST /api/assessment/submissions/[id]/submit
Res = {
  submission: AssessmentSubmission;
  autoScore: number;   // 총점 (학생에게 결과 공개는 릴리스 후)
};
```

### 실시간 이벤트

MVP-0 은 **없음**. 학생 뷰는 `/result` 를 10초 polling + mount refetch 로 릴리스 상태 갱신.

## 3. 컴포넌트 변경

### 신규

- `src/components/assessment/AssessmentBoard.tsx` — 진입 셸. `Board.layout="assessment"` 일 때 `/board/[id]/page.tsx` 에서 마운트. props: `{boardId, classroomId, viewerKind}`. 내부에서 교사 여부 / 학생 여부 / 이미 응시 중 여부를 판단해 `AssessmentComposer` / `AssessmentTake` / `AssessmentGradebook` / `AssessmentResult` 중 하나 렌더.
- `src/components/assessment/AssessmentComposer.tsx` — 템플릿 생성 UI. 제목 + durationMin + 문항 추가/삭제 (최대 20). 각 문항은 MCQ 카드: prompt + 보기 N개(최대 6) + correctChoiceIds 체크박스. 저장 시 POST `/api/assessment/templates`.
- `src/components/assessment/AssessmentTake.tsx` — 학생 응시 UI. 타이머(남은 시간 mm:ss), 문항 리스트 (스크롤), 각 문항 4 보기 라디오/체크박스(복수정답 허용), 300ms debounce 로 `PATCH /answer`, "제출" 버튼.
- `src/components/assessment/AssessmentGradebook.tsx` — 교사 매트릭스. 학생×문항 셀 + 정답률 + 릴리스 버튼 + (선택) CSV 다운로드. QuizReportModal 의 CSS 재활용.
- `src/components/assessment/AssessmentResult.tsx` — 학생 결과. `released=false` 면 "공개 대기 중" 빈 상태, `released=true` 면 점수/문항별 정오 표시.

### 수정

- `src/app/board/[id]/page.tsx` — `case "assessment"` 분기 추가 (기존 quiz/drawing/event-signup 패턴).

### 내부 구조

- `AssessmentBoard` 는 컴포넌트 선택 로직만 담당 — 데이터 fetch 는 각 자식이 직접(SWR 패턴 or fetch).
- `AssessmentComposer` 는 controlled component + 제출 상태 local state.
- `AssessmentTake` 는 `useEffect` 로 타이머 + 300ms debounce.
- `AssessmentResult` 는 polling hook (10초 간격, releasedAt 확인).

### 상태 위치

| 상태 | 위치 | 비고 |
|---|---|---|
| 템플릿 draft (composer) | client | 저장 전까지 메모리 |
| 문항 answers (응시 중) | server (DB) + client local | debounce PATCH |
| 현재 submission | server (lookup on mount) | idempotent POST 로 재사용 |
| gradebook 데이터 | server (GET on demand) | polling 필요 없음 — 교사 수동 새로고침 |
| 학생 result 공개 여부 | server (10초 polling) | realtime 없으므로 폴링 |

## 4. 데이터 흐름

### 4.1 교사 출제 → 응시

```
[교사] AssessmentComposer — 문항 입력
  → POST /api/assessment/templates
    → canManageAssessment(classroomId, ids)
    → Zod: kind=MCQ, correctChoiceIds ⊆ choices.ids
    → Prisma: Template + Questions 트랜잭션 생성
  → { template, questions } 반환 → composer 닫기
[학생] 보드 진입 → AssessmentBoard
  → GET /api/assessment/templates/[id]  (학생 view)
    → canTakeAssessment(templateId, ids)
    → correctChoiceIds 제거 후 반환
  → [학생] "응시 시작"
  → POST /api/assessment/templates/[id]/submissions
    → idempotent: 기존 submission row 있으면 반환
    → 없으면 startedAt=now, endAt=startedAt+durationMin
  → AssessmentTake 진입
```

### 4.2 답안 autosave → 제출 → 채점

```
[학생] 답안 선택
  → 300ms debounce → PATCH /api/assessment/submissions/[id]/answer
    → submission.status==="in_progress" 검사 (409 if submitted)
    → endAt < now → 409 "expired"
    → AssessmentAnswer upsert (submissionId + questionId unique)
[학생] "제출"
  → POST /api/assessment/submissions/[id]/submit
    → submission.status="submitted" SET
    → 각 question 순회: gradeMcq(question, answer) → AssessmentAnswer.autoScore 갱신
    → submission.submittedAt = now, answers 의 autoScore 합
  → 응답 { submission, autoScore }
```

### 4.3 교사 확정 → 릴리스 → 학생 조회

```
[교사] AssessmentGradebook
  → GET /api/assessment/templates/[id]/gradebook
    → Classroom 학생 전부 + submissions (없으면 null) + answers + autoScore
    → 매트릭스 payload
[교사] 학생 row의 "확정" 버튼 클릭
  → POST /api/assessment/submissions/[id]/finalize
    → GradebookEntry upsert { finalScore = sum(autoScore), createdById=teacher, releasedAt=null }
[교사] "릴리스" 버튼 클릭 (학급 전체 일괄)
  → 각 submission 에 대해 POST /api/assessment/submissions/[id]/release
    → GradebookEntry.releasedAt = now
[학생] AssessmentResult
  → GET /api/assessment/submissions/[id]/result  (polling 10초)
    → released=false 면 { released: false }
    → released=true 면 { released: true, finalScore, perQuestion: [{id, correct, selected, answer}] }
```

## 5. 엣지케이스 (8개)

1. **시간 초과 제출** — 학생이 endAt 지난 뒤 PATCH/submit 호출 → 서버 409 `expired`. UI 는 타이머 0 되면 답안 편집 disable + "제출" 버튼만 노출. MVP-0 은 자동 제출 cron 없음 — 학생이 제출 안 하면 `in_progress` 로 남음. 교사가 gradebook 에서 강제 제출 버튼으로 submit 가능 (교사 submit API 호출 권한 부여).
2. **같은 학생 중복 응시** — `@@unique([templateId, studentId])` 로 DB 레벨 차단. POST submissions 는 idempotent (기존 row 반환).
3. **답안 저장 중 네트워크 단절** — MVP-0 은 IndexedDB 없음. 클라이언트는 최신 선택값만 state 에 보관, 재연결 시 전체 answer PATCH 재시도 (last-write-wins).
4. **교사가 학생 응시 중에 템플릿 수정** — MVP-0 은 템플릿 edit API 없음 (read+finalize/release 만). 수정 필요 시 새 템플릿 생성. 스코프 단순화.
5. **빈 학급 gradebook** — Classroom 에 Student 0명 → gradebook 은 `students: []` 반환. UI 는 "응시 학생 없음" 빈 상태.
6. **릴리스 후 교사 수동 점수 보정** — MVP-0 에서 불가. GradebookEntry.finalScore 는 release 이후 immutable. 보정 필요하면 release 철회(DELETE) API → 재finalize → re-release. MVP-0 은 철회 API OUT — 필요 시 MVP-1 에서 추가.
7. **같은 보드에 복수 템플릿 존재** — 현재 스키마 `Board.id ← AssessmentTemplate.boardId` 는 1:N 허용하나 MVP-0 은 AssessmentBoard 가 "해당 board 의 templates 첫 번째만" 노출 (Quiz 보드가 `quizzes[0]` 만 보여주는 패턴과 동일). 템플릿이 없을 때 교사 composer 진입, 있을 때 take/gradebook 진입. 복수 templates 관리 UI 는 MVP-1.
8. **타이머 클럭 드리프트** — API 응답에 serverTime (ISO) 동봉. 클라이언트는 `delta = clientNow - serverTime` 계산, `remainingSec = (endAt - now + delta) / 1000`. 드리프트 > 2초면 "시계 동기화 이상" 경고만.

## 6. DX 영향

### 타입

- `src/types/assessment.ts` — `AssessmentTemplatePayload`, `McqQuestionPayload`, `McqAnswerPayload`, `AssessmentResult`, `AssessmentGradebookPayload`. Prisma 타입을 직접 쓰지 않고 client 전용 DTO 로 분리 (정답 제거된 학생 view).

### 린트 / 테스트

- vitest: `assessment-grading.vitest.ts` (5 케이스), `assessment-permissions.vitest.ts` (5 케이스).
- 기존 테스트 영향 없음 (신규 모델 5개 추가만).

### 빌드 / 배포

- `prisma migrate deploy` → `next build` 순. Vercel 자동.
- 번들 크기: 신규 컴포넌트 5개 (≤ 500 LOC 총). 무시할 수준.

## 7. 롤백 계획

| 시나리오 | 조치 |
|---|---|
| 배포 후 런타임 에러 | Vercel rollback previous deployment. 신규 모델은 nullable/독립이라 이전 코드 무영향. |
| 마이그레이션 실패 | `prisma migrate resolve --rolled-back` + 커밋 revert. migration 헤더의 Manual rollback SQL 적용. |
| 학생 데이터 손상 (상태 꼬임) | submission 개별 row 를 `status="in_progress"` 로 되돌리는 DB 수동 수정. MVP-0 은 권한 체크가 단순해 보정 스크립트 불필요. |
| API 엔드포인트 과부하 | polling 간격 10→30초 완화 (클라이언트 핫픽스). MVP-2 에서 realtime 전환 시 근본 해결. |
| gradebook CSV 대용량 문제 | MVP-0 은 CSV OUT — 해당 없음. |

---

## 자가 체크 (phase3 게이트)
- ✅ 데이터 모델 + 마이그레이션 전략 (신규 5 모델 + nullable 위주)
- ✅ API 9개 req/res 명세
- ✅ 컴포넌트 트리 + 상태 위치
- ✅ 데이터 흐름 (3 블록)
- ✅ 엣지케이스 8개 (≥5)
- ✅ DX 영향 (타입/린트/빌드)
- ✅ 롤백 계획 5 시나리오
- ✅ TODO/TBD 부재
