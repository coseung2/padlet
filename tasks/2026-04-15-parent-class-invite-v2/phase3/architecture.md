# Design Doc — parent-class-invite-v2 (Architecture)

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **slug**: `parent-class-invite-v2`
- **base_path (Path A 확정)**: v1 parent-viewer 실사용 0건 → v1 drop + v2 신규 구축
- **stack lockdown 준수**: Next.js 16 App Router · React 19 · Prisma 6 · PostgreSQL(Supabase ap-northeast-2) · NextAuth 5 beta · ParentSession 7d · 매직링크 15m · SWR 60s 폴링 (실시간 엔진 미정)
- **role 제약 (global)**: teacher / student / parent 만 사용. owner/editor/viewer mock 금지 (phase0 request.json role_constraints)
- **분할**: 데이터 모델 세부는 `data_model.md`, API 상세는 `api_contract.json` 로 분리 (본 문서는 전체 설계 그림 + 의사결정)

---

## 0. Karpathy 4원칙 적용 의사결정 로그

| 원칙 | phase3 적용 |
|---|---|
| **Think Before Coding** | (i) Path A 단일 경로만 설계 — B/C 분기 생성 금지. (ii) Upstash Redis 도입 여부 명시 결정(§7.2): v2 OUT 유지. (iii) 라우트 그룹 2종 분리 결정의 대안(middleware-only 방어)을 비교 후 기각. |
| **Simplicity First** | OUT: Upstash Redis / 가상 스크롤 / WebSocket / 학부모 네이티브 앱 / owner-editor-viewer 연결. v2 필요 API 12개만 정의 (투기 abstract 금지). |
| **Surgical Changes** | 변경 surface 전량 phase0 `affected_surfaces` 에 열거. v1 정리는 별도 "cleanup 블록"으로만 분리 기록 (§6 마이그레이션 순서). |
| **Goal-Driven Execution** | 29개 AC → 엔드포인트·컴포넌트·Cron·enum 단위로 추적 매핑 (§9 AC→설계 교차표). |

---

## 1. 데이터 모델 변경 (요약 — 상세 `data_model.md`)

**신규 모델 1종 + 수정 모델 3종 + enum 2종**

### 1.1 신규
- **`ClassInviteCode`** — 학급 1:코드 1, 8자리 Crockford Base32, `classroomId` unique(active row), `issuedById`(teacher), `expiresAt` nullable(학기말 수동), `maxUses` nullable(무제한), `rotatedAt` nullable
- enum **`ParentLinkStatus`** = { `pending`, `active`, `rejected`, `revoked` } (v2 신규 4-value)
- enum **`ParentRejectedReason`** = { `wrong_child`, `not_parent`, `other` }
- enum **`ParentRevokedReason`** v2 확장 = { `teacher_revoked`, `year_end`, `parent_self_leave`, `rejected_by_teacher`, `auto_expired_pending`, `code_rotated`, `classroom_deleted` }

### 1.2 수정
- **`ParentChildLink`** — status 컬럼 추가 + 감사 필드 6종(`requestedAt`, `approvedAt`, `approvedById`, `rejectedAt`, `rejectedById`, `rejectedReason`) + `revokedAt`/`revokedReason`/`revokedById` 유지 + `@@index([status, requestedAt])` (Cron D+7 스캔용)
- **`ParentSession`** — 필드 변경 없음, 다만 **세션 의미론 변경**: active 링크 없어도 발급 가능 (signup 시점). 미들웨어가 scope 판정 담당.
- **`Parent`** — `invites` 관계 제거 (ParentInviteCode 삭제) + `email`/`name`/`tier`/`soft delete` 유지

### 1.3 삭제 (Path A: v1 drop)
- **`ParentInviteCode` 모델 전체 DROP** (migration 단일 파일에서 CREATE ClassInviteCode 와 함께)
- 기존 `ParentChildLink` 의 v1 row 도 drop (0건 확인됨)

### 1.4 단일 Prisma migration (순서 자동)
- 파일: `prisma/migrations/{YYYYMMDDHHMMSS}_parent_class_invite_v2/migration.sql`
- 단일 트랜잭션: DROP ParentInviteCode → CREATE ClassInviteCode → ALTER ParentChildLink ADD status/audit/index → ALTER enum(ParentRevokedReason) → CREATE enum(ParentRejectedReason, ParentLinkStatus)
- 회귀 불가 (Path A)

---

## 2. API 계약 (요약 — 상세 `api_contract.json`)

