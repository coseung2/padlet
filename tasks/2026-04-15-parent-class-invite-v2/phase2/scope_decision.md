# Scope Decision — parent-class-invite-v2

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **slug**: `parent-class-invite-v2`
- **scope_mode**: **Selective Expansion** (v2 핵심 흐름 전량 + AMENDMENT cascade 포함, 파생 고도화는 v2+ 파킹)
- **작성일**: 2026-04-15

---

## 1. 선택한 UX 패턴

`ux_patterns.json` 5개 후보 중 **A + B + C + D + E 전량 채택** (거절: X).

근거 (research_pack 인용):
- **Pattern A (셀프매칭)** — "교사 클릭 N×3 → N×1" 핵심 목표(§2.2, §3.1) 와 직접 부합. ClassDojo + Seesaw 패턴 융합이 한국 공립 초·중등 반·번호 체계에 정합.
- **Pattern B (status 게이트 + 라우트 그룹)** — `BoardMember` approve 시점 발급(D-26)이 RLS 오염 방지 필수 조건(§3.2). 라우트 그룹 2종 분리가 Next.js App Router lockdown 스택과 정합.
- **Pattern C (Cron 스케줄)** — 1인 개발자 운영에서 hard SLA 없이 UX 종료(§3.3). Vercel Cron 일 1회 = 무료 플랜 한계와 일치.
- **Pattern D (코드 회전)** — 유출 대응 단일 액션이 8자리 코드의 실질 방어력(§1.4 — 소셜 채널 유출 경로)을 보완.
- **Pattern E (Classroom cascade)** — AMENDMENT 2026-04-13 사용자 사후 질문("active 링크 수명?") 대응. `year_end` enum의 자동 트리거 공백 해결.

Pattern X(Google Classroom 방식) 거절 — v2 목표와 정면 충돌 (research_pack §2.1).

---

## 2. MVP 범위

### 2.1 IN (이번 task 필수 구현)

**데이터 모델**
- `ClassInviteCode` 엔티티 신설 (classroomId, code 8자리, issuedById, expiresAt, maxUses=null, rotatedAt)
- `ParentChildLink.status` 유니언 4값 확장 (pending | active | rejected | revoked)
- `ParentChildLink` 감사 필드 6종 추가 (requestedAt, approvedAt, approvedById, rejectedAt, rejectedById, rejectedReason)
- `revokedReason` enum 확장 (+rejected_by_teacher, +auto_expired_pending, +code_rotated, +classroom_deleted) + v1 3종 유지
- `rejectedReason` enum 신규 (wrong_child | not_parent | other)
- 단일 Prisma migration (`{timestamp}_parent_class_invite_v2`)

**교사 UI**
- `/teacher/[classroomId]/parent-access` 탭 3-섹션: (a) 초대 코드 (b) 승인 대기 인박스 (c) 연결된 학부모
- D+N 배지 (D+0~2 회색 / D+3~5 노랑 / D+6 빨강)
- 거부 사유 드롭다운 (wrong_child / not_parent / other)
- Classroom 삭제 확인 모달 (학급명 재입력 + "학부모 N명 액세스 해제" 경고)
- `ParentInviteButton` 컴포넌트 및 v1 진입점 제거 (학생 카드 드롭다운)

**학부모 온보딩**
- `/parent/onboard/signup` — 이메일 입력 + 매직링크 발송
- `/parent/onboard/match/code` — 학급 코드 입력
- `/parent/onboard/match/select` — 학급 명단에서 자녀 선택 (반·번호·마스킹이름 "김○○")
- `/parent/onboard/pending` — 승인 대기 안내
- `/parent/onboard/rejected` — 거부 사유별 안내 + 재신청 deep link

**API**
- `POST /api/class-invite-codes` · `POST /api/class-invite-codes/[codeId]/rotate`
- `POST /api/parent/signup` · `POST /api/parent/match/code` · `GET /api/parent/match/students` · `POST /api/parent/match/request`
- `POST /api/parent/approvals/[linkId]/approve` · `POST /api/parent/approvals/[linkId]/reject`
- `GET /api/parent/session/status` 응답에 `{status:"pending"}` 분기 추가

