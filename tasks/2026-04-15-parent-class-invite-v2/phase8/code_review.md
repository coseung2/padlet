# Code Review — parent-class-invite-v2 · phase8

- **reviewer**: orchestrator (Opus 4.6)
- **input**: phase3_amendment_v2 전체 + phase7/{files_changed.txt, diff_summary.md, tests_added.txt} + HEAD 워크트리
- **재검증 후**:
  - `npx tsc --noEmit` ✅
  - `npx vitest run` → 2 files · 16 tests ✅
  - `npm run build` ✅ (phase7 때 통과 확인)

---

## 1. design / amendment 준수

phase7 diff_summary §4 "AC → 파일 매핑" 29개 항목 전부 trace 가능. amendment_v2 의 architecture / api_contract / component_contract / data_model 4종 문서와 diff 가 정합. 신규 파일 55개 + 수정 15개 + 삭제 2개 모두 amendment 가 예측한 surface 안. scope 확장 0.

## 2. Karpathy 4원칙 감사

| 원칙 | 판정 | 근거 |
|---|---|---|
| Think Before Coding | ✅ | 구현 전 amendment_v2 4종 문서 + blockers §6 체크리스트 전체 확인. 의도적 schema drift(`ParentInviteCode` 잔존), BoardMember insert 보류 등 tradeoff 를 diff_summary §3 에 명시. |
| Simplicity First | ✅ | Upstash, Playwright, react-email CLI, QR 실제 렌더, revoke UI 배선, PARENT_SESSION_SECRET 분리 모두 OUT. 최소 viable scope 유지. |
| Surgical Changes | ✅ | ClassroomDetail 기존 로직 유지 + import 1줄 제거, DELETE /api/classroom/[id] 기존 caller body 없이 호출 호환, parent-rate-limit / parent-magic-link / parent-scope 기존 타이핑 재사용. |
| Goal-Driven Execution | ✅ | tsc / build / vitest 3-gate 모두 green. 16 unit test 신규. AC 교차표로 검증 가능. |

## 3. production bug 탐색 (staff-eng lens)

### 3.1 자동 수정 (REVIEW 라운드)

**Gap A — migration backfill 누락 (HIGH severity)**
- `ALTER TABLE ADD COLUMN "status" DEFAULT 'pending'` 만 있고, 이미 v1 시대에 `deletedAt IS NULL` 로 active 였던 행을 `status='active'` 로 끌어올리는 백필이 없음.
- 결과: migration 적용 직후 모든 기존 학부모들이 `status='pending'` 으로 되돌아가서 자녀 페이지 접근 못 함 OR (parent-scope 미수정 시) pending 상태인데도 접근 가능 → 둘 다 불량.
- **수정**: migration SQL 에 백필 UPDATE 2개 추가 (deletedAt IS NULL → active, IS NOT NULL → revoked).
- 재적용 시 다시 실행 안전 — 두 UPDATE 모두 `WHERE status='pending'` 조건이라 두 번째 실행 시 no-op.

**Gap B — parent-scope.ts status 미narrowing (HIGH severity)**
- phase7 diff_summary §5 이 "phase8 에서 narrowing 필요" 로 미뤄둔 항목.
- `src/lib/parent-scope.ts` 는 여전히 `deletedAt: null` 만 필터. 백필 후 v1 active 행들은 문제 없지만, v2 의 pending 신규 신청 행은 `deletedAt IS NULL` 로 들어오므로 승인 전인데도 parent 가 자녀 정보 열람 가능.
- **수정**: `where` 에 `status: "active"` 조건 추가. tsc 통과 확인.

### 3.2 잔존 gap — phase9 ~ phase11 에 위임

| # | 항목 | 심각도 | 결정 |
|---|---|---|---|
| G1 | BoardMember insert 보류 | LOW (parent-scope active 필터로 실질 권한 동등) | 현 상태 유지. parent-scope 가 single source. |
| G2 | Revoke 엔드포인트 부재 | MED (교사 UX 불완전) | phase11 follow-up task queue 로 이동. 현재 LinkedRow 의 해제 버튼은 toast info 로 UX 설명만. |
| G3 | ClassroomDeleteModal 미배선 | LOW (DELETE API 자체는 confirmName body optional 이라 정상 동작) | phase11 follow-up. |
| G4 | QR placeholder | LOW | phase10 이후 `qrcode` dep 으로 서버 data URL 주입 — doc phase 에 기록. |
| G5 | classNo=0 하드코딩 | LOW | Student schema 에 classNo 필드 없음. UI 가 학급명 헤더로 보완 중. 필요 시 v3. |
| G6 | /parent/join?code= 쿼리 drop | LOW (이미 redirect 처리) | doc 에 기록. |
| G7 | `ParentInviteCode` schema 잔존 (의도적 drift) | LOW | 배포 후 별도 cleanup migration 으로 schema 도 정리. phase11 회고에 명시. |

### 3.3 security-sensitive 영역 재확인

| 영역 | 판정 |
|---|---|
| Auth (parent signup / magic link mint / session) | ✅ 기존 `parent-magic-link.ts` / `parent-session.ts` 재사용. |
| Authorization (parent-scope narrowing) | ✅ 이번 라운드에 fix B 반영. |
| Rate limit (IP / code / classroom / rejection) | ✅ `rate-limit-parent.ts` 4축 + match route 통합. |
| Input validation | ✅ Zod — 모든 API route. |
| PII minimisation (match/students) | ✅ explicit select — 학급 내 학생 목록에서 이메일/연락처 제외. |
| Cron auth | ✅ `CRON_SECRET` + `x-vercel-cron` fallback. RLS rotation key 해석 (a) 로 단일화. |
| DB transaction | ✅ rotate / approve / classroom DELETE 모두 `db.$transaction` 래핑. |
| 멱등성 | ✅ approve/reject `canTransition` 가드, cron 일별 idempotency key. |

## 4. 6차원 평가는 생략 (phase6 디자인 리뷰 범위). 본 리뷰는 **코드 품질만** 다룸.

## 5. 판정

**PASS** — 2건 자동수정(Gap A migration 백필, Gap B parent-scope 쿼리 narrowing) 후 critical 잔존 0. 잔여 G1~G7 은 LOW~MED 로 phase9~phase11 및 follow-up queue 에 위임. `REVIEW_OK.marker` 생성.

phase9 qa_tester 핸드오프.
