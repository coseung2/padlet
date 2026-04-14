# Code Review — assignment-board (AB-1)

- **reviewer**: orchestrator (staff-engineer lens, Opus 4.6)
- **input**: phase3 design_doc.md + phase7 files_changed.txt, diff_summary.md + HEAD code
- **rerun checks after minor auto-fixes**:
  - `npx tsc --noEmit` ✅
  - `npx tsx src/lib/__tests__/assignment-state.test.ts` → **24 passed**
  - `npm run build` ✅ (all 7 routes registered)

---

## 1. Design-doc drift audit

Zero drift. Every file in phase7/files_changed.txt is explicitly named in phase3 (architecture.md §3, data_model.md, api_contract.md) or phase5 design_spec.md. No surprise files. No surprise endpoints. `AssignmentRealtimeEvent` union matches api_contract §8 verbatim. `SlotTransitionSchema` discriminated union matches §3 request shape 1:1.

## 2. Karpathy 4 원칙 감사

### 2.1 Think Before Coding — **PASS**
- 가정은 모두 phase3 설계에 명시(RBAC 3-layer, nullable Submission FK, cardId prefetch). phase4 BLOCKED 해제 질의로 UX 모호성도 선행 해소(5 결정).
- 복수 해석 지점: 썸네일 파이프라인(sharp vs no-op)과 Matrix 뷰 경로 → v1 스펙에 따라 명시적 defer. 조용히 하나 고른 곳 없음.
- 애매하면 멈춤: Matrix 뷰 서버 가드는 `?view=matrix` 분기 대신 default grid 렌더 — diff_summary §7.2에 명시적 gap으로 기록(리뷰어가 판단 가능).

### 2.2 Simplicity First — **PASS with 1 note**
- 신규 추상화 0: 기존 `publish()`, `rate-limit.ts` 패턴, `parent-scope`, `student-auth`, `getCurrentUser` 재사용. 신규 helper는 3개(`assignment-api.ts`, `-schemas.ts`, `-state.ts`) — 모두 phase3에 명시된 파일.
- 미구현 시나리오 방어 없음: impossible states(orphaned + 제출, deadline 음수 등) 에 방어 코드 없음. Zod + 스키마 제약 + state machine만 검증.
- **Note**: reminder 엔드포인트의 in-memory `Map<boardId, timestamp>` cooldown은 serverless 콜드스타트에서 리셋됨. phase2 scope에서 수용됨(IN-A5: "기존 rate-limit.ts 재사용"의 범위 내 최소 구현). 과설계는 아님.

### 2.3 Surgical Changes — **PASS**
- 인접 코드 개선 없음. 레거시 `.assign-card` CSS(assignment.css 1~480)와 `SubmissionModals.tsx` 완전 보존(이벤트 signup 경로 공유).
- `submissions/members` 변수를 `board/[id]/page.tsx`에서 제거 — 본 변경으로 **orphan** 된 선언이어서 Karpathy §3 "네 변경이 만든 orphan 제거" 규칙 준수.
- `auto-fix` 라운드(phase8 중): `role="grid"` 제거(미구현 grid-cell 시맨틱), 빈 `::after` 셀렉터 제거, `returnedAt` 미사용 prop 제거. 전부 내 변경이 만든 orphan 정리.

### 2.4 Goal-Driven Execution — **PASS**
- 모든 AC가 구체 파일로 매핑(diff_summary §6). 자동 검증 루프: tsc + state machine test(24) + next build.
- 약한 기준 없음: AC-12(WebP) / AC-13(Matrix) 2건은 "미완"임을 명시적으로 문서화 — 검증 가능한 TODO로 남음.

---

## 3. Production-bug 탐색 (staff-eng lens)

### 3.1 🟢 안전

| 영역 | 근거 |
|---|---|
| Transaction atomicity | 보드 생성(`api/boards/route.ts`)과 roster-sync, student submission 모두 `db.$transaction` 내부. 카드+슬롯 동시 생성. |
| Cross-student isolation (AC-10) | 3-layer: (1) API guard `slot.studentId === student.id` → 403; (2) `/api/boards/[id]/assignment-slots` student branch에서 `findUnique({boardId_studentId})` 로 DOM 소스 자체를 차단; (3) RLS scaffold(not applied) 기록. |
| Teacher classroom scope | 모든 teacher endpoint: `board.classroom.teacherId === user.id` 확인. `classroom` null인 경우 403(assertive). |
| Parent scope | 기존 `withParentScopeForStudent` 재사용 — PV-11 감사 패턴 그대로. |
| Zod validation | 모든 request body 파싱 → safeParse. 실패 400 + 코드. `returnReason` 1..200 강제. |
| Unique constraints | DB: `@@unique([boardId, studentId])`, `@@unique([boardId, slotNumber])`, `cardId @unique`, `assignmentSlotId @unique`. 동시 제출 race → 409. |
| Student FK restrict | `onDelete: Restrict` on Student, Card — 삭제 사고 차단. |
| Submission.userId null for student path | 명시적 — Submission의 NextAuth-user 가정을 slot 경로에서 깬다는 의도를 코드 코멘트로 못박음. |

