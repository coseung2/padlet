# Phase 3 Decisions — Parent Class Invite Refine

- **task_id**: `2026-04-13-parent-class-invite-refine`
- **session_id**: `interview_20260413_075525`
- **parent_seed_id**: `seed_37b35654542f` (2026-04-12 parent-viewer-access, v2 수퍼시드 대상)
- **ambiguity (final)**: **0.10** (≤ 0.2 게이트 통과)
- **인터뷰 라운드**: 3턴 (SLA → 거부 톤 → 마이그레이션)
- **change_trigger**: 학생별 개별 코드 → 학급 단일 코드 + 학부모 셀프 온보딩 + 교사 승인 게이트

---

## 1. 확정 결정 — 자율 답변 (에이전트 결정)

delta.md의 자명 확정 항목 + 인터뷰 라운드 2·3에서 에이전트가 답변한 항목.

### 1.1 엔티티·데이터 모델

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| D-01 | 페어링 단위 (A) | **학급 1 : 코드 1** — `ClassInviteCode` 엔티티 신설 | change_trigger 사용자 명시 |
| D-02 | `ParentInviteCode` 테이블 | **생성하지 않음** (미배포 상태, 마이그레이션 불필요) | 인터뷰 라운드 3 |
| D-03 | `ParentChildLink.status` 유니언 (D1) | `"pending" \| "active" \| "rejected" \| "revoked"` (4-value) | 구조적 필연 |
| D-04 | status 전이 머신 | `pending → active` (approve), `pending → rejected` (reject/auto_expire), `active → revoked` (기존) | 자명 |
| D-05 | `revokedReason` 확장 (D, N6) | **+ `rejected_by_teacher` + `auto_expired_pending` + `code_rotated`** | 승인/만료/회전 경로 필연 |
| D-06 | `rejectedReason` enum (신규) | `wrong_child` / `not_parent` / `other` (자유 텍스트 없음) | 인터뷰 라운드 2 |
| D-07 | 감사 필드 6종 (N5) | `requestedAt, approvedAt, approvedById, rejectedAt, rejectedById, rejectedReason` | 감사 요건 |
| D-08 | `@@unique([parentId, studentId])` (I1) | **유지** + 다른 parent 독립 신청 허용 (자녀당 active 학부모 상한 없음) | 부·모 공동 양육 현실 |

### 1.2 코드 엔트로피·수명·보안 (B, C, N2, N3)

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| D-09 | 학급 코드 자릿수 | **Crockford Base32 8자리** (32⁸≈10¹²) | 학급 노출 면적 ↑ 대응, 기존 6자리에서 상향 |
| D-10 | 학급 코드 수명 | **학기말 자동 만료** + 교사 수동 회전 버튼 + 무제한 maxUses | 운영 현실·회전 피로 최소 |
| D-11 | brute-force — IP | **IP당 5회/15분** 잠금 (기존 유지) | parent-viewer §1.1 승계 |
| D-12 | brute-force — 코드 | **코드당 50회/일** + **학급 단위 100회/일** rate limit | 학급 단위 노출 면적 대응 (에이전트 자명 강화) |
| D-13 | 코드 자동 만료 제거 | **코드 10회 실패 즉시 만료 제거** (DoS 벡터 방지) | 수학적 자명 |
| D-14 | 교사 알림 — 거부율 임계 | **거부율 임계 초과 시 교사 알림 배지**만 v1 제공 | N15 SOP는 운영 단계 이관 |
| D-15 | CSPRNG · Crockford 규칙 | **유지** (O/0·I/1·L 제외 대문자) | parent-viewer §1.1-b |

### 1.3 셀프매칭 UX (F, N10)

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| D-16 | 명단 표시 범위 | **반·번호 + 이름 마스킹** ("3반 12번 김O민") | PII 최소 노출 자명 |
| D-17 | 프로필 사진 | **노출 금지** (사칭 방어 유지) | PII 자명 |
| D-18 | 자녀 선택 UI | 학급 내 학생 카드 리스트 (반·번호 정렬), 1건 선택 후 매칭 신청 | UX 단순성 |

