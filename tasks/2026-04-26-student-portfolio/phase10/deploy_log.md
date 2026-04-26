# Deploy Log — student-portfolio (phase10)

## 1. 머지 정보

- **워크플로**: 솔로 프로젝트 → PR 없이 main FF 머지 (CLAUDE.md "Git 워크
  플로우" 정책)
- **소스 브랜치**: `feat/student-portfolio` @ `d82f5c7`
- **타깃**: `origin/main`
- **방식**: `git push origin HEAD:main` (fast-forward, 비파괴)
- **머지 시각**: 2026-04-26 ~13:24 KST
- **이전 main HEAD**: `a216b76` (refactor + CLAUDE.md 머지 정책)
- **새 main HEAD**: `d82f5c7` (phase9 QA report)

## 2. push 검증 게이트 (CLAUDE.md 강제)

| 항목 | 결과 |
|---|---|
| `npm run build` | ✅ PASS — Next.js 16.2.3 Turbopack 컴파일 성공, /student/portfolio + /parent/(app)/child/[studentId]/portfolio + 5 신규 API 라우트 모두 빌드 |
| `npm run typecheck` | ✅ PASS — tsc --noEmit, 0 errors |
| `npx vitest run` | ✅ PASS — 16 test files, 163 tests (신규 16건 포함) |
| `phase8/REVIEW_OK.marker` | ✅ 존재 |
| `phase9/QA_OK.marker` | ✅ 존재 |

## 3. 배포 대상

- **인프라**: 사용자 환경(자체 호스팅 + Supabase ap-northeast-2). 별도 PaaS
  배포 시스템 미구성 — main 푸시 = "배포 ready" 상태
- **다음 dev/prod 진입**: 사용자가 main 워크트리 (`C:\Users\심보승\
  Desktop\Obsidian Vault\padlet\`) 에서 `git pull && npm run dev` (또는
  prod 환경에서 동일) 으로 신규 코드 활성화

## 4. 프로덕션 검증

자체 호스팅 환경이라 별도 prod URL 헬스체크 X. 대신 **로컬 dev 서버 라이브
검증**:

```
GET /student/portfolio                                  → 307 redirect to /student/login (unauth, expected)
GET /api/student-portfolio/roster?classroomId=foo       → 401 unauthorized
GET /api/showcase/classroom/foo                         → 401 unauthorized
GET /api/parent/portfolio?childId=x                     → 401 unauthorized
POST /api/showcase                                      → 401 student_session_required
```

모든 신규 라우트 정상. 미인증 호출에서 0 데이터 누출.

기존 보드 페이지 회귀 없음 — `/student` (대시보드), `/board/[id]`, `/parent/(app)/home` 모두 build 단계 정상 컴파일.

### Migration 적용

```
$ npx prisma migrate deploy → 20260426_showcase_entry 적용 (zero-downtime)
```

ShowcaseEntry 테이블 신규 생성. 기존 row touch X.

## 5. 롤백 절차

### 코드 롤백
```bash
# 머지 commit revert (3개 커밋: phase7 코드 + phase8 review + phase9 QA)
git revert d82f5c7 bd9ff45 913e12e --no-edit
git push origin main
```

또는 main 을 이전 SHA 로 force-push (솔로 프로젝트라 안전):
```bash
git push origin a216b76:main --force
```

### Migration 롤백 (필요 시)
```bash
npx prisma migrate resolve --rolled-back 20260426_showcase_entry
psql $DATABASE_URL -c 'DROP TABLE "ShowcaseEntry" CASCADE;'
```

ShowcaseEntry 외 테이블 변경 없으므로 부수효과 0. ParentChildLink / Card /
Student 모두 무변경.

### 트리거 조건

- AC-8 학부모 leak 검출 시 **즉시 롤백** (CRITICAL — phase3 R1)
- 자랑해요 race 한도 초과 사례 발생 시 → hotfix 우선 (SERIALIZABLE 격리),
  실패 시 롤백
- 프로덕션 build 실패 시 → 환경 변수 점검 (DATABASE_URL/DIRECT_URL/
  AUTH_SECRET) 후 재시도

---

## 변경 요약

신규 파일 24개:
- `src/lib/portfolio-acl.ts`, `portfolio-acl-pure.ts`, `portfolio-dto.ts`,
  `portfolio-card-mapper.ts`
- `src/app/api/student-portfolio/{roster,[studentId]}/route.ts`
- `src/app/api/showcase/{route,classroom/[classroomId]/route}.ts`
- `src/app/api/parent/portfolio/route.ts`
- `src/app/student/portfolio/page.tsx`
- `src/app/parent/(app)/child/[studentId]/portfolio/page.tsx`
- `src/components/portfolio/{PortfolioPage,PortfolioRoster,PortfolioStudentView,PortfolioCardItem,ShowcaseHighlightStrip,ShowcaseCardChip,ShowcaseLimitModal,ParentPortfolioView,useShowcaseToggle,source-label}.{tsx,ts}`
- `src/components/portfolio/__tests__/source-label.vitest.ts`
- `src/lib/__tests__/portfolio-acl.vitest.ts`
- `src/styles/portfolio.css`
- `prisma/migrations/20260426_showcase_entry/migration.sql`

수정 파일 6개:
- `prisma/schema.prisma` (Card / Student 에 showcaseEntries relation, ShowcaseEntry model)
- `src/lib/realtime.ts` (classroomShowcaseChannelKey 헬퍼)
- `src/styles/base.css` (--color-showcase 토큰 alias)
- `src/app/globals.css` (portfolio.css import)
- `src/app/student/page.tsx` (StudentDashboard 에 classroomId prop)
- `src/components/StudentDashboard.tsx` (ShowcaseHighlightStrip + 포트폴리오 CTA)
- `src/components/parent/ChildTabs.tsx` (포트폴리오 탭 추가)

phase11 진입 가능.
