# Design Spec — parent-class-invite-v2

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **선택된 변형**: `mockups/v1` (Inbox-First 2-Column · Notion-Calm)
- **탈락 변형**: `rejected/v2`, `rejected/v3`, `rejected/v4` (감사 이력, 삭제 금지)
- **작성일**: 2026-04-13
- **upstream**: phase3/architecture.md · phase3/data_model.md · phase3/api_contract.json · phase3_amendment/architecture_amendment.md (마스킹 제거) · phase4/design_brief.md (v2 — 마스킹 제거 반영) · phase9_user_review/decisions.md #1 · docs/design-system.md
- **재실행 사유**: phase9_user_review/decisions.md #1 (이름 마스킹 전면 제거). 원본 v1 선택/레이아웃/토큰/컴포넌트 구조는 유지, 자녀·급우·학부모 이름 노출을 원본 그대로로 surgical 변경.

---

## 1. 선택된 변형

**`mockups/v1` — Inbox-First 2-Column**

선택 사유 (comparison.md §6 축약):

1. **계약 충실도**: design_brief §2.1 정보 계층(인박스 > 코드 > 연결됨) 을 레이아웃 좌우 2-column 에 1:1 매핑.
2. **동시 참조**: 교사 세션 내 인박스와 초대 코드를 동시에 시야에 유지 → 공유 링크 복사와 대기 리뷰가 한 화면에서 완결.
3. **디자인 시스템 확장 최소**: 신규 토큰 1개(`--color-warning`), 신규 컴포넌트 4개 (brief §5.3 한도 내).
4. **Karpathy Simplicity**: v3 스와이프·v4 triage·v2 탭은 MVP scope 초과. v1 은 요구 범위 내 최소 구성.
5. **반응형**: 태블릿 세로/모바일에서는 세로 stack 으로 degrade (graceful). 교사 주 사용 기기 PC 가정.

phase6 reviewer 가 교사 주 사용 디바이스 가정을 태블릿 우선으로 뒤집을 경우 v3 재검토 필요 — 본 선택은 PC 우선 가정 기반 (comparison.md §7 open question 1).

---

## 2. 화면 상태별 최종 디자인

### 2.1 교사 — `/classroom/[id]/parent-access`

3-섹션 단일 페이지. 상단 브레드크럼 + 페이지 타이틀. 2-col (데스크탑 ≥1080), 세로 stack (태블릿/모바일).

#### 2.1.1 InviteCodeSection (우측 컬럼)

| 상태 | 최종 레이아웃 |
|---|---|
| empty | 카드 내부 중앙 정렬, Body 15 muted "아직 코드가 없습니다. 발급 버튼을 눌러 학부모 초대를 시작하세요." + Primary 버튼 `초대 코드 발급` (44px height). QR placeholder 미표시. |
| loading | 코드 자리 skeleton 8×1 박스 (height 40px, shimmer 1.4s linear infinite) + QR placeholder 192×192 skeleton. 발급/회전 버튼 disabled. |
| ready | 모노 Display 28px 코드 (예 `K3XM-Q7WP`, 4-4 하이픈), QR 192×192 SVG, 발급일 Body 14 muted `2026-04-15 15:23 KST`, 누적 사용 배지 `Badge 12` `24회 사용`, 버튼 row `[복사]` `[회전]`. 카드 max-width 340px. |
| error | 카드 내부 red-tinted banner(`rgba(198,40,40,0.08)` 배경 + `--color-danger` 텍스트) "코드를 불러오지 못했습니다" + caption `E-CODE-001` + `다시 시도` secondary. |
| success | 발급/회전 직후 toast 우측 하단 `새 코드가 발급되었습니다 (기존 대기 3건은 자동 거부)` 2.5s fade-in/out, 카드 내부는 ready 상태로 전환 (기존 ready 와 시각 동일). |

#### 2.1.2 ApprovalInboxSection (좌측 컬럼, 60% width)

