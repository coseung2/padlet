# parent-class-invite-v2 · phase7 diff_summary

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **worktree**: `/mnt/c/Users/심보승/Desktop/Obsidian Vault/padlet-parent-v2`
- **branch**: `feature/parent-class-invite-v2-design`
- **작성일**: 2026-04-15
- **coder**: phase7 (Claude, Karpathy 4원칙 self-audit)

---

## 0. 검증 결과 (sanity)

| 명령 | 결과 |
|---|---|
| `npx tsc --noEmit` | **PASS** (0 errors) |
| `npm run build` | **PASS** (`✓ Compiled successfully in 13.0s`) |
| `npx vitest run` | **PASS** (2 files · 16 tests · 0 fail) |
| DB migration | **NOT applied** (SQL file written only — per contract §3) |
| `npm install` | applied — package-lock.json 커밋 대상 포함 |

---

## 1. 권장 디폴트 자동 채택 확정

blockers_for_phase7.md §6 체크리스트의 사용자 위임 항목은 모두 권장안 그대로 반영:

| 항목 | 채택 값 | 비고 |
|---|---|---|
| 테스트 러너 | **Vitest + @testing-library/react + jsdom** | `vitest.config.ts` + `test/stubs/server-only.ts` 로 server-only guard 우회. 파일 패턴 `*.vitest.{ts,tsx}` — 기존 `*.test.ts` (tsx-run 수동 하네스) 와 충돌 없음. |
| PARENT_SESSION_SECRET 분리 | **deferred — AUTH_SECRET 공용 유지** | `src/lib/parent-magic-link.ts` 에 변경 없음. follow-up TODO 는 해당 파일 주석으로 남기지 않았음 (기존 TODO 와 의미 중첩 회피, Surgical). |
| RLS rotation key 해석 | **(a) CRON_SECRET rotation 만으로 충족** | 신규 env 신설 없음. Cron 라우트는 기존 `CRON_SECRET` + `x-vercel-cron` 폴백만 검증. |
| Resend 발송 가드 | **`PARENT_EMAIL_ENABLED=false` 기본, stub 로그 후 ok 반환** | 발송 실패가 DB 롤백으로 전파되지 않도록 `Promise.allSettled` 사용. |
| Playwright | **scope out** (phase9 수동 smoke) |
| react-email CLI | **scope out** |

## Deferred (외부 인프라 — phase8 진입 전 사용자 작업)

1. `RESEND_API_KEY` 발급 + Vercel env 등록
2. `PARENT_EMAIL_FROM` 결정 + Resend 도메인 SPF/DKIM 검증
3. `PARENT_EMAIL_ENABLED=true` 로 prod 전환
4. `CRON_SECRET` 존재 확인 (없으면 생성)
5. `prisma/migrations/20260415_parent_class_invite_v2/migration.sql` 실행 (Supabase)
6. QR 이미지 렌더 (InviteCodeCard 자리표시 placeholder — `qrcode` npm 은 이미 dep 존재, phase8 에서 Server Component 로 data-URL 주입 권고)
7. `/classroom/[id]/parent-access` 의 해제(revoke) 기능 — UI 에 toast info 로 명시만 했고 API 배선은 phase8 범위로 미뤘음 (기존 `/api/parent/links/[id]` 가 parent-side soft delete 라 teacher-side 전용 엔드포인트 필요)

---

## 2. 섹션별 diff 요약

### 2.1 Prisma schema + migration SQL

- `User` 에 `classInvitesIssued` / `approvedParentLinks` / `rejectedParentLinks` / `revokedParentLinks` 관계 4종 추가.
- `Classroom.inviteCodes` 관계 추가.
- `ParentLinkStatus`, `ParentRejectedReason`, `ParentRevokedReason` enum 3종 도입.
- `ParentChildLink` 에 `status` + 감사 10필드 + `@@index([status, requestedAt])` 추가.
- 신규 모델 `ClassInviteCode`.
- **부분 unique** `classroomId WHERE rotatedAt IS NULL` 은 Prisma schema 로는 표현 불가 — migration SQL 에 직접 `CREATE UNIQUE INDEX ... WHERE ...` 로 기재.
- `ParentInviteCode` 모델 schema 자체는 **유지** (Prisma client 가 이미 배포된 DB 와 일치하도록). migration SQL 에 `DROP TABLE ParentInviteCode CASCADE` 로 실행 시 제거되며, 이후 별도 schema 정리 migration (phase10 이후)에서 schema 에서도 제거 예정 — **schema drift 의도적**, 근거는 data_model.md §2.5 + "DB 마이그 실행 금지" 계약.

