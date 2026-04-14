# Phase6 Design Review Report — parent-class-invite-v2

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **작성일**: 2026-04-14
- **reviewer**: phase6 design_reviewer (agent, autonomous)
- **입력**:
  - `phase6/user_decisions.md` (binding, 사용자 확정 6건)
  - `phase5/design_spec.md` (primary under review)
  - `phase5/design_decisions.md`
  - `phase5/tokens_patch.json`
  - `phase5/mockups/v1/README.md`, `phase5/mockups/comparison.md`
  - `phase4/design_brief.md`
  - `docs/design-system.md`

---

## 1. 판정 (Verdict)

**PASS** — phase7 coder 진입 가능.

근거: 모든 BLOCKER 0건. 본 리뷰에서 식별된 MAJOR 이슈는 **phase5 designer 의 설계 오류가 아니라** 사용자 확정(user_decisions.md) 이 phase5 산출보다 늦게 내려진 결과로 발생한 alignment 갭이며, phase7 coder 가 user_decisions 를 ground truth 로 따르는 한 구현 제약이 아님. 본 리뷰가 해당 갭을 명시 기록함으로써 downstream 에서 추정 없이 참조 가능.

자체 평가 점수 (phase6 계약 §평가 차원, 0~10):

| 차원 | 점수 | 근거 |
|---|---|---|
| 일관성 (DS 준수) | 9 | 토큰 100% 사용, Display 28 단일 예외만 존재 (§3.2 MINOR) |
| 계층 (정보 우선순위) | 9 | brief §2.1 인박스 > 코드 > 연결 을 2-col 에 1:1 매핑 |
| 접근성 | 9 | ARIA 15건 + focus trap + aria-live + reduced-motion 모두 명시. masking 제거 aria 수정 추적됨 |
| 감성/톤 | 9 | Notion-Calm, 기존 Aura-board 카드 패턴 계승, 신규 UI 패턴 최소 |
| AI slop | 10 | placeholder/Lorem/반복 그라디언트 없음. 와이어프레임 예시명 `김보민/이도준/박서연/한민수` 구체 |
| 반응형 | 8 | PC 확정 후 태블릿 세로 stack 전략 유효. 모바일 QR on-demand 1건 마찰 존재 (수용 가능) |

**평균 9.0** ≥ 8.0 phase7 게이트 통과.

---

## 2. 영역별 findings

severity 표기: **BLOCKER** (phase7 진입 차단) / **MAJOR** (구현 전 명확화 필요) / **MINOR** (개선 권고) / **NIT** (미세).

### 2.1 접근성 (Accessibility)

| severity | finding | 위치 |
|---|---|---|
| — (OK) | DPlusBadge 색 4.82:1 AA 통과, 사용자 수용. brief §4.3 요구 충족. | `design_spec.md §3.2`, `tokens_patch.json` |
| — (OK) | masking 제거에 따른 aria-label 재작성 6건 명시 (`{studentName}` 원본 바인딩). | `design_decisions.md §5.3`, `design_spec.md §4.1` |
| — (OK) | 모달 `role="dialog" + aria-modal=true + aria-labelledby` + focus trap 첫 포커스 `[취소]`. brief §4.1 준수. | `design_spec.md §4.1`, §5.4 |
| — (OK) | `aria-live="polite"` 는 InviteCodeCard copy 피드백 + 학부모 P5 polling 상태 변화 (brief §4.2) 에 연결. | `design_spec.md §4.1`, brief §4.2 |
| — (OK) | `prefers-reduced-motion` : modalIn/rowFade/polling sweep/toast/stepper 전부 instant 로 degrade. | `design_spec.md §5.1` |
| — (OK) | 터치 타깃 44×44 전 surface (PendingRow 버튼 44h/padding 10 16, StudentPickerCard 132×116, CodeInput8 48×56, Toast 닫기 44×44). | `design_spec.md §5.2` |
| **MINOR** | Toast 에 `role`/`aria-live` 값이 spec 에 명시되어 있지 않음. 승인/거부/해제 피드백이 SR 에게 전달되려면 `role="status"` + `aria-live="polite"` 필수 (destructive 확정 완료 메시지는 `assertive` 고려). phase7 coder 가 `components/ui/Toast.tsx` API 설계 시 포함해야 함. | `design_spec.md §2.1.1~2.2.6 success rows` |
| **MINOR** | FilterBar 가 `role="tablist" + aria-selected` 인데 실제로 "탭" 이 아니라 "클라이언트 필터 토글" 임(brief §3.1 "클라이언트 필터링"). 엄격 WAI-ARIA 상 `role="radiogroup"` 또는 plain `<button aria-pressed>` 가 더 적합. 현재 선택도 AT 에는 동작하나 의미 왜곡. phase7 에서 확정 권고. | `design_spec.md §4.1` FilterBar 행 |
| **NIT** | `CodeInput8` 각 칸 `aria-label="{n}번째 자리"` 는 한국어 SR 에서 "첫번째자리/두번째자리" 로 읽힘. 명료성 OK. |  |

