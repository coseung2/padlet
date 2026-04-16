# Phase 3 — Parent/Viewer Access 결정 요약

- **task_id**: `2026-04-12-parent-viewer-access`
- **session_id**: `interview_20260412_111153`
- **ambiguity**: **0.15** (임계치 0.2 충족)
- **운영 모드**: 자율 판단 (사용자 부재, AskUserQuestion 미사용)
- **입력**: `phase2/sketch.md` 미결 7개 + 인터뷰 중 추가 도출 6개 파생 항목

---

## 1. 미결 7개 해소 (sketch.md §9)

| # | 미결 | 결정 | 근거 |
|---|---|---|---|
| 1 | 페어링 방식 조합 | **Crockford Base32 6자리 코드 + QR 병행** (학생 탭에서 부모폰 스캔), **자동 active + 교사 revoke**, 48h / maxUses 3 | ClassDojo·Seesaw UX, 교사 승인 단계는 발급 모달에서 이미 흡수 |
| 2 | 알림 v1 범위 | **인앱 배지 (Free/Pro 공통) + 주간 이메일 요약 (Pro 전용)**. 실시간 push·카톡 알림톡은 v2+ | 보수적 기본값, 스마트폰 배터리 절약, Resend 인프라 승계 |
| 3 | 학부모 1인당 자녀 수 | **5명 상한** (tier 무관) | 다자녀 + 친척 돌봄 현실 상한, 앱 레벨 enforce |
| 4 | 학부모 코멘트 기능 | **v1 순수 read-only**. 응원 이모지조차 v2 파킹 | 학생·교사 방해 최소화, 복잡도 경감 |
| 5 | 스마트폰 뷰 분기 | **`/parent/*` 별도 라우트 + Tailwind breakpoint 기반 반응형 + PWA 설치 지원**. 별도 도메인/앱 X | 코드베이스 단일 유지, PWA가 네이티브 설치 요구 해소 |
| 6 | 학생 개인정보 기본값 | **자녀 본명 기본 노출** (가족 맥락). 자녀 본인 업로드 사진만 표시, 타 학생 사진은 DOM 마스킹. 복수 학부모 간 격리는 RLS로 단방향 | Seed 1·4 승계, 개보법·법적 책임 방지 |
| 7 | tier 연계 | **Free 기본 제공** (교사·학부모 모두). Free는 인앱만, Pro는 주간 이메일 + 향후 푸시. **발급 한도만 tier gating** (Free 자녀당 2 / Pro 자녀당 5) | 교육 공공성, 학부모 소외 방지 |

---

## 2. 인터뷰 중 추가 도출된 파생 결정 (8건)

### A1. 타 학생 정보 유출 방어선
- **API 응답 필터링 (서버 미들웨어·RLS)이 1차 방어선**, DOM 마스킹은 보조
- `/parent/*` API 전체 `parentScopeMiddleware` 통과 필수
- `studentId` 파라미터 수신 시 `parent.children` 포함 검증
- 썸네일 URL은 presigned 또는 RLS-scoped query (URL 추측 차단)
- **E2E 게이트**: parent 토큰으로 타 학생 studentId API 직접 호출 → **403 필수**

### A2. Revoke 즉시성 SLA
- **v1 SLA: ≤ 60초** (SWR 폴링 주기에 얹음). 완전 즉시(< 1s)는 Redis 블랙리스트 인프라 요구 → v1 범위 초과
- `ParentSession.revokedAt IS NOT NULL` → 모든 `/parent/*` API 미들웨어에서 **401**
- 클라이언트: 401 수신 시 자동 로그아웃 + "접근이 해제되었습니다" 전환
- 교사 UI: "revoke 후 최대 1분 내 차단됩니다" 기대치 문구 명시

### A3. Parent Code brute-force 방어
- **이중 rate limit**:
  - IP당 **5회 실패 / 15분 → 15분 잠금**
  - 코드당 **10회 실패 시 즉시 만료** (maxUses 3과 별개)
- **엔트로피**: **Crockford Base32 6자리** (32⁶ ≈ 1×10⁹, O/0·I/1·L 제외, 대문자 고정)
- `crypto.randomBytes` CSPRNG 사용 (Math.random 금지)
- `ParentInviteCode.failedAttempts` 카운터 필드 추가
- Vercel Edge Middleware + Upstash Redis 기반 rate limit

