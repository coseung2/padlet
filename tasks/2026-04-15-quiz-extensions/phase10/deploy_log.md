# Deploy Log — quiz-extensions

task_id: 2026-04-15-quiz-extensions
date:    2026-04-16

## 1. 머지 정보

- Workflow: solo-direct-merge (memory `feedback_solo_direct_merge.md`) — PR 생략.
- 브랜치: `feat/quiz-extensions` (8 commits) → `main`.
- Merge commit: `dae6221` (`Merge feat/quiz-extensions`).
- Push: `origin/main` 2732e47..dae6221.

포함 커밋:
```
310ea6f feat(quiz): schema — difficulty + parentQuizId (B2/B4)
5a7c4e9 feat(quiz): types + permissions + report builders
1f91bf6 feat(quiz): API endpoints for draft/questions/report/clone/library
32951d1 feat(quiz): UI — generate/draft/report modals + QuizBoard rewire
5f27340 docs(quiz-extensions): phase7 handoff artifacts
55ee48f fix(quiz): CSV injection guard + draft-discard confirm (phase8 review)
c05e061 docs(quiz-extensions): phase8 review + security audit + REVIEW_OK
834b332 test(quiz-extensions): phase9 e2e regression + QA_OK
```

## 2. CI 결과

- Vercel 자동 빌드: **Ready** (Production, 1m).
- 로컬 사전 검증:
  - `npm run build` → success
  - `npx tsc --noEmit` → clean
  - `npx vitest run` → 6 files, 63/63 tests PASS
  - `phase9/regression_tests/quiz_api_e2e.ts` → 30/30 assertions PASS
  - `phase9/regression_tests/quiz_permissions_e2e.ts` → 5/5 assertions PASS

## 3. 배포 대상

| 항목 | 값 |
|---|---|
| 프로젝트 | `mallagaenge-1872s-projects/aura-board` |
| 환경 | Production |
| 배포 URL (canonical) | https://aura-teacher.com |
| 배포 URL (vercel) | https://aura-board-app.vercel.app (→ /login 리다이렉트) |
| 직접 URL (이번 빌드) | https://aura-board-mkyrzmjq5-mallagaenge-1872s-projects.vercel.app |
| 리전 | icn1 (Seoul) — `vercel.json` `regions: ["icn1"]` 유지 |
| Supabase | ap-northeast-2 (region-aligned) |

## 4. DB 마이그레이션

- 마이그레이션 1건: `20260416_quiz_extensions_difficulty_parent`
- 실행: `npx prisma migrate deploy` (배포 전 선행 실행, phase9 QA 와 동일 DB).
- 컬럼 모두 nullable — 기존 row 무변화, 이전 코드와 호환.
- 상태: `All migrations have been successfully applied.`

## 5. 프로덕션 검증

| 체크 | 결과 |
|---|---|
| `GET https://aura-board-app.vercel.app/` | 307 → `/login` ✅ |
| `GET https://aura-teacher.com/` | 200 ✅ |
| `GET https://aura-teacher.com/login` | 200 ✅ |
| 신규 라우트 (빌드 로그) | `/api/quiz/draft`, `/api/quiz/library`, `/api/quiz/[id]/clone`, `/api/quiz/[id]/questions`, `/api/quiz/[id]/report`, `/api/quiz/[id]/report.csv` 전부 등록 확인 |

### Core Web Vitals

`phase9/perf_baseline.json` 의 dev 서버 API latency 기록만 존재. 프로덕션 Lighthouse 측정은 chrome-devtools MCP 세션이 복구된 뒤에 별도 수행 — 회귀 감지 로직은 **deferred**.

## 6. 롤백 절차

**시나리오 A — 런타임 에러 (배포 직후)**
```bash
# 이전 안정 배포로 Promote
vercel rollback aura-board-c1dke85lm-mallagaenge-1872s-projects.vercel.app
# 또는 Vercel 대시보드 → Deployments → 이전 배포 → "Promote"
```
이전 배포: `aura-board-c1dke85lm-mallagaenge-1872s-projects.vercel.app` (12h 전, 이전 merge 기준).
DB 컬럼은 nullable 이라 앞 코드와 호환 → DB rollback 불필요.

**시나리오 B — 마이그레이션까지 rollback 필요 (극히 드문 경우)**
```sql
-- prisma/migrations/20260416_quiz_extensions_difficulty_parent/migration.sql
-- 파일 상단의 "Manual rollback" 주석 참조
ALTER TABLE "Quiz" DROP COLUMN "difficulty", DROP COLUMN "parentQuizId";
DROP INDEX IF EXISTS "Quiz_parentQuizId_idx";
```

**시나리오 C — git revert**
```bash
git checkout main
git revert -m 1 dae6221   # merge commit
git push origin main
```

## 7. 수동 QA 체크리스트 (사용자 수행 예정)

아래 항목은 chrome-devtools MCP 세션 불가로 자동 검증되지 않음 — `aura-teacher.com` 로그인 후 실제로 확인:

1. **QuizGenerateModal 탭 전환** — 새로 만들기/과거 퀴즈 탭 active underline + bold.
2. **QuizDraftEditor shake** — 빈 필드 상태로 "저장" 클릭 시 해당 카드 shake + 토스트 "빈 항목을 채워주세요 (문항 N)".
3. **QuizReportModal 매트릭스** — sticky 헤더/이름 열, 정답(녹)/오답(빨)/미응답(회) 3색, 모바일 <600px 풀스크린.
4. **SegmentedControl 난이도** — 선택 시 accent 배경 + 흰 텍스트.
5. **갤탭 S6 Lite 실기** — draft 편집 터치 타겟 44px, 모달 풀스크린 전환, 매트릭스 가로 스크롤.