### 2.2 디자인 시스템 준수

| severity | finding | 위치 |
|---|---|---|
| — (OK) | 기존 토큰 전 계열 재사용 (§3.1 24항목 매핑). 하드코딩 hex = 시맨틱 상태색 3종 (Submitted/Reviewed/Returned — 본 task 미사용) + 신규 warning 2종 (tokens_patch.json 경유, §1 rule 준수). | `design_spec.md §3`, `docs/design-system.md §1.62` |
| — (OK) | radius = `--radius-card/-btn/-pill` 만 사용. shadow = `--shadow-card/-card-hover/-accent/-accent-hover`. ds §3/§4 준수. | `design_spec.md §3.1` |
| — (OK) | `rgba(198,40,40,0.08)` (error banner bg) / `#fee2e2` (D+6 tinted bg) 은 파생 투명/tinted 로 `--color-danger` 계열 표면 값으로 수용. ds §1.53 destructive 구조와 일관. | `design_spec.md §2.1.1 error`, `mockups/v1/README.md §4` |
| **MINOR** | `§2.1.1 ready` 의 "모노 **Display 28px** 코드" 는 ds §2 타이포 체계 (Display **26px**) 외. 8자리 invite 코드 표기를 위한 1회성 오버라이드이며 mockups/v1 의 "mono 20px bold" 와도 불일치. 수치 중 하나로 통일 권고: ds Display(26) 유지 또는 별도 "Display Mono 28" 토큰 제안. 현행 스펙이 확정값이라면 hardcoded 28 로 구현하고 §3.1 타이포 표에 예외주 추가 필요. | `design_spec.md §2.1.1` vs `mockups/v1/README.md §1.1` |
| **MINOR** | 학부모 온보딩 셸 패딩 `48px 32px (desktop/tablet) / 32px 20px (mobile)` 은 ds §3 8pt grid 준수이지만 onboarding shell 사양을 design-system.md §7 카드 패턴에 "온보딩 variant" 로 기입해둘 가치 있음 (향후 학생 온보딩 재사용 대비). 본 task 구현 차단은 아님. | `design_spec.md §2.2.1` |

### 2.3 반응형 / 디바이스 (PC-first 확정)

| severity | finding | 위치 |
|---|---|---|
| — (OK) | user_decisions #3 에서 PC-first 확정 → v1 유지, v3 재평가 불필요. comparison.md §7 open question 1 해소됨. | `user_decisions.md`, `comparison.md §7` |
| — (OK) | 태블릿 세로 degrade 전략 (세로 stack, 순서 인박스→코드→LinkedParents) 명시, PendingRow 내부 1-row 유지. Tab S6 Lite 가로(1200px) 는 데스크탑 레이아웃 진입. | `mockups/v1/README.md §1.2`, `design_spec.md §1` |
| — (OK) | 모바일 QR on-demand (brief scope 외이지만 graceful). | `mockups/v1/README.md §1.3` |
| **NIT** | 태블릿 세로 브레이크포인트 수치가 design_spec.md 본문에 없음 (mockups README 에만 "768~1080"). phase5 는 "design-system.md §6 반응형 3 브레이크포인트" 를 상속한다고 간주 — OK. | — |

### 2.4 커버리지 (화면·상태)

