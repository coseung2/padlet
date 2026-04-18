# Phase 7 Diff Summary — quiz-extensions

task_id: 2026-04-15-quiz-extensions
branch:  feat/quiz-extensions

## 1. 데이터 모델

### prisma/schema.prisma
- `Quiz.difficulty`: nullable `String` ("easy" | "medium" | "hard") — B2 난이도 옵션 저장.
- `Quiz.parentQuizId`: nullable `String`, FK 없음 (원본 Quiz 삭제 허용) — B4 clone 추적.
- 신규 인덱스 `@@index([parentQuizId])`.

### prisma/migrations/20260416_quiz_extensions_difficulty_parent
- 두 컬럼 추가 + 인덱스 생성. 수동 rollback SQL 을 헤더 주석으로 포함 (design_doc §7).

## 2. API — 신규

| Method | Path | 설명 |
|---|---|---|
| POST | /api/quiz/draft | FormData 수신, LLM 호출만 (DB 미저장), `{ questions }` 반환. 권한: `canAddCardToBoard`. |
| PUT  | /api/quiz/[id]/questions | 트랜잭션으로 기존 QuizQuestion 삭제 후 신규 생성. 권한: `canManageQuiz`. `status=active` 면 409. |
| GET  | /api/quiz/[id]/report | `buildQuizReport` → summary + matrix JSON. 권한: `canManageQuiz`. |
| GET  | /api/quiz/[id]/report.csv | 동일 데이터 CSV + `\uFEFF` BOM, `Content-Disposition: attachment`. |
| POST | /api/quiz/[id]/clone | 원본 questions 복사 + 새 roomCode + `parentQuizId`. 대상 board 가 다르면 `canAddCardToBoard` 추가 검증. |
| GET  | /api/quiz/library | 교사 본인 `ownsBoardIds` 범위 최신순 + cursor 페이지네이션 (기본 20, 최대 50). |

## 2'. API — 수정

- `POST /api/quiz/create`
  - `difficulty`, `countMode`, `questionCount?`, `draftQuestions?`, `title?` 필드 추가.
  - 최초로 `resolveIdentities` + `canAddCardToBoard` 권한 체크 도입 (기존에는 인증 체크만).
  - `draftQuestions` 가 있으면 LLM 스킵 — step2 저장 경로 담당.
  - LLM 결과 0개 → 422 `empty`, fixed 모드에서 부족하면 422 `insufficient`.
- `lib/quiz-llm.ts`: 시그니처를 `generateQuizFromText(text, apiKey, countSpec, provider, difficulty)` 로 변경.
  - `countSpec = { mode: "auto" } | { mode: "fixed", n }` + 20 cap + difficulty prefix 주입.

## 3. 신규 라이브러리 / 타입

- `src/types/quiz.ts` — `QuizDifficulty`, `QuizDraftQuestion`, `QuizDraft`, `QuizReportPayload`, `QuizLibraryItem`.
- `src/lib/quiz-permissions.ts` — `canManageQuiz(quizId, ids)` 교사 소유 board 기반 확인.
- `src/lib/quiz-report.ts` — `buildQuizReport(quizId)` + `reportToCsv(report)` (JSON/CSV 공용 데이터 빌더).

## 4. UI 컴포넌트

### 신규
- `src/components/ui/SegmentedControl.tsx` — `radiogroup` semantics 순수 컴포넌트. 난이도 3단계 선택에 사용.
- `src/components/quiz/QuizGenerateModal.tsx` — step/탭 상태기 (새로 만들기 / 과거 퀴즈) + draft 편집 통합.
- `src/components/quiz/QuizDraftEditor.tsx` — 문항 카드 리스트, 10문항 상한, 빈 필드 shake + 토스트 메시지.
- `src/components/quiz/QuizLibraryList.tsx` — 페이지네이션 + empty/loading/error 상태.
- `src/components/quiz/QuizReportModal.tsx` — summary 3 stat + sticky matrix + CSV 다운로드 링크.

### 수정
- `src/components/QuizBoard.tsx`
  - 기존 인라인 파일 드래그·드롭 생성 폼 → "+ 퀴즈 만들기" 버튼 → `QuizGenerateModal` 로 치환.
  - `waiting` 상태에 "편집" 버튼 + `QuizDraftEditor` modal overlay.
  - `finished` 상태에 "리포트 보기" 버튼 + `QuizReportModal`.
  - `handleCreated` 가 Prisma → client shape 변환을 담당해 기존 SSE 처리기와 공존.

### 스타일
- `src/styles/base.css`: 난이도 뱃지 3 토큰 추가 (`--color-quiz-difficulty-{easy,medium,hard}`).
- `src/styles/quiz.css`: 모달/세그먼트/드래프트/라이브러리/리포트 매트릭스 CSS 추가 (파일 말미 블록). 모바일 <600px 풀스크린 모달 분기 포함.

## 5. 테스트

- `src/lib/__tests__/quiz-permissions.vitest.ts` — vi.mock 으로 Prisma 를 shim, happy + deny (teacher non-owner / student / anon / missing quiz) 5 케이스. 실행 결과 5/5 PASS.

## 6. 스코프 외 (의도적 SKIP)

- QuizCard UI의 난이도 뱃지 렌더링 — 토큰만 추가, 실제 사용처 배치는 phase9 QA 이후 tuning 으로 연기 (design_spec §6: "가독성 재확인 후 fallback 가능").
- Focus trap: 기존 프로젝트에 `ModalShell` 이 없어 Esc-닫기 + 브라우저 네이티브 탭 순회만 구현. 본격 focus trap 도입은 별도 design_system 작업 (surgical changes 원칙).
- `status=active` 중 편집 차단은 서버에서 409 로 막고 UI에서는 waiting 일 때만 버튼 노출. active 탭 2개 race 는 design_doc §5.4 에서 OUT.

## 7. 검증

- `npx tsc --noEmit` → clean.
- `npm run build` → success (모든 route 포함).
- `npx vitest run src/lib/__tests__/quiz-permissions.vitest.ts` → 5/5 PASS.
- DB 파괴 방지 원칙(memory: feedback_no_destructive_db.md) 준수 — `migrate dev` 대신 수동 migration 파일 작성, `migrate deploy` 는 phase10 에서만 실행.