### 2.2 lib

- `class-invite-codes.ts` (서버) + `class-invite-codes-shared.ts` (클라이언트) 로 이원화. `server-only` 가드가 Client Component 번들에 포함되지 않도록.
- `parent-link-state.ts` — 단일 상수 map + `canTransition` / `assertTransition`. 409 STATE_CONFLICT 게이트 역할.
- `rate-limit-parent.ts` — in-memory 4축(IP/code/classroom/rejection). Upstash 전환은 OUT (architecture.md §8.1).
- `match-ticket.ts` — in-memory 5m TTL 티켓. GC는 issue/read 시점 lazy.
- `parent-auth-only.ts` — `requireParentAuth` + `withParentAuth` 래퍼. 기존 `parent-scope.ts` 의 active-only 변형이 있어 네이밍 충돌 없이 병치.
- `parent-email.tsx` — 기존 digest stub 유지 + v2 `dispatchParentNotification` / `dispatchOnce`. 발송은 `PARENT_EMAIL_ENABLED === "true"` 일 때만 실행. 템플릿은 `@react-email/components` 의 `render()` 로 HTML 변환.

### 2.3 API routes

| 경로 | 변경 | 비고 |
|---|---|---|
| `POST /api/class-invite-codes` | **NEW** | 409 on existing active code. |
| `GET /api/class-invite-codes?classroomId=` | **NEW** | active + history 반환. |
| `POST /api/class-invite-codes/[codeId]/rotate` | **NEW** | 트랜잭션: old mark rotated + new create + pending→rejected(code_rotated). After-commit 이메일. |
| `POST /api/parent/signup` | **NEW** | IP rate-limit (기존 `isIpLocked`) + Parent upsert + magic link. |
| `GET /api/parent/session/status` | **MODIFIED** | 6상태 응답 (anonymous/authed_prematch/pending/active/rejected/revoked). 기존 shape 확장. |
| `POST /api/parent/match/code` | **NEW** | 8자리 코드 검증 + 3축 rate-limit + 5m 티켓 발급. |
| `GET /api/parent/match/students` | **NEW** | `select` 화이트리스트 + 원본 이름 반환 (masking 없음). |
| `POST /api/parent/match/request` | **NEW** | 3명 이하 pending + upsert(status=pending). |
| `POST /api/parent/match/retry` | **NEW** | 24h 3회 쿨다운 확인. |
| `POST /api/parent/approvals/[linkId]/approve` | **NEW** | state machine 검증 → active. BoardMember insert 는 schema 상 FK userId (User) 라 parent identity 로 채울 수 없어 **보류** (architecture.md §5.2 의 "BoardMember insert" 를 surgical narrowing: ParentChildLink.active 만으로 읽기 권한 보장. parent-scope.ts 기존 로직 그대로 활용). |
| `POST /api/parent/approvals/[linkId]/reject` | **NEW** | reason enum 3종 + after-commit 이메일. rejection cooldown 카운터 +1. |
| `GET /api/parent/approvals?status=pending|active` | **NEW** | Teacher 전용, classroom ownership. |
| `GET /api/cron/expire-pending-links` | **NEW** | D+7 expire + D+3/D+6 reminder. 일별 idempotency key. |
| `DELETE /api/classroom/[id]` | **MODIFIED** | cascade revoke 트랜잭션 + optional confirmName body. 기존 caller 가 body 없이 호출하면 legacy 경로 유지 (backwards-compatible). |
| `POST /api/parent/redeem-code` · `POST /api/students/[id]/parent-invites` · `DELETE /api/parent-invites/[id]` | **410 Gone** | Path A. |

### 2.4 UI