| severity | finding | 위치 |
|---|---|---|
| — (OK) | 11개 UI 화면 (S-T1~5 + S-P1~6) + 이메일 9종 모두 존재. | `design_decisions.md §1`, `design_spec.md §2` |
| — (OK) | 5 상태 (empty/loading/ready/error/success) 매핑: 교사 3섹션 + 2 모달 = 상태표 5행 × 5, 학부모 6 페이지 = 5행 × 6. 모달에서 empty 는 "해당 없음" 으로 명시적 제외. brief §1 요구 충족. | `design_spec.md §2.1, §2.2` |
| — (OK) | P6 reason 7종 (brief §1.2 S-P6 5종 + `code_rotated` + `classroom_deleted`) 전부 분기. brief §1.3 의 `classroom_deleted` 추가가 P6 로 흡수되는 흐름 일관. | `design_spec.md §2.2.7`, brief §1.2·§1.3 |
| — (OK) | 이메일 9종 = brief §1.4 명세와 1:1 일치 (educator 메일 CTA `승인 인박스 열기`, classroom-deleted CTA 없음). | `design_spec.md §2.3` |

### 2.5 일관성 (이름 / 역할 / 명명)

| severity | finding | 위치 |
|---|---|---|
| — (OK) | 이름 노출 규칙 = 원본 (마스킹 제거) 완전 반영. 자녀명 `김보민/이도준/박서연/한민수`, 학부모 이메일 축약 + hover full, 교사 PII (담임 이름·이메일) 비노출 (§2.3 이메일). memory `project_pending_role_cleanup` 과 충돌 없음 — 본 task 는 teacher/parent 2-role 만 사용. | `design_spec.md §2, §2.3`, `design_decisions.md §5` |
| — (OK) | 역할 표기 = "학부모" / "자녀" / "선생님" / "담임" 일관. owner/editor/viewer mock 의존 없음 (brief §6 체크). | 전반 |
| — (OK) | Aura-board 제품명 = 로고 24px + 이메일 푸터 + 온보딩 셸 헤더 (user memory `project_app_name`). | `design_spec.md §2.2.1, §2.3`, `mockups/v1/README.md §2.1, §3` |
| — (OK) | Author chip 스타일 규칙은 본 task 범위 외 surface → `design_decisions.md §7` 에서 명시적으로 "해당 없음" 처리. user memory `feedback_author_chip_style` 준수. | `design_decisions.md §7` |

### 2.6 신규 컴포넌트 승격 (Toast / Stepper) — **핵심 쟁점**

| severity | finding | 위치 |
|---|---|---|
| **MAJOR** | user_decisions #5·#6 은 **Toast 와 OnboardingStepper 를 `components/ui/Toast.tsx` / `components/ui/Stepper.tsx` 로 전역 승격** 하고 `docs/design-system.md §7` (Toast) / §8 (Stepper) 에 문서화하도록 확정. 그러나 `design_spec.md §4.1` 은 OnboardingStepper 를 `src/components/parent/OnboardingStepper.tsx` (task-local) 에 배치하고 §4.3 은 "글로벌 승격 없음" 을 명시. `design_decisions.md §4` 도 "글로벌 승격 없음" 기재. → **phase5 산출이 user 확정 결정 이전 작성물이어서 발생한 alignment 갭**. phase5 문서는 수정하지 않음(계약 §execution rules) 단, phase7 coder 는 **user_decisions 를 ground truth** 로 따라 아래 경로로 구현할 것: `components/ui/Toast.tsx`, `components/ui/Stepper.tsx`. design-system.md 문서 갱신은 phase8 후 phase11 에서 반영. | `user_decisions.md §Lane B #5, #6` vs `design_spec.md §4.1·§4.3`, `design_decisions.md §4` |
| **MAJOR** | Toast API 가 현 design_spec 에서 "간단 구현" 수준만 언급 (§4.2 표 + §2 success rows 의 본문 카피). 전역 컴포넌트로 승격되려면 **API shape + slot props + a11y 계약** 명시 필요. phase7 coder 가 설계할 최소 사항: `<Toast variant="success|error|info" message={string} duration={2500} onClose> + role="status" + aria-live="polite" (error 는 assertive 고려) + 우측 하단 위치 + prefers-reduced-motion 에서 slide → instant fade`. 이는 phase5 가 이미 제시한 행동 명세(2.5s, slide+fade, 위치) 와 호환되므로 추가 설계 판단 없이 파생 가능. | `design_spec.md §4.2` (Toast 미정 주석) |
| **MINOR** | Stepper 전역 승격 API 는 `<Stepper current total variant="dot" labels?={string[]} />` + `role="progressbar"` + `aria-valuenow/valuemax` + P6 에서 렌더 skip 이 phase5 에 이미 명시(§4.1). 전역 이동만 하면 되며 API 추가 논의 불필요. | `design_spec.md §4.1` OnboardingStepper 행 |

