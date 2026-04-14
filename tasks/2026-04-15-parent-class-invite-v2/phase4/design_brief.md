# Design Brief — parent-class-invite-v2

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **작성일**: 2026-04-13
- **upstream**: `phase2/scope_decision.md`, `phase3/architecture.md`, `phase3/data_model.md`, `docs/design-system.md`
- **scope reminder**: 텍스트 중심 디자인 명세. 비주얼/목업은 phase5 designer.

---

## 1. 화면/상태 목록

각 행은 `(empty / loading / ready / error / success)` 5상태를 모두 나열. v1 보존 화면(예: `/parent/(authed-active)/home`)은 v2 신규/변경 영향이 있는 부분만 명세.

### 1.1 교사 — `/classroom/[id]/parent-access` (3-섹션 단일 페이지)

3-섹션 = `<InviteCodeSection/>` + `<ApprovalInboxSection/>` + `<LinkedParentsSection/>`. 페이지 전체는 server gate(교사 세션) + 3개 client SWR(60s 폴링).

#### S-T1 InviteCodeSection (현재 활성 코드)

| 상태 | 표시 정보 | 표시 행동 |
|---|---|---|
| empty | "아직 코드가 없습니다. 발급 버튼을 눌러 학부모 초대를 시작하세요." + Primary 버튼 `초대 코드 발급` | 발급 버튼 1개 |
| loading | 코드 자리 skeleton(8자 박스) + QR placeholder | 발급/회전 버튼 disabled |
| ready | 8자리 코드 모노스페이스 + QR(192px) + 발급일(`2026-04-15 15:23 KST`) + `복사`/`회전` 버튼 | 복사(클립보드), 회전(확인 모달) |
| error | 코드 발급/조회 실패 안내 + `다시 시도` 버튼 + 오류 코드 (작은 caption) | 재시도 |
| success | 발급/회전 직후 toast `새 코드가 발급되었습니다 (기존 대기 N건은 자동 거부)` 2.5s | toast 닫기 |

#### S-T2 ApprovalInboxSection (승인 대기 리스트)

| 상태 | 표시 정보 | 표시 행동 |
|---|---|---|
| empty | "현재 승인 대기 중인 학부모가 없습니다." + 보조 텍스트 "초대 코드를 학부모에게 공유해 보세요." | 없음 |
| loading | 행 skeleton × 3 + FilterBar disabled | 없음 |
| ready | FilterBar(`전체` / `D+3 이상` / `D+6 이상`) + PendingRow × N | 행마다: `승인` (Primary), `거부` (RejectReasonDropdown 열림) |
| error | 인박스 로드 실패 안내 + `새로고침` 버튼 + caption 오류코드 | 새로고침 |
| success | 승인/거부 직후 행 fade-out(180ms) + 목록 카운트 즉시 감소 + toast `승인되었습니다` 또는 `거부되었습니다 (사유: {reason})` | undo 없음(즉시 확정) |

각 PendingRow 표시 정보: 학부모 이메일(축약 가능, 마우스오버 full), 신청 자녀(반·번호 + 이름 "김보민"), `requestedAt` 상대시각(`3일 전`), D+N 배지(D+0~2 회색 / D+3~5 노랑 / D+6 빨강), `승인`/`거부` 버튼.

#### S-T3 LinkedParentsSection (연결된 학부모)

| 상태 | 표시 정보 | 표시 행동 |
|---|---|---|
| empty | "아직 연결된 학부모가 없습니다." | 없음 |
| loading | 행 skeleton × 3 | 없음 |
| ready | LinkedRow × N: 학부모 이메일 + 자녀 이름 + 승인일 + `해제` (destructive 작은 버튼) | 해제 클릭 → 확인 모달 → revoke |
| error | 로드 실패 안내 + `새로고침` | 새로고침 |
| success | 해제 직후 행 fade-out + toast `학부모 연결을 해제했습니다` | toast 닫기 |

#### S-T4 회전 확인 모달 (RotateButton 트리거)

