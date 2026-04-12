# Diagnosis — quiz-sse-perf

## 1. 재현 절차

1. 교사 계정으로 퀴즈 생성 및 시작
2. 학생 10명+ 참가
3. 서버 로그에서 1초마다 동일한 풀 쿼리 반복 확인
4. 다른 탭에서 대시보드/보드 열기 → 평소보다 더 느림 (DB 경합)

## 2. 증상 범위

- **영향 받는 사용자**: 퀴즈 호스트 + 참가자 전원
- **영향 받는 페이지**: `/quiz/:code`, `/board/:id` (퀴즈 라이브 뷰)
- **시작 시점**: 퀴즈 라이브 세션 중 지속

## 3. 근본 원인

### 3-1. 1초 간격 풀 쿼리 폴링
`src/app/api/quiz/[id]/stream/route.ts:20-104`:
```ts
async function poll() {
  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" }, include: { answers: true } },
      players: { orderBy: { score: "desc" } },
    },
  });
  // ... 전체 quiz 객체 SSE로 전송
  setTimeout(poll, 1000);
}
```
- 매초 전체 questions + 모든 answers + 모든 players 재조회
- 100 players × 50 questions = 분당 6,000+ 쿼리
- 변경 없어도 동일 페이로드 반복 전송
- SSE 연결당 1 poller → N명 접속 시 N배 부하

### 3-2. 델타 전송 부재
- 점수 1명 변경 → 전체 players 배열 송신
- 클라이언트는 전체 배열로 상태 교체 → 광범위 재렌더

### 3-3. QuizBoard 상태 업데이트가 광범위
`src/components/QuizBoard.tsx:58-73`:
```ts
es.addEventListener("quiz-status", (e) => {
  setQuizzes(prev => prev.map(q =>
    q.id === quiz.id ? { ...q, status: d.status, ... } : q
  ));
});
```
- 단순 상태 필드 변경인데 퀴즈 객체 전체 교체
- 렌더 범위: 분포 차트(OPT_LABELS.map) 재계산 포함

### 3-4. EventSource 정리 경로 취약
`src/components/QuizPlay.tsx:63-155`:
- `useEffect([quizId, playerId])` 내 EventSource 생성
- 라우트 이동 시 중복 구독 가능성
- cleanup에서 AbortController 미사용

## 4. 증거 목록

- `evidence/sse_route.txt` — 현재 스트림 라우트 구조 요약
- `evidence/quiz_client_updates.txt` — 클라이언트 상태 업데이트 경로

## 5. 수정 방향 (제안만)

### 5-1. 델타 기반 SSE
- 서버에서 마지막 emit 상태를 메모리에 캐시
- 변경된 필드만 `quiz-delta` 이벤트로 전송
  ```ts
  { type: "player-score", playerId, score }
  { type: "status", status }
  ```
- 전체 상태는 첫 접속 시 `quiz-init` 이벤트로 1회만

### 5-2. 쿼리 최소화
- 현재 질문만 fetch: `questions: { where: { order: quiz.currentQ } }`
- 플레이어 업데이트는 DB trigger 또는 애플리케이션 레벨 pub/sub 사용
- 폴링 간격 1초 → 2~3초 (델타 전환 후)

### 5-3. 중장기: pub/sub 도입
- Redis pub/sub 또는 Supabase Realtime 으로 DB 폴링 제거
- Vercel 배포 환경이면 **Vercel Queues** 또는 Supabase Realtime 검토
  (server-query-perf 트랙 이후 별도 research task로 분기 가능)

### 5-4. 클라이언트 상태 세분화
- `quizzes` 단일 state → `quizStatusMap`, `playersMap`, `distributionMap` 분리
- 분포 차트는 별도 memoized 컴포넌트로 추출

### 5-5. EventSource cleanup 강화
```ts
useEffect(() => {
  const ac = new AbortController();
  const es = new EventSource(url);
  ac.signal.addEventListener("abort", () => es.close());
  return () => ac.abort();
}, [quizId, playerId]);
```

### 5-6. 구현 순서 (phase2)
1. 현재 질문만 fetch (즉시 효과, 리스크 낮음)
2. 델타 전송 (로직 재설계, 테스트 필요)
3. 클라이언트 상태 분리 + memo
4. EventSource cleanup 강화
5. pub/sub 도입은 research task로 분기