### 2.7 토큰 패치 (`tokens_patch.json`)

| severity | finding | 위치 |
|---|---|---|
| — (OK) | `additions` 만 존재 (`--color-warning` + `-tinted-bg`). `modifications`/`deprecations` 비어있음. 기존 `--color-*` 네임스페이스와 충돌 없음 (검색 결과 `design-system.md` 에 `warning` 토큰 부재 확인). | `tokens_patch.json`, `docs/design-system.md §1` 전체 |
| — (OK) | 값 `#f59e0b` + `#fef3c7` 대비 4.82:1 = user_decisions #4 수용. `#b45309` fallback 불필요 명시. | `user_decisions.md §Lane B #4` |
| — (OK) | `design_system_docs_patch.timing = phase8 후` — 본 phase6 에서 design-system.md 갱신은 금지(user_decisions `phase6 reviewer 에게` 지시 준수). 본 리뷰에서는 **token 추가 승인만** 하고 docs 갱신은 phase11 doc_syncer 에게 위임. | `tokens_patch.json §design_system_docs_patch` |
| **NIT** | `notes[0]` 의 "glob 승격" 오타 → "global". 추후 phase11 문서화 시 정정 권고. | `tokens_patch.json §notes` |

### 2.8 Upstream (phase4 brief) 수용 기준 매핑

brief §1 은 11개 화면 × 5상태 + 이메일 9종 명세. 아래 각 항목이 phase5 산출에 매핑되는지 체크:

| brief 수용 기준 | 매핑 | 결과 |
|---|---|---|
| §1.1 S-T1~5 5상태 | `design_spec.md §2.1.1~2.1.5` | ✅ |
| §1.2 S-P1~6 5상태 (empty 제외 명시된 경우 포함) | `design_spec.md §2.2.2~2.2.7` | ✅ |
| §1.3 `classroom_deleted` reason 추가 | `design_spec.md §2.2.7` 7종 분기 | ✅ |
| §1.4 이메일 9종 + 교사 PII 비노출 | `design_spec.md §2.3` | ✅ |
| §2.1 교사 정보 계층 1=인박스 2=코드 3=연결 | v1 2-col = 좌 인박스 / 우 코드+연결 | ✅ |
| §2.2 학부모 단일 핵심 행동 1개 | P1~P6 각 CTA 1개 | ✅ |
| §2.3 D+N 배지 2순위 위치 | PendingRow 좌측 6px 바 + inline 배지 | ✅ |
| §3.1 교사 인터랙션 9건 | `design_spec.md §2.1 + §5.4` + 폴링 slide-in | ✅ |
| §3.2 학부모 인터랙션 4건 | `design_spec.md §2.2 각 섹션` | ✅ |
| §3.3 마이크로 인터랙션 7건 | `design_spec.md §5.1` reduced-motion 포함 | ✅ |
| §3.4 키보드 순서 | `design_spec.md §5.4` 교사/학부모 모두 | ✅ |
| §4.1~4.5 접근성 5개 | `design_spec.md §4.1 aria + §5.1 + §5.2` | ✅ |
| §5.3 신규 컴포넌트 4개 이내 (권고) | 실제 10개 (brief §5.3 4개 + v1 구현 상세 6개). brief §5.3 은 "task-local" 이 전제였고 10개 모두 본 task 전용으로 한정 → 권고 범위 초과는 **설계 결정의 결과**로 acceptable. v1 선택 근거(comparison §6.3)에서 "신규 컴포넌트 10개 — brief §5 권고 범위" 로 스스로 자기 일관성 주장. **alignment 확인 OK**. | 판단: acceptable |
| §5.4 USER-REVIEW 3건 응답 (노랑/44px/stepper) | user_decisions 에서 모두 해결 | ✅ |

**brief 수용 기준 전체 매핑 100%.**

