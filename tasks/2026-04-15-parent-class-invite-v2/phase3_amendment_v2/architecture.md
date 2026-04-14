# phase3 Architecture Amendment v2 — design alignment (Toast/Stepper 전역 승격 + 토큰·FilterBar role 보정)

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **작성일**: 2026-04-14
- **근거**:
  - `phase6/user_decisions.md` Lane B #5·#6 (Toast/Stepper 전역 승격 확정)
  - `phase6/review_report.md` §2.1 / §2.2 / §2.6 / §2.7 / §6 handoff notes (MAJOR 2 + MINOR 5)
  - `phase5/design_spec.md` §2·§4·§5 · `phase5/tokens_patch.json`
- **스택 lockdown 불변**: 본 amendment 는 phase3 의 DB/API/route/middleware/Cron 아키텍처를 변경하지 않는다. 컴포넌트 경로 1건과 토큰 패치 적용 타이밍, a11y 계약만 delta.
- **upstream 정정 관계**:
  - `phase3/architecture.md` : 본 문서로 §4.1 컴포넌트 위치(`OnboardingStepper`) 와 §11 DX 신규 lib 목록 delta.
  - `phase3_amendment/architecture_amendment.md` (2026-04-13, 마스킹 제거) : 유지. 본 amendment 는 그 위에 누적.

---

## 0. Karpathy 4원칙 적용 로그 (amendment)

| 원칙 | 본 amendment 적용 |
|---|---|
| **Think Before Coding** | phase5 산출 vs user_decisions 의 alignment 갭을 phase6 가 MAJOR 로 명문화. 본 amendment 는 phase7 coder 가 추정 없이 참조할 **단일 진실원**을 확정(`src/components/ui/*` 경로 + Toast API 계약). phase5 문서는 역사성 보존을 위해 손대지 않음. |
| **Simplicity First** | Toast/Stepper 의 전역화 범위를 **경로 이동 + API 명세**로만 제한. 타 공용 컴포넌트 재설계 금지. `FilterBar` 는 role 속성 한 줄만 교체, 글로벌 승격 안 함. Display 28 은 hardcode 로 끝내고 신규 타이포 토큰 만들지 않음. |
| **Surgical Changes** | phase3 §4.1 의 `<OnboardingStepper />` 경로 1줄 + §11 lib 파일 목록 1줄 + 본 amendment 신설 docs 의 "phase7 구현 경로" 확정만. phase3 §1~§10 본문 본체는 불변. |
| **Goal-Driven Execution** | "phase7 coder 가 추정 없이 착수할 수 있다" 를 게이트 목표로. 검증은 `component_contract.md` + `blockers_for_phase7.md` 가 충족. |

---

## 1. 모듈/바운더리 delta

### 1.1 공용 UI 경로 승격 (user_decisions Lane B #5·#6 확정)

`src/components/ui/` 디렉토리(기존)에 전역 컴포넌트 2종 추가:

| 컴포넌트 | phase3 원 경로 (탈) | 본 amendment 확정 경로 | 비고 |
|---|---|---|---|
| `Toast` | (phase5 spec 상 "task-local <Toast/> — 공식 정의 부재") | **`src/components/ui/Toast.tsx`** | 신규. provider/portal/API 는 `component_contract.md §1`. |
| `Stepper` | `src/components/parent/OnboardingStepper.tsx` (phase3 §4.1 트리) | **`src/components/ui/Stepper.tsx`** | 이름 변경 (`OnboardingStepper` → `Stepper`). parent 전용 어휘 제거. |

**bounded import 규칙 (phase7 ESLint 보완 권고, 강제 아님)**:
- `src/components/ui/Toast.tsx`, `src/components/ui/Stepper.tsx` 는 `src/components/parent/**`, `src/components/parent-access/**`, `src/app/**` 에서 import 허용.
- 역방향 (`ui/` → `parent*/`) import 금지 — 일반 bounded context 규칙 (기존 프로젝트 패턴과 동일).
- ESLint plugin-local 에 별도 룰 신설은 **OUT** (과한 정책 확장 — Simplicity First). 코드 리뷰로 방어.

### 1.2 phase3 §4.1 교사 컴포넌트 트리 delta

phase3 §4.1 의 컴포넌트 트리는 그대로 유효. 단, Toast 사용처는 다음과 같이 명시:

```
<ParentAccessPage/>
├── <ToastProvider/>                              # (신규) 페이지 상단 provider
│   ├── <InviteCodeSection/>                      # success toast: 발급/회전/복사
│   ├── <ApprovalInboxSection/>                   # success toast: 승인/거부 완료
│   └── <LinkedParentsSection/>                   # success toast: 해제
```