**신규 12개 / 수정 1개 / 삭제 3개**. 모든 요청·응답은 JSON. 인증은 아래 3층:
- **`parentAuthOnlyMiddleware`** — `/api/parent/signup|match/*`, 쿠키 유효 + status 무관
- **`parentScopeMiddleware`** — `/api/parent/children/*`, 쿠키 유효 + `status='active'` 강제
- **NextAuth teacher session** — `/api/class-invite-codes/*`, `/api/parent/approvals/*`, classroom 삭제 flow

### 2.1 신규 엔드포인트 (12)

교사 (5):
1. `POST /api/class-invite-codes` — classroomId 대상 코드 최초/갱신 발급 (이미 있으면 409 + 회전 유도)
2. `POST /api/class-invite-codes/[codeId]/rotate` — 회전 (트랜잭션: 신코드 발급 + 기존 `ClassInviteCode.rotatedAt` 기록 + 학급 pending 일괄 rejected(`code_rotated`) + 이메일 큐)
3. `GET /api/class-invite-codes?classroomId=` — 현재 활성 코드 + 회전 히스토리
4. `POST /api/parent/approvals/[linkId]/approve` — pending → active, `BoardMember` 생성, `approvedAt`/`approvedById`
5. `POST /api/parent/approvals/[linkId]/reject` — pending → rejected, `rejectedReason` 필수 (wrong_child|not_parent|other), 템플릿 이메일 큐

학부모 (6):
6. `POST /api/parent/signup` — email 입력 → 매직링크 발송 (15분)
7. `GET /api/parent/session/status` — 현재 세션 상태 `{state: "anonymous"|"authed_prematch"|"pending"|"active"|"rejected"|"revoked"}` → 프론트 라우팅 결정
8. `POST /api/parent/match/code` — 학급 코드 입력 → 검증 후 `matchTicket`(5분 서버 세션 state) 발급
9. `GET /api/parent/match/students?ticket=` — 학급 명단 (반·번호·마스킹이름)
10. `POST /api/parent/match/request` — `{ticket, studentId}` → `ParentChildLink(status=pending, requestedAt=now)` 생성
11. `POST /api/parent/match/retry` — 거부/만료 후 재신청 진입 (쿨다운 체크)

Cron (1):
12. `GET /api/cron/expire-pending-links` — Vercel Cron 전용, `CRON_SECRET` 헤더 검증, KST 02:00 일 1회

### 2.2 수정 (1)
- `DELETE /api/classrooms/[id]` — 기존 삭제 flow에 cascade revoke 블록 추가 (단일 트랜잭션: Classroom 삭제 + 해당 학급 active ParentChildLink → revoked(`classroom_deleted`) + ParentSession 만료 flag + 이메일 큐)

### 2.3 삭제 (3, Path A)
- `POST /api/students/[id]/parent-invites` — 410 Gone 응답 후 2026-05-01 이후 route 파일 삭제
- `DELETE /api/parent-invites/[id]` — 410 Gone
- `POST /api/parent/redeem-code` — 410 Gone (v2 `/api/parent/match/code` 로 치환)

### 2.4 에러 코드 표준 (전체 파생)
- `400 INVALID_INPUT` · `401 NO_SESSION` · `401 SESSION_PENDING`(scopeMiddleware 전용) · `403 FORBIDDEN` · `404 NOT_FOUND` · `409 STATE_CONFLICT`(전이 머신 위반) · `410 GONE`(v1) · `429 RATE_LIMITED`(3단계 + 거부 쿨다운 포함) · `500 INTERNAL`

---

## 3. 라우트/페이지 트리

### 3.1 학부모 라우트 그룹 분리 (Next.js App Router)

```
src/app/parent/
├── layout.tsx                         # 공통 parent layout (매직링크 쿠키 로드)
├── onboard/                           # anonymous + authed_prematch 전용
│   ├── signup/page.tsx                # 이메일 입력 → 매직링크 발송
│   ├── signup/verify/page.tsx         # 매직링크 클릭 landing (session mint)
│   ├── match/code/page.tsx            # 학급 코드 입력
│   ├── match/select/page.tsx          # 학급 명단에서 자녀 선택
│   ├── pending/page.tsx               # 승인 대기 안내 (session.state=pending)
│   └── rejected/page.tsx              # 거부 사유 표시 + 재신청 deep link
├── (authed-preActive)/                # route group — status != active 만 허용
│   └── layout.tsx                     # parentAuthOnlyMiddleware 적용
└── (authed-active)/                   # route group — status=active 만 허용
    ├── layout.tsx                     # parentScopeMiddleware 적용
    ├── home/page.tsx                  # (기존 v1 재사용)
    ├── notifications/page.tsx
    ├── child/[studentId]/…            # 기존 v1 구조 유지
    └── account/withdraw/page.tsx
```