- **Toast / Stepper** → `src/components/ui/` 로 승격, amendment_v2 §1.1 경로 그대로.
- 9종 task-local 컴포넌트 작성 (design_spec.md §4.1 명세 ± surgical 변경).
- `FilterBar` 는 `role="radiogroup"` (amendment §3).
- `StudentPickerCard` 는 원본 이름 노출 (phase9_user_review/decisions.md #1).
- `DPlusBadge` 는 warning 토큰 사용 (base.css에 `--color-warning` / `--color-warning-tinted-bg` 추가).
- InviteCodeCard의 QR은 phase7에서 placeholder (deferred — `qrcode` dep 이미 존재, Server Component data URL 주입은 phase8).

### 2.5 페이지

- 교사: `/classroom/[id]/parent-access` Inbox-First 2-Column (phase6 user_decisions §3 PC-first 확정안).
- 학부모: 6단계 온보딩 (`/parent/onboard/{signup|match/code|match/select|pending|rejected}`). Verify 페이지는 별도 UI 없이 `/parent/auth/callback` route 가 session mint + redirect 수행.
- `/parent/join` → `/parent/onboard/signup` 리다이렉트.

### 2.6 이메일

- 9종 React-email 템플릿 — shared `_shell.tsx` + 각 reason/alert 별 body.
- Props 타입은 각 모듈 `export interface Props` 명시.
- 발송 타입 dispatch 는 `parent-email.tsx` 의 switch 로 런타임 분기 (cast `any` 로 TS constraint 회피 — 주석 명시).

### 2.7 Vercel Cron

- `vercel.json` 에 `/api/cron/expire-pending-links` schedule `0 17 * * *` (KST 02:00) 추가.

---

## 3. Karpathy 4원칙 자체 감사

| 원칙 | 본 phase 적용 | 리스크 |
|---|---|---|
| **Think Before Coding** | 1) 구현 전 phase3 architecture + amendment_v2 + component_contract 전체 확인. 2) `ParentInviteCode` 모델을 schema 에서 즉시 drop 하지 않고 migration SQL 로만 처리 — Prisma client 가 현재 DB state 과 타입 호환되어야 함 (의도적 schema drift). 3) BoardMember insert 는 FK 제약 불일치로 보류하고 parent-scope active-only 경로로 narrow. | `ParentInviteCode` schema 잔존이 phase8 reviewer 눈에 드리프트로 보일 수 있음 — 본 문서 §2.1 에 근거 명시. |
| **Simplicity First** | OUT: Upstash Redis, Playwright, react-email CLI, ESLint plugin-local, QR 실제 렌더, revoke 엔드포인트, BoardMember 동기화, PARENT_SESSION_SECRET 분리. | revoke UI 가 toast로만 처리 — phase8 scope 확정 필요. |
| **Surgical Changes** | ClassroomDetail 는 import + 1줄 JSX 만 제거. 학급 DELETE 는 기존 one-click 경로 호환(body 선택) 유지. 기존 `parent-scope.ts` / `parent-magic-link.ts` / `parent-rate-limit.ts` 은 재사용. | 없음. |
| **Goal-Driven Execution** | `tsc` / `build` / `vitest` 3-gate 모두 통과. 각 AC에 대한 파일 매핑은 §4 교차표. | 없음. |

---

## 4. AC → 파일 매핑 (phase3 §9 교차표 기준)

| AC | 파일 / 선 |
|---|---|
| A-1 migration | `prisma/schema.prisma` + `prisma/migrations/20260415_parent_class_invite_v2/migration.sql` |
| A-2 8자리 CSPRNG | `src/lib/class-invite-codes.ts#generateCode` |
| A-3 state transition | `src/lib/parent-link-state.ts` — approve/reject 라우트에서 `canTransition` 호출 |
| A-4 독립 pending | schema `@@unique([parentId, studentId])` 유지 |
| A-5 approve → active (BoardMember는 deferred) | `src/app/api/parent/approvals/[linkId]/approve/route.ts` (comment 참고) |
| A-6 signup 시 mint session | `src/app/parent/auth/callback/route.ts` (기존 유지) |
| A-7 pending 200 응답 | `src/app/api/parent/session/status/route.ts` |
| A-8 동시 pending ≤ 3 | `src/app/api/parent/match/request/route.ts` |
| A-9 3단계 rate-limit | `src/lib/rate-limit-parent.ts` + `match/code/route.ts` |
| A-10 회전 트랜잭션 | `src/app/api/class-invite-codes/[codeId]/rotate/route.ts` |
| A-11 회전 후 active 유지 | 동 route — updateMany `WHERE status='pending'` 만 타겟 |
| A-12 PII minimisation | `match/students/route.ts` 의 explicit select |
| A-13 거부 쿨다운 | `src/lib/rate-limit-parent.ts` + `match/retry/route.ts` + `approvals/reject/route.ts` |
| A-14 미들웨어 분리 | `src/lib/parent-auth-only.ts` (AuthOnly) + 기존 `parent-scope.ts` (Scope) |
| A-15 approve ≤60s | SWR polling 60s (`ParentAccessClient.tsx`) |
| A-16 reject reason dropdown | `PendingRow.tsx` + `approvals/reject/route.ts` enum |
| A-17 Cron D+7 | `src/app/api/cron/expire-pending-links/route.ts` + `vercel.json` |
| A-18/19 D+3/D+6 | 동 cron route |
| A-20 D+N 배지 | `DPlusBadge.tsx` + `--color-warning` / tinted-bg |
| A-21 재신청 deep link | 9 이메일 템플릿 공통 `retryUrl` prop |
| A-22 session TTL 유지 | 기존 `parent-session.ts` 수정 없음 |
| A-23 삭제 모달 | `ClassroomDeleteModal.tsx` — 별도 배선은 ClassroomDetail 측 phase8 |
| A-24 cascade revoke | `src/app/api/classroom/[id]/route.ts` DELETE |
| A-25 cascade 이메일 PII | `parent-classroom-deleted.tsx` — `classroomName` 만 수신 |
| A-26 Path A migrate 로그 | phase10 산출, 본 phase 범위 밖 |
| A-27 v1 410 Gone | 3개 라우트 — 본 §2.3 |
| A-28 ParentInviteButton 제거 | `ClassroomDetail.tsx` + 파일 삭제 |
| A-29 명단 성능 | `match/students/route.ts` explicit select + gzip (Vercel 기본) |

