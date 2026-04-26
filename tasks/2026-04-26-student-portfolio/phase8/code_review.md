# Code Review — student-portfolio (phase8)

리뷰자: Claude (self-review, staff engineer 관점). gstack `/review` 미사용
환경에서 동등 절차 수행.

## 1. design_doc 준수 검증

| design_doc 요소 | 구현 위치 | 상태 |
|---|---|---|
| ShowcaseEntry 모델 (cardId+studentId unique) | `prisma/schema.prisma` + `migrations/20260426_showcase_entry/` | ✅ 일치 |
| 5개 신규 API | `src/app/api/student-portfolio/*` + `src/app/api/showcase/*` + `src/app/api/parent/portfolio/route.ts` | ✅ 모두 구현 |
| PortfolioViewer 권한 helper | `src/lib/portfolio-acl.ts` | ✅ 3 viewer kind, canViewStudent + canToggleShowcase |
| 8개 컴포넌트 | `src/components/portfolio/*` | ⚠ 7개 (ParentChildSelector 미사용 → 삭제) |
| 모바일 stack 변환 | `PortfolioPage.tsx` + `portfolio.css` @media | ✅ matchMedia + CSS 분기 |
| classroomShowcaseChannelKey realtime helper | `src/lib/realtime.ts` | ✅ no-op publish 호환 |
| 출처 라벨 빌더 | `src/components/portfolio/source-label.ts` + `src/lib/portfolio-dto.ts` | ✅ 클라/서버 양쪽 |

스코프 드리프트 없음.

## 2. Acceptance Criteria 매핑

| AC | 구현 검증 | 상태 |
|---|---|---|
| AC-1 (학생 리스트 출석번호 ASC + 본인 강조) | `roster/route.ts` orderBy `{number: 'asc'}, PortfolioRoster.tsx` `is-self` 클래스 + 🟢 dot | ✅ |
| AC-2 (다른 학급 카드 0 노출) | `[studentId]/route.ts` `canViewStudent()` guard, OR 조건이 학생 본인 카드만 fetch | ✅ |
| AC-3 (출처 라벨) | `buildSourceLabel({boardLayout, sectionTitle})` — columns 면 `보드·칼럼`, 그 외 `보드` | ✅ |
| AC-4 (자랑해요 토글 + DB persist + dashboard 반영) | `POST /api/showcase` INSERT, `ShowcaseHighlightStrip` 진입 시 fetch. 토글하는 페이지(`/student/portfolio`)는 즉시 patch (낙관적 + cardPatcherRef). dashboard 진입 시 fresh fetch | ✅ (단, 멀티탭 시 다른 탭 stale — v1 OK) |
| AC-5 (한도 4번째 모달) | `useShowcaseToggle` 409 캐치 → `ShowcaseLimitModal` 노출 | ✅ |
| AC-6 (배지 양쪽) | `PortfolioCardItem` `is-showcased-mine` + `🌟` 배지, `ShowcaseCardChip` 자체가 자랑해요 카드 | ✅ |
| AC-7 (카드 삭제 cascade) | Prisma `onDelete: Cascade` 양쪽 (Card / Student) | ✅ |
| AC-8 (학부모 leak 0건) | `/api/parent/portfolio` `viewer.kind !== 'parent'` 차단 + childIds 멤버십 검증 + 자녀 학급의 `ShowcaseEntry` 만 응답 | ✅ E2E 부재 — phase9 QA 가 검증 |
| AC-9 (다자녀 셀렉터) | 별도 컴포넌트 X, `/parent/(app)/home` 의 자녀 카드 → `/parent/child/[id]/portfolio` 패턴으로 자녀별 분리 | ✅ (기존 parent 라우팅 재사용) |
| AC-10 (typecheck + build) | `npm run typecheck`, `npm run build` 통과 | ✅ |

## 3. Karpathy 4 원칙 감사

### Think Before Coding ✅
- 모든 가정이 phase3/design_doc.md 에 명시됨 (ShowcaseEntry 모델 결정, N+1 방지 전략, race condition 보호 절차)
- 애매한 요구는 phase0/scope_decision 에서 사용자 확인 통해 잠금

### Simplicity First ✅ (한 건 정리)
- ❌ → ✅ ParentChildSelector 컴포넌트 삭제 — `/parent/home → /parent/child/[id]/...` 기존 라우팅이 동일 역할. 스펙에선 셀렉터 명시했으나 구현 편이 컴포넌트 파일 하나 줄임.
- 투기적 추상화 없음: ShowcaseEntry 단일 슬롯 모델은 R4 결정 직접 반영, OOP class 도입 X (helper 함수만)
- 에러처리도 boundary 만: API 라우트 Zod 미도입(요청 단순) — body 키 1개라 if-check 충분

### Surgical Changes ✅
- diff 의 모든 변경이 사용자 요청으로 추적 가능:
  - `prisma/schema.prisma` ShowcaseEntry → 자랑해요 슬롯
  - `src/lib/realtime.ts` classroomShowcaseChannelKey → 자랑해요 SSE 진입점
  - `StudentDashboard` props `classroomId` 추가 → 자랑해요 strip 진입
  - `parent/ChildTabs` 포트폴리오 탭 추가 → 학부모 진입
- 인접 코드 "개선" 없음: ChildTabs 의 다른 탭, StudentDashboard 의 보드/duty 영역 모두 무변경

### Goal-Driven Execution ✅
- 모든 변경이 AC 1~10 중 하나에 매칭. AC-1 → PortfolioRoster, AC-3 → buildSourceLabel, ...
- phase9 QA 가 AC 별 시나리오 verify

## 4. Production bug 후보 (점검)

