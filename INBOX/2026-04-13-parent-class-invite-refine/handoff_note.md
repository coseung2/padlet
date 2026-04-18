# Handoff — Parent Class Invite v2 (Seed 7 Refinement)

- **task_id**: `2026-04-13-parent-class-invite-refine`
- **seed_id**: `seed_6d7077aac472` (parent_seed_id=`seed_37b35654542f`, refinement supersede)
- **interview_id**: `interview_20260413_075525`
- **ambiguity (final)**: 0.10 (게이트 ≤ 0.2 통과)
- **change_type**: `feature_revision` (v1 parent-viewer 페어링 흐름 전량 교체)
- **작성일**: 2026-04-13
- **수신자**: padlet feature 파이프라인 Phase 0 analyst (`padlet/prompts/feature/phase0_analyst.md`)

---

## 1. 배경 — refinement 트리거

2026-04-12 생성된 Seed 7 parent-viewer v1(`seed_37b35654542f`)은 **학생 1:코드 1** 모델이었다. 교사가 학생 카드 드롭다운에서 Crockford Base32 6자리 코드를 매 학생마다 발급·전달하는 구조로, N명 학급에서 최소 3N 클릭 + 학부모 전달 채널 N회가 발생하며 운영 부담이 심각했다. 또한 학부모 신원 검증이 **매직링크 수신 소유**에만 의존해 사칭 방어 레이어가 얇았다.

2026-04-13 사용자 직접 피드백으로 change_trigger가 설정되었다: **"학생별 개별 코드 → 학급 단일 초대 코드 + 학부모 셀프 온보딩(학급 명단에서 자녀 선택) + 교사 승인 게이트"**. v1은 미배포 상태(실사용자 0명)이므로 데이터 마이그레이션 없이 완전 폐기 즉시 전환 가능.

refinement 파이프라인(phase0 target → phase1 audit → phase2 delta → phase3 interview → phase4 seed → phase5 integrate → phase6 handoff)을 통해 v1 유지 13건·변경 50건·파생 5건·사용자 대리 4건 = 총 72 결정으로 정규화되었고, 본 핸드오프가 padlet 진입 계약이다.

---

## 2. 참조 문서 필수 독해 순서

1. **`ideation/tasks/2026-04-13-parent-class-invite-refine/phase4/seed.yaml`** — v2 시드 원본. `goal`·`acceptance_criteria`·`ontology_schema`·`supplemental_overlay`(status 전이 머신·거부 이메일 템플릿·마이그레이션 전략 등 phase3 decisions 구조화 병합). **최우선 정본**.
2. **`ideation/plans/parent-viewer-roadmap.md` §11 변경 로그 2026-04-13 행 + §1.5 승인 게이트 흐름 + §1.6 교사 UI + §7 PV-13~PV-16** — v2 활성 스펙. §0~§10도 v2 기준으로 in-place 재작성된 상태. v1의 §1.1·§1.2 원본 내용은 §11 로그와 v1 seed에만 보존.
3. **`ideation/tasks/2026-04-13-parent-class-invite-refine/phase3/decisions.md`** — D-01~D-50 + 사용자 대리 4건 + E-01~E-05 + 유지 13건의 근거·대리 메모·이의 제기 가능 항목. 구현 중 모호 발생 시 본 문서를 1차 참조.
4. **`ideation/tasks/2026-04-13-parent-class-invite-refine/phase1/audit.md`** — v1의 어떤 절·카드가 왜 변경 후보로 분류되었는지. PV-1/2/3/5/8/12 개정 근거와 PV-4/6/7/9/10/11 유지 근거의 감사 원본.
5. **`ideation/tasks/2026-04-13-parent-class-invite-refine/phase2/delta.md`** — audit → 결정 변환 과정. Q1~Q11 인터뷰 질문 설계 원본과 "자명 확정/인터뷰 회부" 분류 근거.
6. **`ideation/tasks/2026-04-13-parent-class-invite-refine/phase5/updated_docs.md`** — plans/ in-place 갱신 범위 요약. padlet이 canva project plans를 읽기 전용 참조할 때 어느 섹션이 v2용인지 지도 제공.
7. **`ideation/plans/phase0-requests.md` PV-v2-BUNDLE 블록** — 통합 진입 JSON 원본. 본 핸드오프의 padlet_phase0_request.json과 교차 검증용.
8. **`ideation/tasks/2026-04-12-parent-viewer-access/phase4/seed.yaml`** — v1 원시드(수정 금지, archive 예정). parent_seed_id 체인 추적과 "v1에서 유지된 13건"의 출처 확인용.

