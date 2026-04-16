# Design Spec — performance-assessment-autograde (MVP-0)

task_id: 2026-04-16-performance-assessment-autograde
selected: mockups/v1 (All-questions scroll)

## 1. 선택된 변형

**v1 — All-questions scroll**. 사유 (`mockups/comparison.md`):
- MVP-0 ≤ 20 문항 제약에서 세로 스크롤이 가장 단순.
- 기존 `QuizReportModal` 매트릭스 CSS 재활용 — 신규 CSS 최소.
- v2/v3/v4 는 문항 수 증가 또는 태블릿 제스처 필요 시 MVP-1 재검토.

## 2. 화면 상태별 최종 디자인

### AssessmentBoard (자동 분기 셸)

- Owner teacher + 템플릿 없음 → `AssessmentComposer` 마운트.
- Owner teacher + 템플릿 있음 → `AssessmentGradebook` 마운트.
- Student in classroom + submission 없음 or in_progress → `AssessmentTake`.
- Student + submission.status==="submitted" → `AssessmentResult`.
- 다른 identity → "권한 없음" fallback.

### AssessmentComposer (교사)

- **empty** — 제목/시간 입력 + 1개 빈 MCQ 카드.
- **editing** — 복수 문항 카드, 각 카드에 🗑 삭제 + 정답 체크박스 + 배점.
- **saving** — 저장 CTA `저장 중...` + spinner.
- **error** — 상단 빨간 토스트 "저장 실패: {reason}".

### AssessmentTake (학생)

- **not-started** — "응시 시작" 큰 primary CTA + durationMin/문항 수 안내.
- **in-progress** — 타이머 sticky top + 문항 리스트 + 제출 CTA sticky bottom + 우상단 "저장됨" 미세.
- **expired** — 타이머 0 + 답안 disable + 상단 경고 배너 "시간 종료".
- **submitted** — 전체 화면 ✅ "제출 완료" 메시지.

### AssessmentGradebook (교사)

- **loading** — skeleton 매트릭스.
- **empty classroom** — "학급에 학생이 없습니다" 빈 상태.
- **ready** — 학생×문항 매트릭스 + 요약바(제출 N/M·평균 점수) + 학생별 "확정" + 우상단 "전체 릴리스".
- **released** — `릴리스됨 2026-04-18` 뱃지, 릴리스 버튼 disable.

### AssessmentResult (학생)

- **loading** — skeleton.
- **pending release** — 📭 "결과 공개 대기 중".
- **ready** — 큰 점수 + 문항별 정오 비교 리스트.
- **error** — "불러올 수 없음" + 재시도.

## 3. 사용된 토큰

### 기존 (변경 없음)
- 색: `--color-accent`, `--color-accent-active`, `--color-accent-tinted-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-text-faint`, `--color-danger`, `--color-status-reviewed-bg/text`, `--color-status-returned-bg/text`, `--color-slot-placeholder`.
- 타이포/간격/보더: 프로젝트 기본값 준수.

### 신규

**없음**. Quiz 기존 토큰 전부 충분.

## 4. 컴포넌트 목록

### 신규
- `src/components/assessment/AssessmentBoard.tsx`
- `src/components/assessment/AssessmentComposer.tsx`
- `src/components/assessment/AssessmentTake.tsx`
- `src/components/assessment/AssessmentGradebook.tsx`
- `src/components/assessment/AssessmentResult.tsx`
- `src/styles/assessment.css` (신규 스타일시트 — quiz.css 의 매트릭스 alias 블록 포함)

### 수정
- `src/app/board/[id]/page.tsx` — `case "assessment"` 분기 1건.

### 재사용
- `QuizReportModal` 매트릭스 CSS 클래스 네임 그대로는 쓰지 않지만 규칙 복사 (sticky head/col, 3색 셀).
- `card-permissions.ts` 의 `Identities` / `resolveIdentities` 그대로.
- `quiz-report.ts` 의 formula-injection guard 패턴 — MVP-0 CSV 는 OUT 이라 당장 미사용, 그러나 향후 추가 시 패턴 재사용.

## 5. 반응형

| 브레이크포인트 | 동작 |
|---|---|
| 모바일 (<600px) | Composer/Take 전체 폭. 타이머는 상단 고정 영역. 매트릭스는 가로 스크롤 + 이름 열 sticky. |
| 태블릿 (600~1024) | max-width 720px. 갤탭 S6 Lite 터치 44×44px 유지. |
| 데스크톱 (≥1024) | Composer/Take max-width 840px. Gradebook 는 full-width 허용 (매트릭스 가로 공간 우선). |

## 6. 구현 주의

- 타이머 깜빡임은 `@media (prefers-reduced-motion: reduce)` 에서 제거.
- 매트릭스 ARIA: scroll container 에 `aria-label="학생별 문항 결과 매트릭스"`.
- "제출" confirm 문구는 한국어 평어: "제출하면 수정할 수 없어요. 계속?"
- composer 저장 후 신규 template 이 만들어지면 즉시 gradebook 으로 전환 (교사 UX continuity).
