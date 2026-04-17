# Phase 1 — Research

## 사용자 행동 (관찰)

- 사용자는 columns 레이아웃 보드를 함께 사용 중. 다른 사람이 카드를 올려도 본인 화면에 나오지 않아 수동 새로고침 반복.
- 큰 칼럼이 많을수록 카드 정렬 기준이 일정치 않아 찾기 힘듦. 현재는 수동 드래그 순서만 가능.

## 기존 자산

- **SSE 선례**: `src/app/api/quiz/[id]/stream/route.ts` — `ReadableStream` + `text/event-stream`, 1초 폴링, `cancel()`로 누수 방지. 클라이언트 `EventSource` 사용 (`QuizPlay.tsx`, `QuizBoard.tsx`).
- **realtime helper**: `src/lib/realtime.ts` — `boardChannelKey` / `sectionChannelKey` 키 컨벤션만 정의. publish는 no-op. SSE 라우트 내부 구현은 자유.
- **카드 API**: `POST /api/cards`, `PATCH /api/cards/:id`, `DELETE /api/cards/:id` — 현재 즉시 응답만. 브로드캐스트 없음.
- **ColumnsBoard.tsx**: 350줄 클라이언트 컴포넌트. `cards` state는 옵티미스틱 업데이트 + 실패 롤백. 정렬은 `useMemo`로 `order asc`만.

## 외부 패턴 비교

| 옵션 | 장점 | 단점 |
|---|---|---|
| SSE 폴링 | 인프라 0, 같은 코드 패턴 재사용 | 카드 단위 즉시성 부족(1~3초) |
| WebSocket / PartyKit | 진짜 실시간, 양방향 | 신규 인프라/배포 변경 |
| Supabase Realtime | DB CDC 직결 | DB 권한 정책 재설계 필요 |
| polling fetch | 단순 | 헤더 오버헤드, throttle 어려움 |

기존 quiz가 SSE 폴링이고 검증된 디자인 → 동일 패턴 채택.

## 정렬 토글 UX 사례

- Trello: 칼럼 헤더 …메뉴에서 "Sort" → 드롭다운 (manual / date created / due date / name).
- Notion DB view: 정렬은 보드 단위. 칼럼 단위는 미지원.
- Padlet 본가: 보드 단위 정렬만, 칼럼별은 없음.

→ 차별화 포인트로 칼럼별 토글이 의미 있음. `ContextMenu` 자산 재사용.

## 제약

- 인증/권한 그대로(보드 view 권한 보유자만 SSE 접속).
- 정렬 == "수동(order)"이 아니면 드래그 reorder 비활성/명확화 필요(혼란 방지).
- 정렬 선택은 클라이언트 로컬(다른 사람과 다를 수 있음 → 개인 설정).

## 결론

- 트랜스포트: 폴링 SSE (`/api/boards/:id/stream`) — 3초 간격, board 권한 검증.
- 페이로드: 카드/섹션 목록 해시 비교 후 변경 시 전체 스냅샷 재전송 (간단/안전).
- 정렬: 칼럼별 select, localStorage 영속, "수동" 외 모드는 드래그 수동 reorder UI를 비활성.