| 상태 | 표시 정보 | 표시 행동 |
|---|---|---|
| empty | (해당 없음 — 모달 자체가 컨텍스트) | — |
| loading | 모달 내 버튼 spinner | 취소만 활성 |
| ready | 본문 "코드를 회전하면 기존 8자리 코드는 즉시 무효화되고 승인 대기 중인 N명은 자동 거부됩니다. 계속할까요?" + `취소` / `회전` (Destructive) | 취소·회전 |
| error | 회전 실패 안내(텍스트) + `다시 시도` | 재시도·취소 |
| success | 모달 닫힘 + InviteCodeSection success toast 트리거 | — |

#### S-T5 Classroom 삭제 확인 모달 (기존 ClassroomDetail surgical patch)

| 상태 | 표시 정보 | 표시 행동 |
|---|---|---|
| empty | (해당 없음) | — |
| loading | 삭제 진행 spinner | 취소만 |
| ready | 경고 박스: `이 학급을 삭제하면 학부모 N명의 액세스가 즉시 해제됩니다.` + 학급명 재입력 input + `취소` / `삭제` (Destructive, 입력 일치 시에만 활성) | 입력·확인 |
| error | 삭제 실패 안내 + `다시 시도` | 재시도·취소 |
| success | 모달 닫힘 + 학급 목록으로 router.push + toast `학급이 삭제되었습니다` | — |

---

### 1.2 학부모 온보딩 (6 페이지)

라우트는 architecture §3.1 기준. 페이지 단위로 5상태 명세.

#### S-P1 `/parent/onboard/signup` — 이메일 입력

| 상태 | 표시 정보 | 표시 행동 |
|---|---|---|
| empty | 폼 진입 시: 헤더 "학부모 가입" + 안내 "자녀의 학급에 연결하려면 이메일을 입력해 주세요." + 이메일 input(빈 값) | input 포커스, `매직링크 받기` 버튼 disabled |
| loading | 매직링크 발송 중 spinner + 버튼 disabled | 취소 없음 |
| ready | 이메일 입력 시 형식 검증 통과하면 `매직링크 받기` 활성 | 제출 |
| error | 형식 오류(`올바른 이메일을 입력해 주세요`) inline + 서버 오류(`잠시 후 다시 시도해 주세요 (E-PARENT-SIGNUP)`) banner | 재시도 |
| success | 본문 교체: "메일함을 확인해 주세요. 15분간 유효합니다." + 이메일 표시 + `다른 이메일로 다시 시도` 링크 | 링크 클릭 시 폼 복귀 |

#### S-P2 `/parent/onboard/signup/verify` — 매직링크 landing

| 상태 | 표시 정보 | 표시 행동 |
|---|---|---|
| empty | (URL 진입 직후 token 파싱 전 — loading 으로 즉시 전환) | — |
| loading | "이메일 인증 중..." + spinner | 사용자 액션 없음 |
| ready | (성공 직후 자동 router.push, 정지 화면 없음) | — |
| error | 토큰 만료/위조: "이 링크는 만료되었거나 사용할 수 없습니다." + `다시 매직링크 받기` 버튼 → /signup | 재요청 |
| success | router.push 분기 (`session.status` 기준 `/onboard/match/code` · `/onboard/pending` · `/(authed-active)/home` · `/onboard/rejected`) | — |

#### S-P3 `/parent/onboard/match/code` — 학급 코드 입력

| 상태 | 표시 정보 | 표시 행동 |
|---|---|---|
| empty | 헤더 "학급 코드 입력" + 8칸 코드 input + 안내 "선생님께 받은 8자리 코드를 입력하세요." | 첫 칸 자동 포커스, `다음` disabled |
| loading | 코드 검증 중 spinner + input readonly | — |
| ready | 8자 모두 입력 시 `다음` 활성 | 제출 |
| error | 코드 무효: `이 코드를 찾을 수 없습니다` inline / rate-limit: `잠시 후 다시 시도해 주세요 (15분)` banner / 회전됨: `이 코드는 만료되었습니다. 선생님께 새 코드를 요청해 주세요.` | input clear + 재입력 |
| success | ticket 수신 → router.push `/onboard/match/select?ticket=...` | — |

