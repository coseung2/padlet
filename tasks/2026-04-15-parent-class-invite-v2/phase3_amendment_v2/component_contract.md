# phase3 Component Contract (amendment v2) — 전역 승격 컴포넌트 API

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **작성일**: 2026-04-14
- **근거**:
  - `phase6/user_decisions.md` Lane B #5·#6 — Toast / Stepper 전역 승격 결정
  - `phase6/review_report.md` §2.6 MAJOR (Toast API 명세 확장), §6 handoff notes 1·2
  - `phase5/design_spec.md` §2.1·§2.2·§4.1·§5.1·§5.2·§5.4
- **스코프**: 본 문서는 **공용 UI 2종(Toast / Stepper)** 의 API·a11y·동작 계약을 확정한다. 타 task-local 컴포넌트(DPlusBadge / CodeInput8 / StudentPickerCard / PendingRow / LinkedRow / InviteCodeCard / RotateConfirmModal / ClassroomDeleteModal / FilterBar) 는 phase5 design_spec.md §4.1 의 "a11y 핵심" 컬럼이 계약이며, 여기에 더해 `architecture.md §3` 의 FilterBar role 정정만 본 amendment 가 오버라이드한다.

---

## 1. Toast

### 1.1 경로 및 export

- 파일: **`src/components/ui/Toast.tsx`**
- Named exports:
  - `ToastProvider` — React provider, 페이지 최상위 (또는 파생 layout) 1개 배치. portal 을 document.body 에 렌더.
  - `useToast()` — `() => { show(toast: ToastInput): ToastId; dismiss(id: ToastId): void }` 훅.
  - 타입: `ToastVariant`, `ToastInput`, `ToastId`.

### 1.2 API 시그니처

```ts
type ToastVariant = "success" | "error" | "info";

type ToastInput = {
  variant: ToastVariant;
  message: string;               // 한국어 메시지, plain text. ReactNode 미허용 (v1 단순화).
  duration?: number;             // ms, 기본 2500. 0 또는 음수 금지(런타임 가드).
  onClose?: () => void;          // 자동 dismiss + 수동 dismiss 모두에서 호출 (중복 호출 금지).
};

type ToastId = string;            // 내부 uuid/nanoid. 호출자가 추론할 필요 없음.
```

- `variant="success"` : 승인/거부/해제/코드 발급·회전/복사 성공 피드백.
- `variant="error"` : 서버 오류, 네트워크 실패 피드백 (red-tinted banner 와 별개 — banner 는 섹션 내부, toast 는 글로벌).
- `variant="info"` : 일반 안내 (현재 phase5 에서는 직접 사용처 없음, 유틸 여유분).

### 1.3 a11y 계약

| 속성 | success / info | error |
|---|---|---|
| `role` | `"status"` | `"alert"` |
| `aria-live` | `"polite"` | `"assertive"` |
| `aria-atomic` | `"true"` | `"true"` |
| 닫기 버튼 `aria-label` | `"알림 닫기"` | `"알림 닫기"` |