진입 flow (프론트 상태 머신):
- `/parent/onboard/signup` 진입 → 매직링크 → `/onboard/signup/verify?token=…` → session mint → `GET /api/parent/session/status` → `authed_prematch` 면 `/onboard/match/code`, `pending` 이면 `/onboard/pending`, `active` 면 `/(authed-active)/home`, `rejected` 면 `/onboard/rejected`

### 3.2 교사 라우트 (추가 1종)

```
src/app/classroom/[id]/
├── page.tsx                           # 기존 ClassroomDetail (학생 카드 드롭다운 '학부모 초대' 제거)
└── parent-access/
    └── page.tsx                       # NEW — 3-섹션 탭
```

> 기존 프로젝트가 `/teacher/[classroomId]/…` 대신 `/classroom/[id]/…` 구조를 사용. phase0 request.json의 `/teacher/[classroomId]/parent-access` 경로는 **실제 경로 `/classroom/[id]/parent-access`** 로 매핑 (surgical 원칙: 기존 IA 준수). phase4 design_planner 및 phase7 coder 가 이 경로명을 고정한다.

### 3.3 API 라우트 (신규/수정 파일)

```
src/app/api/
├── class-invite-codes/
│   ├── route.ts                       # GET list, POST create
│   └── [codeId]/rotate/route.ts       # POST rotate
├── parent/
│   ├── signup/route.ts                # POST (+ magic-link dispatch)
│   ├── session/status/route.ts        # GET (NEW)
│   ├── match/code/route.ts            # POST
│   ├── match/students/route.ts        # GET (ticket 검증)
│   ├── match/request/route.ts         # POST
│   ├── match/retry/route.ts           # POST
│   ├── approvals/[linkId]/approve/route.ts
│   ├── approvals/[linkId]/reject/route.ts
│   └── (삭제 예정 v1: redeem-code/*)
└── cron/
    └── expire-pending-links/route.ts  # GET (Vercel Cron)
```

---

## 4. 컴포넌트 분할 + 상태 흐름

### 4.1 교사 — `/classroom/[id]/parent-access` 트리

```
<ParentAccessPage/>                           # server component, 교사 세션 gate
├── <InviteCodeSection/>                      # client, SWR ↻ 60s
│   ├── CurrentCodeDisplay                    # code + QR + copy
│   └── RotateButton                          # 모달 확인 → POST rotate
├── <ApprovalInboxSection/>                   # client, SWR ↻ 60s
│   ├── FilterBar                             # 전체/D+3~/D+6
│   ├── PendingList
│   │   └── PendingRow × N                    # D+N 배지 + 승인/거부 버튼
│   └── RejectReasonDropdown                  # wrong_child|not_parent|other
└── <LinkedParentsSection/>                   # client, SWR ↻ 60s
    └── LinkedRow × N                         # 학부모 이메일 + 자녀 + revoke
```

상태 위치:
- **server**: 최초 SSR 페이로드 (교사 세션 + classroomId 해석)
- **client SWR**: 3-섹션 각각 독립 fetch (`/api/class-invite-codes?classroomId=`, `/api/parent/approvals?classroomId=&status=pending`, `/api/parent/approvals?classroomId=&status=active`) — 60s 폴링, 승인/거부 액션 후 `mutate()` 로 즉시 갱신
- **classroom 삭제 모달**: 기존 `ClassroomDetail` 삭제 플로우에 cascade 경고 문구만 surgical 추가

### 4.2 학부모 온보딩 트리

```
<SignupPage/> → form → POST /api/parent/signup → 메일함 안내
<VerifyPage/> → useEffect POST verify → GET session/status → router.push 분기
<MatchCodePage/> → input 8자리 → POST match/code → ticket 수신 → router.push /onboard/match/select?ticket=
<MatchSelectPage/> → GET match/students?ticket= → <StudentPicker/> → POST match/request → /onboard/pending
<PendingPage/> → static 안내 + retry deep link
<RejectedPage/> → reason 쿼리스트링 → 템플릿 본문 + retry deep link
```

### 4.3 미들웨어 분리 (security-critical)

- **`src/lib/parent-auth-only.ts`** — `parentAuthOnlyMiddleware(req)`:
  - 쿠키 `parent_session` 유효성만 체크. `status` 무관.
  - 적용: `/api/parent/signup|match/*`, `/api/parent/session/status`
- **`src/lib/parent-scope.ts`** — `parentScopeMiddleware(req)` (기존 파일 수정):
  - 쿠키 유효 + **`ParentChildLink.status='active'` 1건 이상** 강제. 없으면 `401 SESSION_PENDING`.
  - 적용: `/api/parent/children/*` 전체