**미들웨어·라우트 그룹**
- `parentAuthOnlyMiddleware` 신규 (`/parent/onboard/*` 전용)
- `parentScopeMiddleware` 에 `status='active'` 조건 추가
- 라우트 그룹 `/parent/(authed-preActive)` / `/parent/(authed-active)` 분리
- 3단계 rate limit (IP 5/15min · 코드 50/day · 학급 100/day)

**Cron·이메일**
- Vercel Cron 일 1회 KST 02:00 (`vercel.json` crons 추가)
- `lib/cron/expire-pending-links.ts` — pending D+7 초과 일괄 auto_expired_pending
- 이메일 템플릿 8종 (학부모 거부 3종 + auto-expired + code-rotated + classroom-deleted + 교사 D+3/D+6/D+7)
- 거부 이메일 쿨다운 (동일 이메일 거부 3회 초과 시 24h 차단)

**AMENDMENT PV-17**
- Classroom 삭제 시 해당 학급 active ParentChildLink 일괄 revoke (`classroom_deleted`) + ParentSession 차단 + 학부모 안내 이메일

### 2.2 OUT (이번 task 제외)

| 항목 | 이유 | 후속 task |
|---|---|---|
| 교사 자유 메시지 입력 (거부 이메일 커스텀) | 모더레이션 리스크 + 1인 운영 부담 (D-29) | v2+ 별도 research task |
| 에스컬레이션 경로 (학부모 문의 라우팅) | 1인 개발자 운영 (D-23) | v2+ (운영 콜센터 도입 시) |
| 학부모 앱 네이티브 | 웹 모바일만 지원 scope | v3+ |
| 부/모 합산 권한 통합 | 독립 승인 유지 (D-08) | v2+ |
| Kakao/Google OAuth 학부모 로그인 | 매직링크 유지 (R-01) | v2+ |
| 사칭 감지 SOP 고도화 | 거부율 임계 배지만 v1 제공 (D-48) | 운영 단계 P2 |
| RLS 정책 DB 적용 | v1에서 middleware가 gap 커버 중 (v1 deploy_log §RLS) | PV-9/11 (v2 내 선택적) |
| Upstash Redis rate limit 전환 | v1에서 in-memory rate limit 상태 (v1 phase8 security_audit §3) | phase3 architect 에서 v2 범위 내 포함 여부 결정 |
| `owner/editor/viewer` mock 역할 의존 기능 | 본 task 스코프 밖 (사용자 제약) | 별도 정리 task |

---

## 3. 수용 기준 (Acceptance Criteria)

오케스트레이터가 자동 검증 가능한 동사형 체크리스트. INBOX seed.yaml `acceptance_criteria` + `supplemental_overlay` + AMENDMENT 를 브라운필드 현실에 맞춰 통합.

### 3.1 엔티티·상태 머신 (A-1 ~ A-8, 8건)

- **A-1** Prisma migration 단일 파일로 `ClassInviteCode` CREATE + `ParentChildLink.status` 유니언 확장 + 감사 필드 6종 ADD + `revokedReason` enum 4종 추가 + `rejectedReason` enum 신설 + `@@index([requestedAt])` 적용되고 `npx prisma migrate deploy` 성공
- **A-2** `ClassInviteCode.code` 는 Crockford Base32 8자리 CSPRNG 생성 (O/0, I/1, L 제외 대문자), `@unique` 제약 보장
- **A-3** `ParentChildLink.status` 전이: pending→active(approve), pending→rejected(reject/auto_expire/code_rotated), active→revoked(teacher_revoked/year_end/parent_self_leave/classroom_deleted) 만 허용하고 다른 전이 시도는 409 반환
- **A-4** `@@unique([parentId, studentId])` 유지 + 부·모가 동일 학생에 각각 별도 parentId로 pending 신청 가능
- **A-5** `BoardMember` 는 approve 시점에만 생성, pending 단계에서 존재하지 않음 (DB 쿼리로 검증)
- **A-6** `ParentSession` 은 `/api/parent/signup` 시점 생성 (pending UX 위해)
- **A-7** pending HTTP 응답 = `200 OK` + `{"status":"pending"}` payload, 클라이언트가 `/parent/onboard/pending` 렌더
- **A-8** 동일 학부모가 동시 pending 3건 초과 시 4번째 `POST /api/parent/match/request` 는 429 반환