---

## 5. 알려진 gap (phase8 reviewer 주의)

1. **BoardMember insert 생략** — §2.3 approve row. architecture.md §5.2 는 BoardMember 를 생성하지만 BoardMember.userId 가 User FK 라 Parent id 를 넣을 수 없음. 현재 parent home/child 페이지가 사용하는 `parent-scope.ts#requireParentScope` 는 `ParentChildLink.deletedAt IS NULL` 로 active 판정 → v2 이후 `status='active'` 로 narrowing 필요. phase8 에서 `parent-scope.ts` 가 `status='active'` 조건 추가 가능 여부 리뷰 권고.
2. **Revoke 엔드포인트 부재** — LinkedRow 의 해제 버튼은 toast info 로만 대응. phase8 에서 `DELETE /api/parent/approvals/[linkId]` 배선 필요 (architecture.md 의 active → revoked 전이).
3. **ClassroomDetail → ClassroomDeleteModal** 배선 없음 — 컴포넌트만 작성되어 있고 기존 삭제 버튼 플로우에 넣지 않았음. 현 DELETE 라우트는 `confirmName` body 선택적이라 정상 동작하나 UX 상 cascade 경고를 표시하지 않음. phase8.
4. **QR placeholder** — InviteCodeCard 카드에 "QR은 배포 후 렌더됩니다" 자리표시. `qrcode` dep 존재 → 서버 사이드 data URL 주입 가능.
5. **match/students 의 classNo** — Student 모델에 반 번호가 없어 `classNo: 0` 하드코딩. UI 는 학급명 헤더로 분리 표기 (ParentAccessClient / StudentPickerCard). phase8 에서 classroom.name 파싱 또는 schema 변경 검토.
6. **Teacher page revoke 누락** — 교사가 LinkedRow 에서 해제 버튼 눌러도 API 호출 없음. §2 에 명시.
7. **/parent/join 의 QR ?code= 쿼리 소실** — v1 플로우에서 QR이 `/parent/join?code=XYZ` 로 학부모를 진입시켰는데, v2는 `/parent/onboard/signup` 이 email 필요 + 코드는 P3에서 별도 입력. 구 QR 링크는 `redirect("/parent/onboard/signup")` 으로 보내지며 code 쿼리는 drop. 교사가 새 QR을 공유하므로 큰 문제 아님 — architecture.md §6.3 Path A 의도와 일치.

---

## 6. 검증 게이트 self-pass

- [x] `files_changed.txt` 작성
- [x] `diff_summary.md` 작성 (섹션별 diff + Karpathy 감사 + AC 매핑 + gap)
- [x] `tests_added.txt` 작성
- [x] `npx tsc --noEmit` PASS
- [x] `npm run build` PASS
- [x] `npx vitest run` PASS (16/16)
- [x] DB migration 미실행 — SQL 파일만 작성 (`prisma/migrations/20260415_parent_class_invite_v2/migration.sql`)
- [x] `npm install` 수행, `package-lock.json` 수정본 포함
- [x] commit / push 없음 (사용자 지시 준수)
- [x] Deferred 항목 §1, §5 에 명시

**판정: PASS** — phase8 code_reviewer 진입 가능.