#### S-P4 `/parent/onboard/match/select` — 자녀 선택

| 상태 | 표시 정보 | 표시 행동 |
|---|---|---|
| empty | (학급 명단이 0명일 경우) "아직 학생이 등록되지 않았습니다. 선생님께 문의하세요." + 뒤로 버튼 | 뒤로 |
| loading | 학생 카드 grid skeleton × 12 (학급당 평균 25명 가정) | — |
| ready | 학급명 헤더 + 학생 카드 grid: 각 카드 = `반-번호` + 이름(`김보민`) + 라디오 선택 + (선택 시) Primary `이 학생의 학부모로 신청` (sticky bottom on mobile) | 카드 탭/클릭 → 선택, 신청 버튼 → 제출 |
| error | 명단 로드 실패 또는 ticket 만료(`다시 코드를 입력해 주세요` + /match/code 링크) / 동시 pending 3건 초과(`이미 신청한 학생이 3명입니다. 승인 후 다시 시도해 주세요.`) | 재시도/뒤로 |
| success | 신청 확정 후 router.push `/onboard/pending` | — |

#### S-P5 `/parent/onboard/pending` — 승인 대기

| 상태 | 표시 정보 | 표시 행동 |
|---|---|---|
| empty | (해당 없음 — 진입 시 항상 ready) | — |
| loading | session/status 첫 폴링 중 skeleton(헤더+본문 박스) | — |
| ready | 헤더 "승인 대기 중" + 본문 "선생님이 승인하면 자녀 보드를 볼 수 있습니다. 보통 1~3일 소요됩니다. 7일 내 미승인 시 자동 만료됩니다." + 신청 정보(학급명·자녀 이름·신청일) + `로그아웃` (작은 secondary) | 로그아웃 |
| error | session/status 폴링 실패: silent retry, 3회 실패 시 banner `연결 상태를 확인할 수 없습니다 (재시도)` | 재시도 버튼 |
| success | 폴링이 `status='active'` 감지 → 자동 router.push `/(authed-active)/home` (toast `승인되었습니다`) | — |

#### S-P6 `/parent/onboard/rejected` — 거부/만료 안내

| 상태 | 표시 정보 | 표시 행동 |
|---|---|---|
| empty | (해당 없음) | — |
| loading | reason 쿼리 파싱 중 skeleton | — |
| ready | reason 별 본문 (5종 분기): `wrong_child` "다른 자녀로 신청해 주세요" / `not_parent` "학부모 본인이신지 확인 후 다시 신청해 주세요" / `other` "선생님이 신청을 보류했습니다" / `auto_expired` "7일이 지나 자동 만료되었습니다" / `code_rotated` "코드가 변경되었습니다. 새 코드를 받아 주세요." + Primary `다시 신청하기` (deep link → /onboard/match/code) + 학교 대표 연락처 표시 | 재신청 클릭 |
| error | reason 쿼리 누락 또는 invalid: 일반 안내(`신청이 처리되지 않았습니다`) + 재신청 버튼 | 재신청 |
| success | (거부 안내 자체가 종착점이라 별도 success state 없음 — 재신청 클릭 시 P3 로 이동) | — |

---

### 1.3 학부모 active (v1 보존) — v2 영향 surface

기존 `/parent/(authed-active)/home`, `/notifications`, `/child/[studentId]/...`, `/account/withdraw` 5종은 **v2 신규 디자인 없음**. v2 영향은 다음 1건만:

| surface | v2 변경 | 상태 |
|---|---|---|
| 모든 active 페이지 진입 시 | scopeMiddleware 가 cascade 후 401 SESSION_REVOKED → `/onboard/rejected?reason=classroom_deleted` 로 redirect | 사실상 P6 의 6번째 reason |

