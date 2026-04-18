# Research Pack — performance-assessment-autograde

task_id: 2026-04-16-performance-assessment-autograde
input: phase0/request.json + INBOX handoff (seed_0badf1e571bc)
scope: v1 — MCQ + SHORT 2종 / 화면이탈 잠금 / 교사 확정·릴리스 / Pro 게이트

## 1. 외부 벤치마크 (이미 ideation 에서 수행됨)

- `ideation/tasks/2026-04-16-performance-assessment-autograde/phase1/exploration.md` (618 lines) — Quizizz, ClassKick, Kahoot, Google Forms, Wayground, Educreations, Nearpod, Formative, Socrative 비교 분석 완료.
- `ideation/tasks/2026-04-16-performance-assessment-autograde/phase2/sketch.md` (593 lines) — 응시 UI/매트릭스 뷰/부정행위 레이어 L1~L4 UX 설계 완료.
- `ideation/plans/assessment-autograde-roadmap.md` (440 lines) — 7 엔티티 Prisma 스키마 + 플로우 + 리스크 표 + 타임라인 8~10주 확정.

→ **외부 제품 재조사 skip**. 본 phase1 은 **padlet 내부 코드베이스 audit** 에 집중하여 ideation 설계가 전제하는 인프라 존재 여부를 검증한다.

## 2. padlet 내부 코드베이스 audit — 전제 인프라 실존성

| 전제 (roadmap) | 실제 코드베이스 상태 | 영향 |
|---|---|---|
| **Supabase Realtime 채널** (`assessment:{id}`, p95 < 500ms) | `src/lib/realtime.ts` 는 **no-op 스텁**. 실 엔진 미선정 (`research/realtime-engine` task 보류 중). | 🔴 **차단** — roadmap W6/W8 이 realtime broadcast 에 의존. MVP-0 은 polling/refetch 로 폴백 필요. |
| **PGMQ `grading_retry` 큐 + exponential backoff** | 프로젝트 내 queue/job scheduler 0 건. Vercel 크론만 존재(`src/app/api/cron/*`). | 🔴 **차단** — MVP-0 은 동기 채점 + 실패 즉시 retry_exhausted 마킹. |
| **Supabase RLS 3분화** (teacher/student/parent) | `prisma/migrations/*/rls.sql` 는 **scaffold 만, 프로덕션 미적용**. 실 enforcement 는 application-layer (`src/lib/card-permissions.ts`·`parent-scope.ts`). | 🟠 **정책 재정의** — MVP-0 은 app-layer 권한 체크(canAccessAssessment 헬퍼)로 일관. RLS 실제 적용은 별 task. |
| **Gemini 2.5 Flash 프로바이더** | `src/lib/quiz-llm.ts` 가 OpenAI/Anthropic 만 지원. `src/lib/grading/providers/` 경로 없음 (seed.yaml 가 가리키는 경로는 **미생성**). | 🔴 **차단** — MVP-0 은 기존 quiz-llm 확장 또는 Gemini 단독 provider 신규. |
| **IndexedDB + Supabase autosave 이중화** | 드래프트 저장 패턴 자체가 프로젝트 내 부재 (AssignmentSlot draft 는 서버 POST only). | 🟠 **스코프 축소** — MVP-0 은 300ms debounce 서버 autosave 만(IndexedDB 후속). |
| **FeatureFlag 모델** | 없음. 환경변수 기반 플래그도 별도 인프라 없음. | 🟡 **간이 구현** — DB 단일 row or env var 로 해결. |
| **Page Visibility API 영속화** | 선례 없음. 기존 Quiz/Assignment/Drawing 은 세션 중 신호 없음. | ✅ **신규 구현 — 단순** (visibilitychange 이벤트 → POST /lock). |
| **S-Pen 캔버스 800×400** | `src/components/DrawingBoard.tsx` 에 기존 Drawpile 기반 캔버스 존재. 고정 800×400 은 아님. | 🟡 **재활용/분리** — MVP-0 은 SHORT 텍스트만, 손글씨는 MVP-1 로 연기. |
| **react-virtual (30×30 매트릭스)** | 미설치. | 🟡 **MVP-0 스코프에서 제외** — 학생 × 문항 ≤ 30 는 기본 table 로 충분. |