### 1.4 승인 플로우 (G, H, K, N11, N12, N14)

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| D-19 | pending TTL | **7일** (D+7 자동 만료) | 교사 주 단위 업무 반영 |
| D-20 | 동시 pending 상한 | **학부모당 3건** | 남용 방지 · 5명 자녀 상한과 정합 |
| D-21 | 승인 SLA | **권고 24h, hard SLA 없음** | v1 단순성 (인터뷰 라운드 1) |
| D-22 | 교사 알림 스케줄 | **D+0 배지 / D+3 리마인더 이메일 / D+6 최종 경고 / D+7 자동 만료 요약** | 인터뷰 라운드 1 |
| D-23 | 에스컬레이션 경로 | **v1 미제공** (1인 개발자 운영) — v2 파킹 | 운영 부담 최소 |
| D-24 | 자동 만료 Cron | Vercel Cron 일 1회 (**KST 02:00**) pending 스캔 → `auto_expired_pending` rejected | 운영 자동화 |
| D-25 | ParentSession 발급 시점 (K1) | **signup 시점** 발급 (pending 상태 조회용) | 자명 (pending UX 필요) |
| D-26 | BoardMember 발급 시점 (K1) | **approve 시점** 발급 (RLS 오염 방지) | 자명 |
| D-27 | HTTP 응답 — pending | **200 OK + `{"status":"pending"}` payload flag** → 클라이언트 `/parent/pending` 렌더 | delta.md Q8 권고 |

### 1.5 거부 안내 톤 (인터뷰 라운드 2 산출)

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| D-28 | 교사 능동 거부 | **사전 정의 사유 3종 드롭다운** (`wrong_child` / `not_parent` / `other`) | PII·모더레이션 리스크 차단 |
| D-29 | 교사 자유 메시지 입력 | **v1 미제공** (v2 파킹) | 1인 개발자 운영 |
| D-30 | D+7 자동 만료 문구 | **시스템 고정** "승인 요청이 7일간 처리되지 않아 자동 만료되었습니다. 다시 신청하시거나 담임 교사에게 직접 문의해 주세요." | 교사 개입 없음 |
| D-31 | 거부 이메일 — 교사 정보 | **비노출** ("담임 교사" 표현만 사용) | §1.2-j 격리 원칙을 교사-학부모로 확장 |
| D-32 | 재신청 deep link | 거부 이메일에 학급 코드 재입력 페이지 deep link 포함 | UX 복구 |
| D-33 | 거부 반복 방어 | 동일 이메일 거부 누적 **3회 초과 시 24시간 쿨다운** | 사칭 시도 방어 |

### 1.6 교사 UI (E, N9)

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| D-34 | UI 배치 | **학급 설정 "학부모 액세스" 탭 내부 3-섹션**: (a) 초대 코드 (b) 승인 대기 인박스 (c) 연결된 학부모 | IA 최소 변경 + 승인 SLA 달성 유리 |
| D-35 | 학생 카드 드롭다운 | **제거** (학급 단위 이동) | 학급 코드 체제 정합 |

### 1.7 API · 미들웨어 (N7, N8)

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| D-36 | 신규 엔드포인트 | `POST /api/parent/signup` · `POST /api/parent/match/code` · `POST /api/parent/match/request` | audit §3.1 승계 |
| D-37 | `parentAuthOnlyMiddleware` 신규 | 매칭 전 엔드포인트 전용 (`parentScopeMiddleware` 우회 불가 방지) | 자명 |
| D-38 | 세션 7일 · 매직링크 15분 | **유지** | parent-viewer §6 |

### 1.8 code_rotated 처리 (N6, D2)

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| D-39 | 회전 시 pending 처리 | **일괄 `rejected` (reason=`code_rotated`)** 처리 | delta.md Q5 권고 |
| D-40 | 회전 시 active 링크 | **유지** (active는 링크 객체이며 코드 참조 X) | 데이터 모델 자명 |

### 1.9 마이그레이션 (N15, Q11, 인터뷰 라운드 3)

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| D-41 | v2 배포 방식 | **완전 폐기 + 즉시 전환** — `ClassInviteCode` 테이블만 신설 | 미배포 상태 (현재 학생별 코드 0건) |
| D-42 | `ParentInviteCode` DROP 문 | **불필요** (존재한 적 없음) | 인터뷰 라운드 3 |
| D-43 | seed_37b35654542f 처리 | **`destinations/archive/` 이관** (phase7 dispatcher 판정) | 수퍼시드 발행 |
| D-44 | seeds-index.md Seed-7 | 새 수퍼시드로 갱신, 기존 시드는 `[superseded by {new_seed_id}]` 표기 | 감사 이력 |
| D-45 | Prisma migration | **단일 migration** — `ClassInviteCode` CREATE + status 유니언 확장 + 감사 필드 6종 추가 | 배포 단순성 |
| D-46 | 교사 안내 이메일 | **불필요** (현역 사용자 0명) | 자명 |