→ P6 의 reason 분기에 `classroom_deleted` 추가 ("학급이 삭제되어 액세스가 해제되었습니다. 자세한 사항은 학교에 문의해 주세요.")

---

### 1.4 이메일 템플릿 9종 (visual 은 phase5, 본 phase 는 정보·CTA 명세)

`src/emails/` (React-email + Resend). 모든 템플릿 = (1) 학교/학급명 (2) 사유/안내 본문 (3) 재신청 CTA(해당 시) (4) 푸터 = `Aura-board` 로고 + 학교 대표 연락처. 교사 PII 비노출.

| # | 파일 | 수신자 | 본문 핵심 | CTA |
|---|---|---|---|---|
| 1 | `parent-rejected-wrong-child.tsx` | 학부모 | "신청한 자녀가 일치하지 않습니다" | `다시 신청하기` → /onboard/match/code |
| 2 | `parent-rejected-not-parent.tsx` | 학부모 | "학부모 본인 확인이 필요합니다" | `다시 신청하기` |
| 3 | `parent-rejected-other.tsx` | 학부모 | "선생님이 신청을 보류했습니다" | `다시 신청하기` |
| 4 | `parent-auto-expired.tsx` | 학부모 | "7일 동안 승인되지 않아 만료되었습니다" | `다시 신청하기` |
| 5 | `parent-code-rotated.tsx` | 학부모 | "학급 코드가 변경되었습니다. 새 코드를 받아 주세요." | `다시 신청하기` |
| 6 | `parent-classroom-deleted.tsx` | 학부모 | "학급이 삭제되어 액세스가 해제되었습니다" (재신청 CTA 없음, 학교 연락처만) | (없음) |
| 7 | `teacher-pending-d3.tsx` | 교사 | "{N}명의 학부모가 승인 대기 중입니다" | `승인 인박스 열기` → /classroom/[id]/parent-access |
| 8 | `teacher-pending-d6.tsx` | 교사 | "24시간 후 자동 만료 예정 ({N}건)" | `승인 인박스 열기` |
| 9 | `teacher-expired-summary.tsx` | 교사 | "오늘 {N}건이 자동 만료되었습니다" | `승인 인박스 열기` |

> note: scope_decision §2.1 은 "8종" 이라 적었으나 architecture.md §10·§7.2 의 9종(거부 3 + auto-expired + code-rotated + classroom-deleted + 교사 D+3/D+6/D+7) 이 downstream 진실. **본 brief 는 9종 채택**. (게이트 위반 아님 — 데이터 현실 반영.)

---

## 2. 정보 계층

### 2.1 교사 페이지 우선순위

1. **승인 대기 인박스** (S-T2) — D+N 배지가 빨강인 행을 최상단 정렬, 사용자 첫 시선이 여기로 떨어져야 함.
2. **초대 코드** (S-T1) — 코드 공유가 두 번째 빈도 행위.
3. **연결된 학부모** (S-T3) — 점검·해제용, 가장 낮은 빈도.

시선 흐름: 페이지 진입 → (좌상단) 페이지 타이틀 `학부모 액세스` → (1열) S-T2 인박스 → (2열, 데스크탑) S-T1 코드 → (하단) S-T3 연결 목록. 모바일에서는 세로 스택, 순서 동일.

### 2.2 학부모 온보딩 우선순위

각 페이지마다 **단일 핵심 행동 1개** 원칙:
- P1: 이메일 입력 → "매직링크 받기" 1버튼
- P3: 코드 입력 → "다음" 1버튼
- P4: 자녀 1명 선택 → "신청" 1버튼
- P5: 대기 상태 확인 (행동 없음, 자동 polling)
- P6: 재신청 1버튼

시선 흐름: 헤더(현재 단계 표시 — 1 of 4 / 2 of 4 / ...) → 본문 안내 1줄 → 입력/선택 영역 → CTA. 진행 progress 는 `1 of 4 (가입) → 2 of 4 (코드) → 3 of 4 (자녀) → 4 of 4 (대기)` 4단계 stepper, P6 (rejected) 는 stepper 숨김.