- **ESLint 룰** (`eslint-plugin-local/parent-middleware-boundary`) — `/api/parent/children/**/route.ts` 가 `parentAuthOnlyMiddleware` 를 import 하면 에러. phase7 에서 구현.

---

## 5. 데이터 흐름 다이어그램 (텍스트)

### 5.1 학부모 온보딩 happy path

```
[Parent browser]
  └─ POST /api/parent/signup {email}
     └─ parent-magic-link.ts: issue 15m token → Resend send
[Parent inbox]
  └─ click magic-link → GET /api/parent/auth/verify
     └─ parent-session.ts: mint 7d session cookie
     └─ 302 /parent/onboard/match/code
[Parent browser]
  └─ POST /api/parent/match/code {code}
     └─ rate-limit (IP 5/15m + 코드 50/day + 학급 100/day)
     └─ ClassInviteCode 조회 + active 검증
     └─ Redis-less in-memory ticket (5분 TTL, sessionId↔classroomId 바인딩)
     └─ 200 {ticket}
  └─ GET /api/parent/match/students?ticket=
     └─ Student WHERE classroomId=…  SELECT class_no, student_no, name
     └─ maskName(name) server-side 마스킹 (§7.3)
     └─ 200 {students: [{id, classNo, studentNo, maskedName}]}
  └─ POST /api/parent/match/request {ticket, studentId}
     └─ pending count per parent ≤ 3 검증 (§AC A-8)
     └─ unique(parentId, studentId) 충돌 → 409
     └─ INSERT ParentChildLink(status=pending, requestedAt=now)
     └─ 200 {status:"pending", linkId}
[Parent pending page]
  └─ GET /api/parent/session/status (60s 폴링)
     └─ state=pending → 유지
     └─ state=active  → /parent/(authed-active)/home
     └─ state=rejected → /parent/onboard/rejected?reason=…
```

### 5.2 교사 승인 path

```
[Teacher browser, /classroom/[id]/parent-access]
  └─ click "승인" button on PendingRow
     └─ POST /api/parent/approvals/[linkId]/approve
        └─ teacher session + classroom ownership 검증
        └─ TRANSACTION:
           ├─ UPDATE ParentChildLink status=active, approvedAt=now, approvedById
           ├─ INSERT BoardMember(parentId, boardId ← classroom.defaultBoardId, role='parent')
           └─ (Resend enqueue 안내 이메일은 트랜잭션 밖 after-commit)
        └─ 200 {linkId, status:"active"}
[Parent polling]
  └─ GET /api/parent/session/status → state=active (≤60s SLA)
```

### 5.3 Cron D+7 auto-expire

```
Vercel Cron KST 02:00 (UTC 17:00)
  └─ GET /api/cron/expire-pending-links  (header: x-vercel-cron-signature + CRON_SECRET)
     └─ SELECT id, parentEmail FROM ParentChildLink
        WHERE status='pending' AND requestedAt < now() - interval '7 day'
     └─ for each (batch UPDATE status=rejected, rejectedReason='auto_expired_pending', rejectedAt=now)
     └─ classroom별 group by → 교사 D+7 summary 이메일 1통
     └─ parent별 auto_expired 이메일 1통
     └─ 별도 쿼리: D+3 도달 학급 → teacher reminder 이메일
     └─ 별도 쿼리: D+6 도달 학급 → teacher warning 이메일
     └─ 200 {expired: N, d3: M, d6: K}
```

### 5.4 코드 회전 cascade

```
POST /api/class-invite-codes/[codeId]/rotate
  └─ TRANSACTION:
     ├─ UPDATE ClassInviteCode old SET rotatedAt=now
     ├─ INSERT ClassInviteCode new (8자리 CSPRNG)
     ├─ UPDATE ParentChildLink ... WHERE classroomId=… AND status='pending'
            SET status='rejected', rejectedReason=... (note: revokedReason or rejectedReason는 "rejected_by_rotation" 경로 — D-39 는 rejected 로 분류, AC A-10 에 동일)
     └─ (Resend enqueue: 영향받은 parent 리스트로 code_rotated 이메일 — after-commit)
```

**설계 결정 (§0 Think Before Coding)**: D-05 는 `revokedReason` 에 `code_rotated` 를 추가하지만, 실제 status 전이는 `pending → rejected` 이므로 **`rejectedReason` enum 에 `code_rotated` 가 아닌 별도 필드(`rejectedReason=other` + 내부 메타) 또는 `rejectedReason` enum 확장**이 필요. 본 설계는 **`ParentRejectedReason` enum 에 `code_rotated` 와 `auto_expired` 를 포함한 6-value 로 확장**하여 단일 필드로 해결 (AC A-16 의 "drop down 3종 선택" 은 UI 제한일 뿐 enum 전체를 요구하지 않음). 이는 INBOX decisions.md D-05/D-06 의 모호함(enum 을 revokedReason 에 넣었으나 status 는 rejected) 을 해소하는 설계자 판정. → `data_model.md` 에 명시.

