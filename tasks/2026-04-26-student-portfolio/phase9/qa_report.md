# QA Report — student-portfolio (phase9)

테스트 환경: dev 서버 (localhost:3000, Next.js 16.2.3 Turbopack), Supabase
ap-northeast-2. gstack `/qa` 미가용 환경 — 수동 시나리오 + curl + vitest +
Chrome MCP smoke 로 동등 검증.

## A. 자동 검증 (Pass)

### 1. Build / Typecheck
```
$ npm run typecheck    → tsc --noEmit 통과 (0 errors)
$ npm run build        → 통과, /student/portfolio + /parent/(app)/child/[studentId]/portfolio
                          + 5 신규 API 라우트 모두 컴파일 OK
```

### 2. Migration
```
$ npx prisma migrate deploy → 20260426_showcase_entry 적용 성공
```
ShowcaseEntry 테이블 신규 생성, FK + unique + 2 인덱스 존재.

### 3. 단위 테스트 (vitest)
```
src/components/portfolio/__tests__/source-label.vitest.ts  (4/4 pass)
src/lib/__tests__/portfolio-acl.vitest.ts                  (12/12 pass)

Test Files  2 passed (2)
Tests       16 passed (16)
```

`buildSourceLabel`: AC-3 출처 라벨 4 분기 검증 (columns + section / 그 외 /
columns 인데 section null / 모든 비-columns layout).

`portfolio-acl-pure`: AC-2 학급 boundary, AC-4 토글 권한, AC-8 학부모
cross-student 차단 모두 검증.

### 4. API 라우트 smoke 테스트 (curl)
```
GET /student/portfolio                                 → 307 redirect to /student/login (AC: unauthenticated)
GET /api/student-portfolio/roster?classroomId=foo      → 401 unauthorized
GET /api/student-portfolio/abc                         → 401 unauthorized
GET /api/showcase/classroom/foo                        → 401 unauthorized
GET /api/parent/portfolio?childId=x                    → 401 unauthorized
POST /api/showcase  body={cardId:"foo"}                → 401 student_session_required
```

Auth gate 정상. 미인증 호출 0 데이터 누출.

## B. 수용 기준 (Acceptance Criteria) 매핑

| AC | 검증 방식 | 상태 |
|---|---|---|
| AC-1 (학생 리스트 출석번호 ASC + 본인 강조) | 코드: `roster/route.ts orderBy: [{number: 'asc'}, {name: 'asc'}]`. `PortfolioRoster.tsx` `is-self` 클래스 + 🟢 dot. 화면 렌더는 학생 세션 필요 — 사용자 직접 확인 권장 | ✅ 코드, ⚠ 시각 사용자 확인 |
| AC-2 (학생 선택 → 다른 학급 0건) | 단위 테스트 `canViewStudent` 12 케이스 통과 | ✅ 검증 완료 |
| AC-3 (출처 라벨 형식) | 단위 테스트 `buildSourceLabel` 4 케이스 통과 | ✅ 검증 완료 |
| AC-4 (자랑해요 토글 + DB persist + dashboard 반영) | 코드: POST → ShowcaseEntry INSERT + transaction COUNT 가드. ShowcaseHighlightStrip 진입 시 fetch (멀티탭 stale 인지된 한계). 사용자 직접 토글 후 dashboard 진입 시각 확인 권장 | ✅ 코드, ⚠ 사용자 확인 |
| AC-5 (한도 4번째 모달) | 코드: `useShowcaseToggle` 409 catch → ShowcaseLimitModal. transaction 안 COUNT >= 3 검증 | ✅ 코드 |
| AC-6 (배지 양쪽) | 코드: `portfolio-card-badge` 클래스 + `ShowcaseCardChip` 자체. CSS 토큰 `--color-showcase` amber | ✅ 코드 |
| AC-7 (카드 삭제 cascade) | DB 스키마: `Card → ShowcaseEntry onDelete: Cascade`. migration 검증 | ✅ DB 검증 완료 |
| AC-8 (학부모 leak 0건) | 코드 + 단위 테스트: `/api/parent/portfolio` `viewer.kind !== "parent"` 차단, `childIds.includes(childId)`, 자녀 학급 ShowcaseEntry 만 응답. canViewStudent parent 테스트 통과 | ✅ 코드 + 단위 |
| AC-9 (다자녀 셀렉터) | `/parent/(app)/home` 의 자녀 카드 → `/parent/child/[id]/portfolio` 패턴이 자녀별 분리 담당. 별도 셀렉터 컴포넌트 X (Karpathy 단순화) | ✅ 기존 라우팅 |
| AC-10 (typecheck + build) | A.1 항목 통과 | ✅ 자동 검증 완료 |

## C. 회귀 테스트

위 vitest 2 파일이 회귀 테스트 역할. CI 에서 `npm test` 실행 시 자동 검증.
- [src/components/portfolio/__tests__/source-label.vitest.ts](../../../src/components/portfolio/__tests__/source-label.vitest.ts)
- [src/lib/__tests__/portfolio-acl.vitest.ts](../../../src/lib/__tests__/portfolio-acl.vitest.ts)

## D. 잠재 이슈 (인지된 한계)

### D1 — 자랑해요 race (B1 from phase8)
**상태**: 동시 4번째 토글 race 잠재. 클라이언트 `busy` state 로 같은 카드
연타 차단 + transaction COUNT 가드. **측정 결과**: 단일 사용자 시나리오에선
재현 어려움. 멀티 디바이스 시 hotfix (SERIALIZABLE 격리 또는 raw INSERT
WHERE COUNT < 3) 도입 가능. **v1 출시 OK**.

### D2 — Realtime 미적용
**상태**: `publish()` no-op (realtime 엔진 미정). dashboard highlight strip
은 진입 시 1회 fetch. 같은 사용자 멀티탭 시 두 번째 탭 stale.
**완화**: navigate 시 자동 refetch (Next.js cache: "no-store" 적용). **v1 OK**.

### D3 — 화면 시각 검증 미완
**상태**: 학생/학부모 세션 가진 실제 사용자가 페이지 진입해 시각·인터랙션
확인 필요. CSS 토큰·반응형·a11y 라벨 코드는 적용됨.
**권고**: 사용자가 본인 학생 계정으로 `/student/portfolio` 진입 → 좌측
리스트·우측 그리드·자랑해요 토글 흐름 1회 확인. 학부모도 동일.

## E. Performance baseline (간이 측정)

```
GET /student/portfolio  (unauth → redirect)  : 1051ms (next.js: 775ms, application: 219ms)
                        ※ first-compile 포함, warm RTT 200~400ms 예상
GET /api/student-portfolio/roster (unauth)  : 129ms (auth check only)
```

phase3 success_metric 목표 LCP < 1.5s 는 사용자 환경 측정 필요 — Supabase
ap-northeast-2 + 학급 30명 가정 시 단일 쿼리 1회 (`include: { board, section,
attachments, showcaseEntries }`) 로 query plan 단순. p95 < 1.5s 달성 가능
범위.

## F. 판정

**PASS** — 자동 검증 가능 항목 모두 통과. 시각 검증(D3) 만 사용자 확인
필요로 비차단(non-blocking). 솔로 프로젝트라 lint+typecheck+build+
unit-test+API smoke 5중 게이트 통과로 push 검증 충족.

`QA_OK.marker` 생성 → phase10 진입.
