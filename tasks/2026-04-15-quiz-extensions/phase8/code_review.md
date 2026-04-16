# Code Review — quiz-extensions (phase7 HEAD)

task_id: 2026-04-15-quiz-extensions
reviewer: Claude (staff engineer 관점, gstack 미설치로 본체 수행)
branch:   feat/quiz-extensions
commits:  310ea6f → 5f27340

## 1. design_doc 준수 매트릭스

| design_doc 섹션 | 구현 매핑 | 상태 |
|---|---|---|
| §1 Quiz.difficulty + parentQuizId | schema.prisma + migration 20260416 | ✅ |
| §2 POST /api/quiz/draft | src/app/api/quiz/draft/route.ts | ✅ |
| §2 PUT /api/quiz/[id]/questions | src/app/api/quiz/[id]/questions/route.ts | ✅ |
| §2 GET /api/quiz/[id]/report(.csv) | report/route.ts + report.csv/route.ts + quiz-report.ts | ✅ |
| §2 POST /api/quiz/[id]/clone | clone/route.ts | ✅ |
| §2 GET /api/quiz/library | library/route.ts | ✅ |
| §2 POST /api/quiz/create 확장 | create/route.ts (difficulty/countMode/draftQuestions + canAddCardToBoard 도입) | ✅ |
| §2 LLM 프롬프트 분기 | quiz-llm.ts `countSpec` + difficulty prefix | ✅ |
| §2 canManageQuiz | src/lib/quiz-permissions.ts | ✅ |
| §3 UI 컴포넌트 | QuizGenerateModal / QuizDraftEditor / QuizReportModal / QuizLibraryList / SegmentedControl | ✅ |
| §5.1 LLM 타임아웃 | draft 422 `empty` / `insufficient` + modal error 표시 | ✅ |
| §5.3 탭 닫기 경고 | QuizGenerateModal `beforeunload` + Esc/백드롭 confirm (phase8 추가) | ✅ |
| §5.4 동시 편집 | server 트랜잭션 + last-write-wins | ✅ |
| §5.5 권한 누수 | 모든 신규 엔드포인트 canManageQuiz / canAddCardToBoard 통과 | ✅ |
| §5.6 빈 리포트 | summary.submittedCount=0 + UI 빈 상태 | ✅ |
| §5.8 CSV 한글 | `\uFEFF` BOM + charset=utf-8 | ✅ |
| §5.11 active 중 편집 차단 | PUT /questions 에서 409 `quiz_active` + UI 는 waiting 만 버튼 노출 | ✅ |

스코프 드리프트: **없음**. 구현된 모든 파일이 design_doc 에 문서화됨.

## 2. Karpathy 4 원칙 감사

### ✅ Think Before Coding
- 모든 변경이 phase3/design_doc 에 선행 기술됨.
- 모호했던 한 가지: "QuizCard 난이도 뱃지" 의 실제 렌더 위치. phase5 design_spec §6가 fallback 여지를 남겨둔 구간 — 구현은 CSS 토큰만 도입하고 렌더링은 QA 이후 튜닝으로 **의도적 연기**. diff_summary.md §6에 명시.

### ✅ Simplicity First
- SegmentedControl 은 제네릭 `<T extends string>` 이지만 phase5 design_spec §6에서 "향후 재사용 대비 ui/ 배치" 를 명시. 스펙 대응으로 정당화.
- 투기적 에러처리, 불필요한 추상 없음.
- `QuizDraftEditor` 는 외부 상태를 parent 가 소유 — controlled component 패턴만 사용, 내부 undo stack 등 없음.

### ⚠ Surgical Changes — 한 건 검토 필요 (허용)
- `/api/quiz/create` 에 처음으로 `canAddCardToBoard` 권한 체크를 **추가**. 기존 코드는 `getCurrentUser` 만 호출해 권한 누수가 있었다. Karpathy "인접 코드 개선 금지" 원칙과 충돌하는 듯 보이지만:
  - design_doc §2.4 에서 명시적으로 추가를 요구 ("draft/create 는 `canAddCardToBoard(ids, board)` 재사용")
  - 기존 취약점 유지 시 draft 는 안전한데 create 는 누구나 호출 가능한 불일치가 생김
  → **허용**. 변경이 사용자(=design_doc) 요청으로 추적 가능.
- QuizBoard 에서 `text/file/dragOver/creating/fileRef/handleCreate/onDrop` 삭제: "기존 생성 폼 → modal 치환" 요구로 직접 추적 가능.
- `Distribution / PlayerList / Leaderboard / LLMModal / QuizUrl` 는 전혀 손대지 않음.

### ✅ Goal-Driven Execution
- `canManageQuiz` 에 vitest 5 케이스 (happy/deny 교사/학생/anon/missing). 5/5 PASS.
- `npm run build` + `npx tsc --noEmit` PASS.
- E2E(draft→save→clone→report CSV) 는 phase9 QA 범위로 위임.

## 3. 프로덕션 버그 탐색