- `ToastProvider` 는 `src/components/ui/Toast.tsx` 에서 export (`useToast()` hook + portal 렌더). 위치 계약은 `component_contract.md §1.3`.
- phase3 §4.1 이 명시한 "client SWR `mutate()` 후 즉시 반영" 은 그대로. Toast 는 mutation 성공/실패 callback 에서 `useToast().show(...)` 호출.

### 1.3 phase3 §4.2 학부모 온보딩 트리 delta

Stepper 사용 위치는 phase5 design_spec.md §2.2.1 의 공통 shell 에 이미 명시. 본 amendment 는 경로/이름만 교체:

```
<OnboardingShell> (phase5 §2.2.1, task-local or 인라인)
├── <header>                                     # Aura-board logo 24px
├── <Stepper current={1..4} total={4} />         # (신규 ui/Stepper), P6 에서 렌더 스킵
└── <main>{children}</main>
```

- P1~P5 에 렌더, P6(Rejected)에서 스킵 — phase5 §2.2.7 준수.
- `variant="dot"` 은 Stepper 의 기본값으로 가정(계약 `component_contract.md §2.1`).

### 1.4 경로 변경이 phase3 §11 DX 영향에 미치는 delta

phase3 §11 의 "신규 lib 파일 5종" 은 그대로 유지. **컴포넌트 추가는 `lib` 가 아니라 `components/ui`** 이므로 §11 목록을 수정하지 않는다. 다만 phase7 coder 는 신규 ui 컴포넌트 2개(`Toast`, `Stepper`) 를 작업 목록에 별도로 포함해야 한다 — 본 amendment 가 그 근거.

---

## 2. 토큰 패치 적용 타이밍 (tokens_patch.json)

### 2.1 `src/styles/base.css` `:root` 반영 시점

`phase5/tokens_patch.json` 의 `additions` (`--color-warning`, `--color-warning-tinted-bg`) 는 **phase7 coder 가 `src/styles/base.css` 의 `:root` 블록에 직접 추가한다.** phase3 §11 DX 영향 목록에 명시되지 않은 작업이므로 본 amendment 에서 확정.

- 추가 위치: 기존 `--color-danger` 계열 다음 (알파벳 혹은 의미 순서 중 프로젝트 관례 준수).
- 주석으로 `/* parent-class-invite-v2 phase5 */` 는 **부착하지 않음** — 프로젝트 CSS 컨벤션상 불필요. 토큰 값만 추가.

### 2.2 `docs/design-system.md` 문서 동기화 시점

- phase7/8 에서는 docs 를 수정하지 **않는다**.
- **phase11 doc_syncer** 가 다음을 수행:
  1. `docs/design-system.md` §1 컬러 토큰에 "Warning" 서브섹션 신규 추가 (`--color-warning`, `--color-warning-tinted-bg`).
  2. `§7 컴포넌트 패턴` 에 **Toast** 섹션 추가 (`component_contract.md §1` 내용 요약).
  3. `§7 컴포넌트 패턴` 에 **Stepper** 섹션 추가 (`component_contract.md §2` 내용 요약).
  4. `§8 접근성` 또는 체크리스트에 "태블릿 우선 surface 는 터치 타깃 44px" 항목 추가.
  5. `tokens_patch.json §notes` 의 오타 `"glob 승격"` → `"global 승격"` 정정 반영(phase6 review §2.7 NIT).
- 본 amendment 는 `design_system_docs_patch.timing = "phase11 doc_syncer"` 를 확정한다 (phase5 tokens_patch.json `design_system_docs_patch.timing = "phase8 code_reviewer 통과 후"` 보다 **늦춤** — phase8 리뷰 범위가 코드이지 docs 아님, 일관성 목적).

### 2.3 `#b45309` fallback 불필요 확정

user_decisions Lane B #4 로 `#f59e0b` 확정. fallback 브랜치 제거 — phase7 coder 는 단일 값만 사용.

---

## 3. FilterBar role 계약 (phase6 §2.1 MINOR 반영)

phase5 design_spec.md §4.1 은 FilterBar 를 `role="tablist" + aria-selected` 로 명시하였으나, **실제 동작은 "클라이언트 필터 단일 선택 토글"** (phase4 brief §3.1 기준). 탭이 아니므로 WAI-ARIA 의미 왜곡.

### 3.1 확정 contract

`<FilterBar />` 의 ARIA 는 다음으로 확정:

- 루트: `role="radiogroup"` + `aria-label="대기 목록 필터"`
- 각 옵션 버튼: `role="radio"` + `aria-checked={selected}` + `tabIndex={selected ? 0 : -1}`
- 키보드: 좌/우 화살표로 이동하며 `aria-checked` 이동 + focus 이동 (WAI-ARIA radiogroup 규칙)
- 시각 스타일은 phase5 §2.1.2 ready 의 pill 토글 그대로 유지.

phase5 spec 상의 `role="tablist"` 표기는 본 amendment 로 **오버라이드**된다. phase5 원문은 수정하지 않음(계약: phase5 보존). phase7 coder 의 ground truth 는 본 §3.1.

### 3.2 대안 rejected

- `<button aria-pressed>` 방식도 유효하나, 3-토글이 상호 배타적이라는 "단일 선택" 의미를 `radiogroup` 쪽이 더 정확히 전달. 채택 안 함.

---

## 4. Display 28 예외 처리 (phase6 §2.2 MINOR)

- `InviteCodeSection` ready 상태의 8자리 초대 코드(§2.1.1)는 "모노 Display 28px" 로 phase5 가 확정.
- 기존 design-system §2 타이포 scale 은 Display 26 이 최대. 본 task 의 28px 은 **1회성 hardcode** 로 구현:
  - CSS 토큰 신규 추가 없음.
  - `InviteCodeCard.tsx` 내부 스타일에 `font-size: 28px; font-family: ui-monospace, ...` 을 직접 기재.
  - 추후 동일 표기가 누적 surface 2건 이상 될 시 별도 `--type-display-mono` 토큰 제안 (본 amendment 스코프 밖).
- phase5 `design_spec.md §3.1` 타이포 표의 Display 항목 위에 "28px 예외주" 를 추가할 필요는 **없음** — 본 amendment 가 단일 예외임을 명문화함으로써 대체.

---

## 5. phase3 본문 정정 요약 (overlay map)

| phase3 원문 위치 | 원 표기 | amendment v2 확정 |
|---|---|---|
| §4.1 학부모 온보딩 트리 중 Stepper | `src/components/parent/OnboardingStepper.tsx` | `src/components/ui/Stepper.tsx` (이름 `Stepper`) |
| §4.1 교사 트리 | Toast 미기재 | `src/components/ui/Toast.tsx` + `<ToastProvider>` 최상위 배치 (본 §1.2) |
| §11 DX 영향 | "신규 lib 파일 5종" | lib 5종 유지 + 신규 ui 컴포넌트 2종(`Toast`, `Stepper`) 추가 |
| §8.5 마스킹 규칙 | (phase3_amendment 2026-04-13 로 삭제됨) | 유지 (본 amendment 와 무관) |
| 토큰 추가 타이밍 | (phase3 내 언급 없음) | `src/styles/base.css` 는 phase7, `docs/design-system.md` 는 phase11 doc_syncer |

본 amendment 는 phase3 원문을 **편집하지 않는다** — phase7 coder 는 phase3 원문 + 본 amendment 2건(2026-04-13 마스킹 제거 + 본 v2) 을 순서대로 합성해 참조한다.

---

## 6. data_model / api_contract 영향

- **data_model**: 변경 없음 (`data_model.md` 참조).
- **api_contract**: 변경 없음 (`api_contract.md` 참조).
- phase5 는 UI/토큰/컴포넌트 계약만 추가/조정했고 DB schema, enum, endpoint 시그니처, Cron path, middleware 는 손대지 않았다. 따라서 서버 계약 delta 는 0건.

---

## 7. 검증 게이트 self-pass

- [x] 컴포넌트 전역 승격 2종(Toast/Stepper) 경로 확정 — §1.1
- [x] 토큰 패치 반영 위치/타이밍 확정 — §2
- [x] FilterBar role 계약 확정 — §3
- [x] Display 28 예외 처리 명시 — §4
- [x] phase3 원문 overlay 규칙 — §5
- [x] data_model / api_contract delta 여부 명시 — §6
- [x] Karpathy 4원칙 적용 로그 — §0
- [x] `component_contract.md` 참조 포인터 다수 — §1.2 / §1.3 / §2.1 / §3.1
- [x] 신규 추측/투기적 확장 없음 (ESLint rule 추가도 OUT)
- [x] TODO/TBD/placeholder 부재

**판정: PASS** — phase7 coder 진입 전, §3 user_decisions 기반 블로커 3종(`blockers_for_phase7.md`) 확인 필요.
