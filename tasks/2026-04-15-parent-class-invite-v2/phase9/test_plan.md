# Test Plan — parent-class-invite-v2

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **slug**: `parent-class-invite-v2`
- **작성일**: 2026-04-15
- **Phase**: 4 (test_planner, 사용자 커스텀 오버로드 — 표준 feature 파이프라인의 `design_planner` 슬롯을 본 task 한정 `test_planner` 로 사용)
- **상위 입력**: `phase2/scope_decision.md`(29 AC), `phase2/BLOCKER_RESOLUTION.md`(Path A), `phase3/architecture.md`(14 섹션), `phase3/data_model.md`, `phase3/api_contract.json`(13 엔드포인트)
- **진실원본 override**: 이름 마스킹 규칙은 **전면 제거** (phase9_user_review/decisions.md #1). 자녀·급우·학부모 이름은 원본 그대로 표시. architecture.md §8.5 삭제, AC A-12 제거 (29 → 28 AC).

---

## 0. Karpathy 4원칙 적용

| 원칙 | 적용 |
|---|---|
| **Think Before Coding** | 각 AC 마다 "무엇을 검증하는가 / 통과 기준은 무엇인가" 를 먼저 서술. 단일 AC 가 여러 레이어에 걸치면 unit/integration/E2E 중 어느 레이어가 "책임 소재(primary)" 인지 명시. |
| **Simplicity First** | AC 에 없는 커버리지 투기 금지. owner/editor/viewer mock 역할 가정 금지. 테스트는 실제 시드 데이터 기반으로만 구성. |
| **Surgical Changes** | 본 phase 는 계획 문서만 — 코드·시드·픽스처 파일 신규 작성 금지 (phase7 coder 가 작성). 본 문서는 phase7 에 필요한 픽스처 "요구 스펙" 만 기술. |
| **Goal-Driven Execution** | 각 케이스에 "expected behaviour" 를 작성해 phase9 QA 가 PASS/FAIL 을 기계 판정 가능하게 한다. |

---

## 1. 테스트 레이어 정의

| 레이어 | 도구 | 대상 | 실행 시점 |
|---|---|---|---|
| **Unit** | Vitest | 순수 함수 (lib/*), state machine, rate-limit 카운터 | `npm run test:unit` (phase7 coder CI) |
| **Integration** | Vitest + Prisma test schema (Postgres 별도 DB) | API route handler, 트랜잭션, 미들웨어, Cron handler | `npm run test:integration` (phase8 review 전) |
| **E2E** | Playwright (chromium + webkit) | 브라우저 플로우, SWR 60s 폴링, 세션 라우팅, UI 배지 | phase9 QA (갤럭시 탭 S6 Lite viewport 포함) |

추가 도구:
- **Static**: ESLint plugin `parent-middleware-boundary` (A-14 핫스팟)
- **Perf**: Lighthouse (Chrome DevTools emulation — 갤럭시 탭 S6 Lite viewport + CPU 4x + Slow 4G) — A-29 전용

---

## 2. 우선순위 정의

| 우선순위 | 기준 | 실행 게이트 |
|---|---|---|
| **P0** | 보안 게이트 (미들웨어, 코드 유출, 거부 쿨다운, Cron 인증), 데이터 무결성(전이 머신, 단일 코드 unique), Classroom cascade | phase8 REVIEW_OK 전 필수 PASS |
| **P1** | 핵심 행복 경로(교사 승인, 학부모 온보딩), Cron D+3/D+6/D+7, 라우트 그룹 분리, 이메일 템플릿, v1 410 Gone | phase9 QA_OK 전 필수 PASS |
| **P2** | UX 보조(D+N 배지 색상, 재신청 deep link, 성능 TTI, 세션 TTL 유지) | phase9 smoke 수준 PASS, 실패 시 WARN 로 기록 |

---

## 3. 테스트 픽스처 / 시드 요구 사양

phase7 coder 가 신규 작성해야 할 픽스처 파일 (본 문서가 **스펙만** 확정, 실제 구현은 phase7).

### 3.1 신규 시드 파일

- **`tests/fixtures/parent-class-invite.ts`** (신규) — 아래 엔티티 세트를 export
  - `teacher_A` — User(role=teacher), classroom 2개 소유
  - `teacher_B` — User(role=teacher), classroom 1개 (cross-ownership 검증용)
  - `classroom_A1` — teacher_A 소유, 학생 3명 (classNo/studentNo 부여)
  - `classroom_A2` — teacher_A 소유, 학생 200명 (A-29 성능 테스트용)
  - `classroom_B1` — teacher_B 소유, 학생 2명
  - `student_김보민` — classroom_A1, 3자 한글 이름 (기본 케이스)
  - `student_김보` — classroom_A1, 2자 한글 이름
  - `student_남궁민수` — classroom_A1, 복성 4자
  - `parent_mom@example.com` — Parent, 매직링크 토큰 준비
  - `parent_dad@example.com` — Parent, 동일 학생 대상 독립 pending (A-4)
  - `parent_abuser@example.com` — Parent, 거부 3회 누적 시드 (A-13)
  - `code_A1_active` — ClassInviteCode, classroom_A1, rotatedAt=null
  - `link_pending_d0` / `link_pending_d3` / `link_pending_d6` / `link_pending_d8` — ParentChildLink status=pending, requestedAt 각각 now / now-3d / now-6d / now-8d (Cron 검증)

### 3.2 v1 데이터 없음 전제 (Path A)

- BLOCKER_RESOLUTION.md: production DB ParentInviteCode 0건 확인됨
- 테스트 시드도 v1 ParentInviteCode row 없음 — 제공 금지 (migration drop 전제와 일치)
- v1 410 Gone 검증(A-27) 은 route 파일 존재 여부 + HTTP 응답으로만 확인

### 3.3 시간 조작

- Vitest `vi.useFakeTimers()` + UTC 기준 (KST 변환은 lib 내부)
- Cron 테스트는 "2026-05-01 17:00 UTC = 2026-05-02 02:00 KST" 고정 시점 기준

### 3.4 외부 의존성 모킹

- **Resend**: `tests/mocks/resend.ts` — `sendEmail(template, props)` 호출을 배열에 기록만, 실제 발송 금지
- **매직링크 URL 생성**: env `PARENT_MAGIC_LINK_BASE_URL=http://localhost:3000` 고정
- **CSPRNG**: `crypto.randomBytes` 는 실제 사용(유니크성 검증에 필요), state-machine 은 순수 함수라 모킹 불필요

---

## 4. AC × 테스트 매트릭스 (29 AC)

표기: **U**=Unit, **I**=Integration, **E**=E2E. ●=primary(통과 기준 판정 주책임), ○=secondary(보조 검증).

| AC | 요약 | U | I | E | 우선순위 |
|---|---|---|---|---|---|
| A-1 | Prisma migration 단일 파일 성공 | — | ● | — | P0 |
| A-2 | 8자리 Crockford Base32 CSPRNG + @unique | ● | ○ | — | P0 |
| A-3 | 전이 머신 (허용 외 409) | ● | ● | — | P0 |
| A-4 | 부·모 독립 pending 가능 | — | ● | ○ | P1 |
| A-5 | BoardMember = approve 시점만 | — | ● | — | P0 |
| A-6 | ParentSession = signup 시점 | — | ● | ○ | P1 |
| A-7 | pending 200 + `{status:"pending"}` | — | ● | ○ | P1 |
| A-8 | 동시 pending 3건 초과 429 | — | ● | — | P1 |
| A-9 | 3단계 rate limit (IP·code·class) | ● | ● | — | P0 |
| A-10 | 코드 회전 트랜잭션 cascade | — | ● | ○ | P0 |
| A-11 | 회전 후 active 유지 | — | ● | — | P0 |
| ~~A-12~~ | ~~명단 PII 최소화~~ **제거** (decisions.md #1) | — | — | — | — |
| A-13 | 거부 3회/24h 쿨다운 | — | ● | ○ | P0 |
| A-14 | 미들웨어 경로 분리 (우회 불가) | ● (ESLint) | ● | ○ | P0 |
| A-15 | approve 60s 이내 active 전환 | — | ● | ● | P1 |
| A-16 | 거부 드롭다운 3종 + 이메일 PII 미노출 | — | ● | ● | P1 |
| A-17 | Cron D+7 auto_expired | — | ● | — | P0 |
| A-18 | Cron D+3 reminder | — | ● | — | P1 |
| A-19 | Cron D+6 warning | — | ● | — | P1 |
| A-20 | D+N 배지 색상 (회색/노랑/빨강) | ● | — | ● | P2 |
| A-21 | 이메일 재신청 deep link | ○ | ● | ○ | P1 |
| A-22 | 매직링크 15m + 세션 7d TTL | — | ● | ○ | P2 |
| A-23 | Classroom 삭제 모달 확인 | — | ○ | ● | P1 |
| A-24 | Classroom 삭제 cascade revoke | — | ● | ● | P0 |
| A-25 | cascade 이메일 교사 PII 미노출 | ○ | ● | — | P0 |
| A-26 | Path A migration 로그 | — | ● | — | P1 |
| A-27 | v1 endpoint 410 Gone | — | ● | — | P1 |
| A-28 | ParentInviteButton 제거 | — | ○ | ● | P1 |
| A-29 | 명단 ≤ 200KB + TTI < 2s | — | ● (페이로드 크기) | ● (Lighthouse) | P2 |

합계 primary 기준 (A-12 제거 후):
- **Unit primary**: 5 (A-2, A-3, A-9, A-14(lint), A-20)
- **Integration primary**: 22 (A-1, A-3, A-4~A-11, A-13~A-19 대부분, A-21~A-27, A-29 일부)
- **E2E primary**: 6 (A-15, A-16, A-23, A-24, A-28, A-29)
- 합계 케이스 수: Unit ~7 · Integration ~24 · E2E 12 = **~43 관찰 포인트 (28 AC 커버)**

---

## 5. AC 별 테스트 케이스 상세

### 5.1 엔티티·상태 머신 (A-1 ~ A-8)

#### A-1 — Prisma migration 단일 파일 (P0, Integration)
- **TC-A1-I1**: `npx prisma migrate deploy` 실행 → exit code 0, 생성된 테이블/enum/컬럼 일치 (`information_schema` 조회)
- **Expected**: `ClassInviteCode` 테이블 존재, `ParentChildLink.status` 컬럼 존재, enum `ParentLinkStatus` 4값, `ParentRejectedReason` 5값(+code_rotated +auto_expired), `ParentRevokedReason` 7값, 인덱스 `(status, requestedAt)` 존재, partial unique `classroomId WHERE rotatedAt IS NULL` 존재
- **Fail 기준**: 하나라도 누락 또는 migration 분리되어 있으면 FAIL

#### A-2 — 8자리 Crockford Base32 CSPRNG + @unique (P0, Unit+Integration)
- **TC-A2-U1**: `generateInviteCode()` 10,000회 호출 → 모든 결과가 `/^[0-9A-HJ-NP-TV-Z]{8}$/` (I/1/L/O/0/U 제외 체크: data_model.md §1.1 은 O/0/I/1/L 제외. Crockford 원본은 U 도 제외하지 않음 — architecture.md 문구 기준 `O/0, I/1, L 제외`)
- **TC-A2-U2**: 10,000 샘플 중복률 = 0 (sanity check, 실제 @unique 강제는 DB 레이어)
- **TC-A2-I1**: 동일 코드 두 번 INSERT 시 Prisma P2002 에러 발생
- **Expected**: 정규식 통과 + DB unique 에러 정상 발생
- **Fail 기준**: 정규식 위반 1건 이상 또는 중복 수용 시 FAIL

#### A-3 — state 전이 머신 (P0, Unit+Integration)
- **TC-A3-U1**: `parentLinkStateTransition('pending','active')` → OK
- **TC-A3-U2**: `parentLinkStateTransition('pending','rejected')` → OK
- **TC-A3-U3**: `parentLinkStateTransition('active','revoked')` → OK
- **TC-A3-U4**: `parentLinkStateTransition('rejected','active')` → throws `STATE_CONFLICT`
- **TC-A3-U5**: `parentLinkStateTransition('revoked','active')` → throws
- **TC-A3-U6**: `parentLinkStateTransition('active','pending')` → throws
- **TC-A3-I1**: `POST /api/parent/approvals/{linkId}/approve` 에서 link.status=active 인 경우 409
- **Expected**: 4 허용 전이만 통과, 나머지 전부 409
- **Fail 기준**: 금지 전이 1건이라도 200 반환 시 FAIL

#### A-4 — 부·모 독립 pending (P1, Integration)
- **TC-A4-I1**: parent_mom + parent_dad 가 동일 student_김보민 에 각각 `POST /match/request` → 둘 다 201, 2개의 ParentChildLink row
- **Expected**: `@@unique([parentId,studentId])` 는 parentId 가 다르므로 충돌 없음
- **Fail 기준**: 두 번째 요청이 409 반환 시 FAIL

#### A-5 — BoardMember = approve 시점만 (P0, Integration)
- **TC-A5-I1**: pending 상태에서 `SELECT FROM BoardMember WHERE parentId=?` → 0건
- **TC-A5-I2**: approve 호출 후 재조회 → 1건 (role='parent', boardId=classroom.defaultBoardId)
- **Expected**: 트랜잭션 단위로 생성, pending 에는 절대 미존재
- **Fail 기준**: pending 단계에서 1건 이상 존재 시 FAIL

#### A-6 — ParentSession = signup 시점 (P1, Integration)
- **TC-A6-I1**: `POST /api/parent/signup` → `SELECT FROM ParentSession` 에 새 row (state=`authed_prematch` 해석 가능한 쿠키 mint)
- **TC-A6-I2**: 매직링크 verify 전 cookie 로 `GET /api/parent/session/status` → `state='authed_prematch'`
- **Expected**: signup 직후 세션 존재, 매칭 없이도 발급
- **Fail 기준**: signup 후 세션 없거나 매칭 완료 시점에만 발급되면 FAIL

#### A-7 — pending 200 + `{status:"pending"}` (P1, Integration)
- **TC-A7-I1**: `POST /api/parent/match/request` → `200 {"status":"pending", "linkId":"..."}`
- **TC-A7-I2**: 직후 `GET /api/parent/session/status` → `{"state":"pending", "pendingLinks":1}`
- **Expected**: 200 응답 + payload 정확
- **Fail 기준**: 202/201 이거나 payload 필드 누락 시 FAIL

#### A-8 — 동시 pending 3건 초과 429 (P1, Integration)
- **TC-A8-I1**: parent_mom 이 3명의 서로 다른 학생에 각각 `match/request` → 3건 모두 200
- **TC-A8-I2**: 4번째 학생에 `match/request` → 429 (`TOO_MANY_PENDING`)
- **Expected**: 정확히 3건 허용, 4건째 차단
- **Fail 기준**: 4건째 통과 또는 3건째 거부 시 FAIL

### 5.2 코드·보안 (A-9 ~ A-14) — 보안 핫스팟

#### A-9 — 3단계 rate limit (P0, Unit+Integration)
- **TC-A9-U1**: `rateLimit({scope:'IP', key:'1.2.3.4', limit:5, window:'15m'})` 6번째 호출 → `false`
- **TC-A9-I1**: 동일 IP 에서 `POST /api/parent/match/code` 6회 호출 → 5회 200, 6회 429
- **TC-A9-I2**: 서로 다른 IP 51개가 동일 `code` 에 대해 각 1회 호출 → 51회째 429 (code-level 50/day)
- **TC-A9-I3**: 여러 코드 합산 동일 classroom 에 101회 호출 → 101회째 429 (class-level 100/day)
- **Expected**: 3 카운터 독립 동작, 각 경계에서 정확히 차단
- **Fail 기준**: 경계값 초과 허용 또는 false-positive(경계 이하 차단) 시 FAIL

#### A-10 — 코드 회전 cascade 트랜잭션 (P0, Integration)
- **TC-A10-I1**: code_A1_active 에 대해 5개 pending ParentChildLink 존재 상태 → `POST /api/class-invite-codes/{id}/rotate`
- **Expected**:
  - 기존 ClassInviteCode.rotatedAt=not null
  - 새 ClassInviteCode row 1개 추가 (다른 code 값)
  - 5개 ParentChildLink 모두 status=rejected, rejectedReason=code_rotated
  - 모든 변경이 단일 트랜잭션 (트랜잭션 실패 주입 시 atomicity 검증: `TC-A10-I2` 중간 에러 raise → rollback 확인)
  - after-commit: Resend mock 에 5건 `parent-code-rotated` 이메일 기록
- **Fail 기준**: 부분 반영 또는 이메일 enqueue 가 트랜잭션 내부(실패 시 누수) 시 FAIL

#### A-11 — 회전 후 active 유지 (P0, Integration)
- **TC-A11-I1**: active ParentChildLink 3건 + pending 2건 상태에서 회전 실행
- **Expected**: active 3건은 status 변화 없음, pending 2건만 rejected
- **TC-A11-I2**: 회전 후 해당 parent 로 `GET /api/parent/children/{studentId}` → 200 (scopeMiddleware 통과)
- **Fail 기준**: active 1건이라도 status 변화 시 FAIL

#### ~~A-12~~ — **제거** (decisions.md #1)

이름 마스킹 규칙 전면 제거. 자녀·급우·학부모 이름은 원본 그대로 표시. 관련 테스트 케이스(U1~U10, I1~I2) 및 `src/lib/mask-name.ts` 생성 계획 모두 취소.

단, **응답 schema 엄격성**(`full_name`/`phone`/`address`/`birthdate`/`photo` 등 민감 필드는 응답에 포함 금지)은 별도 AC 로 유지할 가치가 있다면 A-14(미들웨어) 또는 신규 AC 로 재편성 가능 — 본 task 에서는 제거. phase7 coder 가 응답 schema 작성 시 원칙적으로 `id,classNo,studentNo,name` 만 노출하도록 한다 (design_brief 에도 동일 반영).

#### A-13 — 거부 3회/24h 쿨다운 (P0, Integration)
- **TC-A13-I1**: parent_abuser 가 3번 거부 당한 히스토리 시드 후, 4번째 `POST /api/parent/match/retry` → 429 + `cooldownSeconds ≈ 86400` 범위
- **TC-A13-I2**: 24h+ 경과 (fake timer) 후 재시도 → 200
- **TC-A13-I3**: 거부 2회만 있는 parent 는 3번째 허용
- **Expected**: 3회 초과 시점 정확히 차단, 24h 경과 후 해제
- **Fail 기준**: 경계값 오차 또는 해제 실패 시 FAIL

#### A-14 — 미들웨어 경로 분리 (우회 불가) (P0, Unit+Integration) **[핫스팟]**
- **TC-A14-U1** (ESLint): `src/app/api/parent/children/test-file.ts` 가 `parentAuthOnlyMiddleware` import → ESLint rule `parent-middleware-boundary` 가 `error` 발생 → `npm run lint` exit code 1
- ~~**TC-A14-U2**: 양방향 강제~~ **제외** (decisions.md #2: 한 방향만 강제)
- **TC-A14-I1**: pending 세션으로 `GET /api/parent/children/{studentId}` 호출 → `401 SESSION_PENDING`
- **TC-A14-I2**: pending 세션으로 `GET /api/parent/session/status` 호출 → `200 {state:"pending"}` (authOnly 통과)
- **TC-A14-I3**: 세션 없이 `GET /api/parent/match/students` → `401 NO_SESSION`
- **TC-A14-I4**: active 세션으로 `GET /api/parent/children/{studentId}` → 200 (해피 패스)
- **Expected**: pending 이 active 영역에 절대 접근 불가, ESLint 가 빌드 타임 보장
- **Fail 기준**: pending 으로 `/api/parent/children/*` 200 반환 시 즉시 P0 FAIL, push 차단

### 5.3 승인·Cron·이메일 (A-15 ~ A-22)

#### A-15 — approve 60s 이내 active (P1, Integration+E2E)
- **TC-A15-I1**: approve → link.status=active, approvedAt/approvedById 기록, BoardMember 생성 — 단일 트랜잭션
- **TC-A15-E1**: Playwright — 교사 승인 버튼 클릭 + 학부모 브라우저 pending 페이지가 60s 내 `/parent/(authed-active)/home` 으로 라우팅 (SWR 폴링 60s 기반, 최대 대기 75s 여유)
- **Expected**: 트랜잭션 일관성 + 60s SLA
- **Fail 기준**: 트랜잭션 실패 또는 E2E 75s 초과 시 FAIL

#### A-16 — 거부 드롭다운 3종 + 이메일 PII 미노출 (P1, Integration+E2E)
- **TC-A16-I1**: `POST /approvals/{id}/reject` body `{reason:"wrong_child"}` → 200 + Resend mock 에 `parent-rejected-wrong-child` 템플릿 + props 에 `teacherName`/`teacherEmail`/`teacherPhone` 필드 미존재
- **TC-A16-I2**: `reason:"invalid_value"` → 400 `INVALID_REASON`
- **TC-A16-E1**: Playwright — `/classroom/[id]/parent-access` 거부 드롭다운에 정확히 3개 옵션(wrong_child/not_parent/other) 노출
- **Expected**: 드롭다운 UI 3종만, API 는 5 enum 중 UI 3종만 받음(시스템 2종 code_rotated/auto_expired 는 서버 내부 전용)
- **Fail 기준**: PII 필드 1개라도 이메일 props 포함 또는 UI 에 시스템 사유 노출 시 FAIL

#### A-17 — Cron D+7 auto_expired (P0, Integration) **[핫스팟]**
- **TC-A17-I1**: 시드 `link_pending_d8` (requestedAt = now - 8d) 존재 + valid `CRON_SECRET` 헤더 → `GET /api/cron/expire-pending-links` → 200, link.status=rejected, rejectedReason=auto_expired
- **TC-A17-I2**: **Idempotency** — 동일 호출 2회 연속 (Cron 재시도 시뮬) → 두 번째 응답 `expired:0` (이미 처리된 pending 없음). 이메일 dispatchOnce key 중복 방지 → Resend mock 에 동일 key 이메일 1건만.
- **TC-A17-I3**: `Authorization` 헤더 없거나 wrong secret → 401
- **TC-A17-I4**: `link_pending_d6` (7일 미도달) 는 status 변화 없음
- **TC-A17-I5**: teacher summary 이메일 — 해당 classroom 의 교사에게 `teacher-summary-d7` 1통 (N 건 집계)
- **Expected**: 멱등성 보장 + 경계값 정확 + 이메일 1통/교사
- **Fail 기준**: 재시도 시 이메일 중복 발송 또는 경계일 오류 시 FAIL (핫스팟)

#### A-18 — Cron D+3 reminder (P1, Integration)
- **TC-A18-I1**: `link_pending_d3` (requestedAt = now - 3d) 시드 → Cron 실행 → `teacher-reminder-d3` 이메일 1통
- **TC-A18-I2**: 동일 Cron 동일 날짜 재호출 → idempotency key `reminder_d3_{classroomId}_{YYYYMMDD}` 중복 감지 → 0통
- **Expected**: D+3 경계 정확 + 하루 1회
- **Fail 기준**: 경계 이전/이후 발송 또는 중복 발송 시 FAIL

#### A-19 — Cron D+6 warning (P1, Integration)
- **TC-A19-I1**: `link_pending_d6` (requestedAt = now - 6d) 시드 → Cron → `teacher-warning-d6` 1통
- **TC-A19-I2**: idempotency 동일 검증
- **Expected**: D+3 과 동일 패턴

#### A-20 — D+N 배지 색상 (P2, Unit+E2E)
- **TC-A20-U1**: `computeDNBadgeColor(0)` → `"gray"`, `(2)` → `"gray"`, `(3)` → `"yellow"`, `(5)` → `"yellow"`, `(6)` → `"red"`, `(7)` → `"red"`
- **TC-A20-E1**: Playwright — 승인 인박스 `/classroom/[id]/parent-access` 에 D+0, D+3, D+6 시드 렌더 → 배경 색상 클래스 `bg-gray-*`/`bg-yellow-*`/`bg-red-*` 각각 검출
- **Expected**: 경계값(3, 6) 정확
- **Fail 기준**: 경계값 오분류 시 FAIL

#### A-21 — 이메일 재신청 deep link (P1, Integration)
- **TC-A21-I1**: 3종 거부 이메일 + auto-expired + code-rotated + classroom-deleted 각 템플릿의 Resend mock props 에 `retryUrl` 존재 + `https://{host}/parent/onboard/match/code` 로 시작
- **Expected**: 6종 이메일 전부 deep link 포함
- **Fail 기준**: 1종이라도 누락 시 FAIL

#### A-22 — 매직링크 15m + 세션 7d TTL (P2, Integration)
- **TC-A22-I1**: 매직링크 발급 후 15m+1s 경과 → verify 시 401
- **TC-A22-I2**: ParentSession 쿠키 `maxAge` 7d
- **Expected**: v1 파라미터 변경 없음

### 5.4 AMENDMENT cascade (A-23 ~ A-25) — 핫스팟

#### A-23 — Classroom 삭제 모달 확인 (P1, Integration+E2E)
- **TC-A23-E1**: 교사 UI 에서 삭제 버튼 → 모달 표시 + "학부모 N명 액세스 해제" 문구 + 학급명 재입력 input
- **TC-A23-E2**: 다른 이름 입력 → 확인 버튼 disabled
- **TC-A23-E3**: 정확한 이름 입력 → 활성화 → 클릭 → `DELETE /api/classrooms/{id}` body `{confirmName: "..."}`
- **TC-A23-I1**: API 가 `confirmName` 불일치 시 `400 CONFIRM_MISMATCH`
- **Expected**: 서버+클라이언트 양쪽 검증
- **Fail 기준**: 서버 검증 없으면 FAIL

#### A-24 — Classroom 삭제 cascade revoke (P0, Integration+E2E)
- **TC-A24-I1**: classroom_A1 에 active 3 + pending 2 링크 존재 상태에서 `DELETE /api/classrooms/A1` 유효 confirmName → 200, 5건 모두 status=revoked, revokedReason=classroom_deleted
- **TC-A24-I2**: 해당 parent 로 `GET /api/parent/children/{studentId}` 즉시 (다음 요청) → 401 (scopeMiddleware)
- **TC-A24-I3**: **트랜잭션 원자성** — 중간 raise 시 Classroom 과 ParentChildLink 변경 둘 다 rollback
- **TC-A24-E1**: Playwright — 학부모가 active 홈 화면 접속 중 → 교사가 삭제 → 학부모 다음 네비게이션에서 401 또는 /onboard 리다이렉트
- **Expected**: 즉시 revoke + 다음 요청부터 차단 + 트랜잭션 원자성
- **Fail 기준**: 원자성 위반 또는 revoke 후 접근 허용 시 FAIL (핫스팟)

#### A-25 — cascade 이메일 교사 PII 미노출 (P0, Integration)
- **TC-A25-I1**: cascade 후 Resend mock `parent-classroom-deleted` 이메일 props schema — `classroomName` 만, `teacherName`/`teacherEmail`/`teacherPhone`/`rejectedReason` 필드 미존재
- **TC-A25-U1**: TypeScript 타입 — `src/emails/parent-classroom-deleted.tsx` props 에 교사 관련 필드 허용 안 됨 (compile 시점 체크)
- **Expected**: 타입+런타임 양쪽 교사 PII 차단
- **Fail 기준**: 1건이라도 노출 시 FAIL

### 5.5 v1 마이그레이션 (A-26 ~ A-28)

#### A-26 — Path A migration 로그 (P1, Integration)
- **TC-A26-I1**: phase10 배포 시점에 `phase10/migration_log.md` 파일 존재 + `migrate deploy` exit 0 로그 + `v1 DROP rows:0` 명시
- **Expected**: 문서화된 마이그 로그
- **Fail 기준**: 로그 누락 시 phase10 재실행

#### A-27 — v1 endpoint 410 Gone (P1, Integration)
- **TC-A27-I1**: `POST /api/students/{id}/parent-invites` → 410
- **TC-A27-I2**: `DELETE /api/parent-invites/{id}` → 410
- **TC-A27-I3**: `POST /api/parent/redeem-code` → 410 + body hint `"v2 /api/parent/match/code 사용"` 포함
- **Expected**: 3종 모두 410

#### A-28 — ParentInviteButton 제거 (P1, Integration+E2E)
- **TC-A28-I1**: `grep -r "ParentInviteButton" src/` → 0 건 (빌드 스크립트로 검증)
- **TC-A28-E1**: Playwright — 교사가 `/classroom/{id}` 학생 카드 드롭다운 열기 → `"학부모 초대"` 메뉴 아이템 미존재 (DOM `text=` 조회 실패 확인)
- **Expected**: 코드+UI 양쪽 제거

### 5.6 성능·접근성 (A-29)

#### A-29 — 명단 ≤ 200KB + TTI < 2s (P2, Integration+E2E)
- **TC-A29-I1**: classroom_A2 (200명) `GET /api/parent/match/students` 응답 content-length ≤ 200,000 bytes (압축 전)
- **TC-A29-E1**: Chrome DevTools emulation (갤럭시 탭 S6 Lite viewport 1200×2000, CPU 4x slowdown, Slow 4G network) `/parent/onboard/match/select?ticket=...` TTI < 2s. 실기기 측정 불요 (decisions.md #4).
- **Expected**: emulation 프로파일 기준 TTI 2s 미만
- **Fail 기준**: TTI 2s+ 또는 payload 200KB 초과 시 WARN(P2, 배포 차단 아님 but 문서화)

---

## 6. 핫스팟 집중 전략

### 6.1 미들웨어 우회 (A-14) — 보안 P0
- Unit: ESLint plugin 단독 실행 — `npm run lint` 에서 positive + negative 각 1건
- Integration: 4 조합 (auth only path × auth only session, auth only path × no session, scope path × pending session, scope path × active session) 전부 커버
- E2E: pending 브라우저로 `/parent/(authed-active)/home` 직접 URL 접근 → 자동 리다이렉트 `/onboard/pending` 또는 401
- **추가 강제**: phase7 코더가 `src/app/api/parent/children/**` 디렉토리 추가 시 ESLint 가 빌드 차단

### 6.2 Cron idempotency (A-17~A-19) — 운영 P0
- Integration 에서 Cron 핸들러 직접 호출 2회 연속 시뮬 → 2번째 실행 시 이메일 mock 큐 크기 변화 0
- `dispatchOnce(key)` 헬퍼 단위 테스트 — key 재사용 시 `false` 반환
- Cron 실행 중 중단(process.kill 시뮬) 시뮬은 OUT — Vercel 자동 retry + idempotency 로 완화 (architecture.md §7.2)
- **Fail 시 phase10 차단**: idempotency 깨지면 이중 이메일 → P0 incident 리스크

### 6.3 ~~마스킹 edge case (A-12)~~ — **제거** (decisions.md #1)

A-12 자체가 삭제되어 핫스팟 아님. 응답에서 민감 필드(`full_name`/`phone`/`address`/`birthdate`/`photo`) 미노출은 phase7 coder 의 schema 설계 원칙으로 흡수.

### 6.4 Classroom cascade 원자성 (A-24) — 데이터 무결성 P0
- Prisma `$transaction` 내부 중간 `throw new Error()` 주입 시뮬 → Classroom, ParentChildLink, BoardMember 모두 원복 확인
- after-commit 이메일은 트랜잭션 외부 → 트랜잭션 rollback 시 이메일 미발송 확인

### 6.5 코드 회전 race (A-10 + edge §10.4)
- 2 parent 브라우저가 동시에 `match/code` 시도 + 교사가 회전 → 하나는 old code, 하나는 new code
- **구현 강제 (decisions.md #3)**: phase7 coder 는 Prisma `$queryRaw` 로 명시적 `SELECT ... FOR UPDATE` 구문 작성. `$transaction` isolation 만으로 갈음 금지.
- **검증 방법**: integration test 가 쿼리 로그(`prisma.$on('query')`)에서 `FOR UPDATE` 문자열 존재 확인 → 부재 시 FAIL.

---

## 7. 테스트 실행 게이트

| 시점 | 실행 스위트 | 게이트 |
|---|---|---|
| phase7 coder 작업 중 | Unit (전체) | 로컬 PASS 필수 |
| phase8 code_reviewer 진입 | Unit + Integration (P0 전체, P1 전체) | REVIEW_OK.marker 전 PASS |
| phase9 QA 진입 | E2E 전체 (P0·P1 필수, P2 smoke) + Lighthouse | QA_OK.marker 전 PASS |
| phase10 deployer push 전 | `npm run build`, `npm run typecheck`, `npm run lint`, 모든 마커 유효 | push 검증 게이트 |

---

## 8. 사용자 검토 결정 로그 (2026-04-13 확정)

모두 `phase9_user_review/decisions.md` 에 상세.

1. **마스킹 전면 제거** — AC A-12 삭제, `src/lib/mask-name.ts` 생성 취소, 이름 원본 노출. 관련 test case U1~U10, I1~I2 삭제. (→ §2 P0 에서 "마스킹" 제거, §3.1 시드 edge case 축소, §5.2 A-12 블록 제거, §6.3 핫스팟 제거)
2. **ESLint rule 한 방향만** — children → authOnly import 금지만 강제. 양방향(signup 경로에 scopeMiddleware 차단) 미구현. (→ §5.2 TC-A14-U2 제외 표기)
3. **코드 회전 `FOR UPDATE` 명시 지시** — phase7 coder 계약서에 Prisma `$queryRaw` + `SELECT ... FOR UPDATE` 명시. Integration test 가 쿼리 로그에서 문자열 검증. (→ §6.5 구현 강제 표기)
4. **Lighthouse Chrome DevTools emulation 확정** — 실기기 측정 불요. CPU 4x + Slow 4G throttling. (→ §5.6 TC-A29-E1 실기기 라인 제거)

---

## 9. phase5 입력 준비도

본 phase 는 사용자 커스텀 오버로드로 design_planner 슬롯을 test_planner 로 사용. **표준 파이프라인의 design_planner 산출물(`design_brief.md`) 은 본 task 에서 생략** 되며, phase5 (designer) 는 architecture.md §3~§4 (라우트 트리, 컴포넌트 분할) 를 직접 입력으로 사용해야 함.

design 관련 UI 요구사항 요약 (phase5 참조용 — 완전한 design_brief 는 아님):
- 교사 `/classroom/[id]/parent-access`: 3-섹션 탭 (초대 코드 / 승인 인박스 / 연결된 학부모)
- 학부모 온보딩 5 페이지: signup → verify → match/code → match/select → pending/rejected
- D+N 배지 (A-20): 회색/노랑/빨강 3 상태
- Classroom 삭제 모달 (A-23): 학급명 재입력 확인
- 접근성: WCAG 2.1 AA (본 문서 스코프 외, phase5 에서 구체화)

**phase5 진입 가능**. 단, **design_brief 공백** 이 사용자 결정사항 — 필요 시 별도 phase 실행 요청 필요.

---

## 10. 검증 게이트 self-pass

- [x] 28 AC 전부 매트릭스 cover (§4, A-12 제거 반영) — 5 Unit primary + 22 Integration primary + 6 E2E primary
- [x] unit/integration/E2E 분류 명시 (§4 표, §5 상세)
- [x] 핫스팟 별도 강조 (§6) — 미들웨어 우회 A-14, Cron idempotency A-17~A-19, cascade 원자성 A-24, 코드 회전 race
- [x] 통과 기준 (Expected / Fail 기준) 각 케이스 작성
- [x] 픽스처 의존성 (§3) — `tests/fixtures/parent-class-invite.ts` 신규 (phase7 작성)
- [x] 외부 모킹 (Resend) 정의
- [x] 우선순위 (P0/P1/P2) 분포 명시
- [x] Karpathy 4원칙 적용 로그 (§0)
- [x] task_id / slug 일관
- [x] TODO/TBD/placeholder 부재 (USER-REVIEW 4건 → 결정 완료, §8 로그 참조)
- [x] owner/editor/viewer mock 의존 없음 (teacher/student/parent 만 사용)
- [x] 이름 노출 정책 일관 (원본 표시, 마스킹 없음)

**판정: PASS** — phase5 진입 가능. §8 결정 4건 모두 확정됨.