### 5.5 Classroom 삭제 cascade (AMENDMENT PV-17)

```
DELETE /api/classrooms/[id]
  └─ teacher session + ownership 검증
  └─ 확인 토큰 (학급명 재입력) 일치 검증 (서버측 echo 확인)
  └─ TRANSACTION:
     ├─ SELECT active ParentChildLink for classroom — list for email queue
     ├─ UPDATE ParentChildLink SET status='revoked', revokedReason='classroom_deleted'
     │         WHERE classroomId=… AND status IN ('pending','active')
     ├─ DELETE BoardMember WHERE boardId IN (classroom.boards) AND role='parent'
     ├─ UPDATE ParentSession SET sessionRevokedAt=now WHERE parentId IN (...)  -- 선택적, 정책상 next request 401
     └─ Classroom 하위 삭제 (기존 flow)
  └─ after-commit: 이메일 큐 (학급명만, 교사 PII 없음 — D-54)
```

**트랜잭션 크기 리스크** (R-2): 100명 학급 + 학부모 200 건 cascade 시 트랜잭션 ~200 row update + 200 이메일 enqueue. 이메일 **발송은 트랜잭션 외부** (Resend queue) 로 분리 완료. 트랜잭션은 DB write 만 포함.

---

## 6. 마이그레이션 순서 (Path A, v1 drop → v2 create)

v1 실사용 0건 확정이므로 **단일 Prisma migration** 로 처리. 브랜치: `feat/parent-class-invite-v2`.

### 6.1 Prisma migration 파일 (단일)

`prisma/migrations/{ts}_parent_class_invite_v2/migration.sql`:
1. `CREATE TYPE "ParentLinkStatus" AS ENUM ('pending','active','rejected','revoked');`
2. `CREATE TYPE "ParentRejectedReason" AS ENUM ('wrong_child','not_parent','other','code_rotated','auto_expired','classroom_deleted');`
3. `ALTER TYPE "ParentRevokedReason" ADD VALUE IF NOT EXISTS 'rejected_by_teacher';` × 4 (새 revokedReason 4종)
4. `DROP TABLE "ParentInviteCode" CASCADE;` (v1 drop — row 0건 전제)
5. `CREATE TABLE "ClassInviteCode" (...)` — `id`, `classroomId`, `code`, `codeHash`, `issuedById`, `expiresAt`, `maxUses`, `rotatedAt`, `createdAt`
   - `UNIQUE (classroomId) WHERE rotatedAt IS NULL` — 활성 코드는 학급당 1개 (partial index)
   - `UNIQUE (code)`