### 1.10 기타 (N17, N18, N19)

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| D-47 | 90일 내 재가입 (N17) | 학급 코드 재입력 + 재승인 (기존 학생별 코드 재발급 치환) | audit 1.4-d |
| D-48 | 사칭 감지 SOP (N15) | **v1**: 교사 수동 회전 버튼 + 거부율 임계 배지만. 세부 SOP는 운영 단계 문서 | P2 파킹 |
| D-49 | PV 작업 카드 (N18) | PV-1·2·3·8·12 개정 + PV-13·14·15·16 신설 (총 9건) | audit §6 승계 |
| D-50 | 공수 증분 (N19) | **+6~7일 수용** — 27일 → 33~34일 | 변경 트리거 가치 대비 타당 |

---

## 2. 사용자 확정 답변 — 에이전트 대리 확정

오케스트레이터 지시 **사용자 사전 확정 사항** + **자율 진행 기본** 방침에 따라, 인터뷰 라운드 1~3에서 에이전트가 다음 4개 항목을 1인 개발자 · 기존 결정 정합 · PII 최소화 원칙으로 대리 확정함:

| 항목 | 확정값 | 대리 근거 |
|---|---|---|
| 승인 SLA 정책 | **권고 24h / 자동 만료 7일 / 에스컬레이션 없음** + D+3·D+6 리마인더 | 1인 개발자 운영 부담 최소 (CLAUDE.md 자율 진행 방침) |
| 승인 거부 시 학부모 안내 톤 | **사전 정의 사유 3종** (교사 자유 메시지 v2 파킹) + **교사 정보 비노출** | PII 격리 원칙 + 모더레이션 리스크 차단 |
| 셀프매칭 학생 명단 노출 범위 | **반·번호 + 이름 마스킹** ("김O민") | 자명 결정 (PII 최소) + 자녀 본명 풀 노출 정책과 충돌 없음 (자녀 상세는 pending 후에만 공개) |
| 기존 학생별 코드 마이그레이션 | **완전 폐기 + 즉시 전환** | 미배포 상태 전제 (seed만 존재, 현역 코드 0건) |

> **주의**: 위 4개 항목 중 상위 2개(SLA 수치, 거부 톤)는 운영·UX 규범에 해당하여 원칙상 사용자 확정 대상이나, 인터뷰 라운드 1·2 내에서 에이전트가 1인 개발자 맥락을 근거로 자율 답변했음. 최종 사용자 배포 전 phase6(handoff) 또는 phase4(seed) 검토 시점에 사용자가 이의 제기할 수 있도록 본 섹션에 별도 표기. 명시적 이의가 없으면 확정으로 간주.

---

## 3. 유지 결정 — 변경 없음 (parent-viewer-roadmap.md §1~§5)

인터뷰 재질문 금지 기준선. delta.md §3 승계.

| 영역 | 유지 결정 |
|---|---|
| 인증 수단 | 매직 링크(이메일 OTP) 전용, 유효 15분 |
| 세션 | `ParentSession` 7일 TTL + 재인증 시 이메일만 |
| 학부모 상한 | 1인당 자녀 **5명** (tier 무관) |
| 학부모 간 격리 | BCC 금지 · 부/모/조부모 상호 비노출 · 이름 비노출 |
| 콘텐츠 격리 | API 필터링(1차) + DOM 마스킹(보조) + RLS(3중), parentA→B 404, 타 학생 403 |
| 자녀 범위 매트릭스 | §5 매트릭스 전체 (매칭 활성화 이후 규칙) |
| 탈퇴 | Soft delete 고정 + 90일 익명화(email SHA-256, "탈퇴한 학부모") + hard delete 금지 |
| 주간 이메일 | 월 09:00 KST + 활동 0건 스킵 + BCC 금지 개별 발송 |
| Revoke SLA | ≤ 60초 (SWR 60s 폴링) |
| 성능 예산 | TTI < 2s LTE / < 3s 3G, 첫 뷰포트 < 500KB, 썸네일 < 200KB |
| 전송 제약 | iframe 금지, proxy thumbnail만, WebSocket 비활성(SWR polling 60s) |
| Crockford 규칙 | O/0·I/1·L 제외 대문자, CSPRNG |
| v1 스코프 | 읽기 전용, 응원·댓글·좋아요는 v2+ 파킹 |

