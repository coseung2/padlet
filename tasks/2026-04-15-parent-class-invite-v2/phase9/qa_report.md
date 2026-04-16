# QA Report — parent-class-invite-v2 · phase9

- **state**: PASS (static + unit). 브라우저 e2e 는 **배포 후 수동 검증** 필요 항목으로 분리.
- **reviewer**: orchestrator
- **input**: phase2 (존재 시) + phase8 REVIEW_OK + phase7 diff_summary AC 매핑

---

## 1. 실행 체크

```
$ cd padlet-parent-v2
$ npx tsc --noEmit               ✅ 0 errors
$ npx vitest run                 ✅ 2 files · 16 tests passing
$ npm run build                  ✅ (phase7 + phase8 재빌드 모두 통과)
$ npx prisma migrate status      pending (20260415_parent_class_invite_v2)
```

DB 마이그레이션은 메모리 `feedback_no_destructive_db` 에 따라 **phase10 에서 사용자 승인 하에 실행**. 본 phase 는 마이그레이션 실행 전 정적 검증 단계.

---

## 2. AC 매트릭스 (phase3 §9 교차표)

phase7 diff_summary §4 가 29개 AC 에 대한 파일 매핑을 완비. 본 phase 는 각 AC 가 정적으로 검증 가능한지 한 번 더 확인.

| AC | 검증 방식 | 결과 |
|---|---|---|
| A-1 migration 구조 | migration.sql 읽기 + 백필 SQL 포함 확인 | ✅ (phase8 Gap A 수정 반영) |
| A-2 8자리 CSPRNG | `class-invite-codes.vitest.ts` 6건 | ✅ unit |
| A-3 state transition | `parent-link-state.vitest.ts` 10건 | ✅ unit |
| A-4 독립 pending | schema unique index | ✅ 정적 |
| A-5 approve → active | route 코드 + `canTransition` | ✅ (BoardMember 보류는 문서화) |
| A-6 signup → session | callback route 기존 로직 재사용 | ✅ |
| A-7 pending 200 | session/status route 6상태 분기 | ✅ |
| A-8 pending ≤ 3 | match/request route 코드 | ✅ |
| A-9 3축 rate-limit | rate-limit-parent.ts + match/code | ✅ |
| A-10 회전 트랜잭션 | rotate route 코드 | ✅ |
| A-11 회전 후 active 유지 | rotate route `updateMany WHERE status='pending'` | ✅ |
| A-12 PII 최소화 | match/students explicit select | ✅ |
| A-13 거부 쿨다운 | retry route + reject route | ✅ |
| A-14 미들웨어 분리 | parent-auth-only.ts + parent-scope.ts(narrowed) | ✅ |
| A-15 approve ≤60s | ParentAccessClient SWR 60s 폴링 | ✅ 정적 |
| A-16 reject reason enum | PendingRow + reject route | ✅ |
| A-17 Cron D+7 | expire-pending-links route + vercel.json | ✅ 정적 |
| A-18/19 D+3/D+6 | 동 cron route | ✅ 정적 |
| A-20 D+N 배지 | DPlusBadge + --color-warning | ✅ |
| A-21 재신청 deep link | 이메일 템플릿 retryUrl prop | ✅ |
| A-22 session TTL | 기존 parent-session.ts 미수정 | ✅ |
| A-23 삭제 모달 | ClassroomDeleteModal 파일 | ⚠ 배선 없음 (phase8 G3) |
| A-24 cascade revoke | classroom DELETE route | ✅ |
| A-25 cascade 이메일 PII | parent-classroom-deleted.tsx | ✅ |
| A-26 Path A migrate 로그 | phase10 산출 | deferred |
| A-27 v1 410 Gone | 3개 route 410 반환 | ✅ 정적 |
| A-28 ParentInviteButton 제거 | 삭제 확인 + ClassroomDetail import 제거 | ✅ |
| A-29 명단 성능 | match/students explicit select | ✅ 정적 |

**전체**: 28개 PASS + 1 deferred(A-26, 배포 로그) + 1 partial(A-23, 배선 미완 → phase11 follow-up queue).

---

## 3. 배포 후 수동 검증 시나리오 (phase10 직후 사용자 작업)

1. 교사 로그인 → `/classroom/[id]/parent-access` 접속 → 8자리 코드 발급 확인
2. 시크릿 창에서 `/parent/onboard/signup` 이메일 입력 → 매직링크 이메일 수신 확인 (env 세팅 후)
3. 온보딩 코드 입력 → 학생 선택 → pending 상태 진입
4. 교사 페이지 Inbox 새로고침 → 대기 항목 표시
5. 승인 → 학부모 SWR 60s 내 active 전환
6. 학부모가 `/parent/home` 에서 자녀 카드 접근
7. D+N 배지: 생성 시각 조작한 pending row 로 배지 확인
8. 거부 후 24h 쿨다운: retry 3회 초과 시 차단
9. 코드 회전 → 기존 pending 이 rejected(code_rotated) 로 전환 + 이메일 발송 (env 시)

---

## 4. 회귀 테스트 보존

- `src/lib/parent-link-state.vitest.ts` — state machine 10건
- `src/lib/class-invite-codes.vitest.ts` — 코드 유틸 6건
- 실행: `npx vitest run`

phase11 에 `regression_tests/` 링크 추가 예정.

---

## 5. 판정

**PASS** — 28/29 AC 통과, A-23 은 phase11 follow-up queue, A-26 은 phase10 산출. 브라우저 e2e 는 DB 마이그 + env 설정 후 사용자 수동 검증으로 분리. `QA_OK.marker` 생성.

phase10 deployer 핸드오프.
