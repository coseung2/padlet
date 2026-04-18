# Phase 1 Research Pack — parent-class-invite-v2

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **slug**: `parent-class-invite-v2`
- **입력**: `phase0/request.json` + INBOX/2026-04-13-parent-class-invite-refine/*
- **작성일**: 2026-04-15

> 본 research_pack은 ideation 하네스에서 이미 진행된 phase1~phase3(audit · delta · interview) 산출물을 1차 소스로 한다. INBOX 자료가 vertically 자체 벤치마크·근거를 포함하므로 외부 벤치마크는 핵심 3개 패턴만 보강한다. 새 스택 조사는 금지 (architecture.md 잠금).

---

## 1. 코드베이스 현황 (brownfield 감사)

### 1.1 v1 parent-viewer 실제 배포 상태 (INBOX 주장과 불일치)

INBOX `handoff_note.md §6`과 `decisions.md D-41~D-46`은 v1을 **"미배포, 현역 사용자 0명, 마이그레이션 불요"** 로 전제. 본 코드베이스 감사 결과 **v1은 프로덕션 배포 완료** 상태임을 확인:

| 증거 | 위치 | 배포 흔적 |
|---|---|---|
| Prisma 마이그레이션 적용 | `prisma/migrations/20260412_add_parent_viewer/migration.sql` | `tasks/2026-04-12-parent-viewer-access/phase10/deploy_log.md` 에 Supabase `aws-1-ap-northeast-2.pooler` 적용 로그 존재 |
| 스키마 라이브 | `prisma/schema.prisma:667-724` | `ParentInviteCode`, `ParentChildLink`, `ParentSession`, `Parent` 모델 4종 |
| 교사측 진입 컴포넌트 | `src/components/ParentInviteButton.tsx` | `ClassroomDetail` 학생 행에 마운트, 모달 + QR + 카운트다운 |
| v1 API 엔드포인트 | `src/app/api/students/[id]/parent-invites/route.ts`, `src/app/api/parent-invites/[id]/route.ts`, `src/app/api/parent/redeem-code/route.ts` | 발급·revoke·reissue·교환 전부 라이브 |
| 학부모 앱 라우트 | `src/app/parent/(app)/*` | home, notifications, child/[studentId]/{plant,events,drawing,breakout,assignments}, account/withdraw 9+ 페이지 배포 |
| 학부모 API | `src/app/api/parent/{session,children,links,account,test}/**` | 세션 상태·자녀 범위·링크 revoke·탈퇴까지 전량 구현 |
| 하부 라이브러리 | `src/lib/parent-fetch.ts`, `src/lib/parent-email.ts` | 매직링크 dispatcher 및 자녀 범위 fetch 헬퍼 배포 |

**영향**: D-41(완전 폐기 즉시 전환) · D-42(`ParentInviteCode` DROP 불필요) · D-46(교사 안내 이메일 불필요)는 **재평가 필요**. 실제 가입 학부모 수·발급된 코드 수는 코드만으로 판정 불가 → phase2 에서 USER-REVIEW 블로커로 회부.

### 1.2 역할·인증 현황

- RBAC 헬퍼 (`src/lib/rbac.ts`): `getBoardRole`, `requirePermission`, `viewSection` — teacher/student/parent 기반
- 학생 세션: 커스텀 HMAC 쿠키 (`src/lib/student-auth.ts`)
- 교사 세션: NextAuth 5 beta + Prisma Adapter
- 학부모 세션: `ParentSession` 7일 TTL + 매직링크 15분
- **owner/editor/viewer mock 역할은 본 task 스코프 밖** (사용자 제약)

### 1.3 기존 실시간·성능 제약 (lockdown)

- 실시간 엔진: 미정 — `src/lib/realtime.ts` helper만 존재. pub/sub 없이 **SWR 60s 폴링** (v1 유지)
- 성능 예산: TTI < 2s LTE, 갤럭시 탭 S6 Lite 기준 (메모리 baseline)
- iframe 금지, proxy thumbnail only, Vercel Blob presigned

### 1.4 Vercel Cron 현황

`vercel.json` 에 이미 Cron 섹션이 있다면 추가, 없으면 신설. `lib/cron/*` 패턴은 미존재 (신규 도입).

---

## 2. 유사 제품 벤치마크 (핵심 3개)

외부 브라우저 접근 없이 ideation 하네스의 `phase1/audit.md` 및 공개된 제품 패턴 지식을 근거로 정리. 본 task는 외부 캡처 수집이 아닌 계약 기반 구현이므로 phase5(디자인)에서 shotgun 시 캡처 보강.

### 2.1 Google Classroom — 학부모 초대

- **패턴**: 교사가 학생 옆 "Invite guardian" → 학부모 이메일 직접 입력 → 학부모 이메일로 수락 링크
- **장점**: 검증된 flow, 사칭 방어(이메일 소유 증명)
- **단점**: 교사가 학부모 이메일을 모으는 비용 여전, N명당 N회 입력
- **본 task 적용**: ❌ — v2의 "교사 운영 비용 N → 1" 목표와 충돌. 거절.

### 2.2 ClassDojo — 학급 코드 + 학부모 셀프조인

- **패턴**: 교사가 학급 코드 1개 발급 → 학부모가 앱에서 코드 입력 → 학급 명단에서 자녀 선택 → 교사 승인 대기
- **장점**: 교사 운영 비용 O(1), 승인 게이트로 사칭 차단
- **단점**: 학급 코드가 단톡방·문자로 유출 시 동일 학급 내 타 학부모 사칭 가능
- **본 task 적용**: ✅ 채택 — v2 시드 `change_trigger`의 원형 패턴. IP 5회/15분 + 코드 50회/일 + 학급 100회/일 rate limit으로 유출 대응

### 2.3 Seesaw — 반·번호 기반 학생 식별

- **패턴**: 학부모가 학급 코드 입력 후 반·번호·이름 첫 글자로 자녀 선택
- **장점**: PII 최소화 (이름 풀 노출 안 함), 반·번호 특정성으로 실수 매칭 감소
- **단점**: 번호 미부여 학급에서 동작 어려움 (한국 공립 초·중등은 번호 체계 존재)
- **본 task 적용**: ✅ 채택 — 마스킹 규칙 "김○○" (사용자 사전 확정, U-03)

---

## 3. 핵심 UX 패턴 분석

### 3.1 Pattern A — 학부모 셀프매칭 (ClassDojo + Seesaw 융합)

- **설명**: 학부모가 학급 코드 입력 후 반·번호·마스킹이름 명단에서 자녀 1명 선택, 교사 승인 후 활성화
- **장점**:
  - 교사 클릭 수 N×3 → N×1 (승인 클릭만)
  - 2-step 사칭 방어: 학급 코드 소유 + 교사 승인
  - PII 최소 노출: `full_name` 비노출, 성 1자 + ○ 마스킹
- **단점**:
  - 학급 코드 유출 시 동일 학급 타 학생 정보(반·번호·마스킹이름) 전수 조회 가능 → rate limit 3단계(IP/코드/학급) 필수
  - 동명이인(성+이름끝글자) 중복 가능 → pending 단계에서 학부모가 잘못 신청 시 교사가 `wrong_child` 사유로 거부
  - 승인 게이트 추가로 pending → active 지연 발생(권고 24h, 최대 7d)
- **본 task 채택**: ✅ MVP 핵심 패턴

### 3.2 Pattern B — pending/active 상태 분리 + 라우트 그룹

- **설명**: `ParentChildLink.status` 4값 유니언(`pending|active|rejected|revoked`). pending 학부모는 `/parent/onboard/pending` 전용 라우트, active만 자녀 콘텐츠 열람. 미들웨어 2종(`parentAuthOnlyMiddleware` · `parentScopeMiddleware`) 분기
- **장점**:
  - RLS 오염 방지: `BoardMember` 는 approve 시점에만 생성 (D-26)
  - pending 세션이 자녀 콘텐츠 URL을 직접 찌르더라도 401 강제
  - 라우트 그룹 `(authed-preActive)` / `(authed-active)` 로 Next.js App Router 정적 분리
- **단점**:
  - 미들웨어 2종 분기 → 실수로 `parentAuthOnlyMiddleware` 우회 시 security hole. ESLint 룰 필수
  - pending HTTP 응답을 `200 + {"status":"pending"}` flag로 처리 (D-27) → 프론트 상태 머신이 status를 명시 처리해야 함
- **본 task 채택**: ✅ — D-25·D-26·D-27 준수

### 3.3 Pattern C — Vercel Cron 기반 D+3/D+6/D+7 알림 + auto-expiry

- **설명**: Vercel Cron 일 1회 KST 02:00 (UTC 17:00)에 pending 스캔, D+7 초과 시 `auto_expired_pending` 일괄 rejected + 이메일. D+3/D+6은 교사 대상 리마인더/경고 이메일
- **장점**:
  - 교사 hard SLA 없이도 UX 흐름 자연 종료
  - 단일 Cron 엔트리포인트로 운영 단순
  - 이메일 채널 일원화 (Resend/프로젝트 기본 dispatcher 재사용)
- **단점**:
  - Cron 실패 시 pending 영구 적체 (Vercel Cron 리트라이 정책 확인 필요)
  - D+3/D+6 배치 이메일 → 학부모별 signup 시점 분산 시 cohort 기준으로 grouping 필요
  - Vercel Cron 무료 플랜 1회/일 제약 내 처리 가능 (일 1회 요구와 일치)
- **본 task 채택**: ✅ — D-22·D-24·E-03 준수

---

## 4. 기술 제약 확인 (architecture.md 잠금 준수)

| 영역 | 잠금 스택 | v2 요구사항 | 충돌 여부 |
|---|---|---|---|
| 런타임 | Next.js 16 App Router | App Router 라우트 그룹 `(authed-preActive)` / `(authed-active)` | 없음 |
| ORM | Prisma 6 + PostgreSQL(Supabase) | `ClassInviteCode` 테이블 + status enum 확장 + 감사 필드 6종 | 없음 (단일 migration) |
| 인증 | NextAuth 5 beta (교사), 커스텀 HMAC(학생), ParentSession(학부모) | v1 ParentSession·매직링크 재사용 | 없음 |
| 실시간 | 미정, SWR 60s 폴링 | pending → active 60s 내 반영 필요 | 없음 (폴링 충분) |
| 이메일 | `src/lib/parent-email.ts` 기반 dispatcher | D-22 4종 + 거부 3종 + AMENDMENT classroom_deleted = 8 템플릿 | 없음 |
| Cron | Vercel Cron (기존 사용 여부 확인 필요) | 일 1회 KST 02:00 | 없음 |
| 성능 | TTI<2s LTE, 갤럭시 탭 S6 Lite | 학급 명단 `GET /api/parent/match/students` 페이로드 ≤ 200KB | 명단 200명 초과 시 페이지네이션 필요 |

---

## 5. 리스크 · 미결 이슈

### 5.1 BLOCKER (phase2 USER-REVIEW 필수)

1. **v1 실제 배포 상태 ↔ INBOX 주장 불일치** — v1 프로덕션 데이터 존재 여부 사용자 확답 필요. 3가지 처리 경로:
   - **Path A** (INBOX 주장대로 진행): v1 데이터 DROP + `ParentInviteCode` 테이블 유지(읽기전용) + v1 API 410 Gone
   - **Path B** (v1 라이브 사용자 존재): 학부모 안내 이메일 + 기존 active `ParentChildLink` 유지 + v1 발급 UI만 제거 + v1 코드 expiresAt 도래 시 자연 소멸
   - **Path C** (v1 스모크 테스트 수준만): 모든 Parent/ParentChildLink/ParentInviteCode/ParentSession 레코드 삭제 후 D-41 그대로 진행

### 5.2 구현 리스크 (phase3+ 에서 해소)

- **미들웨어 우회 risk**: `parentAuthOnlyMiddleware` 와 `parentScopeMiddleware` 혼동 시 pending 학부모가 자녀 콘텐츠 접근. ESLint 룰 + 라우트 그룹 분리 2중 방어 필요
- **코드 회전 race**: `ClassInviteCode.rotate` 와 학부모 매칭 request 동시 발생 시 트랜잭션 격리. D-39(회전 시 pending 일괄 rejected) 를 단일 트랜잭션 처리
- **마스킹 edge case**: 1글자 이름(한국 관습 드묾, "김"만) 시 "김○" 대신 "김"만 노출? AMENDMENT 및 U-03 기준 "김○○" 2자 규칙 → 1자 이름은 "김○"로 처리 필요 (phase3 확정)
- **Classroom 삭제 cascade** (AMENDMENT D-51~D-56): 대형 학급(100명 + 학부모 200명) 삭제 시 단일 트랜잭션 cascade revoke + 이메일 200통 발송 → 트랜잭션 외부 큐 이메일 필요
- **rate limit 저장소**: v1 deploy_log `phase8/security_audit.md §3` 에 "Upstash Redis 업그레이드" 가 TODO. 현재 in-memory rate limit은 multi-instance 환경에서 무력. v2 착수 전 Upstash Redis 결정 필요 (phase3 architect)
- **성능 예산**: 학급 명단 200+ 명 시 페이로드 압축(gzip) 확인 + infinite scroll or 페이지네이션 검토

### 5.3 파킹 (v2+ 이관)

- 교사 자유 메시지 입력 (D-29)
- 에스컬레이션 경로 (D-23)
- 학부모 앱 네이티브
- 부/모 합산 권한 통합
- Kakao OAuth
- 사칭 감지 SOP 상세화 (D-48)

---

## 6. 핸드오프

phase2 strategist 입력:
- 본 문서 (`research_pack.md`) — 패턴 3개 + 브라운필드 감사 + BLOCKER 1개
- `phase0/request.json`

phase2 는 Pattern A(셀프매칭) + Pattern B(상태 분리) + Pattern C(Cron)를 통합한 MVP 스코프를 확정하고, BLOCKER 1건(v1 마이그레이션 경로)을 USER-REVIEW 결정 포인트로 노출해야 한다.