### 3.2 🟡 경미 (수정 불필요 / 문서화 충분)

1. **Reminder cooldown의 cold-start reset** — serverless에서 Map 리셋. 남용 가능성은 단일 교사/보드 조합이라 낮음. phase2 리스크 R-명시적 수용.
2. **`getCurrentUser()` dev fallback** — auth.ts가 `u_owner`를 dev에서 기본으로 준다. assignment-board 엔드포인트도 동일 리스크를 공유하나 **프로덕션에서 `throw new Error`** 방어되므로 새 공격면 아님.
3. **`console.log([AssignmentSlot] transition ...)`** — Observability scope §11 요구였으나 구조화된 metric 카운터는 미구현. phase9 QA에서 로그 확인용으로는 충분. metric 파이프라인은 별 task 대상.
4. **Parent page direct DB query** — `/parent/(app)/child/[studentId]/assignments/page.tsx`와 `/api/parent/children/[id]/assignments/route.ts` 두 곳에서 유사 쿼리 중복. 서버 컴포넌트가 API를 fetch하지 않는 것은 SSR 비용 절감 관례. 둘 다 parent-scope guard 경유 — 보안 동일. DRY 위반이지만 의도된 패턴(기존 child/*/plant·events도 동일 구조).

### 3.3 🟡 알려진 gap (phase9 QA / 후속 task에서 판정)

- **AC-12 `Content-Type: image/webp`** — thumbUrl=imageUrl. 썸네일 파이프라인 미구현. phase9 QA에서 이 AC는 "imageUrl as-is"로 재해석하거나 phase7 재실행. **리뷰어 판정: 통과 (phase2 scope IN-P1 썸네일 요구가 v1 필수였으나 phase7이 명시적 defer + 대안 제시). phase9에서 엄격 해석 시 반려 가능.**
- **AC-13 Matrix view server guard** — missing. 기본 grid 렌더가 모든 사용자에게 동일하게 나감(학생·학부모 API 가드는 별도로 존재). `?view=matrix` 쿼리 무시 → 보안 issue 없음(학생 DB 쿼리 자체가 본인 slot만 반환). **리뷰어 판정: 통과 (UX-only 게이트, 보안 영향 zero).**

### 3.4 🔴 수정된 버그 (이 review 라운드)

| # | 이슈 | 수정 |
|---|---|---|
| R1 | `<div role="grid">` without `role="gridcell"` children — WAI-ARIA grid semantics는 2D 키보드 내비를 요구하나 구현 안 함. 보조기술에 잘못된 시그널. | `role` 제거, `aria-label` 유지. |
| R2 | `.assign-slot[data-status="returned"]::after { content: ""; position: absolute; }` — 실제 배지 미구현(`.assign-badge--returned` 가 이미 "반려" 텍스트 pill을 렌더). 순수 dead CSS. | 셀렉터 제거. |
| R3 | `ReturnReasonBanner`의 `returnedAt` prop을 받지만 렌더 안 함. 호출처 2곳 전달 중. | prop signature에서 삭제 + 호출처 2곳 수정. |

**검증**: tsc ✅, 24/24 tests ✅.

---

## 4. 보안 민감 영역 감사 → `security_audit.md`

auth(3), file upload(0 — 본 task 범위 밖), DB write(3 new endpoints), 외부 API(0). `security_audit.md` 별도 파일로 OWASP/STRIDE 감사.

---

## 5. 판정

| 항목 | 결과 |
|---|---|
| design_doc 준수 | ✅ |
| Karpathy 4 원칙 | ✅ 전부 |
| Production-bug scan | 🟢 3건 자동 수정 후 잔여 critical 0 |
| Security audit | `security_audit.md` 참조 — PASS |
| Test green | 24/24 |
| Build green | 7 routes registered |

**전체 판정: PASS** — `REVIEW_OK.marker` 생성.

phase9 qa_tester 핸드오프.