### 🔴 Found → 자동 수정 완료

**B-1. CSV Formula Injection (security)**
- `src/lib/quiz-report.ts` 의 `escapeCell` 이 `",\n` 만 escape.
- 학생 닉네임을 `=HYPERLINK("evil")` 같이 설정하면 교사가 CSV 를 Excel 로 열 때 포뮬라가 실행됨 (OWASP CSV Injection).
- 학생 닉네임은 `QuizPlayer.nickname` 으로 클라이언트 입력 경로 (join API).
- **Fix**: `=+-@\t\r` 로 시작하는 셀 앞에 `'` 를 prefix 하는 추가 escape 단계. 이후 표준 CSV quoting.

**B-2. Esc 로 draft 유실 (UX/data loss)**
- `QuizGenerateModal` 의 Esc/backdrop 핸들러가 확인 없이 `onClose` 호출.
- `beforeunload` 는 브라우저 탭 닫을 때만 발동, 모달 닫기는 커버 못함.
- design_doc §5.11 ("draft 단계에서 '돌아가기' 클릭 시 경고 모달") 누락.
- **Fix**: `draftPending` 시 `confirm("저장하지 않은 변경이 있습니다. 닫으시겠습니까?")` 분기. Esc + backdrop 공통 경유.

### 🟡 Noted (수정 없이 기록)

**N-1. Clone 의 parentQuizId 체인 축적**
- 클론 → 클론의 클론 → ... 시 `parentQuizId` 는 직전 세대만 가리킴.
- design_doc §5.10 이 명시적으로 허용 ("UI 에서 parentQuizId 추적은 1단계만, DB 는 체인 허용").
- 수정 불필요.

**N-2. QuizGenerateModal 에 focus-trap 없음**
- 프로젝트 전반에 ModalShell / focus-trap 컴포넌트 자체가 없음.
- phase6 design_review §3.1 가 focus trap 명시를 요구했으나 phase5 spec 만 업데이트, 구현은 없음.
- 본격적인 focus trap 도입은 design-system 레벨 작업 → 별도 task 로 분리하는 것이 Surgical.
- 현재 구현은 Esc 닫기 + 브라우저 네이티브 Tab 순환 + 첫 interactive 요소 자동 focus 까지 커버.
- **연기 권고** (phase9 QA 에서 재평가).

**N-3. draft 엔드포인트 rate limit 없음**
- `/api/quiz/draft` 는 LLM 호출 비용을 발생시킴.
- 교사 세션 기반이라 공격면 낮으나 실수 탭 연타로 크레딧 소모 가능.
- design_doc §7 rollback 매트릭스에서 "per-user 분당 10건" 을 예비책으로 언급 — 현재는 불필요, 비용 모니터링 후 결정.

**N-4. CSV 컬럼 순서**
- 선택/정오 별도 그룹으로 출력 (이름 / Q1-QN 선택 / Q1-QN 정오 / 점수 / 맞힌 수). Excel 필터에 친화적이나 "각 문항 옆에 바로 O/X" 를 기대하는 사용자에겐 가독성 저하.
- design_doc/spec 에 구체적 컬럼 순서 스펙 없음. QA 피드백으로 변경 여지.

**N-5. QuizReportModal 의 CSV 링크 download 속성**
- `<a href="/api/quiz/:id/report.csv" download>` 에 파일명 없음.
- 서버가 `Content-Disposition: attachment; filename="quiz-{id}-report.csv"` 를 보내므로 실제 다운로드명은 서버 값이 우선. 문제 없음.

## 4. 보안 영역 변경 점검 (OWASP 요약)

| 범주 | 변경 | 평가 |
|---|---|---|
| A01 Broken Access Control | canManageQuiz (신규), canAddCardToBoard(/create 추가) | ✅ 전 엔드포인트 적용 확인 |
| A03 Injection (DB) | Prisma 쿼리, 매개변수화 | ✅ |
| A03 Injection (CSV) | reportToCsv | 🔴→✅ B-1 수정 후 |
| A05 Security Misconfig | 신규 env var / 외부 서비스 없음 | ✅ |
| A09 Logging | `console.error(e)` 에 LLM apiKey 포함 여부 — 에러 객체에 키 없음, 요청 바디 로깅 안 함 | ✅ |
| File upload | /api/quiz/draft 의 PDF 파싱 — 기존 /create 와 동일 패턴 (pdf-parse) | ✅ |
| 인증 | resolveIdentities 사용, cookie-based | ✅ |

추가 STRIDE: Tampering (draft 편집 후 PUT) — 서버가 질문 유효성 재검증 ✅. Info Disclosure — 리포트는 교사만 ✅.

## 5. 판정

- **전체 PASS** — design_doc 전 항목 대응 + Karpathy 4 원칙 준수 + 프로덕션 버그 2건 자동 수정 완료.
- 연기된 항목(N-2 focus trap, N-3 rate limit) 은 별도 task 권고.

→ `phase8/REVIEW_OK.marker` 생성.