### A4. 학부모 최초 인증 플로우
- **매직 링크 (이메일 OTP) v1 기본**. 비밀번호·Kakao OAuth는 v2+
- `Parent.email` 필수, 매직 링크 유효시간 15분
- ParentSession 토큰 발급, 세션 만료 **7일** (재방문 마찰 최소)
- 동일 이메일 재가입 시 기존 `ParentChildLink`에 새 세션만 추가 (중복 계정 방지)
- 세션 만료 후 재인증 = 이메일만으로 재진행 (코드 재입력 불필요)

### A5. 교사 학부모 관리 UI 배치
- **혼합 패턴**:
  - **발급**: 학생 카드 드롭다운 "학부모 초대" → 코드 + QR 모달 → 복사/공유
  - **관리**: 학급 설정 "학부모 액세스" 탭 → 전체 `ParentChildLink` 목록 + 마지막 접속일 + 1-click revoke
- revoke 확인 모달에 "최대 1분 내 차단됩니다" 문구 포함
- 코드 만료(48h) / 소진(maxUses 3) 후 → 동일 학생 카드에서 재발급 버튼 노출

### A6. 학부모-학부모 격리 (동일 자녀 부/모/조부모 간)
- **각 Parent 레코드는 타 Parent 레코드에 접근 불가** — `ParentChildLink`는 단방향 조회만
- **API**: `/parent/*`는 `req.parentId`(세션 기반)만 참조 → 동일 studentId를 보는 다른 parentId 목록 응답 포함 불가
- **DB RLS**: `ParentChildLink` SELECT 정책 = `parent_id = auth.parent_id()` → 자신의 링크만 조회
- **주간 이메일**: 각 학부모에게 **개별 발송** (BCC 금지)
- **교사 관리 UI**: 학부모 이름·이메일은 교사에게만 표시, 동일 자녀의 다른 학부모에게는 비표시
- **E2E 게이트**: parentA 토큰으로 parentB의 ParentChildLink 조회 시도 → **404** (존재 불인식)

### A7. 주간 이메일 요약 콘텐츠 범위
- **집계 + 대표 썸네일 1장 혼합** 방식
- 발송: 매주 월요일 00:00 UTC (= KST 09:00), Vercel Cron
- 수신 자격: **Pro 학부모만**
- 섹션: 헤더 → 활동 집계 ("그림 N건, 관찰일지 N건, 행사 공지 N건, 숙제 피드백 N건", 0건 항목 숨김) → 대표 썸네일 1장 → 교사 피드백 발췌 (1~3개 bullet) → CTA "자세히 보기" 딥링크
- **제외**: 타 학생 정보, 학급 전체 공지 (자녀 범위 한정), Quiz 점수(v1 비노출)
- **활동 0건 주**: 이메일 스킵 (스팸 회피, `lastSummarySkippedAt` 기록)
- **수신 거부**: `Parent.emailSummaryOptOut: Boolean @default(false)` — 계정 삭제 없이 이메일만 중단
- 렌더링: React Email + Resend, 썸네일 presigned URL 유효 **7일**

### A8. 학부모 탈퇴 플로우
- **Soft delete 고정** — hard delete 금지
- 근거: 감사 로그(`issuedById·revokedReason`) 법적 증빙, GDPR/개보법은 익명화로 충족
- 시퀀스:
  1. 학부모 "계정 탈퇴" 요청 → `Parent.deletedAt = now()` + 모든 `ParentSession` 즉시 무효화
  2. 모든 `ParentChildLink.status = "revoked"`, `revokedReason = "self_withdraw"`, `deletedAt = now()`
  3. **90일 후 Cron 자동 익명화**: `Parent.email → SHA-256 hash` 또는 `deleted-{id}@anonymized.local`, `displayName = "탈퇴한 학부모"`, `phoneHash = null`. `ParentChildLink` 레코드는 유지 (감사 보존)
  4. 90일 이내 재가입 시 동일 이메일로 계정 복구 (`deletedAt = null` 복귀), 기존 링크는 복원하지 않고 신규 Parent Code 재발급 필요
- `/parent/*` 미들웨어: `Parent.deletedAt IS NOT NULL` → 즉시 401
- 교사 UI: "연결 해제됨 (탈퇴)"로 표시, 이름·이메일 비표시