### 3.2 코드·보안 (A-9 ~ A-14, 6건)

- **A-9** 학급 코드 brute-force 시 IP 5회/15분 초과 시 429, 코드당 50회/일 초과 시 429, 학급당 100회/일 초과 시 429 (3단계 독립 카운터)
- **A-10** 교사 수동 회전 버튼 클릭 시 단일 트랜잭션으로 새 코드 발급 + 기존 pending 일괄 rejected(`code_rotated`) + 학부모 안내 이메일 큐잉
- **A-11** 회전 후 기존 active ParentChildLink 는 유지 (RLS·API 양쪽에서 접근 차단 없음 검증)
- **A-12** 학부모 셀프매칭 `GET /api/parent/match/students` 응답에 `full_name`·`phone`·`address`·`birthdate`·프로필 사진 필드 부재, 오직 `classNo`·`studentNo`·`maskedName`("김○○") 만 존재
- **A-13** 동일 학부모 이메일 거부 3회 초과 후 24h 내 재신청 시 429 + "24시간 후 재시도" 메시지 반환
- **A-14** `parentAuthOnlyMiddleware` 통과 경로 ≠ `parentScopeMiddleware` 통과 경로 (ESLint 룰 또는 integration test로 미들웨어 우회 불가 검증)

### 3.3 승인 플로우·Cron·이메일 (A-15 ~ A-22, 8건)

- **A-15** 교사가 `/teacher/[classroomId]/parent-access` 승인 인박스에서 승인 1클릭 시 `ParentChildLink.status` = active, `approvedAt`·`approvedById` 기록, `BoardMember` 생성, 학부모 세션이 60s 내 active 전환 확인
- **A-16** 교사 거부 시 드롭다운에서 wrong_child/not_parent/other 중 1개 선택 → `rejectedReason` 저장 + 해당 템플릿 이메일 발송 (교사 이름·이메일·전화 비노출, 학교 대표 연락처만)
- **A-17** Vercel Cron (KST 02:00 = UTC 17:00) 일 1회 실행, pending `requestedAt` + 7일 초과 건을 일괄 rejected(`auto_expired_pending`) + 학부모 이메일 + 교사 D+7 요약 이메일 발송
- **A-18** D+3 도래 학급에 대해 `[Aura-board] {N}명의 학부모가 승인 대기 중입니다` 교사 이메일 발송
- **A-19** D+6 도래 학급에 대해 `[Aura-board] 24시간 후 자동 만료 예정 ({N}건)` 교사 이메일 발송
- **A-20** D+N 배지 UI: D+0~2 회색 / D+3~5 노랑 / D+6 빨강 렌더링 (날짜 경과 단위 KST 기준)
- **A-21** 거부·만료 이메일 모두 재신청 deep link 포함, deep link 클릭 시 `/parent/onboard/match/code` 로 이동
- **A-22** 매직링크 15분 TTL + ParentSession 7일 TTL 유지 (v1 파라미터 변경 없음)

### 3.4 AMENDMENT cascade (A-23 ~ A-25, 3건)

- **A-23** 교사가 Classroom 삭제 시 확인 모달에 "학부모 N명 액세스 해제" 경고 + 학급명 재입력 확인 표시, 재입력 일치 시에만 삭제 실행
- **A-24** Classroom 삭제 단일 트랜잭션으로 해당 학급 모든 active ParentChildLink → revoked (`classroom_deleted`) + ParentSession 즉시 차단 (다음 요청에서 401)
- **A-25** cascade 학부모 안내 이메일에 학급명만 포함, 교사 이름·사유·이메일 비노출 (D-54 · D-31 격리 승계)

### 3.5 v1 마이그레이션 (A-26 ~ A-28, 3건)

- **A-26** phase2 USER-REVIEW 결정 경로 (Path A/B/C, §5.1 BLOCKER 참조)에 따라 v1 데이터 처리 실행 + 실행 로그 `phase10/migration_log.md` 기록
- **A-27** v1 엔드포인트 (`/api/students/[id]/parent-invites`, `/api/parent-invites/[id]`, `/api/parent/redeem-code`) 는 Path A/B/C 결정에 따라 410 Gone 또는 유예 기간 read-only 처리
- **A-28** `ParentInviteButton` 컴포넌트 및 `ClassroomDetail` 내 진입점 제거, v1 테이블 `ParentInviteCode` 는 읽기전용 history 로 보존 (스키마 삭제 금지, D-02 재해석)

