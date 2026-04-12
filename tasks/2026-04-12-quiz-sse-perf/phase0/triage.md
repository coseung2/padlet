# Triage — quiz-sse-perf

## 증상 (관찰 가능한 행동만)

- 사용자 보고: "전체적으로 느려" 중 퀴즈 진행 중 가중 요인
- 퀴즈 활성 시 다른 페이지 응답도 함께 지연 (DB 리소스 경합)
- SSE 구독자 수 증가할수록 심화

## severity 근거

- **high**
- 퀴즈 기능 자체는 동작하나 서버 전체 성능 잠식
- 데이터 손실/보안 사고 없으므로 `critical` 아님

## 초기 관찰 (증거)

- `src/app/api/quiz/[id]/stream/route.ts:20-104` — 1초마다 전체 퀴즈 데이터 풀 쿼리
- `src/components/QuizBoard.tsx:58-73` — 매 이벤트마다 전체 퀴즈 객체 교체 (광범위 리렌더)
- `src/components/QuizPlay.tsx:63-155` — EventSource 정리 누락 가능성

## 스코프

- 퀴즈 SSE 스트림 라우트 (`/api/quiz/[id]/stream`)
- QuizBoard / QuizPlay 의 상태 업데이트 전략

## 스코프 외

- 다른 서버 쿼리 → `server-query-perf`
- 일반 클라이언트 렌더링 → `client-render-perf`

## 긴급 단축 여부

- `high` → 미적용