> 독해 완료 후 혼란 시 체인: `phase4/seed.yaml(seed_6d7077aac472)` → `roadmap §11` → `phase3/decisions.md` → (v1 원인) `phase1/audit.md`.

---

## 3. 기준 환경·제약

### 3.1 단말·성능 (v1에서 계승 — 변경 없음)

- **주 단말**: 갤럭시 탭 S6 Lite (학교 지급, 10.4" 2000x1200, Exynos 9611) + 스마트폰 PWA (320~430px, iOS Safari / Android Chrome)
- **네트워크**: 3G~LTE, TTI < 2s LTE / < 3s 3G, first viewport < 500KB, thumbnail < 200KB
- **iframe 금지**, proxy thumbnail only (Vercel Blob presigned)
- **WebSocket 비활성**, SWR 60s 폴링
- Pro tier 주간 이메일 월 09:00 KST (개별 발송, BCC 금지)

### 3.2 보안·격리 (v1 §1.2 유지 + v2 확장)

- **GPL 격리 삼중 방어 유지**: API 필터링(1차) + DOM 마스킹(보조) + Postgres RLS(최종)
- **Revoke SLA ≤ 60s** (`revokedAt IS NOT NULL → 401`)
- **매직링크 15분 + ParentSession 7일 TTL** (v1 유지)
- **학부모 간 BCC 금지·이름 비노출** (v1 유지)
- **자녀 5명/학부모 상한** (v1 유지)
- **Crockford Base32 + CSPRNG 코드 생성 규칙** (v1 유지, 자릿수만 6→8 확장)
- **Soft delete 90일 익명화** (v1 유지)

### 3.3 v2 신규 제약

- **학급 코드 자릿수 8** (32⁸≈10¹², v1의 6자리 10⁹에서 상향 — 학급 노출 면적 대응)
- **학급 코드 수명**: 학기말 자동 만료 + 교사 수동 회전 + 무제한 maxUses (v1의 "48h/maxUses 3" 폐기)
- **Rate limit**: IP 5회/15분 + 코드 50회/일 + **학급 100회/일** (신규)
- **코드 자동 만료 제거** (v1의 "10회 실패 즉시 만료"는 DoS 벡터로 판단, D-13)
- **pending TTL 7일** + 학부모당 동시 pending 3건 상한
- **승인 SLA 권고 24h** (비강제, Cron은 7일 후 자동 만료)
- **거부 이메일 쿨다운 24h** (동일 이메일 거부 3회 초과 시)
- **교사 자유 메시지 입력·에스컬레이션 경로 v1 미제공** (v2 파킹)

### 3.4 §1~§5 유지 결정 기준선 (재질문 금지)

parent-viewer-roadmap.md §1 인증(매직링크 전용·비밀번호 없음·세션 7일)·§2 자녀 범위 매트릭스(§5 SSOT)·§3 탈퇴 Soft delete 고정·§4 주간 이메일 Pro tier 월요일·§5 콘텐츠 격리 RLS 단방향은 **변경 없음**. v2는 § 1.1(페어링)·§1.2(Revoke·격리 상태 전이)·§1.3(알림)·§1.4(탈퇴·감사)의 일부 행과 §1.5·§1.6 신설만 수행.

---

## 4. 이번 작업 (seed.goal)

**Aura-board 학부모 페어링 v2 구현** — 학급 단위 단일 초대 코드(`ClassInviteCode`) + 학부모 셀프매칭(학급 명단에서 반·번호·마스킹 이름으로 자녀 선택) + 교사 승인 게이트(`ParentChildLink.status` 4-value 전이 머신)로 v1의 학생 1:코드 1 모델을 완전 대체. 교사 운영 부담을 학생 수 → 1 승인 클릭 수준으로 감소시키고, 승인 게이트를 추가 사칭 차단 레이어로 확립. v1 시드(`seed_37b35654542f`)는 archive 이관, v2 시드(`seed_6d7077aac472`)가 활성 스펙.

---

## 5. 수용 기준 체크리스트 (67건 1:1 매핑)

> seed.yaml `acceptance_criteria` + `supplemental_overlay` + phase3 `decisions.md` D-01~D-50, 사용자 대리 4건, v1 유지 13건의 1:1 전수 매핑. 총 67건.
>
> **사용자 대리 확정 4건(U-01~U-04)**은 사용자 이의 제기 가능 항목으로 [USER-REVIEW] 표기.

### 5.1 엔티티·데이터 모델 (D-01~D-08, 8건)

- [ ] **D-01** `ClassInviteCode` 엔티티 신설 — 학급 1:코드 1, `classroomId`·`code`(8자리)·`issuedById`·`expiresAt`(학기말)·`maxUses`(null=무제한)·`rotatedAt`
- [ ] **D-02** `ParentInviteCode` 테이블 **생성하지 않음** (v1 미배포, 마이그레이션 불필요). v1 엔드포인트는 410 Gone 반환
- [ ] **D-03** `ParentChildLink.status` 유니언 4-value: `"pending" | "active" | "rejected" | "revoked"`
- [ ] **D-04** status 전이 머신: `pending → active`(approve), `pending → rejected`(reject/auto_expire/code_rotated), `active → revoked`(teacher_revoked/year_end/parent_self_leave)
- [ ] **D-05** `revokedReason` enum 확장: `rejected_by_teacher` + `auto_expired_pending` + `code_rotated` 신규 + v1 3종(teacher_revoked·year_end·parent_self_leave) 재명명 유지 — 총 6값
- [ ] **D-06** `rejectedReason` enum 신규: `wrong_child` / `not_parent` / `other` (자유 텍스트 없음)
- [ ] **D-07** `ParentChildLink` 감사 필드 6종 추가: `requestedAt, approvedAt, approvedById, rejectedAt, rejectedById, rejectedReason`
- [ ] **D-08** `@@unique([parentId, studentId])` 유지 + 부·모 각각 별도 `parentId`로 동일 `studentId`에 독립 신청 허용 (자녀당 active 학부모 상한 없음)

### 5.2 코드 엔트로피·수명·보안 (D-09~D-15, 7건)

- [ ] **D-09** 학급 코드 Crockford Base32 **8자리** (32⁸≈10¹²)
- [ ] **D-10** 학급 코드 수명 = 학기말 자동 만료 + 교사 수동 회전 버튼 + 무제한 maxUses
- [ ] **D-11** brute-force IP 잠금: IP당 5회/15분 (v1 유지)
- [ ] **D-12** brute-force 코드·학급 rate limit: 코드당 50회/일 + 학급 100회/일 (신규)
- [ ] **D-13** 코드 10회 실패 즉시 만료 **제거** (DoS 벡터 방지)
- [ ] **D-14** 거부율 임계 초과 시 교사 알림 배지만 v1 제공 (SOP 고도화는 P2 파킹)
- [ ] **D-15** CSPRNG + Crockford 규칙(O/0·I/1·L 제외 대문자) 유지

### 5.3 셀프매칭 UX (D-16~D-18, 3건)

- [ ] **D-16** 학생 명단 표시 범위: 반(class_no) + 번호(student_no) + 마스킹 이름 (형식 "3반 12번 김O민"; 2자는 "김O")
- [ ] **D-17** 프로필 사진 노출 금지
- [ ] **D-18** 자녀 선택 UI: 학급 내 학생 카드 리스트, 반·번호 오름차순 정렬, 1건 선택 후 매칭 신청

### 5.4 승인 플로우 (D-19~D-27, 9건)

- [ ] **D-19** pending TTL 7일 → D+7 자동 만료
- [ ] **D-20** 학부모당 동시 pending 상한 3건
- [ ] **D-21** 승인 SLA 권고 24h, hard SLA 없음 (교사 안내 문구만)
- [ ] **D-22** 교사 알림 스케줄: D+0 인박스 배지 / D+3 이메일 리마인더 / D+6 최종 경고 이메일 / D+7 자동 만료 요약 이메일
- [ ] **D-23** 에스컬레이션 경로 v1 미제공 (v2 파킹)
- [ ] **D-24** Vercel Cron 일 1회 **KST 02:00** (UTC 17:00) pending 스캔 → `auto_expired_pending` rejected 처리
- [ ] **D-25** `ParentSession` 발급 시점 = **signup 시점** (pending 상태 조회 UX 위해)
- [ ] **D-26** `BoardMember` 발급 시점 = **approve 시점** (RLS 오염 방지)
- [ ] **D-27** pending HTTP 응답 = **200 OK + `{"status":"pending"}` payload flag** → 클라이언트가 `/parent/onboard/pending` 렌더

### 5.5 거부 안내 톤 (D-28~D-33, 6건)

- [ ] **D-28** 교사 능동 거부 = 사전 정의 사유 3종 드롭다운 (`wrong_child` / `not_parent` / `other`)
- [ ] **D-29** 교사 자유 메시지 입력 v1 미제공 (v2 파킹)
- [ ] **D-30** D+7 자동 만료 문구 = 시스템 고정 ("7일간 승인이 이루어지지 않아 신청이 자동 만료되었습니다. 여전히 자녀 계정 열람이 필요하시면 아래 링크에서 재신청해 주세요.")
- [ ] **D-31** 거부 이메일에 교사 이름·이메일·전화번호 비노출 (학교 대표 연락처만, "담임 교사" 표현)
- [ ] **D-32** 거부·만료 이메일에 학급 코드 재입력 페이지 deep link 포함 (재신청 flow)
- [ ] **D-33** 동일 이메일 거부 누적 3회 초과 시 24시간 재신청 차단 (쿨다운)

### 5.6 교사 UI (D-34~D-35, 2건)

- [ ] **D-34** 교사 UI = 학급 설정 > "학부모 액세스" 탭 내부 3-섹션: (a) 초대 코드 (b) 승인 대기 인박스 (c) 연결된 학부모. 배지 체계 D+0~2 회색 / D+3~5 노랑 / D+6 빨강
- [ ] **D-35** 학생 카드 드롭다운 "학부모 초대" 항목 제거 (v1 경로는 읽기 전용 history 페이지로만 잔존)

### 5.7 API·미들웨어 (D-36~D-38, 3건)

- [ ] **D-36** 신규 엔드포인트: `POST /api/parent/signup` / `POST /api/parent/match/code` / `GET /api/parent/match/students` / `POST /api/parent/match/request` / `POST /api/parent/approvals/:id/approve` / `POST /api/parent/approvals/:id/reject` / `POST /api/class-invite-codes` / `POST /api/class-invite-codes/:id/rotate`
- [ ] **D-37** `parentAuthOnlyMiddleware` 신규 — 매칭 전 엔드포인트 전용. `parentScopeMiddleware` 우회 불가. ESLint 룰 2종 분기 명시
- [ ] **D-38** 세션 7일 + 매직링크 15분 유지

### 5.8 code_rotated 처리 (D-39~D-40, 2건)

- [ ] **D-39** 회전 시 해당 학급 pending 링크 일괄 `rejected` (reason=`code_rotated`) 처리 + 학부모 안내 이메일 발송
- [ ] **D-40** 회전 시 active 링크 유지 (active는 링크 객체이며 코드 참조 X)

### 5.9 마이그레이션 (D-41~D-46, 6건)

- [ ] **D-41** v2 배포 방식 = 완전 폐기 + 즉시 전환, `ClassInviteCode` 테이블만 신설
- [ ] **D-42** `ParentInviteCode` DROP 문 불필요 (존재한 적 없음)
- [ ] **D-43** `seed_37b35654542f`는 phase7 dispatcher가 `destinations/archive/`로 이관
- [ ] **D-44** `seeds-index.md` Seed-7 = 수퍼시드 표기, 기존 시드는 `[superseded by seed_6d7077aac472]`
- [ ] **D-45** 단일 Prisma migration: `ClassInviteCode` CREATE + `ParentChildLink.status` 유니언 확장 + 감사 필드 6종 ADD + `revokedReason`·`rejectedReason` enum 확장 + `@@index([requestedAt])` 추가 (Cron D+7 스캔)
- [ ] **D-46** 교사 안내 이메일 불필요 (현역 사용자 0명)

### 5.10 기타 (D-47~D-50, 4건)

- [ ] **D-47** 90일 내 재가입 경로 = 학급 코드 재입력 + 재승인 (v1 "교사 재발급" 대체)
- [ ] **D-48** 사칭 감지 SOP v1 = 교사 수동 회전 버튼 + 거부율 임계 배지만 (상세 SOP는 P2 파킹)
- [ ] **D-49** PV 작업 카드 = PV-1·2·3·5·8·12 개정 + PV-13·14·15·16 신설 (총 개정·신설 10건, 유지 6건)
- [ ] **D-50** 공수 증분 +6~7일 수용 (27일 → 33~34일)

### 5.11 파생 결정 E-01~E-05 (5건)

- [ ] **E-01** 거부 이메일 쿨다운 24h (D-33과 동일, 별도 추적)
- [ ] **E-02** 거부 이메일에 재신청 deep link 포함 (D-32와 동일)
- [ ] **E-03** 자동 만료 Cron Vercel 일 1회 KST 02:00 (D-24와 동일)
- [ ] **E-04** 교사 알림 채널 구분: 배지(D+0 in-app) + 이메일(D+3·D+6·D+7). 푸시·SMS 미사용
- [ ] **E-05** 거부 사유 enum 저장: `ParentChildLink.rejectedReason` 필드에 3값 enum 저장 (감사·리포팅용)

### 5.12 사용자 대리 확정 4건 [USER-REVIEW]

- [ ] **U-01** [USER-REVIEW] 승인 SLA 정책 = 권고 24h / 자동 만료 7d / 에스컬레이션 없음 + D+3·D+6 리마인더 (1인 개발자 부담 최소화 근거)
- [ ] **U-02** [USER-REVIEW] 거부 시 학부모 안내 톤 = 사전 정의 사유 3종 + 교사 정보 비노출 (PII 격리 + 모더레이션 리스크 차단)
- [ ] **U-03** [USER-REVIEW] 셀프매칭 명단 노출 범위 = 반·번호 + 이름 마스킹 "김O민" (PII 최소)
- [ ] **U-04** [USER-REVIEW] 기존 학생별 코드 마이그레이션 = 완전 폐기 즉시 전환 (v1 미배포 전제)

### 5.13 v1 유지 13건 (재질문 금지 기준선)

- [ ] **R-01** 인증 = 매직 링크(이메일 OTP) 전용, 유효 15분
- [ ] **R-02** `ParentSession` 7일 TTL + 재인증 시 이메일만
- [ ] **R-03** 학부모 1인당 자녀 연결 **5명** 상한 (tier 무관)
- [ ] **R-04** 학부모 간 격리: BCC 금지 + 부/모/조부모 상호 비노출 + 이름 비노출
- [ ] **R-05** 콘텐츠 격리 삼중: API 필터 + DOM 마스킹 + RLS, parentA→B 404, 타 학생 403
- [ ] **R-06** 자녀 범위 매트릭스 §5 전체 (매칭 active 이후 규칙)
- [ ] **R-07** 탈퇴 soft delete 고정 + 90일 email SHA-256 익명화 + hard delete 금지
- [ ] **R-08** 주간 이메일 월 09:00 KST + 활동 0건 스킵 + BCC 금지 개별 발송
- [ ] **R-09** Revoke SLA ≤ 60초 (SWR 60s 폴링)
- [ ] **R-10** 성능 예산 TTI < 2s LTE / < 3s 3G / 첫 뷰포트 < 500KB / 썸네일 < 200KB
- [ ] **R-11** 전송 제약: iframe 금지, proxy thumbnail only, WebSocket 비활성 SWR 60s polling
- [ ] **R-12** Crockford 규칙 O/0·I/1·L 제외 대문자 + CSPRNG
- [ ] **R-13** v1 스코프 유지: parent read-only (응원·댓글·좋아요는 v2+ 파킹)

---

## 6. 주의사항

- **v1 미배포 전제**: 원 parent-viewer 시드(`seed_37b35654542f`)는 설계만 완료된 상태로 현역 사용자 0명 · 발급 코드 0건 · DB 테이블 `ParentInviteCode` 미생성. 따라서 **데이터 마이그레이션·학부모 안내·DROP 문이 모두 불필요**. 단, 가정이 틀릴 경우(실제로 v1 일부가 stage에 배포되어 있다면) 즉시 오케스트레이터에 보고 후 마이그레이션 카드 추가 설계 필요.
- **학급 코드 brute-force 노출 면적 확대**: 학생 코드 6자리(10⁹)에서 학급 코드 8자리(10¹²)로 확장해 수학적 방어력은 3자릿수 증가했으나, **동일 코드가 학급 내 수십 명 학부모에게 공유**되므로 실질적 소셜 유출 경로(단톡방·문자 등)가 넓다. IP 5회/15분 + 코드 50회/일 + **학급 100회/일 rate limit 정책 강화 필수** (`middleware/rateLimit.ts` 3단계 카운터 구현). 코드 자동 만료(10회 실패)는 DoS 벡터로 제거된 상태이므로 rate limit 이외의 자가 방어 레이어가 없음을 유의.
- **학생 명단 노출 시 PII 마스킹 엄수**: 셀프매칭 `GET /api/parent/match/students` 응답에서 **반/번호/마스킹 이름만** 노출하고 `full_name`·`phone`·`address`·`birthdate`·프로필 사진·학부모 정보 등 모든 PII 필드를 서버측에서 제거. 마스킹 규칙은 "성 + O + 끝글자" (예: 김보민 → "김O민", 박지 → "박O", 남궁민 → "남O민" — 성 1글자 규칙은 한국 이름 일반 규칙 따름, edge case는 1글자 이름에 대해 "O"만 노출). 클라이언트 사이드 필터만으로 해결 금지 — RLS + API 필터 이중 적용.
- **pending 상태 학부모 401 정책**: `parentScopeMiddleware`는 `status='active'` 조건을 추가로 검증해야 함. `status='pending'` 세션은 `/api/parent/onboard/*`·`/api/parent/match/*`·`/api/parent/pending` 엔드포인트만 통과하고, 나머지 `/api/parent/*` (자녀 콘텐츠 열람)는 **401 반환**. `/parent/(authed-preActive)/` 라우트 그룹과 `/parent/(authed-active)/` 라우트 그룹 분리 필수. `parentAuthOnlyMiddleware`(매칭 전 전용)와 `parentScopeMiddleware`(매칭 후 전용) 2종으로 분기하고 ESLint 룰로 우회 방지.
- **사용자 대리 확정 4건 재검토 가능**: U-01(SLA 수치)·U-02(거부 톤)·U-03(명단 노출 범위)·U-04(마이그레이션 전략)는 에이전트 자율 답변으로 확정됐으나 운영·UX 규범 영역이므로 사용자 이의 제기 시 padlet phase0 analyst 단계에서 재조정 가능. 이의 없으면 확정으로 진행. 구현 분기 영향: U-01은 Cron 스케줄·이메일 템플릿 시점, U-02는 거부 이메일 본문·드롭다운 UI, U-03은 마스킹 함수 구현, U-04는 migration 스크립트 범위.
- **한국 학교 환경 가족 구조 다양성**: 부·모가 동시에 서로 다른 학부모 계정으로 신청하는 케이스가 **정상 경로**(D-08). `@@unique([parentId, studentId])`만 강제하며 자녀당 active 학부모 수 상한은 두지 않음. 단 학부모 간 상호 비노출 원칙(R-04)은 유지 — 부·모는 서로의 계정 존재·이름·활동을 알 수 없음. 추가로 **학부모 시간대 다양성**(야간 근무·맞벌이) 반영해 D+3/D+6 이메일은 KST 09:00 이후 고정 발송, 학부모 피크 시간 고려한 리마인더 톤 유지. 조부모·위탁 양육자 신청 시 `not_parent` 거부 대신 교사 재량으로 `other` 사유 후 오프라인 학교 문의 유도 (운영 문서화는 D-48 P2 파킹).
- **SSOT 준수 (v1에서 계승)**: 자녀 범위 필터는 `parent-viewer-roadmap.md §5` cross-cutting 매트릭스가 정본. Seed 1·3·4·6 로드맵과 불일치 시 §5를 기준으로 각 feature 로드맵 교정. 반대 방향 금지.
- **padlet feature 파이프라인 준수**: request.json은 phase0 포맷 고정. refinement 메타(`refinement`·`parent_seed_id`·`supersedes`)는 padlet analyst가 해석 후 phase1 이후 파이프라인에 전파. 본 단계에서 오케스트레이터의 임의 스코프 확장·사용자 재인터뷰 금지.
- **v1/v2 경계**: 교사 자유 메시지·에스컬레이션·부·모 합산 권한·Kakao OAuth·Parent 앱 네이티브·사칭 감지 SOP는 v2+ 파킹. request.json `out_of_scope_v2`에 명시됨. 이들 항목을 padlet phase1~ 스코프에 섞지 말 것.

---

## 7. 핸드오프 산출물

- `tasks/2026-04-13-parent-class-invite-refine/phase6/padlet_phase0_request.json` — padlet feature phase0 포맷 (refinement 메타 포함)
- `tasks/2026-04-13-parent-class-invite-refine/phase6/handoff_note.md` — 본 문서

**다음 단계**: phase7 dispatcher가 본 산출물을 `padlet/INBOX/`로 배송 + `seed_37b35654542f`를 `destinations/archive/`로 이관. padlet 측에서 `tasks/2026-04-13-parent-class-invite-v2-impl/phase0/request.json`에 상기 JSON 투입 → **PV-13(셀프매칭)** 착수. 병렬로 PV-14(승인 인박스)·PV-15(Cron·이메일)·PV-16(코드 회전) 진행.