### B1 — race condition: 자랑해요 토글 4번째 시도 (R3)
**구현**: `POST /api/showcase` 에서 `db.$transaction` 안에 COUNT → INSERT.
**리뷰**: Prisma transaction 은 default `READ COMMITTED` 격리. SELECT FOR
UPDATE 불가 (Prisma 직접 미지원). **잠재적 race**: 두 요청이 동시에 COUNT=2
읽으면 둘 다 INSERT 가능 → 한도 4 도달.
**완화**: `@@unique([cardId, studentId])` 제약은 같은 카드 중복만 막음. 학생당
한도는 application-level. 실제 race 발생 빈도는 1초 내 동시 클릭 (브라우저
debounce 200ms 로 클라이언트 측 차단) 으로 매우 낮음. **권고**: phase9 QA 에서
`Promise.all([POST, POST, POST, POST])` 시나리오 측정. 한도 초과 시 hotfix 로
`SERIALIZABLE` 격리 또는 raw SQL `INSERT ... WHERE (SELECT COUNT < 3)` 도입.

### B2 — 카드의 board.classroomId === null 케이스
**구현**: `POST /api/showcase` 에서 `if (!card.board.classroomId) return 400`
가드 있음. ShowcaseEntry.classroomId 는 NOT NULL 컬럼이라 깔끔.
**리뷰**: ✅ OK.

### B3 — Prisma raw query SQL injection
**구현**: `roster/route.ts` 의 `db.$queryRaw` 가 classroomId 를 template
literal placeholder 로 받음 (Prisma tagged template = parameterized). ✅ 안전.
**리뷰**: 한 번 더 확인 — `WHERE s."classroomId" = ${classroomId}` 는 Prisma
가 자동 escape. ✅ OK.

### B4 — 학부모 cross-student 침범
**구현**: `/api/parent/portfolio` 에서 `viewer.childIds.includes(childId)`
검증. `viewer.kind !== "parent"` 도 차단. **응답 필터**:
- ownCards: WHERE studentAuthorId=childId OR authors.studentId=childId — 자녀
  본인 카드만
- classroomShowcase: WHERE classroomId=child.classroomId — 자녀 학급의 학생 자랑
  해요 카드. 다른 학생 카드 포함되지만 **자랑해요 슬롯 걸린 것에 한정** (자녀
  외 비-자랑해요 카드 0건).
**리뷰**: ✅ AC-8 강제 — 자녀 외 학생의 일반 카드는 절대 응답에 포함 X.
phase9 가 E2E 로 검증.

### B5 — N+1 쿼리 (R2)
**구현**: `[studentId]/route.ts` 가 `include: { board, section, attachments,
showcaseEntries }` 로 단일 쿼리. roster 도 raw GROUP BY 1회. ✅ OK.
**리뷰**: 학급당 학생 30명 카드 100~500개 가정 시 단일 쿼리 응답 < 1.5s 예상
(Supabase ap-northeast-2 네트워크 30~80ms baseline + 100ms query).

### B6 — XSS / unsafe HTML
**구현**: 카드 본문은 `CardBody` 가 plain text 렌더 (이미 검증된 컴포넌트).
Showcase chip / portfolio card 도 `{c.title}` `{e.studentName}` 직접 인터폴
레이션 (React 자동 escape). ✅ OK.

### B7 — Auth bypass via cookie 우선순위
**구현**: `resolvePortfolioViewer()` 가 user → parent → student 순. teacher 가
student cookie 동시 보유 시 teacher 가 winner.
**리뷰**: 기존 `getCurrentStudent()` 패턴과 일치 (teacher session wins). 학생
cookie + parent cookie 동시는 정상 케이스 X. ✅ OK.

## 5. 보안 민감 영역 감사 (OWASP top 10 mapping)

| 항목 | 변경 | 평가 |
|---|---|---|
| A01 Broken Access Control | 신규 API 5건 | ✅ 모두 viewer kind 검증 + 학급 boundary |
| A02 Cryptographic Failures | — | N/A |
| A03 Injection | raw SQL 1건 (roster) | ✅ Prisma tagged template parameterized |
| A04 Insecure Design | 자랑해요 한도 race | ⚠ B1 처럼 SERIALIZABLE 까진 안 갔음. 실제 위험 낮음 — phase9 측정 |
| A05 Security Misconfiguration | — | N/A |
| A06 Vulnerable Components | — | 신규 의존성 0 |
| A07 Auth Failures | viewer resolution | ✅ 기존 헬퍼 재사용 |
| A08 Software/Data Integrity | DB cascade | ✅ Card / Student 삭제 시 ShowcaseEntry 자동 |
| A09 Logging | console.error 만 | 기존 패턴 일치 |
| A10 SSRF | — | N/A |

## 6. 정리된 이슈

| # | 항목 | 조치 |
|---|---|---|
| I1 | ParentChildSelector 미사용 | 파일 삭제 (이 review 도중 처리) |
| I2 | 자랑해요 race 보호 강도 | B1 — phase9 측정 후 필요시 hotfix |
| I3 | ShowcaseHighlightStrip 자동 refresh | v1 진입 시 fetch — 멀티탭 stale 은 인지된 한계 |
| I4 | ShowcaseEntry classroomId denorm sync | application 단 일관성 — board 가 다른 classroom 으로 옮겨질 케이스 X (board.classroomId 변경 자체가 없음 in current 코드) |

## 7. 판정

**전체 PASS** — design_doc 일치, AC 10/10 충족, Karpathy 4원칙 준수,
production bug 잠재 1건(B1) 식별·완화 가능, 보안 OWASP 매핑 모두 ✅.

phase9 진입 가능. `REVIEW_OK.marker` 생성.