### 3.6 성능·접근성 (A-29, 1건)

- **A-29** 학급 명단 조회 `GET /api/parent/match/students` 응답 페이로드가 학급당 200명 기준 ≤ 200KB, 갤럭시 탭 S6 Lite 기준 `/parent/onboard/match/select` 페이지 TTI < 2s (LTE 네트워크 시뮬)

**수용 기준 총 29건** (seed.yaml 67건을 브라운필드 현실 반영해 병합·압축, USER-REVIEW 1건 포함)

---

## 4. 스코프 결정 모드

**Selective Expansion** — INBOX가 제시한 v2 핵심 흐름 전량(PV-13~16) + AMENDMENT(PV-17) 을 MVP 범위로 채택하되, 파생 고도화(교사 자유 메시지, 에스컬레이션, OAuth, Kakao, 사칭 감지 SOP, Upstash Redis)는 OUT으로 분리. 1인 개발자 공수 34.5~35.5일 내 완료 가능성을 유지하면서 사용자 핵심 요구(운영 비용 N→1, 사칭 차단 게이트, AMENDMENT 수명 정책)만 선택적으로 확장.

**phase3 architect 에게 신호**:
- 기술 스택은 `docs/architecture.md` 잠금 따름 (Next.js 16 + Prisma 6 + Supabase + ParentSession)
- Upstash Redis 도입 여부는 architect 에서 범위 내 판정 (현재 OUT 성향, 브라운필드 TODO 카드만)
- 라우트 그룹 `(authed-preActive)`/`(authed-active)` 분리가 아키텍처 핵심 결정

---

## 5. 위험 요소

### 5.1 BLOCKER — v1 실제 배포 상태 (USER-REVIEW 필수)

**핵심 발견**: INBOX `handoff_note.md §6` 및 `decisions.md D-41~D-46` 은 v1 parent-viewer 를 "미배포, 현역 사용자 0명, 마이그레이션 불요" 로 전제. 실제 코드베이스 감사(research_pack §1.1) 결과:

| 증거 | 위치 |
|---|---|
| Supabase 마이그레이션 적용 완료 | `tasks/2026-04-12-parent-viewer-access/phase10/deploy_log.md` |
| 스키마 live (Parent, ParentInviteCode, ParentChildLink, ParentSession) | `prisma/schema.prisma:649-724` |
| 교사 진입점 배포 | `src/components/ParentInviteButton.tsx` |
| 학부모 앱 라우트 9종 배포 | `src/app/parent/(app)/*` |
| 학부모 API 라우트 배포 | `src/app/api/parent/{session,children,links,account}/**` |
| 발급·교환 API 배포 | `src/app/api/students/[id]/parent-invites`, `/api/parent-invites/[id]`, `/api/parent/redeem-code` |

**USER-REVIEW 결정 포인트**: 다음 3경로 중 사용자 확정 필요.

| Path | 내용 | 추정 추가 공수 |
|---|---|---|
| **A** (INBOX 원안) | 현역 사용자 0명 가정 그대로 진행 → v1 코드 제거 + API 410 Gone + `ParentInviteCode` 읽기전용 보존, 안내 이메일 생략 | +0일 |
| **B** (라이브 사용자 존재) | 학부모 공지 이메일 + 기존 active `ParentChildLink` 자연 공존 + v1 UI 제거 + v1 발급 코드는 `expiresAt` 도래 시 자연 소멸 + v2 병행 운영 60일 | +3~5일 |
| **C** (스모크 테스트 수준) | DB 쿼리로 Parent/ParentChildLink 레코드 수 확인 → 0건이면 Path A, 미미하면 hard delete 후 Path A | +0.5일 |

**권고**: Path C 로 실제 DB 상태 선조사 후 Path A/B 재판정. 본 경로는 **phase3 architect 착수 전 사용자 컨펌 필수**.

### 5.2 구현 리스크