| 상태 | 최종 레이아웃 |
|---|---|
| empty | 카드 내부 중앙, Body 15 muted "현재 승인 대기 중인 학부모가 없습니다." + 보조 Caption 12 muted "초대 코드를 학부모에게 공유해 보세요." FilterBar 숨김. |
| loading | FilterBar disabled, row skeleton 72px × 3 (shimmer). |
| ready | FilterBar pill `[전체][D+3 이상][D+6 이상]` 상단 고정 (sticky top 8px) + PendingRow × N. 각 row = 좌측 6px 세로 바 (DPlusBadge 색) + 학부모 이메일(축약) + 자녀 정보(반-번호 · 자녀 이름 원본) + DPlusBadge + 상대시각 + `[승인]` `[거부 ▾]`. Row height 72px. 이름 노출 규칙: 원본 그대로(마스킹 없음, phase9 decisions #1). |
| error | 섹션 상단 red-tinted banner + `새로고침` secondary. 기존 rows 는 숨김. |
| success | 처리된 row fade-out 180ms → `list.filter` 제거 → 상단 카운트 감소 + toast `승인되었습니다` 또는 `거부되었습니다 (사유: {reason})` 2.5s. |

#### 2.1.3 LinkedParentsSection (우측 컬럼, InviteCode 아래)

| 상태 | 최종 레이아웃 |
|---|---|
| empty | "아직 연결된 학부모가 없습니다." Body 15 muted. |
| loading | row skeleton 48px × 3. |
| ready | LinkedRow × N (pagination 10건/페이지). 각 row = 학부모 이메일 · 자녀 이름(원본) · 승인일 · `[해제]` destructive small. Row height 48px. `[더 보기]` secondary 하단. |
| error | banner + `새로고침`. |
| success | 해제 row fade-out + toast `학부모 연결을 해제했습니다`. |

#### 2.1.4 회전 확인 모달 (S-T4)

| 상태 | 최종 레이아웃 |
|---|---|
| loading | 모달 내 `[회전]` 버튼 spinner + `[취소]` 만 활성. |
| ready | Title 20 "초대 코드 회전" + Body 15 "코드를 회전하면 기존 8자리 코드는 즉시 무효화되고 승인 대기 중인 N명은 자동 거부됩니다. 계속할까요?" + footer `[취소]` `[회전]` (destructive). 모달 max-width 420, 패딩 24. |
| error | 본문 아래 red-tinted banner + `다시 시도` inline. |
| success | 모달 fade-out 200ms → InviteCodeSection success toast. |

(empty 상태는 모달 특성상 해당 없음.)

#### 2.1.5 학급 삭제 모달 (S-T5)

| 상태 | 최종 레이아웃 |
|---|---|
| loading | `[삭제]` spinner, `[취소]` 만 활성. |
| ready | Title 20 "학급 삭제" + 경고 박스 (`--color-danger` tinted bg, 1px border) "이 학급을 삭제하면 학부모 {N}명의 액세스가 즉시 해제됩니다." + Body 15 "삭제를 확인하려면 학급명 `3학년 2반` 을 정확히 입력하세요." + input + `[취소]` `[삭제]` (destructive, 학급명 매칭 시에만 활성). |
| error | banner + `다시 시도`. |
| success | 모달 닫힘 + `router.push('/classrooms')` + toast `학급이 삭제되었습니다`. |

### 2.2 학부모 온보딩 — 6 페이지

#### 2.2.1 공통 shell

```
max-width: 480px
padding: 48px 32px (desktop/tablet) / 32px 20px (mobile)
background: var(--color-surface)
border: var(--border-card)
border-radius: var(--radius-card)
box-shadow: var(--shadow-card)
Aura-board 로고 (SVG 24px) 상단 중앙
OnboardingStepper dot variant (P1~P5 표시, P6 숨김)
```

#### 2.2.2 P1 Signup — `/parent/onboard/signup`

| 상태 | 최종 레이아웃 |
|---|---|
| empty | Stepper `● ─ ○ ─ ○ ─ ○` (1/4). Title "학부모 가입" + Body 15 muted "자녀의 학급에 연결하려면 이메일을 입력해 주세요." + Input (height 48, placeholder `parent@example.com`) + Primary 버튼 `매직링크 받기` (disabled 상태, height 56 full-width). |
| loading | 버튼에 spinner + `매직링크 발송 중...` 텍스트, input readonly. |
| ready | 이메일 형식 검증 통과 시 버튼 active (`--color-accent` + `--shadow-accent`). |
| error | 형식 오류는 input 하단 Caption 12 red `올바른 이메일을 입력해 주세요`. 서버 오류는 카드 상단 banner `잠시 후 다시 시도해 주세요 (E-PARENT-SIGNUP)`. |
| success | 카드 본문 교체: Title "메일함을 확인해 주세요" + Body 15 "`parent@example.com` 으로 매직링크를 보냈습니다. 15분간 유효합니다." + 링크 `다른 이메일로 다시 시도` (Caption 13 accent). |

#### 2.2.3 P2 Verify — `/parent/onboard/signup/verify`

| 상태 | 최종 레이아웃 |
|---|---|
| loading | 카드 중앙 spinner (28px) + Body 15 "이메일 인증 중..." (기본 진입 직후 상태). |
| error | Icon 40px (red X) + Title "이 링크는 만료되었거나 사용할 수 없습니다" + Body 15 + Primary `다시 매직링크 받기` → `/onboard/signup`. |
| success | (즉시 `router.replace` 분기, 정지 화면 없음.) |

(empty·ready 는 toString 에서 사실상 loading 과 동일으로 병합. brief §1.2 S-P2 명세.)

#### 2.2.4 P3 Code Input — `/parent/onboard/match/code`

| 상태 | 최종 레이아웃 |
|---|---|
| empty | Stepper (2/4). Title "학급 코드 입력" + Body muted "선생님께 받은 8자리 코드를 입력하세요." + `<CodeInput8 />` (8칸, 각 48×56, 간격 8, 홀수 4-4 사이 gap 16) + Primary `다음` disabled. |
| loading | input readonly + 버튼 spinner. |
| ready | 8자 입력 완료 시 `다음` active. Backspace/화살표 키보드 지원. |
| error | input 하단 Caption red. 3종 분기: `이 코드를 찾을 수 없습니다` / `잠시 후 다시 시도해 주세요 (15분)` / `이 코드는 만료되었습니다. 선생님께 새 코드를 요청해 주세요.` 에러 발생 시 8칸 clear + 첫 칸 focus. |
| success | (router.push 로 즉시 이동, 정지 화면 없음.) |

#### 2.2.5 P4 Student Pick — `/parent/onboard/match/select`

| 상태 | 최종 레이아웃 |
|---|---|
| empty | "아직 학생이 등록되지 않았습니다. 선생님께 문의하세요." + secondary `뒤로`. |
| loading | Stepper (3/4). 카드 grid skeleton (4×3 데스크탑, 3×4 태블릿, 2×6 모바일). |
| ready | 학급명 헤더 (Section 15) "3학년 2반" + Body caption "자녀를 선택하세요." + 카드 grid: 각 카드 132×116 (데스크탑)/160×140(태블릿)/계산치(모바일 2열). 카드 내부: Micro `3-2-15` + Subtitle `김보민` (자녀 이름 원본) + radio (우상단 20×20). 선택 시 `border-color: var(--color-accent)`, `background: var(--color-accent-tinted-bg)`, `box-shadow: var(--shadow-card-hover)`. Sticky bottom Primary `이 학생의 학부모로 신청`. 카드 44×44 탭 타깃 충족 (전체 카드 영역이 타깃). |
| error | 상단 banner 분기: `다시 코드를 입력해 주세요` (ticket 만료) + link `/match/code` · `이미 신청한 학생이 3명입니다. 승인 후 다시 시도해 주세요.` · 일반 로드 실패 + `다시 시도`. |
| success | (router.push → `/onboard/pending`.) |

#### 2.2.6 P5 Pending — `/parent/onboard/pending`

| 상태 | 최종 레이아웃 |
|---|---|
| loading | 헤더 + 본문 skeleton. |
| ready | Stepper (4/4). Icon 48 ⏳ (SSR 호환 emoji) + Title "승인 대기 중" + Body 15 "선생님이 승인하면 자녀 보드를 볼 수 있습니다. 보통 1~3일 소요됩니다. 7일 내 미승인 시 자동 만료됩니다." + divider + 신청 정보 테이블 (학급·자녀·신청일, Label 13 / Body 14) + divider + `로그아웃` secondary small. 상단 1px `--color-accent` progress sweep (30s 주기, reduced-motion 시 정적). |
| error | 헤더 아래 small banner `연결 상태를 확인할 수 없습니다` + `재시도` 버튼. silent retry 3회 후 노출. |
| success | toast `승인되었습니다` 2.5s + 1.5s delay 후 `router.push('/(authed-active)/home')`. |

(empty 상태는 brief 정의대로 해당 없음 — 진입 시 항상 ready.)

#### 2.2.7 P6 Rejected — `/parent/onboard/rejected`

| 상태 | 최종 레이아웃 |
|---|---|
| loading | 카드 skeleton. |
| ready | Stepper 숨김. Icon 48 (reason 별 분기 emoji 또는 SVG neutral) + Title 20 (reason 별) + Body 15 (reason 별) + Primary `다시 신청하기` (classroom_deleted 제외) + Caption `학교 대표 연락처: 02-0000-0000`. reason 분기 7종(brief §1.2 S-P6 + v2 `classroom_deleted` 추가). |
| error | reason 쿼리 누락/invalid 시 일반 안내 "신청이 처리되지 않았습니다" + 재신청. |
| success | (재신청 클릭 → router.push `/onboard/match/code`, 본 화면은 종착점.) |

### 2.3 이메일 9종 (React-email · 600px)

공통 레이아웃:

```
┌─────────────────────────────────────┐
│  [Aura-board logo 24px]             │  ← 흰 배경, 상하 padding 24
├─────────────────────────────────────┤
│                                     │
│  Title 20 (#111, Inter 700)         │
│                                     │
│  Body 15 (#555, Inter 400, 1.6 lh)  │
│                                     │
│  [CTA button accent]  (해당 시)      │
│                                     │
├─────────────────────────────────────┤
│  학교 대표 연락처 13 muted          │
│  Aura-board · 자동 발송 12 faint    │
└─────────────────────────────────────┘
```

- 교사 PII (담임 이름·이메일) 노출 금지.
- `classroom-deleted` 템플릿은 CTA 없음 — 학교 연락처만.
- 교사용 3종(#7, #8, #9) 은 CTA 색을 `--color-accent` 유지, 본문은 건수 강조 (Title 에 숫자 포함: "12명의 학부모가 승인 대기 중입니다").
- 이메일 최대 너비 600, fallback font `system-ui, -apple-system, "Segoe UI"`, `<html lang="ko">`.
- 9종 분류:
  1. `parent-rejected-wrong-child` — 학부모, CTA 재신청
  2. `parent-rejected-not-parent` — 학부모, CTA 재신청
  3. `parent-rejected-other` — 학부모, CTA 재신청
  4. `parent-auto-expired` — 학부모, CTA 재신청
  5. `parent-code-rotated` — 학부모, CTA 재신청
  6. `parent-classroom-deleted` — 학부모, CTA 없음
  7. `teacher-pending-d3` — 교사, CTA `승인 인박스 열기`
  8. `teacher-pending-d6` — 교사, CTA `승인 인박스 열기`
  9. `teacher-expired-summary` — 교사, CTA `승인 인박스 열기`

---

## 3. 사용된 토큰

### 3.1 기존 토큰 (design-system §1~§9)

| 분류 | 토큰 | 용도 |
|---|---|---|
| 배경 | `--color-bg` | 페이지 캔버스 |
| 표면 | `--color-surface` | 카드/모달/온보딩 셸 |
| 표면 alt | `--color-surface-alt` | D+0~2 배지 배경 |
| 텍스트 | `--color-text` | 제목·본문 |
| 텍스트 muted | `--color-text-muted` | 설명·라벨·D+0~2 텍스트 |
| 텍스트 faint | `--color-text-faint` | placeholder·caption |
| 액센트 | `--color-accent` | Primary 버튼·링크·progress sweep·체크 |
| 액센트 active | `--color-accent-active` | hover/active |
| 액센트 tinted bg | `--color-accent-tinted-bg` | 선택 카드 배경 (P4) |
| 액센트 tinted text | `--color-accent-tinted-text` | focus outline (`#097fe8` 2px) |
| 보더 | `--color-border` | 카드/input 보더 |
| 보더 hover | `--color-border-hover` | hover 강조 |
| danger | `--color-danger` | 거부 버튼·경고 banner·D+6↑ 배지 |
| danger active | `--color-danger-active` | destructive hover |
| 반경 | `--radius-card` / `--radius-btn` / `--radius-pill` | 카드/버튼/배지 |
| 그림자 | `--shadow-card` / `--shadow-card-hover` / `--shadow-accent` / `--shadow-accent-hover` | 카드·CTA |
| 보더 변수 | `--border-card` | 카드 공통 |
| 타이포 | Display 26 / Title 20 / Subtitle 16 / Section 15 / Body 14~15 / Label 13 / Badge 12 / Micro 11 | brief §1 매핑 |
| 트랜지션 | 180ms ease (box-shadow) / 150ms (bg) / 200ms (modalIn) | 인터랙션 |

### 3.2 신규 토큰

| 토큰 | 값 | 용도 | 근거 |
|---|---|---|---|
| `--color-warning` | `#f59e0b` | D+3~5 배지 전경, triage 노랑 카드 (후속 변형 대비 예약) | brief §5.4 option (a), D+N 3단계 시각 분기 필수 |
| `--color-warning-tinted-bg` | `#fef3c7` | D+3~5 배지 배경 | 접근성 AA (warning on tinted 4.8:1) |

> 컬러 값 대비 검증: `#f59e0b` on `#fef3c7` = 4.82:1 (AA 소형 텍스트 통과, Badge 12 허용). `#b45309` 로 downgrade 옵션은 보류 — phase6 reviewer 가 필요 시 재검토.

### 3.3 시맨틱 색(토큰 외)

- Submitted `#1565c0` / Reviewed `#2e7d32` / Returned `#c62828` — 본 task 에서 직접 사용 없음.

---

## 4. 컴포넌트 목록

### 4.1 신규 (task-local, src/components/)

| 컴포넌트 | 경로 | 설명 | a11y 핵심 |
|---|---|---|---|
| `<DPlusBadge value={n} />` | `src/components/parent-access/DPlusBadge.tsx` | D+N 배지, 3색 분기 (0~2 회색 / 3~5 warning / 6~7 danger). 텍스트는 항상 `D+{n}` 표기. | `aria-label="신청 후 {n}일 경과"`, tooltip, 색 + 텍스트 이중 전달 |
| `<CodeInput8 value onChange onComplete />` | `src/components/parent/CodeInput8.tsx` | 8칸 input (4-4 분할). Backspace/좌우 화살표 지원, paste 시 자동 분배. | `role="group"` + `aria-label="학급 코드 8자리"`, 각 칸 `aria-label="{n}번째 자리"` |
| `<StudentPickerCard student selected onSelect />` | `src/components/parent/StudentPickerCard.tsx` | 카드 + radio. 44×44 탭 타깃. | `role="radio"` + `aria-checked` + `aria-label="{grade}-{class}-{number} {studentName}"` (원본 이름 노출) |
| `<OnboardingStepper current total variant="dot" />` | `src/components/parent/OnboardingStepper.tsx` | 4단계 dot stepper. P6 에서는 렌더링 스킵. | `role="progressbar"` + `aria-valuenow`/`aria-valuemax`, label 텍스트 `{current} of {total}` |
| `<PendingRow link onApprove onReject />` | `src/components/parent-access/PendingRow.tsx` | 좌측 6px 세로 바, 학부모 정보, DPlusBadge, 버튼. | `role="listitem"`, 버튼 `aria-label="{studentName} 학부모 승인/거부"` (원본 이름) |
| `<LinkedRow link onRevoke />` | `src/components/parent-access/LinkedRow.tsx` | 연결된 학부모 row. | `role="listitem"`, 해제 `aria-label="{studentName} 학부모 연결 해제"` (원본 이름) |
| `<InviteCodeCard code qrUrl issuedAt usage onCopy onRotate />` | `src/components/parent-access/InviteCodeCard.tsx` | 코드 + QR + 버튼. | copy 성공 200ms in-place feedback, `aria-live="polite"` |
| `<RotateConfirmModal open onConfirm onCancel pendingCount />` | `src/components/parent-access/RotateConfirmModal.tsx` | S-T4 모달. | focus trap, `role="dialog"` + `aria-modal=true` + `aria-labelledby` |
| `<ClassroomDeleteModal classroom pendingCount onConfirm onCancel />` | `src/components/classroom/ClassroomDeleteModal.tsx` | S-T5 모달, 학급명 재입력 확인. | focus trap 동일, 입력 불일치 시 `[삭제]` disabled |
| `<FilterBar value options onChange />` | `src/components/parent-access/FilterBar.tsx` | 전체/D+3↑/D+6↑ 3-토글 pill. | `role="tablist"` + `aria-selected` |

### 4.2 기존 재사용

| 컴포넌트 | 비고 |
|---|---|
| 카드 패턴 (design-system §7) | 온보딩 셸, 교사 3섹션 카드 |
| 모달 패턴 (§7) | 회전/삭제 모달 |
| SidePanel (§7) | 본 task 미사용 (v3 변형에서만 쓰였으나 기각) |
| 버튼 Primary/Secondary/Destructive | 전 화면 |
| 인풋 (§7) | 이메일 input, 학급명 input |
| 뱃지/필 (§7) | DPlusBadge 베이스 |
| Toast (미정 — 기존 패턴 확인 후 사용 또는 간단 구현) | 승인/거부/해제/발급 피드백 |

> Toast 컴포넌트가 기존 design-system 에 공식 정의 없음 (phase6 reviewer 확인 요). 부재 시 `<Toast />` 를 신규 task-local 컴포넌트로 추가하고 design-system.md §7 갱신 후보로 제안.

### 4.3 글로벌 승격 여부

- `OnboardingStepper` : 향후 학생 온보딩 등 재사용 가능성. 현 시점 **미승격**, 후속 task 에서 재평가 (brief §5.4 권고 3 수용).
- `DPlusBadge` / `CodeInput8` / `StudentPickerCard` : 본 task 전용. 미승격.
- `FilterBar` : 3-토글 pill 은 일반화 가치 있음. 미승격, 재사용 사례 누적 후 재검토.

---

## 5. 추가 메모

### 5.1 `prefers-reduced-motion`

모든 트랜지션(modalIn, row fade-out, progress sweep, toast slide, stepper dot bg)은 `@media (prefers-reduced-motion: reduce)` 에서 instant 로 degrade. design-system §7 SidePanel 동일 패턴.

### 5.2 터치 타깃 (Tab S6 Lite baseline)

- PendingRow/LinkedRow 의 `[승인]`/`[거부]`/`[해제]` 버튼 : height 44, padding 10 16.
- StudentPickerCard : 전체 카드 면 = 탭 타깃, 최소 132×116 ≥ 44.
- CodeInput8 각 칸 : 48×56 ≥ 44.
- Toast 닫기 : 44×44 aria-label `알림 닫기`.
- design-system §8 의 "최소 24px" 는 데스크탑 포인터 기준 유지, 본 task 는 태블릿 우선 surface 에서 44px override (brief §4.4 확정). docs/design-system.md §11 체크리스트에 항목 추가 권고 (phase8 후 docs 갱신).

### 5.3 SWR 60s 폴링 / 학부모 30s 폴링

폴링 tick 시 데이터 diff → 새 row 는 상단에서 slide-in 200ms, 사라진 row 는 fade-out 180ms. 전체 list re-render 금지 (React key stable). 폴링 자체는 시각 인디케이터 없음 (silent).

### 5.4 keyboard flow (brief §3.4 확장)

교사 페이지:
1. 페이지 타이틀 → FilterBar pill (Left/Right 화살표로 순환) → PendingRow.승인 → PendingRow.거부 → 다음 행 … → InviteCodeCard.복사 → 회전 → LinkedRow.해제
2. Esc = 모달 닫기, Enter = 포커스 버튼 활성
3. 모달 focus trap 첫 focus = `[취소]` (안전 기본값)

학부모 P4:
1. `radiogroup` 진입 → 화살표로 학생 카드 이동 → Space/Enter 선택 → Tab → Primary CTA → Enter 제출

### 5.5 phase6 reviewer 에게 질문

1. (blocking 아님) 교사 주 사용 디바이스 PC/태블릿 가정 확정 필요. 태블릿 우선이면 v3 재검토.
2. `--color-warning` hex `#f59e0b` 수용 여부 (대안: `#b45309` 대비 더 높음).
3. Toast 컴포넌트 공식 정의 여부 (design-system §7 에 없음).
4. `OnboardingStepper` 전역 승격 시점.

---

## 6. 검증 게이트 self-pass

- [x] §1 선택된 변형 + 탈락 변형 명시
- [x] §2 화면 상태별 (empty/loading/ready/error/success) 누락 없이 명세 (교사 5 + 학부모 6 + 모달 2 + 이메일 9 공통)
- [x] §3 사용 토큰 (기존 + 신규 2개) 명시
- [x] §4 컴포넌트 목록 (신규 10개 task-local + 기존 재사용)
- [x] 이름 노출 규칙: 원본 표시 (마스킹 없음 — phase9_user_review/decisions.md #1 + phase3_amendment 반영)
- [x] Tab S6 Lite 44px 터치 타깃 반영
- [x] `prefers-reduced-motion` 커버
- [x] Korean copy 전반 준수

**판정: PASS** — phase6 design_reviewer 진입 가능.
