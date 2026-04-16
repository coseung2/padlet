# Handoff — Parent Viewer Access (Seed 7)

- **task_id**: `2026-04-12-parent-viewer-access`
- **seed_id**: `seed_37b35654542f`
- **interview_id**: `interview_20260412_111153`
- **ambiguity**: 0.074 (phase4 seed)
- **작성일**: 2026-04-12
- **수신자**: padlet feature 파이프라인 Phase 0 analyst (`padlet/prompts/feature/phase0_analyst.md`)

---

## 배경

Aura-board는 교사-학생 중심의 학급 보드 플랫폼으로, Seed 1(그림 라이브러리)·Seed 3(행사 신청)·Seed 4(식물관찰일지)·Seed 6(Breakout)에서 각기 단편적으로 "학부모 열람"을 언급해 왔으나 통합 인증·범위·격리 정책이 부재했다. 본 Seed 7은 **Crockford Base32 6자리 초대 코드 → 매직 링크 인증 → ParentSession** 파이프라인과 **parentScopeMiddleware + RLS 단방향 정책**으로 학부모 읽기 전용 뷰어 접근을 확립하고, cross-cutting "자녀 범위 필터"를 `parent-viewer-roadmap.md §5` 단일 진실 원천(SSOT)으로 고정한다.

---

## 참조 문서 필수 독해 순서

1. `canva project/plans/seeds-index.md` — Seed 7의 타 Seed 대비 위치와 cross-cutting 의존성 맥락
2. `canva project/plans/parent-viewer-roadmap.md` — §0~§11 본 Seed의 확정 결정·스키마·§5 자녀 범위 매트릭스(SSOT)·PV-1~PV-12 작업 분할
3. `canva project/plans/tablet-performance-roadmap.md` — 스마트폰 PWA/갤럭시 탭 S6 Lite TTI·이미지·썸네일 성능 예산 계승
4. `canva project/plans/drawing-board-library-roadmap.md` — §학부모 열람 범위: StudentAsset studentId ∈ parent.children, presigned 썸네일 규칙
5. `canva project/plans/plant-journal-roadmap.md` — §3.4 학부모 뷰 PJ-8 Seed 7 이관(§5 매트릭스의 PlantObservation 행)
6. `canva project/plans/event-signup-roadmap.md` — §학부모 열람 범위: 학급 이벤트 메타 허용, 자녀 본인 Submission만, 참가자 명단·득점 마스킹
7. `canva project/plans/breakout-room-roadmap.md` — §8 학부모 열람 범위: BreakoutMembership 필터, teacher-pool 제외, 자녀 모둠 한정
8. `canva project/plans/phase0-requests.md` — PV-1~PV-12 padlet 진입 JSON 블록 원본

---

## 기준 단말·제약

- **스마트폰 PWA** 320~430px iOS Safari / Android Chrome, 갤럭시 탭 S6 Lite 동시 지원
- **네트워크**: 3G~LTE, TTI < 2s LTE / < 3s 3G, first viewport < 500KB, thumbnail < 200KB
- **iframe 금지**, proxy thumbnail only (Vercel Blob presigned)
- **WebSocket 비활성**, SWR 60s 폴링
- **BoardMember.role="parent"** 순수 read-only (댓글·좋아요는 v2+)
- **GPL 격리**: `studentId ∈ parent.children` 서버 미들웨어 + Postgres RLS 이중 강제
- **Revoke SLA ≤ 60s** (`revokedAt IS NOT NULL → 401`)
- **Crockford Base32 6자리**, IP 5회/15분 + 코드당 10회 실패 즉시 만료
- **매직 링크 전용**(비밀번호 없음), 세션 7일
- **자녀 5명/학부모 상한**, Free tier invite 2명/자녀 + in-app badge / Pro tier invite 5명/자녀 + 주간 이메일
- **Soft delete only**, 탈퇴 90일 후 PII SHA-256 해시 익명화
- **학부모 간 격리**: RLS `parent_id = auth.parent_id()` 단방향 — 다른 학부모 ParentChildLink 조회 시 404

---

## 이번 작업 (seed.goal)

Aura-board 플랫폼에 학부모 읽기 전용 뷰어 액세스 기능을 추가 — 교사 발급 Crockford Base32 6자리 코드로 페어링 후 학부모가 스마트폰 PWA(`/parent/*`)에서 자녀의 그림보드·식물관찰일지·행사 보드·Breakout·숙제를 열람할 수 있으며, 서버 RLS + `parentScopeMiddleware`로 타 학생 PII 완전 격리를 보장한다.

---

