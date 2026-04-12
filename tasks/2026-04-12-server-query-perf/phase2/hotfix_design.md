# Hotfix Design — server-query-perf

## 변경 요약

Track A (서버 사이드 쿼리 최적화) 의 phase1 diagnosis §5 권고안 중 **위험도 낮은 3개 축**을 최소 변경으로 적용.

### 1. 누락 인덱스 추가 (commit `aff1047`)

| 대상 | 현 코드베이스에서의 역할 |
|---|---|
| `Account(userId)` | PrismaAdapter가 `user 카스케이드 삭제` 및 다수 계정 조회 시 사용. 현 핫패스는 `(provider, providerAccountId)` unique key — 이 인덱스는 보조용 |
| `Session(userId)` | 현 프로젝트는 **JWT 세션 전략** 사용 중 (L3 `src/lib/auth-config.ts`) → `Session` 테이블 자체를 hot read 하지 않음. DB 세션 전략으로 전환 시 대비용 |
| `Card(authorId)` | 현재 코드베이스에 `authorId` 필터 쿼리 없음 — 추후 `내가 작성한 카드` 등의 필터가 등장할 때 대비 |

- `prisma/schema.prisma` 에 `@@index([userId])` / `@@index([authorId])` 추가
- `prisma/migrations/20260412_add_perf_indexes/migration.sql` 에 idempotent `CREATE INDEX IF NOT EXISTS` SQL 작성
- **주의**: 인덱스 자체는 무해하고 idempotent 하지만, 원래 diagnosis §3-4 의 "페이지 로드마다 풀스캔" 서술은 현 auth 설정(JWT) 하에서는 정확하지 않음. 인덱스는 **미래 대비** 및 **방어적 최적화** 로 유지한다.
- 대규모 데이터(수백만 행 이상) 환경이면 `CREATE INDEX CONCURRENTLY` 검토 필요. 현 Supabase 규모에서는 단순 `CREATE INDEX` 의 락 시간 허용 가능.

### 2. 독립 쿼리 병렬화 (commit `25b0725`)

| 파일 | Before | After |
|---|---|---|
| `src/app/page.tsx` | `boardMember.findMany` → `classroom.findMany` (직렬) | `Promise.all([...])` |
| `src/app/classroom/[id]/page.tsx` | `classroom.findUnique` → `boardMember.findMany` (직렬) | `Promise.all([...])` |

### 3. 보드 페이지 쿼리 분리 + force-dynamic 제거 (commit `2c41fe9`)

#### 3-1. 보드 쿼리 분리 (레이아웃별 조건부 fetch)

Before — 단일 `findFirst` 에 5개 `include`:
```ts
db.board.findFirst({
  include: { cards, sections, submissions, members: { user }, quizzes: { questions, players } }
})
```

After — 2단 파이프라인 + **레이아웃별 gating**:
- **Round 1** (3 병렬): `board` 코어 + `getCurrentUser` + `getCurrentStudent`
- **Round 2** (레이아웃에 따라 0~5 병렬):
  - `cards` — 카드 렌더 레이아웃(freeform/grid/stream/columns)에만 fetch. assignment/quiz 는 skip.
  - `sections` — columns 레이아웃에만 fetch. 다른 레이아웃은 skip.
  - `submissions`, `members(+user)` — assignment 레이아웃에만
  - `quizzes(+questions+players)` — quiz 레이아웃에만
  - `role` — user 존재 시

**실제 저장량 예시**:
| 레이아웃 | fetch 쿼리 수 | Before 대비 |
|---|---|---|
| freeform / grid / stream | cards + role = 2 | submissions / members / quizzes join 제거 |
| columns | cards + sections + role = 3 | 동일 + sections 는 columns 에만 |
| assignment | submissions + members + role = 3 | cards / sections / quizzes 제거 |
| quiz | quizzes(+nested) + role = 2 | cards / sections / submissions / members 제거 |

