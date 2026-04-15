# QA Report — quiz-extensions

task_id: 2026-04-15-quiz-extensions
tester:  Claude (gstack 미설치 + chrome-devtools MCP 세션 불가 — API+DB+SSR 기반 e2e 로 대체)
env:     local dev (`PORT=3000 npm run dev`), mock-auth owner=`u_owner`
commits: 310ea6f → c05e061 + phase9 fix (BOM decode 테스트 수정)

## 1. 테스트 커버리지 모드

- **API+DB e2e**: `phase9/regression_tests/quiz_api_e2e.ts` — 실제 dev 서버에 HTTP 요청 + Prisma 로 DB 를 직접 검증. 30 assertions.
- **권한 e2e**: `phase9/regression_tests/quiz_permissions_e2e.ts` — `as=editor` mock 쿠키로 비소유 교사의 403 확인. 5 assertions.
- **SSR 스모크**: quiz-layout board 페이지 GET 200 + `quiz-board`/`quiz-empty` 클래스 존재 + "Application error" 부재 확인.
- **단위**: `src/lib/__tests__/quiz-permissions.vitest.ts` 5/5 PASS.
- **빌드/타입**: `npm run build` success, `npx tsc --noEmit` clean.

⚠ **브라우저 시각 QA 는 본 세션에서 실행 불가** (MCP chrome-devtools 연결 실패). 시각 AC 는 수동 확인 필요 — 아래 §3 에서 명시.

## 2. 수용 기준 매트릭스

### B1 성적 리포트

| AC | 내용 | 검증 방식 | 결과 |
|---|---|---|---|
| AC-B1-1 | 리포트 모달 2초 이내 로드 | GET /report latency ~250ms (dev server 첫 콜 제외) | ✅ |
| AC-B1-2 | 3개 요약 숫자 | report.summary.{submittedCount,avgCorrectRate,avgTimeMs} 필드 검증 | ✅ |
| AC-B1-3 | 학생×문항 매트릭스 3색 | QuizReportModal `quiz-report-cell-{correct,wrong,empty}` CSS + status bg 토큰. SSR 스모크 HTML 에 cell 클래스 존재 | ✅ (API); 시각 수동확인 권고 |
| AC-B1-4 | CSV UTF-8 BOM | raw bytes `EF BB BF` 확인 + Content-Type `text/csv; charset=utf-8` + `Content-Disposition: attachment; filename=quiz-{id}-report.csv` | ✅ |
| AC-B1-5 | 빈 상태 | empty quiz → `summary.submittedCount=0` + `players=[]` | ✅ |
| AC-B1-6 | 비소유 403 | editor 교사 → 403 | ✅ |

### B2 생성 옵션

| AC | 내용 | 검증 방식 | 결과 |
|---|---|---|---|
| AC-B2-1 | 난이도 세그먼트 기본 중간 | QuizGenerateModal `useState<QuizDifficulty>("medium")` + SegmentedControl 3 옵션 | ✅ 코드 확인 |
| AC-B2-2 | 문항 수 2모드 (auto 기본 / fixed 수 입력) | radiogroup + `disabled={countMode !== "fixed"}` | ✅ 코드 확인 |
| AC-B2-3 | auto 20 cap / fixed 클램프+insufficient | quiz-llm.ts `slice(0, 20)` + `/create` 에서 `clampCount(1~20)` + 422 `insufficient` 에러 | ✅ 코드 확인 + route 테스트 |
| AC-B2-4 | Quiz.difficulty 저장 | draft 승격 경로에서 `difficulty: "hard"` 전송 → DB 에 hard 저장 확인 | ✅ |

### B3 Draft / Edit

| AC | 내용 | 검증 방식 | 결과 |
|---|---|---|---|
| AC-B3-1 | /api/quiz/draft 는 DB 미저장 | /draft 라우트 코드에 `db.quiz.create` 호출 없음 — `return NextResponse.json({ questions })` 만 | ✅ 코드 감사 |
| AC-B3-2 | QuizDraftEditor 카드 | 컴포넌트 구조 확인 (질문/4옵션/정답라디오/삭제) | ✅ 코드 확인 |
| AC-B3-3 | + 문항 추가 / 상한 | `MAX_QUESTIONS=10` + `disabled={questions.length >= MAX_QUESTIONS}` | ✅ (design_doc 10, scope_decision AC-B3-3 은 20 명시 — 본 구현은 design_doc §3 의 "10개 상한" 우선. 스펙 불일치 메모) |
| AC-B3-4 | 저장 → /create → 모달 닫기 | draftQuestions 전송 → 200 + Quiz 생성 확인 | ✅ |
| AC-B3-5 | PUT /questions, 403 for non-owner | editor → 403, owner → 기존 questions 교체 성공 | ✅ |

### B4 재사용

| AC | 내용 | 검증 방식 | 결과 |
|---|---|---|---|
| AC-B4-1 | library 교사 소유 퀴즈 최신순 | library 응답에 seed+clone 포함, editor 세션은 제외 | ✅ |
| AC-B4-2 | 재사용 → clone → 섹션에 카드 | /clone POST 200 + 신규 roomCode + parentQuizId=source | ✅ |
| AC-B4-3 | parentQuizId 보존 | DB row 확인 | ✅ |
| AC-B4-4 | 본인 아닌 clone 403 | editor 세션 → 403 | ✅ |

### 보안 (phase8 자동 수정)

| 항목 | 검증 | 결과 |
|---|---|---|
| CSV Formula Injection guard | 학생 nickname=`=HACKER...` 주입 → CSV 에 `'=HACKER` prefix 확인 | ✅ |
| Esc/backdrop 으로 draft 유실 | `draftPending` 시 `confirm()` 경유 | ✅ 코드 확인 (수동 확인 권고) |

## 3. 시각 UI 수동 확인 필요 (MCP 불가로 자동화 불가)

아래 항목은 dev 서버에서 실제 브라우저로 열어 1회 확인 권고:

- QuizGenerateModal 탭 전환 (새로 만들기 ↔ 과거 퀴즈) 시각 상태
- QuizDraftEditor 빈 필드 입력 시 shake 애니메이션
- QuizReportModal 매트릭스 sticky 헤더/이름 열, 모바일 <600px 풀스크린 모달
- SegmentedControl active 상태 (accent 배경 + 흰 텍스트)
- 갤럭시 탭 S6 Lite 브라우저에서 draft 편집 탭 가능성 (project_perf_baseline_tab_s6_lite.md)

실시간 세션 start/next/finish 기존 플로우는 phase7 에서 변경되지 않아 회귀 위험 낮음 (SSR 스모크로 커버).

## 4. 테스트 실행 로그

```
[API e2e] tasks/2026-04-15-quiz-extensions/phase9/regression_tests/quiz_api_e2e.ts
  30/30 assertions passed

[Permissions e2e] tasks/2026-04-15-quiz-extensions/phase9/regression_tests/quiz_permissions_e2e.ts
  5/5 assertions passed

[Vitest] src/lib/__tests__/quiz-permissions.vitest.ts
  5/5 tests passed

[SSR smoke] GET /board/{quiz-layout-board}
  200, HTML 22KB, quiz-board class present, no application error

[Build] npm run build
  Success

[Typecheck] npx tsc --noEmit
  Clean
```

## 5. 판정

**전체 PASS** — 모든 자동화 가능한 AC 가 PASS, 시각 확인 필요 항목은 §3 에 명시하여 수동 QA 체크리스트로 인계.

`QA_OK.marker` 생성 → phase10 (deployer) 진행 가능.
