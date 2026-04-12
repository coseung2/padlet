# Triage — server-query-perf

## 증상 (관찰 가능한 행동만)

- 사용자 보고: "탭간의 이동이나 보드 열때 등 웹이 전체적으로 느려"
- 재현 경로: 대시보드 ↔ 보드 ↔ 교실 페이지 이동 시마다 눈에 띄는 지연
- 데이터 손실/에러 없음. 기능은 정상 동작하되 응답 시간 저하

## severity 근거

- **high** 분류
- 핵심 기능(보드 열기, 페이지 이동)의 UX가 크게 저하
- 데이터 손실/보안 영향 없으므로 `critical` 아님
- 사용자가 일상적으로 겪는 빈번한 경로 → `medium` 보다 심각

## 초기 관찰 (증거)

사전 분석에서 3개 Explore 에이전트가 병렬 조사한 결과:

1. **모든 페이지 `force-dynamic`** — Next.js 캐싱 완전 비활성화
   - `src/app/page.tsx:8`, `src/app/board/[id]/page.tsx:17`, `src/app/classroom/page.tsx:6`, `src/app/classroom/[id]/page.tsx:6`, `src/app/student/page.tsx:6`
2. **보드 페이지 단일 쿼리 과부하** — `src/app/board/[id]/page.tsx:34-46` (카드+섹션+제출물+멤버+퀴즈 전체)
3. **순차 DB 호출** — `src/app/page.tsx:19-34`, `src/app/board/[id]/page.tsx:34-64`, `src/app/classroom/[id]/page.tsx:16-32`
4. **누락 인덱스** — `prisma/schema.prisma` L48 (Account.userId), L56 (Session.userId), L149 (Card.authorId)

## 스코프 (이 트랙에서만 다룰 것)

- 서버 사이드 데이터 로드 경로 (페이지 RSC, API routes, Prisma 쿼리, 인덱스)
- 캐싱 전략 (revalidation, unstable_cache, HTTP cache headers)

## 스코프 외 (다른 트랙으로 분기)

- 클라이언트 렌더링/번들 → `client-render-perf` 트랙
- 퀴즈 SSE 스트림 → `quiz-sse-perf` 트랙

## 긴급 단축 여부

- `severity == high` 이므로 긴급 단축 **미적용**
- 정상 phase 순서 (phase1 진단 → phase2 핫픽스 → phase3 검수) 준수
