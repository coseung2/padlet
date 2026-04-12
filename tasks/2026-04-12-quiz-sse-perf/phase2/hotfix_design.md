# Hotfix Design — quiz-sse-perf

## 변경 요약

Track C (퀴즈 SSE 최적화) 의 phase1 diagnosis §5 권고안 중 **위험도 낮은 3개 축**을 최소 변경으로 적용.

### 1. SSE 스트림 델타화 + 쿼리 경량화 (commit `f471946`)

#### Before
- `db.quiz.findUnique` 마다 `questions + answers + players` 전체 join
- 응답마다 quiz 전체 상태 전송 (status, currentQ, players, distribution)
- `answers` 이벤트는 매 poll 마다 무조건 emit (변경 여부 무관)
- 플레이어 델타는 **count** 기반 — 점수 업데이트만 있는 경우 client로 전파 안 됨 (버그)

#### After
- **Tick 쿼리 슬림화**: `{ status, currentQ, players(id, nickname, score) }` 만 조회
- **questions 캐시**: 라이브 퀴즈 동안 questions 는 immutable. 최초 1회 `quizQuestion.findMany` 후 메모리 캐시
- **플레이어 해시 기반 델타**: `id:score` 해시 비교 → 점수 변화도 감지
- **answers 분포 count-gated**: `quizAnswer.count` 로 변화 감지 → count 달라질 때만 `findMany({select: {selected: true}})` + 재집계
- **스트림 취소 전파**: `ReadableStream.cancel()` 에서 `cancelled = true` 플래그 설정 → 다음 `setTimeout(poll, 1000)` 자동 종료. 클라이언트 disconnect 시 DB 폴링 루프 누수 방지.

#### 쿼리 수 비교 (1초 tick, 100 플레이어, 50 질문)
| 조건 | Before | After |
|---|---|---|
| 변화 없음 | 1 query + 완전 hydrate (question 50 + answers N + players 100) | 2 small queries (quiz+players 101 rows, count 1 row) |
| 플레이어 점수 변경 | 1 query 동일 | 2 small queries |
| 답변 도착 | 1 query 동일 | 3 queries (tick + count + 분포 findMany) |
| 질문 전환 | 1 query 동일 | 2 small queries (questions 캐시 HIT) |

### 2. QuizBoard 컴포넌트 분리 + 메모이제이션 (commit `65fb78a`)

- `Distribution` 컴포넌트 분리 → `React.memo({ dist, correctIndex })`
- `PlayerList` 컴포넌트 분리 → `React.memo({ players })`
- `sorted` 플레이어 배열 → `useMemo`
- **효과**:
  - `answers` 델타만 온 경우 → `dist` state 만 변경 → `Distribution` 만 리렌더
  - `players` 델타만 온 경우 → `quiz.players` 변경 → `sorted` 재계산 → `PlayerList` 만 리렌더
  - 이전: 각 델타가 전체 QuizBoard 트리 리렌더

### 3. EventSource cleanup 검증 (no commit)

- `QuizPlay.tsx` L151-154: 이미 `es.close()` cleanup 있음
- `QuizBoard.tsx` L92-94: 이미 `es.close()` cleanup 있음
- `playerIdRef` 패턴으로 부모 state 변경에도 재구독 방지
- 추가 변경 불필요 — 본 track 에서는 **no-op**

## 왜 최소인가

### 반영한 것만 반영
- **SSE 라우트**: 외부 API 계약(SSE 이벤트 이름/shape) 불변. 전송 빈도와 내부 쿼리만 조정
- **QuizBoard**: 하위 컴포넌트 분리만. 부모 state 구조와 이벤트 핸들러 불변
- **코드 사이즈 증가 최소**: route.ts +80줄, QuizBoard.tsx +50줄

### 의식적으로 제외
| 제외 | 이유 |
|---|---|
| Supabase Realtime 마이그레이션 | 아키텍처 변경 → 별도 research task |
| Vercel Workflow 전환 | 플랫폼 종속 아키텍처 변경 → 별도 research task (PostToolUse hook 권고 사항) |
| 폴링 간격 증가 (1s → 2-3s) | UX 지연 체감 우려. 델타 gating 이 효과 더 큼 |
| 클라이언트 SSE 재연결 전략 | 현재 auto-reconnect (EventSource 기본) 충분 |
| QuizPlay 상태 구조 재설계 | 현재 구조로도 delta 적용 가능 |

## 후속 작업 (follow-up)

본 hotfix 이후 남은 개선:

1. **Supabase Realtime 도입 검토**: 폴링 완전 제거. `quizPlayer` 테이블 변경 listen → client 직접 push
2. **Vercel Workflow**: 장기 SSE 대신 durable workflow 로 전환 (Vercel 플랫폼 종속)
3. **웹소켓 전환**: SSE 단방향 한계. 양방향 필요 시 WebSocket (Socket.io / Pusher)

모두 별도 research task 로 분기 권고.

## 수용 기준

1. `npm run typecheck` PASS
2. `npm run build` PASS
3. UI 동작 불변:
   - 퀴즈 생성 / 참가 / 진행 / 종료 플로우 정상
   - 호스트 뷰: 분포 차트, 플레이어 목록 실시간 업데이트
   - 플레이어 뷰: 문제 수신, 답변 제출, 순위 표시 정상
4. 새 동작:
   - 점수 업데이트 (count 변화 없이) 도 플레이어 뷰에 반영됨 (기존 버그 수정)
   - 브라우저 탭 닫기 → 서버 DB 폴링 루프 자동 종료 (로그 확인)

## 회귀 테스트

테스트 프레임워크 미설치 → `typecheck` + `build` + 수동 검증으로 대체 (`tests_added.txt` 참조).

## 성능 기대치 (정성적)

| 항목 | Before | After |
|---|---|---|
| 1 tick DB 부하 (변화 없음) | questions+answers+players 완전 hydrate | quiz+players 소량 + count 1개 |
| 10 구독자 × 60초 | ~600 heavy queries | ~1200 light queries, 데이터량 1/10 |
| 호스트 뷰 리렌더 단위 | 전체 QuizBoard 트리 | Distribution OR PlayerList 만 |
| 클라이언트 탭 닫기 | 서버 루프 계속 돌음 | 다음 tick에서 종료 |