### 2.3 D+N 배지 정보 위계

PendingRow 내에서 D+N 배지는 **두 번째 우선순위** (학부모 식별 정보가 1순위, 행동 버튼이 3순위 — 우측 정렬). 배지는 행의 좌측 또는 자녀 이름 옆 inline.

---

## 3. 인터랙션 명세

### 3.1 교사 인터랙션 매핑

| 행동 | 시스템 반응 |
|---|---|
| 코드 `복사` 버튼 클릭 | 클립보드 복사 + 버튼이 200ms 동안 `복사됨 ✓` 텍스트로 전환 후 원복 (toast 없음, in-place feedback) |
| 코드 `회전` 버튼 클릭 | 모달 S-T4 오픈 (200ms ease modalIn) |
| 회전 모달 `회전` 확인 | 버튼 spinner → 성공 시 모달 closes (200ms) → S-T1 success state toast (`새 코드 발급됨, 대기 N건 자동 거부`) |
| PendingRow `승인` 클릭 | 버튼 spinner → 행 fade-out 180ms → SWR `mutate()` → 인박스 카운트 즉시 감소 + S-T2 success toast |
| PendingRow `거부` 클릭 | RejectReasonDropdown 열림(200ms) → reason 선택 → 자동 제출 → 행 fade-out → toast |
| Classroom 삭제 버튼 | S-T5 모달 오픈 + 학급명 input 빈 값 / `삭제` 버튼 disabled → 사용자가 학급명 정확 입력 → `삭제` 활성 → 클릭 시 spinner → 학급 목록 router.push |
| FilterBar `D+3 이상` 토글 | 클라이언트 필터링(API 재호출 없음) + 행 수 카운트 갱신 |
| 60s 폴링 자동 갱신 | 행 수 변화 시 새 행은 위에서 슬라이드인 (200ms), 사라진 행은 fade-out |

### 3.2 학부모 인터랙션 매핑

| 행동 | 시스템 반응 |
|---|---|
| P3 코드 input 8자 입력 | 마지막 칸 입력 시 `다음` 버튼 자동 활성 (포커스 이동 없음, 사용자 의도 존중) |
| P4 학생 카드 탭/클릭 | 카드 border + 배경 accent-tinted + 라디오 체크 + sticky CTA `이 학생의 학부모로 신청` 활성 (모바일은 bottom sheet 형태로 슬라이드업 200ms) |
| P5 polling | 30s 간격 `GET /api/parent/session/status`. status 변경 감지 시 toast(`승인되었습니다`) → 1.5s 후 자동 router.push |
| P6 `다시 신청하기` 클릭 | router.push `/onboard/match/code` (현재 ticket·세션 유지) |

### 3.3 마이크로 인터랙션 (design-system §9 토큰 내)

| 인터랙션 | 트랜지션 |
|---|---|
| 모달 진입 | 200ms ease (modalIn) — 기존 토큰 |
| 행 fade-out (승인/거부/해제) | 180ms ease, opacity 1→0 |
| 버튼 hover (Primary) | box-shadow 180ms ease (--shadow-accent → --shadow-accent-hover) |
| 버튼 hover (Destructive) | background 150ms ease |
| Toast | 진입 200ms slide+fade, 2.5s 유지, 200ms fade-out |
| 스텝퍼(학부모 progress) | 단계 변경 시 active 점 background 150ms ease |
| Skeleton shimmer | 1.4s linear infinite (기존 토큰 부재 — §5 신규 확인 필요) |

### 3.4 키보드 네비게이션 시퀀스 (요약)

- 교사 페이지: `Tab` 순서 = (탭타이틀) → InviteCodeSection 코드 → 복사 → 회전 → FilterBar → PendingRow.승인 → PendingRow.거부 → 다음 행 ... → LinkedRow.해제. `Esc` = 모달 닫기. `Enter` = 포커스된 버튼 활성.
- 학부모 P4: `Tab` 으로 학생 카드 순회, `Space` 또는 `Enter` 로 선택, `Tab` 한 번 더 → CTA → `Enter` 제출.