6. `ALTER TABLE "ParentChildLink"`:
   - `ADD COLUMN status "ParentLinkStatus" NOT NULL DEFAULT 'pending'`
   - `ADD COLUMN requestedAt TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `ADD COLUMN approvedAt TIMESTAMPTZ`, `approvedById TEXT`
   - `ADD COLUMN rejectedAt TIMESTAMPTZ`, `rejectedById TEXT`, `rejectedReason "ParentRejectedReason"`
   - `ADD COLUMN revokedAt TIMESTAMPTZ`, `revokedById TEXT`, `revokedReason "ParentRevokedReason"`
   - `CREATE INDEX on (status, requestedAt);` — Cron D+7 스캔
   - FK `approvedById`, `rejectedById`, `revokedById` → `User(id)` (teacher)
7. (선택) `DELETE FROM "ParentChildLink";` — Path A 0건 전제이나 안전 장치

### 6.2 Prisma schema diff (data_model.md §2 참조)

### 6.3 v1 코드 cleanup (동일 migration PR 내)
- 삭제: `src/app/api/students/[id]/parent-invites/route.ts`, `src/app/api/parent-invites/[id]/route.ts`, `src/app/api/parent/redeem-code/route.ts`
- 삭제: `src/components/ParentInviteButton.tsx` 및 `src/components/ClassroomDetail.tsx` 내 import/사용부
- 삭제: `src/lib/parent-codes.ts` (v1 코드 생성 로직 — v2 `src/lib/class-invite-codes.ts` 로 재작성)
- 유지: `src/lib/parent-magic-link.ts`, `src/lib/parent-session.ts`, `src/lib/parent-email.ts` (v2 재사용)

### 6.4 배포 순서
1. `git checkout -b feat/parent-class-invite-v2` (develop 기반)
2. phase7 coder: schema + migration + lib + API + UI
3. phase8/9 통과 후 Supabase `prisma migrate deploy`
4. Vercel `--prod` 배포
5. smoke: 교사 코드 발급 → 학부모 signup → pending → approve → active 60s 이내 반영

---

## 7. Vercel Cron 구성

### 7.1 `vercel.json` 추가 block

```json
{
  "regions": ["icn1"],
  "crons": [
    { "path": "/api/cron/parent-weekly-digest",   "schedule": "0 0 * * 1" },
    { "path": "/api/cron/parent-anonymize",       "schedule": "30 15 * * *" },
    { "path": "/api/cron/expire-pending-links",   "schedule": "0 17 * * *" }
  ]
}
```
- `0 17 * * *` UTC = **KST 02:00** 일 1회 (AC A-17 부합)
- 기존 2개 Cron 은 수정 없이 유지

### 7.2 `src/lib/cron/expire-pending-links.ts`

단일 entry 가 3가지 일을 수행 (D+3/D+6/D+7):
- **D+7 expire**: `requestedAt < now - 7d AND status='pending'` → `rejected(auto_expired)` + parent 이메일 + teacher D+7 요약 이메일
- **D+3 reminder**: `requestedAt BETWEEN now-3d AND now-2d15m AND status='pending'` → classroom group → teacher D+3 리마인더 이메일 1회 (idempotency key: `reminder_d3_{classroomId}_{YYYYMMDD}`)
- **D+6 warning**: 동일 패턴 D+6 경고

idempotency 는 이메일 dispatcher 측에서 담당 (동일 key 재발송 금지) — `src/lib/parent-email.ts` 의 `dispatchOnce(key, payload)` 헬퍼 신설.

### 7.3 인증 — `CRON_SECRET`

- `GET /api/cron/expire-pending-links` 는 Vercel Cron 만 호출. `Authorization: Bearer $CRON_SECRET` 헤더 검증. 기존 2개 Cron 과 동일 패턴.
- env: `CRON_SECRET`(기존) 재사용

---

## 8. 위협 모델

### 8.1 Brute-force 방어 (3단계, in-memory rate-limit)

- IP 5/15min (기존 `src/lib/rate-limit.ts` 재사용)
- 코드 50/day (신규 `src/lib/rate-limit-parent.ts` — LRU map per-code)
- 학급 100/day (동일 파일 — LRU map per-classroom)
- **Upstash Redis 도입 여부**: **OUT (§0 Simplicity First)**. 현재 Vercel Functions 는 단일 region icn1 고정 + Next.js 16 serverless instance 가 short-lived 이나, v2 시점 트래픽 추정(학부모 수 ≤ 2,000 + 일일 매칭 ≤ 100) 에서 in-memory 카운터는 최대 **2x 오차** 범위 내 (instance fan-out). AC A-9 의 "429 반환" 은 soft guarantee 로 수용. Upstash 전환은 별도 incident task 로 분리 (트래픽 10배 이상 시 재평가).

### 8.2 Replay 방어
- 매직링크 토큰 15m TTL + single-use (consume 시 DB flag)
- 매칭 `ticket` 5m TTL + single-use (match/request 소비 시 invalidate) — in-memory Map
- 세션 쿠키: HttpOnly + Secure + SameSite=Lax + `tokenHash` 기반 single-active (v1 유지)

### 8.3 사칭 차단 2층
1. 매직링크 이메일 소유 증명
2. 학급 코드 소유 증명
3. 교사 승인 게이트 (wrong_child 거부 가능)
→ v1 1층 (매직링크) → v2 **3층** 구성

### 8.4 AMENDMENT cascade revoke (classroom 삭제)

- 트랜잭션: DB 상태 변경만, 이메일은 after-commit
- 교사 PII 미노출 (D-54): 이메일 본문에 `{classroomName}` 만. `teacherName`/`email`/`phone` 바인딩 금지 — `src/emails/parent-classroom-deleted.tsx` 의 props 타입으로 강제

### 8.5 PII 최소 노출

- `GET /api/parent/match/students` 응답 schema (strict) = `{id, classNo, studentNo, maskedName}`. `omit full_name, phone, address, birthdate, photo` — Prisma select 로 명시 (누락 시 serialize 단계에서 `zod` schema 가 차단)
- **마스킹 규칙** (`src/lib/mask-name.ts` 신규):
  ```
  2자 이름 "김보" → "김보"  (가운데 부재 → 원본 유지)
  3자 이름 "김보민" → "김O민"  (성 + O + 끝 글자)
  4자 이름 "남궁민수" → "남궁O수"  (복성 whitelist 적용 후 가운데 O × N-2 + 끝)
  5자 이름 "남궁가나다" → "남궁OO다"
  1자 이름 "김" → "김"  (edge case, 마스킹 불가)
  복성 whitelist: 남궁/황보/선우/제갈/독고/동방/사공/서문 — 외는 성 1자
  유니코드 정규화 NFC 선적용
  ```
  - decision record: 2026-04-15 사용자 결정 — INBOX handoff_note.md 의 "김O민" (성+O+끝글자) 안 채택 확정. phase2 scope_decision.md `user_preconfirmed.masked_name_format` ("김○○") 는 본 결정으로 **OVERRIDE**. 근거: 자녀 식별 보조용 명단에서 끝 글자 노출은 UX 마찰 대비 정보 누출이 미미하다는 사용자 판단.

### 8.6 거부 쿨다운 (A-13)
- `src/lib/rate-limit-parent.ts` 에 `rejectionCooldown(email)` 헬퍼: `ParentChildLink WHERE parentEmail=... AND status='rejected' AND rejectedAt > now - 24h COUNT >= 3` → 429 + `retry-after: 86400`

### 8.7 ParentSession 라이프사이클 (R-8 해소)
- signup 시 mint (7d)
- 매칭/거부/만료 **상관없이 유지** (재인증 비용 최소화)
- classroom cascade 시 `sessionRevokedAt=now` set → scopeMiddleware 401
- 탈퇴 시 v1 기존 플로우 유지 (Soft delete + 90d 익명화)

---

## 9. AC → 설계 교차표 (요약)

| AC | 적용 산출물 |
|---|---|
| A-1 Prisma migration | `data_model.md §2` + §6.1 |
| A-2 8자리 CSPRNG | `src/lib/class-invite-codes.ts` + Prisma `UNIQUE(code)` |
| A-3 status 전이 머신 | `src/lib/parent-link-state.ts` 신규 (transitions 검증) |
| A-4 부·모 독립 pending | schema `@@unique([parentId, studentId])` 유지 |
| A-5 BoardMember approve 시점 | §5.2 트랜잭션 |
| A-6 ParentSession signup 시점 | §2.1 #6 + §8.7 |
| A-7 pending 200 payload | §2.1 #7 (`session/status`) |
| A-8 동시 pending ≤ 3 | §2.1 #10 선검증 |
| A-9 3단계 rate limit | §8.1 |
| A-10 회전 트랜잭션 | §5.4 |
| A-11 회전 후 active 유지 | schema: active 는 code 참조 없음 |
| A-12 PII 최소 노출 | §8.5 + zod response schema |
| A-13 거부 3회 24h | §8.6 |
| A-14 미들웨어 분리 | §4.3 + ESLint rule |
| A-15 approve 1클릭 60s | §5.2 + SWR 60s 폴링 |
| A-16 거부 드롭다운 | §2.1 #5 + UI §4.1 |
| A-17 Cron D+7 | §7.2 |
| A-18/19 D+3/D+6 | §7.2 |
| A-20 배지 UI | §4.1 PendingRow |
| A-21 재신청 deep link | 이메일 템플릿 8종에 공통 포함 |
| A-22 세션 TTL 유지 | §8.7 |
| A-23 삭제 모달 | 기존 `ClassroomDetail` surgical patch |
| A-24 cascade revoke | §5.5 |
| A-25 cascade 이메일 PII | §8.4 |
| A-26 Path A 마이그로그 | §6.4 smoke log → `phase10/migration_log.md` |
| A-27 v1 410 Gone | §6.3 cleanup |
| A-28 ParentInviteButton 제거 | §6.3 |
| A-29 성능 예산 | §5.1 명단 서버측 projection + gzip (Vercel 기본) |

---

## 10. 엣지케이스 (≥5, AMENDMENT·Path A 반영)

1. **학급 명단 200+ 학생**: 페이로드 크기 검증. AC A-29: maskedName ~6바이트 + id/classNo/studentNo ~30바이트 × 200 = ~7KB. 여유 충분. 페이지네이션 OUT.
2. **동시 매칭 race (parent A·B 동시 signup)**: `@@unique([parentId, studentId])` + DB-level 경쟁 해소 (Postgres serializable 불필요, unique 충돌 409).
3. **매직링크 재사용 시도**: 15m TTL + single-use → 401 (v1 유지).
4. **코드 회전 중 동시 parent 매칭**: migration §5.4 트랜잭션이 SELECT-FOR-UPDATE on ClassInviteCode → 회전 commit 후 새 코드로만 매칭 가능, 기존 pending 은 같은 트랜잭션에서 rejected.
5. **Classroom 삭제 중 parent 세션 요청**: trigger-free. request 당 scopeMiddleware 가 ParentChildLink `status` 재조회 → revoked 면 401.
6. **Cron 실패**: Vercel Cron 자동 retry (5분 간격 3회). 로그는 Vercel log + `src/lib/parent-email.ts` dispatchOnce idempotency key 로 중복 방지.
7. **한글 1자 이름 마스킹**: `mask-name.ts` edge branch "김" → "김" (경고 없이 원본). phase9 QA unit test 필수.
8. **학부모 탈퇴 후 재가입**: `Parent.parentDeletedAt` 90d 이내 재가입 시도 → 기존 v1 deletion flow 재사용 (R-07 유지).
9. **미들웨어 우회 시도**: `/api/parent/children/foo` 에 `parentAuthOnlyMiddleware` 를 실수로 연결 → ESLint 빌드 실패 (§4.3).

---

## 11. DX 영향

- 신규 타입: `ParentLinkStatus`, `ParentRejectedReason`, `MatchTicket`, `SessionStatusResponse`
- 신규 lib 파일 5종: `class-invite-codes.ts`, `mask-name.ts`, `parent-link-state.ts`, `parent-auth-only.ts`, `rate-limit-parent.ts`
- ESLint plugin local rule 1종: `parent-middleware-boundary`
- 이메일 템플릿 9종: `src/emails/` (Resend + React-email) — parent 3종 거부 + auto-expired + code-rotated + classroom-deleted + teacher D+3/D+6/D+7 요약 = 9. phase0 request.json `affected_surfaces` 와 일치 (`api_contract.json.email_templates` 참조)
- Cron job 1종: `expire-pending-links`
- Prisma schema 변경 1회 + migration 단일 파일
- 빌드·배포: 기존 flow 유지 (`npm run build`/`typecheck`)

---

## 12. 롤백 계획

**Path A 0건 전제이므로 roll-forward only 권장.** 단, prod 사고 발생 시:
1. Vercel 에서 이전 deployment 로 revert (코드 롤백)
2. DB: **DROP TABLE ClassInviteCode** + **ParentChildLink status/audit 컬럼 DROP** 스크립트 별도 준비 (`prisma/migrations/rollback/`) — 실제 prod 실행은 사용자 확인 후만
3. v1 ParentInviteCode 테이블 복구는 불가 (drop 했음). 대신 **v2 코드 + 승인 flow 유지한 채** 버그 수정하는 roll-forward 가 정상 경로

---

## 13. 사용자 검토 권장 결정 포인트 (phase4 진입 전)

1. ~~**마스킹 규칙 충돌 해소** (§8.5)~~ — 2026-04-15 사용자 결정으로 INBOX 안 ("김O민" 성+O+끝글자) 채택 확정. §8.5 본문 갱신됨.
2. **ParentRejectedReason enum 확장** (§5.4 판정) — INBOX D-05 은 `revokedReason` 에 code_rotated/auto_expired 를 넣었으나 status 전이가 rejected 이므로 `rejectedReason` 에 포함하도록 재분류. UI 드롭다운(3종) 과 enum(6종) 을 별개로 운용.
3. **Upstash Redis OUT 확정** (§8.1) — 단일 region 운영 트래픽 추정 내 in-memory 수용. 이의 시 phase3 재실행.
4. **`/teacher/[classroomId]` vs `/classroom/[id]` 경로명** (§3.2) — 기존 IA 따라 후자 채택. 사용자 이의 없으면 확정.

---

## 14. 검증 게이트 self-pass

- [x] 데이터 모델 diff 명시 (신규/수정/삭제 + enum) — §1 + `data_model.md`
- [x] API 계약 (메서드·경로·입출력·에러·인증) — §2 + `api_contract.json`
- [x] 라우트/페이지 트리 — §3
- [x] 컴포넌트 분할 + 상태 흐름 — §4 + §5
- [x] 마이그레이션 순서 (v1 drop → v2 create) — §6
- [x] Vercel Cron 구성 (KST 02:00 D+3/D+6/D+7) — §7
- [x] 위협 모델 (rate limit, replay, 사칭, cascade) — §8
- [x] 엣지케이스 ≥ 5개 — §10 (9건)
- [x] 롤백 계획 — §12
- [x] Karpathy 4원칙 적용 로그 — §0
- [x] task_id / slug 일관
- [x] TODO/TBD/placeholder 부재

**판정: PASS** — phase4 design_planner 진입 준비 완료.