#### 3-2. force-dynamic 제거 (시맨틱 클린업)

7개 페이지에서 `export const dynamic = "force-dynamic"` 삭제:
- `src/app/page.tsx`
- `src/app/board/[id]/page.tsx`
- `src/app/classroom/page.tsx`
- `src/app/classroom/[id]/page.tsx`
- `src/app/student/page.tsx`
- `src/app/quiz/[code]/page.tsx`
- `src/app/qr/[token]/page.tsx`

**주의 — 성능 주장 재보정**:
모든 페이지가 `auth()` / `cookies()` 를 내부에서 사용 → Next.js 16 에서는 dynamic API 호출만으로 자동 dynamic 판정. 따라서 `force-dynamic` 삭제만으로 Router Cache 혜택을 받는다는 보장은 없다 (`next.config.ts` 의 `experimental.staleTimes` 설정 없이는 기본값으로 dynamic route 의 staleTime = 0).

본 커밋의 효과는 **시맨틱 클린업** (불필요한 지시자 제거). 실제 성능 이득은 앞서의 쿼리 분리/병렬화에서 나오며, Router Cache warm-up 이득은 후속 `staleTimes` 튜닝 task로 분리되어야 함.

## 왜 최소인가

### 반영한 것만 반영
- **인덱스**: 데이터 손실 없음, 기존 쿼리 plan 만 빨라짐
- **`Promise.all`**: 로직 불변, 실행 순서만 변경
- **보드 쿼리 분리**: 결과 데이터 형태는 동일하게 유지 (props 매핑 변경 없음)
- **force-dynamic 제거**: dynamic API 호출은 그대로라 동작 변경 없음

### 의식적으로 제외한 것
| 제외 | 이유 |
|---|---|
| 카드 `take: 50` 페이지네이션 | 클라이언트 페이지네이션 UI 부재 → UI 변경 동반 → 별도 feature task |
| `unstable_cache` / 명시적 revalidation | 캐시 무효화 전략 설계 필요 → scope 초과 |
| API routes `Cache-Control` 헤더 | incident 외 API까지 건드려야 함 → scope 초과 |
| `React.cache()` wrapping of `getCurrentUser` | lib/auth.ts 리팩터 동반 → 별도 변경 |

## 수용 기준 (phase3 검수에서 확인)

1. `npm run typecheck` PASS
2. `npm run build` PASS
3. 기존 UI 동작 불변:
   - 대시보드 보드 목록 렌더
   - 보드 페이지 5개 레이아웃 모두 정상
   - 교실 상세 + 학생/보드 목록 렌더
   - 권한 체크 (owner/editor/viewer/student) 기존과 동일
4. 인덱스 migration SQL이 idempotent (`IF NOT EXISTS`)

## 배포 주의

- 인덱스 migration 은 Supabase에 적용 필요: `npx prisma db push`
  - 로컬 `.env` 에 `DATABASE_URL` 과 `DIRECT_URL` 세팅 상태로 실행
  - 또는 Supabase SQL editor 에 `migration.sql` 내용 붙여넣기
- 인덱스 생성은 PostgreSQL 에서 기본 `CREATE INDEX` 는 테이블 락을 획득하지만, 현재 트래픽 수준에서는 문제 없음. 프로덕션 대규모 데이터면 `CREATE INDEX CONCURRENTLY` 로 변경 고려.

## 회귀 테스트

이 프로젝트에는 단위/E2E 테스트 인프라가 없음(package.json에 테스트 프레임워크 미설치).
대체 검증:
- `npm run typecheck` — TypeScript 타입 안전성
- `npm run build` — Next.js 빌드 성공 (RSC 경로 유효성 검증)
- 수동 재현: phase1 diagnosis §1 의 재현 시나리오 전체 확인 (phase3 검수에서 수행)

테스트 인프라 도입은 별도 research task 로 분기 권고.