## 3. 재사용 가능한 기존 패턴

### 3.1 Quiz 서브시스템 (방금 merge 됨, feat/quiz-extensions)
- `src/app/api/quiz/*` — 교사 보드 owner 기반 권한 체크(`canManageQuiz`).
- `src/components/quiz/QuizDraftEditor.tsx` — 문항 추가/삭제/editor 패턴. MCQ 생성기로 재활용 가능.
- `src/components/quiz/QuizReportModal.tsx` — 학생×문항 매트릭스 렌더 + sticky header/col + CSV export. **본 task 교사 gradebook 에 그대로 재활용**.
- `src/lib/quiz-report.ts` — 리포트 빌더 + CSV escape (formula-injection guard 포함). Assessment 성적부 CSV 에 재활용.

### 3.2 Board 레이아웃 확장 점
- `Board.layout` 은 이미 enum 필드. "assessment" 추가는 migration + `src/app/board/[id]/page.tsx` switch 분기 1건.

### 3.3 권한 체크
- `Identities` / `canAddCardToBoard` 패턴. Classroom owner = teacher 식별 이미 `Classroom.teacherId` 존재.

### 3.4 LLM 공용 모듈
- `src/lib/quiz-llm.ts` 의 provider dispatch 패턴. Gemini branch 를 추가하면 SHORT 채점에 바로 연결 가능.

### 3.5 card-permissions 단위 테스트 기법
- vitest + `vi.mock` 로 Prisma shim. Assessment 권한 테스트에 그대로 적용.

## 4. UX 패턴 (벤치마크 요약)

| 패턴 ID | 설명 | 출처 |
|---|---|---|
| AG-1 | 문항 ±1 lazy mount (Snapdragon 720G TTI < 3s) | Quizizz + ideation exploration |
| AG-2 | Page Visibility + fullscreenchange 더블 구독 + 서버 영속화 | ClassKick Guard, Formative Lock |
| AG-3 | SHORT 모범답안 다수 + 키워드 + 부분점수 체크박스 + 루브릭 자연어 4필드 | Formative rubric builder |
| AG-4 | 교사 매트릭스 뷰 sticky 이름 열 + 학생×문항 3색 상태 셀 | 이미 QuizReportModal 로 보유 |
| AG-5 | autoScore vs manualScore 구분 열 + 릴리스 버튼 | Google Forms + Wayground |
| AG-6 | draft autosave 300ms debounce + hash 무결성 | Formative Notebook |

## 5. 결론: MVP 범위 축소 근거

roadmap 이 전제하는 **6가지 인프라(Realtime/PGMQ/RLS/Gemini provider/IndexedDB/FeatureFlag)** 중 **4가지 (Realtime, PGMQ, RLS 실적용, Gemini provider)** 가 현재 codebase 에 **존재하지 않음**. 이들을 모두 동시 구축하며 5 primitive 전체를 커버하면 실제 타임라인은 **16주+** 로 추정 (roadmap 8~10주는 이 infra 가 있다는 가정).

solo 프로젝트 현실 + Karpathy Simplicity First 원칙 → phase2 strategist 가 **MVP-0** 로 아래를 격리 제안한다:
- MCQ 출제 + 응시 + 결정론 채점 + 교사 확정 + 학생 조회.
- SHORT / 화면이탈 잠금 / Realtime / Feature flag / 매트릭스 virtualization 은 MVP-1+ 로 분리.

이 감축은 roadmap §12 `exit_conditions.scope_overflow` 와 상충하지 않음 — 파킹이 아니라 **단계적 출시**다. seed 의 `goal` 은 MVP-0 → MVP-1 순차 달성으로 여전히 도달 가능.
