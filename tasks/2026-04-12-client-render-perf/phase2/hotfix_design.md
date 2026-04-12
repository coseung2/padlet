# Hotfix Design — client-render-perf

## 변경 요약

Track B (클라이언트 렌더링 최적화) 의 phase1 diagnosis §5 권고안 중 **위험도 낮은 5개 축**을 최소 변경으로 적용.

### 1. XLSX 동적 import (commit `1f088ad`)

- `src/components/AddStudentsModal.tsx`: top-level `import * as XLSX from "xlsx"` 제거
- `handleFile()` 내부에서 `await import("xlsx")` 로 지연 로드
- `parseFileData()` 가 XLSX 모듈을 인자로 받도록 시그니처 변경
- **효과**: 초기 번들에서 XLSX ~400KB 제거. 교사가 파일을 실제로 선택했을 때만 다운로드.

### 2. ColumnsBoard 메모이제이션 + 드래그 CSS 클래스화 (commit `eb8a586`)

#### 2-1. getCardsForSection 메모이제이션
Before — 렌더당 8회 `filter + sort` (섹션당 2회 × 4 섹션):
```ts
function getCardsForSection(sectionId) {
  return cards.filter(...).sort(...);  // O(n log n) × 8
}
```

After — `cardsBySection` Map 을 `useMemo` 로 1회 구축:
```ts
const cardsBySection = useMemo(() => {
  const map = new Map<string, CardData[]>();
  const sorted = [...cards].sort(...);
  for (const card of sorted) {
    map.get(key)?.push(card) ?? map.set(key, [card]);
  }
  return map;
}, [cards]);

function getCardsForSection(id) {
  return cardsBySection.get(id) ?? [];  // O(1)
}
```

#### 2-2. 드래그 opacity → CSS 클래스
- `style.opacity = "0.5"` 직접 조작 → `classList.add("is-dragging")`
- `src/styles/boards.css` 에 `.column-card.is-dragging { opacity: 0.5 }` 추가
- 클래스 토글은 스타일 캐시에 영향 없음 → 레이아웃 스래싱 방지

### 3. CardAttachments React.memo (commit `1b4e104`)

- `CardAttachments` 에 `React.memo` 래핑 (6개 primitive/null props → shallow equality 안전)
- 4개 보드 컴포넌트 (Grid, Stream, Columns, Board/Draggable) 에서 모든 카드 자식으로 사용됨
- 드래그, 선택, 모달 토글 등 무관한 부모 state 변경 시 attachment 프리뷰 재렌더 방지

**의식적으로 제외**: `DraggableCard` memo.
- 현재 callsite `onPositionChange={(x,y) => handlePositionChange(c.id, x, y)}` 처럼 card.id 클로저를 매번 새로 생성
- memo 효과를 얻으려면 `onPositionChange(cardId, x, y)` 시그니처로 API 변경 + 부모에서 `useCallback` 안정화 필요
- **scope 초과** → 별도 후속 작업으로 분기

### 4. 낙관적 업데이트 (commit `763ad02`)

- `ClassroomDetail` 의 `router.refresh()` 호출 제거
- `AddStudentsModal` 이 생성된 학생 배열을 `onAdded(newStudents)` 로 전달
- `ClassroomDetail` 은 로컬 `students` state 에 머지 (번호순 재정렬)
- 학생 추가 시 전체 RSC 재실행 / 풀 데이터 리페치 **사라짐**
- 다른 mutation (delete, batch-delete, reissue, link/unlink) 은 이미 낙관적 업데이트 사용 중 — 본 커밋으로 마지막 남은 `router.refresh()` 경로 제거 완료

### 5. max-height 애니메이션 → transform (commit `a40c15d`)

- `src/styles/modal.css` `@keyframes attachIn`: `max-height: 0 → 400px` → `transform: scaleY(0.8) → 1`
- `max-height` 애니는 매 프레임 layout 재계산. `transform` 은 composite-only.
- `.modal-attach-section` 에 `transform-origin: top` 추가 (자연스러운 확장)

## 왜 최소인가

### 반영한 것만 반영
- **XLSX**: import 구문만 변경, 함수 시그니처 한 곳
- **ColumnsBoard**: 기존 `getCardsForSection` API 유지. 내부만 메모이제이션.
- **드래그 CSS**: 기존 `.column-card:active { opacity: 0.85 }` 규칙 유지. 새 modifier 추가만.
- **CardAttachments memo**: 래퍼만 추가, 내부 로직 불변
- **낙관적 업데이트**: 기존 API 응답 shape 그대로 활용
- **max-height 애니**: 애니메이션 대상만 변경, 섹션 배치/크기 영향 없음

### 의식적으로 제외
| 제외 | 이유 |
|---|---|
| `DraggableCard` React.memo | callback 시그니처 변경 + 부모 `useCallback` 필요 → scope 초과 |
| `Dashboard` 인라인 스타일 정리 | 리팩터 범주, UI 동작 변경 없음 → scope 초과 |
| `QuizBoard` 상태 세분화 | Track C 스코프 |
| QR 서버 사이드 캐시 | Prisma 스키마 변경 + migration 필요 → 별도 feature task |

## 수용 기준

1. `npm run typecheck` PASS
2. `npm run build` PASS
3. UI 동작 불변:
   - AddStudentsModal에서 파일 업로드 → 파싱 정상
   - 학생 일괄 추가 → 모달 닫히고 테이블에 즉시 표시, 번호순 정렬
   - ColumnsBoard 카드 이동 → 드래그 중 opacity 0.5 표시
   - 카드 드롭 → 섹션 이동 정상
   - 모달 attach 섹션 토글 → 애니메이션 자연스러움

## 회귀 테스트

테스트 프레임워크 미설치 → `typecheck` + `build` + 수동 검증으로 대체 (`tests_added.txt` 참조).

## 성능 기대치 (정성적)

| 항목 | Before | After |
|---|---|---|
| 초기 번들 크기 | XLSX 포함 (~400KB) | 지연 로드 |
| 100카드/4섹션 보드 렌더 | 800 filter+sort | 1 sort + Map 1회 구축 |
| 학생 일괄 추가 후 | RSC 재실행 + 풀 리페치 (수 초) | 즉시 (<16ms) |
| 드래그 중 프레임 드랍 | 인라인 스타일 recalc | 클래스 토글 (composite only) |
| 모달 attach 애니 | layout/frame | composite/frame |