| # | 리스크 | 완화 |
|---|---|---|
| R-1 | 미들웨어 2종 혼용으로 pending 학부모가 자녀 콘텐츠 접근 | ESLint 룰 + 라우트 그룹 분리 + phase9 E2E "pending 세션으로 /parent/(authed-active) 401" 검증 |
| R-2 | 대형 학급 Classroom 삭제 시 cascade 트랜잭션 타임아웃 | 100명 이상 학급은 이메일 큐 외부화 (트랜잭션은 revoke만) |
| R-3 | 학급 코드 유출 → 타 학부모 명단 수집 | 3단계 rate limit + 학교 대표 연락처 이외 교사 PII 비노출 |
| R-4 | Vercel Cron 실패 시 pending 적체 | Cron 실행 로그 감시 + Vercel 자동 retry + 주 1회 수동 점검 SOP (phase10) |
| R-5 | 마스킹 규칙 edge case (1자 이름) | phase3 architect 에서 유니코드 정규화 + "김○" 규칙 명문화 |
| R-6 | rate limit in-memory → multi-instance 환경 무력 | phase3 architect 에서 Upstash Redis 도입 범위 판정 (현재 v2 OUT 성향) |
| R-7 | BoardMember 스키마에 `parentId` 허용 여부 | phase3 architect 에서 현재 `BoardMember` 구조 재확인 — 기존 스키마가 parent 멤버를 받지 않는다면 확장 필요 |
| R-8 | pending 상태 학부모가 매직링크 재인증 시 `status='pending'` 세션 재발급 처리 | phase3 architect 에서 ParentSession 라이프사이클 명세화 |

### 5.3 접근성·성능

- 갤럭시 탭 S6 Lite 기준 TTI < 2s 유지 (A-29)
- 승인 인박스 pending 100건 초과 시 가상 스크롤 또는 페이지네이션 필요 (phase4 design_planner)
- 이메일 템플릿 8종 × 한국어 → i18n 확장 시 파일 수 2배 (현재 한국어 단일)

### 5.4 Karpathy 원칙 체크

- **Think Before Coding**: v1 실제 배포 상태 BLOCKER 를 phase3 착수 전 노출 ✅
- **Simplicity First**: OUT 항목을 명시, 투기적 추상화 금지 (Upstash Redis·OAuth·에스컬레이션 모두 OUT) ✅
- **Surgical Changes**: 변경 surface 를 `phase0/request.json affected_surfaces` 에 열거, 인접 코드 "개선" 금지 ✅
- **Goal-Driven Execution**: 29개 수용 기준이 모두 동사형·검증 가능 ✅

---

## 6. 다음 단계

1. **USER-REVIEW 블로커 해소**: Path A/B/C 결정 (Path C 권고)
2. phase3 architect: 데이터 모델 정밀 설계 + 미들웨어 계약 + 라우트 그룹 구조 + Upstash Redis 판정 + ParentSession 라이프사이클
3. phase4~6: 디자인 계획/shotgun/리뷰 (교사 탭 3-섹션 + 학부모 온보딩 5페이지)
4. phase7 coder: PV-13 → PV-14 → PV-15 → PV-16 → PV-17 순서 (의존성)
5. phase9 QA: 29개 수용 기준 E2E 검증 + A-14 미들웨어 우회 테스트 + A-17 Cron 시뮬
6. phase10 deployer: Path A/B/C 결정에 따라 v1 코드 제거 + `migration_log.md` 기록

---

## 7. 검증 게이트 self-pass

- [x] `scope_decision.md` 존재
- [x] 필수 섹션 5개 모두 기입 (UX 패턴 · MVP 범위 · 수용 기준 · 스코프 모드 · 위험 요소)
- [x] 수용 기준 ≥ 3개 (**29개**)
- [x] 리스크 분석 존재 (BLOCKER 1 + 구현 리스크 8 + 접근성·성능 + Karpathy 체크)
- [x] TODO/TBD/placeholder 부재 (USER-REVIEW 블로커는 정식 결정 포인트로 섹션화)
- [x] 앞 phase 식별자 일관 (task_id `2026-04-15-parent-class-invite-v2` · slug 일치)

**게이트 판정: PASS** — phase3 진입 가능. 단, **§5.1 BLOCKER(v1 배포 상태)는 phase3 architect 착수 전 USER-REVIEW 필수**.