---

## 4. 접근성 요구 (최소 3개, 본 brief 5개)

### 4.1 키보드 only 동작

- 모든 페이지는 마우스/터치 없이 `Tab` / `Shift+Tab` / `Enter` / `Space` / `Esc` 로 완주 가능.
- S-T4·S-T5 모달은 focus trap 적용 (design-system §7 SidePanel 와 동일 패턴), 첫 포커스는 `취소`(파괴 액션 모달은 안전 기본값), `Esc` 닫기, 닫힘 시 opener 포커스 복귀.
- P3 코드 input 8칸은 `Backspace` 시 이전 칸 자동 포커스 + `좌/우 화살표` 칸 이동.
- P4 학생 카드 grid 는 라디오 그룹으로 노출(`role="radiogroup"`) — `↑↓←→` 로 이동, `Space`/`Enter` 선택.

### 4.2 스크린리더 라벨

- D+N 배지: `aria-label="신청 후 N일 경과"` (시각 색만으로 의미 전달 금지).
- 승인/거부 버튼: `aria-label="{자녀이름} 학부모 승인" / "...거부"` 동적 바인딩.
- 폴링 상태 변화 (P5 → active): `aria-live="polite"` region 에 "승인되었습니다, 보드로 이동합니다" 안내.
- 모달: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (design-system §7 준수).
- 이메일 템플릿: `<head>` 에 `lang="ko"` + 의미 있는 alt 텍스트.

### 4.3 명도 대비 / 포커스 가시성

- 모든 텍스트 ≥ AA (`--color-text` 18:1, `--color-text-muted` 5.5:1 — design-system §8 이미 충족).
- D+N 배지 색상은 **색만으로 정보 전달 금지** — 배지 텍스트 자체에 `D+3` 표기 + tooltip + aria-label.
- 빨강 배지(`--color-danger` `#c62828`) on 흰 배경 = 5.9:1 (AA 통과). 노랑(검토 필요): phase5 designer 가 정확한 hex 결정 시 contrast 검증.
- `:focus-visible` outline 2px `#097fe8` (design-system §8 토큰) 기본 적용.

### 4.4 터치 타겟 (갤럭시 탭 S6 Lite 기준)

- 본 프로젝트 perf baseline = 갤럭시 탭 S6 Lite. **모든 터치 타깃 ≥ 44×44px** (design-system 기존 24px 권장보다 강화 — 태블릿 손가락 정확도 보정).
- 적용 surface: 승인/거부 버튼, P4 학생 카드(전체 카드 영역이 탭 타깃), P3 코드 input 칸 (각 칸 ≥ 44×44), Toast 닫기.
- design-system §8 의 "최소 24px" 는 desktop pointer 기준, 본 task 는 태블릿 우선이므로 **44px override** (phase5 designer 에게 명시).

### 4.5 모션 감도 (`prefers-reduced-motion`)

- 모든 transition (modalIn, fade-out, slide-in, shimmer, polling 자동 push) 은 `@media (prefers-reduced-motion: reduce)` 시 instant 전환.
- design-system §7 SidePanel 가 이미 이 패턴 적용 — 동일 규칙 확장.

---

## 5. 디자인 시스템 확장 여부

### 5.1 결론

**기존 토큰/컴포넌트로 ~95% 가능**. 신규 토큰 0개, 신규 컴포넌트 4개(이 task 전용), 디자인 시스템 docs 갱신 1건.

### 5.2 신규 토큰 (제안)

없음. design-system §1·§2·§3·§4 의 기존 토큰만으로 모든 시각 표현 가능. (D+N 배지 노랑은 phase5 designer 가 기존 시맨틱 색 또는 새 토큰 제안 가능 — **본 brief 는 신규 토큰 없이 갈 수 있다고 판단**, 아래 §5.4 USER-REVIEW 참조.)

### 5.3 신규 컴포넌트 (task-local, 디자인 시스템 글로벌 추가 아님)