- SR 은 toast 출현 시 message 를 읽는다. 닫힘은 선언하지 않음 (role=status 관례).
- `error` 는 polite 대신 assertive 로 채택 (phase6 review §6 #2 준수) — 사용자 조치가 필요한 경우임.

### 1.4 렌더 계약

- 위치: **viewport 우측 하단 fixed**. `bottom: 24px; right: 24px;` (mobile `16px`). 여러 toast 동시 표시 시 **위로 스택** (최신이 아래).
- 크기: max-width 360px, padding 12 16, radius `--radius-card`.
- 색상 매핑:
  - success: `--color-surface` + `--color-text` + 좌측 3px 바 `--color-accent`.
  - error: `--color-surface` + `--color-text` + 좌측 3px 바 `--color-danger`.
  - info: `--color-surface` + `--color-text-muted` + 좌측 3px 바 `--color-text-muted`.
- 닫기 버튼: 우측 상단, **44×44 touch target** (phase5 §5.2 준수, Tab S6 Lite baseline). 내부 아이콘은 시각상 16px, 나머지 여백이 target 영역.
- 그림자: `--shadow-card-hover`.

### 1.5 모션 계약

- 기본: 진입 `slide-up + fade-in 200ms`, 퇴장 `fade-out 180ms`.
- `@media (prefers-reduced-motion: reduce)`: **instant fade** (slide 제거, duration 0). phase5 §5.1 준수.

### 1.6 동작 계약

- `duration` 경과 시 자동 dismiss. hover / focus 시 dismiss 타이머 **일시 정지** (a11y, 마우스 없이 focus 로도 유지 가능).
- 닫기 버튼 클릭 또는 Esc 키 → 현재 focus 된 toast 즉시 dismiss.
- `show()` 다중 호출 시 각 toast 는 독립 타이머 (v1 단순화: 큐잉·대체·dedupe 없음).
- 같은 메시지 반복 호출 시 중복 표시 허용 (dedupe 정책 OUT — Simplicity First).

### 1.7 phase5 대응 호출 지점

| 호출 지점 | variant | message 예시 |
|---|---|---|
| 코드 발급/회전 성공 (§2.1.1 success) | success | `새 코드가 발급되었습니다 (기존 대기 N건은 자동 거부)` |
| 승인 성공 (§2.1.2 success) | success | `승인되었습니다` |
| 거부 성공 (§2.1.2 success) | success | `거부되었습니다 (사유: {reason})` |
| 해제 성공 (§2.1.3 success) | success | `학부모 연결을 해제했습니다` |
| 학급 삭제 성공 (§2.1.5 success) | success | `학급이 삭제되었습니다` |
| P5 승인 감지 (§2.2.6 success) | success | `승인되었습니다` |
| InviteCodeCard 복사 성공 (§4.1) | success | `코드를 복사했습니다` (phase5 가 aria-live 로 처리한 in-place 는 유지, toast 는 선택적 — phase7 coder 판단) |

---

## 2. Stepper

### 2.1 경로 및 export

- 파일: **`src/components/ui/Stepper.tsx`**
- Default export: `Stepper`.
- 이름 `Stepper` (기존 `OnboardingStepper` 의 도메인 접두사 제거) — user_decisions Lane B #6 전역 승격 의도 반영.

### 2.2 API 시그니처

```ts
type StepperVariant = "dot";       // v1 은 dot 1종만. 'bar' 등 확장은 후속 task.

type StepperProps = {
  current: number;                 // 1-indexed, 1..total.
  total: number;                   // 총 단계 수.
  variant?: StepperVariant;        // 기본 "dot".
  labels?: string[];               // optional, length === total 이어야 함. 각 step 의 aria-label 세부화용.
  ariaLabel?: string;              // 기본 "진행 단계".
};
```

- `current < 1 || current > total` 은 dev 빌드에서 console.warn, prod 에서는 clamp.
- `labels` 제공 시 각 dot 에 `aria-label="{label[i]} ({i+1} / {total})"` 세부화.

### 2.3 a11y 계약

- 루트: `role="progressbar"` + `aria-valuenow={current}` + `aria-valuemin={1}` + `aria-valuemax={total}` + `aria-label={ariaLabel ?? "진행 단계"}`.
- 보조 SR 텍스트: `<span className="sr-only">{current} of {total}</span>` 루트 자식.
- 각 dot 은 **순수 장식** — interactive 아님, 클릭으로 이동 불가 (v1 단순화).

### 2.4 렌더 계약

- dot 8×8 원, 간격 12, 연결선 1px `--color-border` (완료 dot 사이).
- 색: 완료/현재 `--color-accent`, 미완료 `--color-border-hover`.
- 정렬: 수평 center. 온보딩 셸(phase5 §2.2.1) 헤더 아래 16px 간격.

### 2.5 모션 계약

- dot 배경색 전환 `background-color 150ms ease`.
- `prefers-reduced-motion: reduce` → instant (phase5 §5.1).

### 2.6 phase5 대응 호출 지점

- P1 `<Stepper current={1} total={4} />`
- P3 `<Stepper current={2} total={4} />`
- P4 `<Stepper current={3} total={4} />`
- P5 `<Stepper current={4} total={4} />`
- P2 Verify: 일반적으로 중간 통과 화면이므로 Stepper 렌더 선택 — phase5 §2.2.3 이 dot 표기 명시 없음 → **렌더 스킵** (phase5 loading 화면 유지). phase7 coder ground truth.
- P6 Rejected: 스킵 (phase5 §2.2.7 준수).

---

## 3. 본 계약이 phase5 spec 을 오버라이드하는 지점 요약

| 지점 | phase5 원 표기 | 본 amendment 확정 |
|---|---|---|
| Toast 경로 | task-local (spec 상 "공식 정의 없음, 간단 구현") | `src/components/ui/Toast.tsx` (전역) |
| Toast API 속성 | `role`/`aria-live` 미기재 | §1.3 표 확정 |
| Stepper 경로 | `src/components/parent/OnboardingStepper.tsx` | `src/components/ui/Stepper.tsx` |
| Stepper 컴포넌트명 | `OnboardingStepper` | `Stepper` |
| FilterBar role | `role="tablist" + aria-selected` | `role="radiogroup" + role="radio" + aria-checked` (본 amendment `architecture.md §3`) |

그 외 phase5 design_spec.md §4.1 의 컴포넌트 a11y 핵심 계약(DPlusBadge / CodeInput8 / StudentPickerCard / PendingRow / LinkedRow / InviteCodeCard / RotateConfirmModal / ClassroomDeleteModal)은 **변경 없음**. phase7 coder ground truth.

---

## 4. 검증 게이트 self-pass

- [x] Toast API (variant / message / duration / onClose) 명시 — §1.2
- [x] Toast a11y (role / aria-live / 44×44 close / reduced-motion) 명시 — §1.3, §1.4, §1.5
- [x] Stepper API (steps / currentStep 유사 / aria-label pattern) 명시 — §2.2, §2.3
- [x] phase5 와의 override 지점 요약 — §3
- [x] TODO/TBD 부재
