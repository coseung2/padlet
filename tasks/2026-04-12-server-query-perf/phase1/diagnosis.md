# Diagnosis — server-query-perf

## 1. 재현 절차

1. 로컬 dev 서버 기동: `fuser -k 3000/tcp; rm -rf .next; PORT=3000 npm run dev`
2. `/` (대시보드) 접속 → 보드 목록 로드 완료까지 체감 1~2초+
3. 보드 링크 클릭 → `/board/:id` 로드 완료까지 체감 2~3초+
4. 뒤로가기 → 다시 대시보드 전체 쿼리 재실행 (캐시 없음)
5. 반복 시 매번 동일한 지연 재현

## 2. 증상 범위

- **영향 받는 사용자**: 모든 인증 사용자 (owner/editor/viewer)
- **영향 받는 페이지**: `/`, `/board/:id`, `/classroom/:id`, `/student`, `/quiz/:code`, `/qr/:token`
- **시작 시점**: `force-dynamic` 도입 이후 지속. 데이터 증가에 따라 심화.

## 3. 근본 원인

### 3-1. Next.js 캐시 완전 비활성화
- `force-dynamic` 지시자가 모든 주요 페이지에 박혀 있음
- Data Cache, Full Route Cache, Router Cache 전부 무효화
- 탭 전환마다 RSC 전체 재실행 + DB 재쿼리

### 3-2. 보드 페이지 단일 쿼리에 과도한 `include`
`src/app/board/[id]/page.tsx:34-46`:
```ts
include: {
  cards: { orderBy: { order: "asc" } },       // 전체 카드
  sections: { orderBy: { order: "asc" } },    // 전체 섹션
  submissions: true,                          // 전체 제출
  members: { include: { user: true } },       // 유저 풀필드
  quizzes: {
    include: { questions: { ... }, players: true },  // 퀴즈+질문+플레이어 전체
  },
}
```
- 카드 100개 + 퀴즈 2개 × 플레이어 50명 = 수백~수천 레코드
- 단일 응답 payload 비대 + Prisma hydrate 오버헤드

### 3-3. 직렬 DB 호출 (병렬화 누락)
`src/app/board/[id]/page.tsx:34-64`:
1. board 조회
2. `getCurrentUser()` (users.findUnique)
3. `getBoardRole()` (boardMember.findFirst)
4. `getCurrentStudent()` (student.findUnique)
→ 4개 독립 쿼리가 순차 실행. 각 쿼리 레이턴시 누적.

### 3-4. 누락 인덱스
- `prisma/schema.prisma:48` — `Account.userId` 인덱스 없음 (NextAuth 세션 조회 시 풀스캔)
- `prisma/schema.prisma:56` — `Session.userId` 인덱스 없음
- `prisma/schema.prisma:149` — `Card.authorId` 인덱스 없음

### 3-5. API routes에 캐시 헤더 부재
- `Cache-Control` 헤더 미설정
- Next.js `fetch` 의 `revalidate` 옵션 미사용
- 클라이언트가 동일 데이터 반복 요청

## 4. 증거 목록

- `evidence/force_dynamic_usages.txt` — force-dynamic 사용 위치 전수조사
- `evidence/sequential_queries.txt` — 직렬 DB 호출 코드 스니펫
- `evidence/missing_indexes.txt` — 누락 인덱스 목록

## 5. 수정 방향 (제안만)

### 5-1. 캐싱 전략
- `force-dynamic` 제거. 대신 동적 부분만 `unstable_cache` 또는 `revalidate` 활용
- 인증된 유저별 데이터는 `cache()` (React cache)로 요청 범위 메모이제이션
- 공개 API 응답에 `Cache-Control: private, max-age=30, stale-while-revalidate=60`

### 5-2. 보드 쿼리 분리
- `board` 기본 조회 + `cards` 페이지네이션 (최초 50개) + `members/quizzes` 별도 로드
- 필요한 필드만 `select` 로 한정

### 5-3. 병렬화
- `getCurrentUser()` + `getBoardRole()` + `getCurrentStudent()` → `Promise.all()`
- 대시보드: `boardMember.findMany()` + `classroom.findMany()` 병렬

### 5-4. 인덱스 추가
- Prisma migration으로 `Account.userId`, `Session.userId`, `Card.authorId` 인덱스 생성
- 기존 데이터 마이그레이션은 SQLite → PostgreSQL 전환 이력 있으므로 Supabase 측에서 실행

### 5-5. 구현 순서 (phase2)
1. 인덱스 migration (즉시 효과, 리스크 낮음)
2. 병렬화 (코드 변경 국소, 리스크 낮음)
3. force-dynamic 제거 + 캐시 전략 (리스크 중간, 테스트 필요)
4. 보드 쿼리 분리 + 페이지네이션 (UI 변경 동반, 리스크 중간)
