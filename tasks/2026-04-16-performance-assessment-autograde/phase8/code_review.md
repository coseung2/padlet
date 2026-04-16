# Code Review — performance-assessment-autograde MVP-0

task_id: 2026-04-16-performance-assessment-autograde
reviewer: Claude (gstack 미설치로 본체 수행)
branch:   feat/assessment-autograde

## 1. design_doc 준수 매트릭스

| design_doc 섹션 | 구현 매핑 | 상태 |
|---|---|---|
| §1 Prisma 5 신규 모델 | schema.prisma + migration 20260417 | ✅ |
| §2 API 9개 | 10개 구현 (bootstrap 추가) — templates/submissions/answer/submit/gradebook/finalize/release/result + boards/[boardId] | ✅ |
| §3 컴포넌트 5개 | AssessmentBoard/Composer/Take/Gradebook/Result | ✅ |
| §4 데이터 흐름 | 교사 출제 → 학생 응시 → 채점 → 확정 → 릴리스 → 학생 조회 flow 전부 e2e 통과 | ✅ |
| §5 엣지케이스 8개 | 409 중복 제출, 409 만료, endAt 서버 결정, 빈 학급 처리 등 구현 | ✅ |
| §6 DX | typecheck clean, vitest 31건 PASS, build success | ✅ |
| §7 롤백 | 마이그레이션 헤더에 rollback SQL 포함 | ✅ |

스코프 드리프트: 없음.

## 2. Karpathy 4 원칙

| 원칙 | 상태 |
|---|---|
| Think Before Coding | ✅ 모든 변경이 phase0-6 에 선행 명문화. SHORT/realtime/lock 등 확장은 MVP-1+ 로 연기 명시. |
| Simplicity First | ✅ IndexedDB/PGMQ/Realtime 없음 (폴링으로 대체). Gemini provider 없음 (MCQ 전용). react-virtual 없음. |
| Surgical Changes | ✅ 기존 파일 편집은 `Board.layout` enum + `Classroom`/`Student` back-relation + `CreateBoardModal` 옵션 + `board/[id]/page.tsx` switch 한 건 뿐. |
| Goal-Driven Execution | ✅ grading/permissions vitest 19→20, e2e 26건, build clean. |

## 3. 프로덕션 버그 — 자동 수정

### 🔴 B-1. 다중 정답 MCQ 선택 불가 (UX/data integrity)
- `AssessmentTake` 가 `<input type="radio" name="q-{id}">` 사용 → 다중 정답 문항에서 학생이 하나 이상 선택 불가.
- `correctChoiceIds.length ≥ 2` 경우 **항상 오답 처리** → 점수 왜곡.
- 수정: 모든 선지를 `<input type="checkbox">` 로 전환, `selectAnswer` 호출 시 toggle 로직. `isMulti` 힌트 로직 삭제 (정답 수 누설 우려).

### 🟠 B-2. `canViewAssessmentTemplate` 조기 반환 (권한 로직 버그)
- `if (ids.teacher) return canManageAssessment(...)` 가 비소유 교사 bundle (teacher + student 동시) 에서 false 반환 후 student 경로로 떨어지지 않음.
- 실제 e2e 로 재현: mock auth `as=viewer` + student_session 쿠키 → 403 → student view 접근 불가.
- 수정: `if (ids.teacher && canManageAssessment) return true` 로 분기하여 student 경로 fall-through 허용. card-permissions.ts 의 OR 패턴과 일치.
- 리그레션 테스트 추가 (`non-owner teacher + student-in bundle`).

### 🟠 B-3. `AssessmentResult` polling 무한 루프 가능성
- setInterval 내부가 `state` 를 클로저로 캡처 → 릴리스 후에도 계속 폴링.
- 수정: `releasedRef: useRef<boolean>` 으로 최신 값 추적, 릴리스 되면 인터벌 skip.

### 🟡 N-1. AssessmentTake 미프리필 (수용, MVP-1 이슈)
- 학생이 새로고침하면 이전 답안 state 초기화. 서버에는 answer row 있으나 UI 로 가져오지 않음 (주석만 있는 effect 삭제).
- MVP-0 에서 수용 (scope_decision §2 IndexedDB OUT 과 정합). MVP-1 에서 페이지 마운트 시 answer prefetch 추가 예정.

### 🟡 N-2. `AssessmentTemplate.title` 변경 불가
- 한번 생성된 템플릿의 title/durationMin/questions 변경 API 없음. 재생성이 유일 경로. MVP-0 단순성 원칙.

### 🟡 N-3. `AssessmentTemplate` 삭제 API 없음
- 실수로 만든 템플릿 정리 불가 (DB 직접). MVP-1 에서 추가 예정.

## 4. 보안 (OWASP 요약)

| 범주 | 결과 |
|---|---|
| A01 Broken Access Control | 모든 경로 canManage/canAccessSubmission/canView 적용. unlock 경로는 MVP-0 OUT. ✅ |
| A03 Injection | Prisma 파라미터화. Zod 가 kind=MCQ 강제. JSON payload 는 DB JSONB 저장만 하고 HTML 렌더 시 React escape. ✅ |
| A04 Insecure Design | `correctChoiceIds` 가 student DTO 에서 제거되는지 e2e 로 검증. 릴리스 전 `/result` 는 `{released:false}` 만 반환. ✅ |
| A09 Logging | console.error 에 password/cookie 노출 없음. ✅ |

## 5. 판정

**전체 PASS**. 자동 수정 3건 (B-1, B-2, B-3), 수용 3건 (N-1 ~ N-3).

→ `phase8/REVIEW_OK.marker` 생성.