## 수용 기준 체크리스트 (seed.acceptance_criteria 1:1 매핑)

- [ ] **AC-1 / PV-2·PV-8** 교사가 학생 카드에서 Crockford Base32 Parent Code + QR 코드를 발급할 수 있다
- [ ] **AC-2 / PV-3·PV-4** 학부모가 코드 입력 후 매직 링크 이메일로 계정 생성 및 인증에 성공한다
- [ ] **AC-3 / PV-6·PV-7** `/parent/*` 라우트에서 자녀의 그림보드·식물관찰일지·행사 보드·Breakout·숙제를 열람할 수 있다
- [ ] **AC-4 / PV-5** `parentScopeMiddleware`가 모든 `/parent/*` API 엔드포인트에 적용되어 studentId 귀속 검증을 수행한다
- [ ] **AC-5 / PV-12 E2E** parent 토큰으로 타 학생 studentId API 직접 호출 시 403 반환 (E2E 테스트 필수)
- [ ] **AC-6 / PV-12 E2E** parentA 토큰으로 parentB의 ParentChildLink 조회 시도 시 404 반환 (E2E 테스트 필수)
- [ ] **AC-7 / PV-9** 교사 1-click revoke 후 ≤ 60s 이내 해당 학부모 세션이 차단된다
- [ ] **AC-8 / PV-9** 학부모 클라이언트가 401 수신 시 자동 로그아웃 후 "접근이 해제되었습니다" 화면으로 전환된다
- [ ] **AC-9 / PV-10** Pro 학부모에게 매주 월요일 09:00 KST 주간 활동 요약 이메일이 발송된다 (활동 0건 주 스킵)
- [ ] **AC-10 / PV-11** 학부모 탈퇴 시 soft delete 처리되고 90일 후 PII가 익명화된다
- [ ] **AC-11 / PV-6** PWA 설치 가능 (`/parent/*` manifest 포함)
- [ ] **AC-12 / PV-2** 코드 48h 만료 또는 `maxUses` 3 소진 후 학생 카드에서 재발급 버튼이 노출된다
- [ ] **AC-13 / PV-7** EventBoard API는 `classroomId` 기준 조회를 허용하되 타 학생 EventSignup 레코드를 응답에서 제거한다
- [ ] **AC-14 / PV-7** Breakout API는 `session.studentId ∈ parent.children` 검증 후 반환한다

---

## 주의사항

- **SSOT 준수**: PV-7 자녀 범위 서버 필터는 `parent-viewer-roadmap.md §5` cross-cutting 매트릭스로 단일 관리된다. Seed 1·3·4·6 로드맵의 "학부모 열람 범위" 절과 **정의 불일치 발생 시 §5 매트릭스를 정본**으로 간주하고 해당 feature 로드맵을 교정 — 반대 방향(feature 로드맵 기준으로 §5를 수정)은 금지.
- **이중 방어 원칙**: API 필터링(1차) + DOM 마스킹(보조) + RLS 단방향(최종) 삼중 구조를 임의로 단순화하지 말 것. AC-5/AC-6 E2E가 보안 게이트.
- **padlet feature 파이프라인 준수**: request.json은 phase0 포맷만 사용. phase1 이후 분기·스코프 변경은 padlet analyst에 일임하며, 본 핸드오프 단계에서 임의 결정·사용자 인터뷰 금지.
- **Soft delete 불가역성**: ParentChildLink hard delete 금지. 탈퇴 경로는 반드시 `parentDeletedAt` SET → 90일 Cron 익명화 2단계 유지.
- **Revoke 즉시성**: `ParentSession.sessionRevokedAt` SET 시점에 Edge Middleware 캐시 무효화 필수 — SWR 60s 폴링 주기와 독립적으로 ≤ 60s SLA 보장.
- **Tier 분기**: Free/Pro 차등은 초대 인원 + 주간 이메일 on/off에만 한정. 열람 범위·보안 정책은 tier 무관 동일.
- **v1/v2 경계**: 좋아요·실시간 push·Kakao 알림톡·Quiz 점수 공개는 v2+ 파킹. request.json에 섞지 말 것.

---

## 핸드오프 산출물

- `tasks/2026-04-12-parent-viewer-access/phase6/padlet_phase0_request.json` — padlet feature phase0 포맷
- `tasks/2026-04-12-parent-viewer-access/phase6/handoff_note.md` — 본 문서

다음 단계: `ooo run seed_37b35654542f` 또는 padlet `tasks/2026-04-12-parent-viewer-access-impl/phase0/request.json`에 상기 JSON 투입 → PV-1(Prisma 4종 + RLS 마이그레이션)부터 착수.