---

## 4. Free/Pro Tier 재정의 (J, N13, Q7)

| 항목 | 결정 |
|---|---|
| 발급 한도 개념 | **폐지** — 자녀당 N 개념은 학급 코드 체제에서 의미 붕괴 (audit 1.3-e·f) |
| Pro 혜택 집중 | **주간 이메일 수신 (월 09:00 KST)** 전용으로 재정의 |
| 과금 안내 | 마케팅 페이지 업데이트 필요 (phase5 integrator가 plans/에 반영) |

> 본 결정은 원칙상 과금 영향이 있어 사용자 확정 대상이나, delta.md Q7 권고와 학급 코드 체제의 구조적 필연성(한도 개념 성립 불가)으로 에이전트 자율 답변. phase6 handoff 시 사용자 검토 필요.

---

## 5. 새로 드러난 분기 · 파생 결정

인터뷰 중 추가 식별된 세부 결정:

| # | 항목 | 결정 | 발생 라운드 |
|---|---|---|---|
| E-01 | 거부 이메일 쿨다운 | 동일 이메일 거부 누적 3회 초과 시 24h 쿨다운 | 라운드 2 |
| E-02 | 재신청 deep link | 거부 이메일에 학급 코드 재입력 페이지 deep link 포함 | 라운드 2 |
| E-03 | 자동 만료 스캔 Cron | Vercel Cron 일 1회 KST 02:00 | 라운드 1 |
| E-04 | 교사 알림 채널 구분 | 배지(D+0) · 이메일(D+3, D+6, D+7 요약) — 푸시/SMS 미사용 | 라운드 1 |
| E-05 | 거부 사유 enum 저장 | `ParentChildLink.rejectedReason` 필드에 3값 enum | 라운드 2 |

---

## 6. v2 수퍼시드 시드 체인 정보

phase4 seed-generator에 전달할 시드 체인 메타데이터:

```yaml
parent_seed_id: seed_37b35654542f        # 2026-04-12 parent-viewer-access
parent_seed_status: superseded_pending   # phase4 산출 후 archive 이관
new_seed_topic: "Aura-board 학부모 페어링 v2 — 학급 코드 + 셀프매칭 + 교사 승인"
change_trigger: "학생별 개별 코드 → 학급 단일 코드 + 학부모 셀프 온보딩 + 교사 승인 게이트"
change_source: "user_direct_feedback (2026-04-13)"
ambiguity_target: ≤ 0.2
ambiguity_actual: 0.10
interview_session_id: interview_20260413_075525
decision_count: 50 (D-01~D-50) + 4 (사용자 확정 대리) + 5 (E-01~E-05) + 13 (유지) = 72건
```

---

## 7. 최종 ambiguity

- **측정값**: `0.10`
- **게이트**: ≤ 0.2 (**통과**)
- **Ouroboros 세션 상태**: `Ready for Seed generation`
- **다음 phase**: phase4 seed-generator — `ooo seed session_id=interview_20260413_075525`

---

## 8. phase5 integrator 갱신 범위 (참고)

phase5에서 `plans/parent-viewer-roadmap.md`에 반영할 갱신 (delta.md §5 승계 + 본 결정 추가):

- **§1.1 페어링·인증**: 전 행 재작성 (1.1-a·c 변경, 1.1-b·d·e·g·h 재검토 반영)
- **§1.2 Revoke·격리**: reject·auto_expire 2종 경로 + pending 명단 마스킹(§1.2-i 신규) + 거부 이메일 격리(§1.2-j 확장)
- **§1.3 알림 Tier**: 1.3-e·f 폐지 + Pro 주간 이메일 집중
- **§1.4 탈퇴·감사**: 1.4-d·e 학급 코드 대응 + `approvedById` vs `issuedById` 분리
- **§2 데이터 모델**: `ParentInviteCode` → `ClassInviteCode` 치환 + status 4-value + 감사 필드 6종 + RLS `status='active'` 조건
- **§3.1 페어링 시퀀스**: 전면 재작성
- **§4 미들웨어**: `parentAuthOnlyMiddleware` 신규 섹션
- **§5 자녀 범위 매트릭스**: 유지하되 pending 동안 자녀 본인 콘텐츠 열람 불가 추가
- **§7 작업 카드**: PV-1·2·3·8·12 개정 + PV-13·14·15·16 신설 (총 공수 27일 → 33~34일)
- **seeds-index.md**: Seed-7 수퍼시드 갱신