---

## 3. 탈락 변형 아카이브 감사

- `rejected/v2/`, `rejected/v3/`, `rejected/v4/` 존재 (`rejected/` 내 `README.md` 주의 헤더 포함).
- comparison.md §1~§7 audit trail 보존, v1 재선택 근거(§6) 및 phase6 open question §7 존재.
- user_decisions 에서 "rejected/README.md audit history 보존 — OK" 확정.
- 삭제·수정 없음. 감사 이력 무결.

---

## 4. 리스크 / 외부 블로커 (phase6 범위 외이지만 phase7 진입 조건)

user_decisions.md `phase6 reviewer 에게` §3 에서 명시:
1. **phase3 architecture 누락** — v2 세션 모델/cascade 로직 구현 사양
2. **테스트 인프라** — unit + e2e 러너, react-email 프리뷰, contract test
3. **환경 변수** — Resend key, RLS rotation key, cron secret

이 3건은 **phase7 코드 구현 직전 오케스트레이터가 별도 트랙으로 해결할 블로커** 이며 phase6 design review 범위 외. 본 리뷰에서 PASS 를 발부하되 phase7 kickoff 전 블로커 해소를 오케스트레이터 책임으로 위임.

---

## 5. 요약 (counts)

- BLOCKER: 0
- MAJOR: 2 (§2.6 Toast/Stepper 전역 승격 alignment, §2.6 Toast API 명세 확장)
- MINOR: 5 (§2.1 Toast role + FilterBar role, §2.2 Display 28 + 셸 variant, §2.7 tokens 오타)
- NIT: 2 (§2.1 aria-label 자연스러움, §2.3 태블릿 bp 수치 상속)

**최종 판정: PASS** — phase5 design 산출물은 phase4 brief 전 요구 수용. user_decisions 와의 alignment 갭(Toast/Stepper 전역 승격) 은 본 리뷰의 finding 으로 명문화되어 phase7 coder 의 ground truth 는 user_decisions 이다. design_spec.md / tokens_patch.json 은 현 상태로 phase7 입력 승인.

## 6. phase7 coder 에게 전달 (조건부 handoff notes)

1. 컴포넌트 경로 **오버라이드** (user_decisions 우선):
   - `OnboardingStepper` → `src/components/ui/Stepper.tsx` (phase5 spec 의 `src/components/parent/OnboardingStepper.tsx` **미사용**)
   - `Toast` → `src/components/ui/Toast.tsx` (phase5 spec 의 task-local 경로 **미사용**)
2. Toast API 최소 계약 (본 리뷰 §2.6 MAJOR 해결):
   - Props: `variant: "success"|"error"|"info"`, `message: string`, `duration?: number = 2500`, `onClose: () => void`
   - a11y: `role="status"` (success/info), `role="alert"` + `aria-live="assertive"` (error); `prefers-reduced-motion` 에서 slide→instant fade 로 degrade; 닫기 버튼 44×44 `aria-label="알림 닫기"`.
   - 위치: 우측 하단 fixed, stack 시 위로 쌓임.
3. FilterBar role 명확화 (§2.1 MINOR): `role="tablist"` 대신 **`role="radiogroup"`** + 각 버튼 `role="radio"` + `aria-checked` 채택 권고 (탭 아님, 필터 단일 선택). design-system docs 갱신 없음 — 단일 task 의 인라인 선택.
4. Display 28 (§2.2 MINOR): invite 코드 모노 28px 은 단발 hardcode 로 구현 (타이포 토큰 미추가). 차후 유사 표기 surface 누적 시 새 토큰 제안.
5. tokens_patch.json 은 phase7 구현 시 `src/styles/base.css` `:root` 에 추가 (docs/design-system.md 갱신은 phase11 doc_syncer 역할).
6. phase3 architecture amendment / 테스트 인프라 / env 3종 블로커는 phase7 kickoff 전 오케스트레이터 확인 필요.

---

## 7. 다음 게이트

- **phase6 검증 게이트**: PASS (본 문서 + `REVIEW_OK.marker` 생성)
- **phase7 진입 조건**: (1) 본 리뷰 §4 블로커 3종 해소 (2) user_decisions + 본 리뷰 §6 handoff notes 를 coder 입력으로 전달