---

## 3. 행사 보드·Breakout 학부모 열람 범위 (보충 자율 결정)

| 콘텐츠 | 학부모 열람 범위 | 구현 원칙 |
|---|---|---|
| **행사 보드 (Seed 3)** | 자녀 학급 전체 이벤트 노출 (참가자 명단·득점 제외) | `EventSignup` 응답에서 `studentId ≠ child` 레코드 제거. 자녀 본인 Submission·피드백만 표시 |
| **Breakout (Seed 6)** | 자녀 본인 세션 결과·제출물만 | `session.studentId ∈ parent.children` 검증 후 반환. 교사-pool Section 제외 |

---

## 4. Prisma 스키마 최종 확정 (sketch §2 + 파생)

**신규 필드 추가**:
- `Parent.emailSummaryOptOut Boolean @default(false)` — 이메일 수신 거부
- `Parent.deletedAt DateTime?` — soft delete (sketch의 `revokedAt`과 용도 중복 확인: `deletedAt`은 학부모 자발, `revokedAt`은 교사 액션)
- `ParentChildLink.deletedAt DateTime?` — soft delete (기존 `revokedAt`과 병존: `revokedAt`=교사 철회, `deletedAt`=학부모 탈퇴)
- `ParentInviteCode.failedAttempts Int @default(0)` — rate limit 카운터

**Parent Code 생성 규칙**:
- Crockford Base32 6자리 (32⁶ ≈ 1×10⁹ 조합)
- O/0·I/1·L 제외, 대문자 고정
- `crypto.randomBytes` 기반 CSPRNG

---

## 5. 검증 게이트 (phase9 신규 추가)

- [ ] 390px 세로 뷰포트 Lighthouse Mobile Score ≥ 90
- [ ] 3G fast 에뮬레이션 TTI < 3s
- [ ] iframe 마운트 0건 검증 (DOM snapshot)
- [ ] **E2E 보안 게이트 (신규 추가)**:
  - [ ] parent 토큰으로 타 학생 studentId API 직접 호출 → **403** 반환
  - [ ] parentA 토큰으로 parentB의 ParentChildLink 조회 → **404** (존재 불인식)
  - [ ] 타 학생 썸네일 URL 직접 접근 → **403** (presigned 검증)
  - [ ] 교사 revoke 후 60초 이내 학부모 세션 **401** 수신
  - [ ] brute-force IP 5회 실패 시 15분 잠금, 코드 10회 실패 시 즉시 만료
- [ ] 주간 이메일: 활동 0건 주 발송 스킵 검증
- [ ] 학부모 탈퇴 후 90일 경과 시 익명화 Cron 실행 검증

---

## 6. v1 제외 (v2+ 파킹) 명시

- 실시간 push 알림 (Pro 확장 후보)
- 카카오톡 알림톡
- 학부모 코멘트·좋아요·응원 이모지
- Kakao/Google OAuth (매직 링크만 v1)
- Quiz 점수 열람 (사후 요약 리포트)
- 학부모 셀프 자녀 이동·연결 변경 (교사 재발급 경유)
- Redis 블랙리스트 기반 즉시 revoke (< 1s)
- 비밀번호 기반 로그인

---

## 7. 새로 드러난 분기 (현재 세션 편입 금지, 차기 로드맵)

- **Enterprise 학교 SSO**: 현재 개별 매직 링크 → 학교 G Suite / 네이버웍스 SSO 연동은 v2.5+ 분리 작업
- **Parent 앱 native (Flutter/React Native)**: PWA로 출발, 가족 사용률 20% 초과 시 네이티브 분기 검토
- **학부모 간 통신 채널**: 현재 격리 엄수, v3에서 "반 대표 학부모" 공식 역할 신설 검토 가능

---

## 8. 최종 요약

**ambiguity = 0.15 (임계치 0.2 통과)** — Seed 생성 준비 완료.

- 결정 건수: 7 (sketch 미결) + 8 (파생) + 2 (콘텐츠 범위 보충) = **17건**
- 근거: phase1 하이브리드 전제 + Seed 1·3·4·6 승계 + Canvas/ClassDojo/Seesaw 관례 + 개보법·GDPR 요건
- 다음 단계: `phase4` → `/ouroboros:seed` 로 Seed 명세 고정