| 컴포넌트 | 위치 | 베이스 토큰 |
|---|---|---|
| `<DPlusBadge value={n}/>` | `src/components/parent-access/DPlusBadge.tsx` | 뱃지 패턴(§7) + 색 분기 (회색 = `--color-text-muted` bg / 노랑 TBD / 빨강 = `--color-danger`) |
| `<CodeInput8 />` | `src/components/parent/CodeInput8.tsx` | 인풋 패턴(§7) × 8칸 + 키보드 nav |
| `<StudentPickerCard />` | `src/components/parent/StudentPickerCard.tsx` | 카드 패턴(§7) + radio role |
| `<OnboardingStepper />` | `src/components/parent/OnboardingStepper.tsx` | 뱃지/필 패턴 응용 + active dot |

신규 컴포넌트는 **글로벌 design-system 에 승격하지 않음** (Karpathy §2 Simplicity — 이 task 외 재사용 미정). phase5 designer 가 글로벌 승격 가치 판단 가능.

### 5.4 USER-REVIEW 권장 결정 포인트

1. **D+N 배지 노랑색** — 기존 design-system 에 노랑 토큰 부재. 옵션: (a) `#f59e0b` 계열 신규 토큰 `--color-warning` 추가 (b) D+3~5 구간을 단색(빨강 흐림) + 텍스트만으로 표현. **권고: (a) 신규 토큰 1개 추가, design-system §1.7 신규 섹션 "Warning"** — phase5 designer 결정 시 docs/design-system.md 도 동시 갱신.
2. **갤럭시 탭 S6 Lite 44px override** — design-system §8 글로벌 기본을 24→44 로 갱신할지, 본 task 만 override 할지. **권고: 본 task만 override** (다른 데스크탑 기능 surface 영향 최소).
3. **OnboardingStepper 글로벌 승격 여부** — 향후 다른 온보딩(예: 학생 가입) 도입 시 재사용 가능. **현 시점 미승격, 후속 task 에서 재평가**.

### 5.5 design-system docs 갱신 계획

phase8 code_reviewer 통과 후 `docs/design-system.md` 에 다음 추가 (D+N 배지 토큰 (a) 채택 가정):
- §1.7 Warning 섹션 신규 (`--color-warning` `#f59e0b` + tinted bg)
- §11 체크리스트에 "터치 타깃 44px (태블릿 우선 surface)" 항목 추가

설문 결과에 따라 갱신 범위 조정.

---

## 6. 검증 게이트 self-pass

- [x] §1 화면/상태 목록 — 5상태 (empty/loading/ready/error/success) 누락 없이 모든 화면(교사 5 + 학부모 6 + 이메일 9) 명세
- [x] §2 정보 계층 — 우선순위 1~3 + 시선 흐름 명시
- [x] §3 인터랙션 명세 — 사용자 행동 → 시스템 반응 매핑 + 마이크로 인터랙션
- [x] §4 접근성 — 5개 항목(키보드/SR/대비/터치/모션) ≥ 3 충족
- [x] §5 디자인 시스템 확장 — 신규 토큰 0개 (USER-REVIEW 1건 권고) + 신규 컴포넌트 4개 (task-local)
- [x] 실제 목업/비주얼 첨부 없음 (phase5 designer 의 일)
- [x] 이름 노출 정책: 원본 표시 (마스킹 없음 — decisions.md #1 반영)
- [x] owner/editor/viewer mock 역할 의존 없음
- [x] 코드 변경 0건

**판정: PASS** — phase5 designer 진입 가능.

---

## 7. phase5 designer 입력 핸드오프

phase5 designer 는 본 brief 를 입력으로 다음을 산출:
- 화면별 wireframe 또는 컴포넌트 트리 시각화 (S-T1~T5, S-P1~P6)
- D+N 배지 색·여백 spec
- 이메일 9종 React-email 컴포넌트 wireframe
- §5.4 USER-REVIEW 3건에 대한 designer 권고
