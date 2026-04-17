# Phase 3 — Architecture

## 1. SSE 보드 스트림

### 신규 라우트 — `src/app/api/boards/[id]/stream/route.ts`

```
GET /api/boards/:id/stream  →  text/event-stream
```

흐름:
1. 진입 시 `getCurrentUser()` + `requirePermission(boardId, "view")`. 실패 → 403 응답(스트림 미시작).
2. `ReadableStream.start(controller)` 안에 폴링 루프 (3초 간격):
   - `db.card.findMany({ where: { boardId }, orderBy: { order: "asc" } })`
   - `db.section.findMany({ where: { boardId }, orderBy: { order: "asc" } })`
   - 두 결과를 합쳐 stable 직렬화 후 SHA1 해시 (cards/sections 분리). 직전 해시와 다르면 `event: snapshot\ndata: {cards, sections}` 전송.
3. 60초마다 권한 재검증 (`getBoardRole`). 권한 잃으면 `event: forbidden` + close.
4. 60초마다 keepalive 코멘트(`: ping\n\n`) 전송 (프록시 idle timeout 방지).
5. `ReadableStream.cancel()` 시 `cancelled = true` → poll 종료 (quiz 패턴 동일).

### 페이로드 모양

```ts
type SnapshotEvent = {
  cards: CardWire[];      // 모든 필드 (현재 ColumnsBoard CardData와 동일 매핑)
  sections: { id: string; title: string; order: number }[];
};
```

전체 스냅샷 재전송 = 머지 로직 단순. 현재 컬럼 보드 카드 상한이 수백 단위라 페이로드 사이즈 허용.

### 첫 폴링은 즉시 1회 (0초 대기) → 클라이언트 hydration 직후 빠르게 동기화.

## 2. 클라이언트 — ColumnsBoard 통합

### 새 hook (인라인) — `useBoardStream`

ColumnsBoard 안에 `useEffect`로 직접 구현:
1. `new EventSource('/api/boards/{boardId}/stream')`
2. `addEventListener('snapshot', ev => mergeSnapshot(JSON.parse(ev.data)))`
3. `addEventListener('forbidden', ...)` → ES.close + 콘솔 경고
4. unmount 시 `es.close()`

### 머지 규칙

- `pendingMutationIds: Set<string>` (ref) — POST/PATCH/DELETE 시작 시 카드 ID 추가, 응답 후 제거.
- 스냅샷 적용:
  - 카드: 서버 카드 중 `pendingMutationIds`에 있는 ID는 **현재 로컬 값 유지**(옵티미스틱 보호). 나머지는 서버 값 채택.
  - 새 카드(서버에만 존재) 추가, 사라진 카드(로컬에만 존재 & non-pending) 제거.
  - 섹션도 동일 규칙(섹션 mutation은 더 적어 단순).

### 옵티미스틱 → SSE handoff

기존 옵티미스틱 setCards 호출 직전에 `pendingMutationIds.add(cardId)` 추가. fetch finally에서 제거. 이렇게 하면 SSE 스냅샷이 옵티미스틱 도중 도착해도 사용자 화면이 깜빡이지 않음.

## 3. 칼럼별 정렬 토글

### 상태

```ts
type SortMode = "manual" | "newest" | "oldest" | "title";
const [sortBySection, setSortBySection] = useState<Record<string, SortMode>>({});
```

### 영속

- 키: `aura.columnSort.{boardId}` (단일 키에 섹션→모드 객체 저장).
- mount 시 `localStorage.getItem` → state 시드.
- 변경 시 즉시 저장.

### 정렬 적용

`cardsBySection`은 섹션별로 그룹핑까지 진행. 각 섹션의 카드 배열을 추가로 sortMode에 따라 정렬:

```ts
function sortFor(mode: SortMode, cards: CardData[]): CardData[] {
  switch (mode) {
    case "manual":
    case undefined:
      return cards.sort(byOrderAsc);
    case "newest":
      return cards.sort(byCreatedDesc);
    case "oldest":
      return cards.sort(byCreatedAsc);
    case "title":
      return cards.sort(byTitleLocale);
  }
}
```

`CardData`에는 이미 `createdAt: string` 필드가 있어 추가 schema 변경 불필요(`/api/boards/:id` 응답과 page.tsx에서 모두 채움).

### UI

칼럼 헤더 — 카운트 옆에 작은 `<select>` (기본 옵션: `수동`). `aria-label="정렬"`. select 변경 시 setSortBySection.

### 드래그 reorder 안전장치

같은 섹션 내 inline reorder(=drop on same section)는 manual에서만 의미가 있는데, 현재 `moveCard`가 항상 `targetCards.length`로 끝에 push. 비-manual 모드에서도 PATCH는 진행하되, `column-cards`에 `data-sort-mode` attribute를 두고 manual이 아니면 반투명 안내 토스트(아주 단순: alert) 또는 제목바에 "정렬: 최신순" 뱃지 표기로 사용자에게 표시. 본 task에서는 **헤더에 모드 라벨이 보이는 것**만으로 충분하다(사용자 혼란 1차 차단).

## 4. 보안

- SSE 라우트 GET은 NextAuth 또는 student session 모두 거부 안 됨 — `getCurrentUser` 사용 정책 확인 필요. 일관성 위해 기존 `requirePermission`을 그대로 쓰고, 학생 뷰어는 차회 task에서 확장(분리 명시).
- 페이로드에 비공개 필드 추가하지 않음(이미 page.tsx에서 클라이언트로 보내는 카드 필드와 동일).

## 5. 성능

- 변경 hash로 중복 스냅샷 차단 → 빈 보드는 사실상 핑만 흐름.
- 한 보드에 viewer N명일 때 폴링은 N×(card+section) findMany / 3s. 100 카드 × 8 섹션 × 5뷰어 시 초당 ~1.7쿼리. perf 인덱스(`20260412_add_perf_indexes`) 이미 boardId 기준 존재.

## 6. 비범위(향후)

- 카드 단위 diff (`event: card-added | card-updated | card-deleted`).
- 다른 레이아웃 적용.
- WebSocket / Supabase Realtime 마이그레이션.
- 정렬 모드 사용자 간 공유.
