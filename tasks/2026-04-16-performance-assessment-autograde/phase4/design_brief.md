# Design Brief — performance-assessment-autograde (MVP-0)

task_id: 2026-04-16-performance-assessment-autograde
input: phase2/scope_decision.md + phase3/design_doc.md

## 1. 화면 × 상태

### AssessmentBoard (진입 셸 — 자동 분기)
- **교사 × 템플릿 없음** → Composer 직행
- **교사 × 템플릿 있음** → Gradebook 직행
- **학생 × 응시 전** → "응시 시작" CTA
- **학생 × 응시 중** → Take 화면
- **학생 × 제출 완료 + 미릴리스** → Result (공개 대기 중)
- **학생 × 릴리스 후** → Result (점수 노출)

### AssessmentComposer
- **empty draft** — 제목/시간 입력 + "+ 문항 추가" 버튼 + 첫 MCQ 빈 카드
- **editing** — 문항 카드 목록(드래그 재정렬 OUT — MVP-0), 최소 1문항 필수
- **saving** — "저장 중…" CTA disabled + spinner
- **error** — 상단 빨간 토스트 "저장 실패: {reason}"

### AssessmentTake
- **not-started** — "응시 시작" 큰 CTA + durationMin 안내 + 문항 수 표시
- **in-progress** — 상단 타이머(남은 시간 mm:ss) sticky + 문항 리스트 + 각 문항 라디오/체크박스 + 하단 "제출" 버튼
- **saving** — 미세 autosave 표시 (우상단 "저장됨" / "저장 중")
- **expired** — 타이머 0 도달 시 답안 편집 disable, "시간 종료 — 제출해주세요" 배너
- **submitted** — "제출 완료! 결과는 선생님이 공개하면 볼 수 있어요" 전체 화면 confirmation

### AssessmentGradebook (교사)
- **loading skeleton**
- **empty classroom** — "학급에 학생이 없습니다" 빈 상태
- **ready** — 학생(행) × 문항(열) 매트릭스 + 자동점수 + "확정" 버튼(학생별) + "전체 릴리스" 버튼(상단)
- **released** — "2026-04-18 공개됨" 뱃지 + 릴리스 버튼 비활성

### AssessmentResult (학생)
- **loading**
- **pending release** — 📭 "결과 공개 대기 중" 빈 상태 + "선생님이 공개하면 자동으로 보여요" 안내 + 10초 polling
- **ready** — finalScore 큰 숫자 + 문항별 선택/정답 비교 리스트 (정답 녹색, 오답 빨강)
- **error** — "결과를 불러올 수 없습니다" + 재시도 버튼

## 2. 정보 계층

### Composer
1. 제목 입력 (최상단, 포커스)
2. 시간 설정 (제목 옆)
3. 문항 카드 목록 (주 영역)
4. "저장" CTA (하단 sticky)

### Take (학생)
1. **타이머** (상단 sticky, 빨강 < 5min)
2. 문항 + 보기 (주 영역)
3. "제출" CTA (하단 sticky)
4. autosave 상태 (우상단 작게)

### Gradebook (교사)
1. 매트릭스 (주 영역)
2. 요약바 (상단 — 응시 완료 N / 평균 점수)
3. "릴리스" CTA (우상단)

### Result (학생)
1. **점수** (최상단, 큰 숫자, 성취감 톤)
2. 문항별 정오 비교
3. 전체 점수 대비 정답률

## 3. 인터랙션 명세

| 행동 | 반응 |
|---|---|
| [교사] 문항 "+ 추가" 클릭 | 빈 MCQ 카드 리스트 끝에 삽입, 첫 prompt input 자동 focus |
| [교사] MCQ 체크박스로 정답 지정 | 해당 choice 배경 하이라이트 (accent tinted bg) |
| [학생] 응시 시작 | `POST submissions` → Take 화면 전환 (애니메이션 없음) |
| [학생] 보기 선택 | 라디오 선택 → 300ms debounce 후 PATCH. 우상단 "저장 중" → "저장됨" 전환 |
| [학생] 제출 | confirm("제출하면 수정할 수 없어요. 계속?") → POST submit → "제출 완료" 화면 |
| [교사] 학생 row "확정" | finalScore 모달 확인 → POST finalize → row 녹색 뱃지 "확정됨" |
| [교사] "전체 릴리스" | confirm("학급 전체에 점수 공개합니다") → 각 submission 에 POST release 순차 호출 → 진행 바 |
| [학생 polling] | 10초마다 GET result → releasedAt 생기면 자동 전환 (새로고침 불필요) |
| 타이머 < 5min | 타이머 색상 빨강 전환 + 깜빡임 (pulse 1Hz) |
| 타이머 = 0 | 답안 편집 disable + 상단 경고 배너 |

## 4. 접근성 요구

1. **키보드 only 동작** — 모든 CTA Tab 순회, Enter/Space 발동. 라디오 그룹 ↑↓ 키 이동.
2. **SR 라벨**: MCQ 체크박스는 `role="checkbox"` + aria-label `"보기 A 정답 지정"`. 타이머는 `role="timer"` + aria-live="polite" (5분/1분 경계에서만 알림).
3. **명도 대비** — 타이머 빨강은 `--color-danger` (#c62828 on white = AAA). autosave 상태 텍스트는 `--color-text-muted` 확인.
4. **포커스 가시성** — 모든 button/input 에 accent outline 2px (기존 디자인 토큰 재사용).
5. **사용자 제어 polling** — 학생 Result 폴링은 자동이지만 `prefers-reduced-motion` 시 애니메이션/깜빡임 제거.

## 5. 디자인 시스템 확장 여부

### 기존 토큰으로 충분
- `--color-accent` / `--color-accent-tinted-bg` / `--color-status-reviewed-bg` / `--color-status-returned-bg` / `--color-slot-placeholder` / `--color-danger` / `--color-text-muted`.
- QuizReportModal 의 매트릭스 CSS (`quiz-report-matrix*`, `quiz-report-cell-{correct,wrong,empty}`) 를 **이름만 rebrand** (`assessment-matrix-*`) 하여 재사용. 혹은 공용 CSS class 로 추출도 가능하나 MVP-0 은 카피 + prefix 교체로 surgical.

### 신규 토큰 / 컴포넌트

- 신규 토큰: **없음**.
- 신규 컴포넌트: 없음. 기존 `SegmentedControl` (quiz 에서 도입)도 재사용 가능하지만 MVP-0 은 사용처 없음.

### 분리된 CSS 파일

- `src/styles/assessment.css` (신규) — AssessmentComposer/Take/Gradebook/Result 전용. QuizReportModal 매트릭스 CSS 의 alias 블록 포함. 기존 `quiz.css` 의무 변경 없음.
