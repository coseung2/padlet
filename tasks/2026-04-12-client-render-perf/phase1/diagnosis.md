# Diagnosis — client-render-perf

## 1. 재현 절차

### 시나리오 A: 학생 관리
1. 교실 페이지 접속 (학생 20명 이상)
2. 학생 1명 삭제 → UI 업데이트까지 1~2초 지연
3. QR 재발급 → 다시 지연

### 시나리오 B: 드래그 앤 드롭
1. 보드 페이지 접속 (카드 30개+)
2. 카드 드래그 시작 → 드래그 중 프레임 드랍
3. 드롭 시 UI 업데이트 지연

### 시나리오 C: 초기 로드
1. 교실 페이지 최초 접속 (cold cache)
2. Network 탭에서 XLSX 라이브러리(~400KB) 다운로드 확인
3. 실제 엑셀 업로드 모달은 열지 않아도 포함됨

## 2. 증상 범위

- **영향 받는 사용자**: 교실/보드 편집자(owner/editor)
- **영향 받는 페이지**: `/classroom/:id`, `/board/:id`
- **시작 시점**: 학생/카드 데이터 증가에 따라 심화

## 3. 근본 원인

### 3-1. `router.refresh()` 남발
`src/components/ClassroomDetail.tsx:47-49`:
```ts
const refresh = useCallback(() => { router.refresh(); }, [router]);
```
호출 지점:
- L354-355 학생 추가
- L85 학생 삭제
- L115 QR 재발급

각 호출마다 RSC 전체 재렌더 → 서버 왕복 → 클라이언트 리하이드레이션 → 수백 학생 re-render.

### 3-2. XLSX 정적 import
`src/components/AddStudentsModal.tsx:3`:
```ts
import * as XLSX from "xlsx";
```
- 모달을 열지 않아도 초기 번들에 포함
- ~400KB minified
- 비교: jspdf, qrcode는 dynamic import 사용 중 (StudentQRCard.tsx)

### 3-3. `getCardsForSection()` 렌더 시 반복 호출
`src/components/ColumnsBoard.tsx:129-133, 346`:
```ts
function getCardsForSection(sectionId: string) {
  return cards.filter(c => c.sectionId === sectionId).sort(...);
}
```
- 섹션 4개 × 렌더당 2회 = 8회/렌더
- 카드 100개 × 필터+정렬 × 8 = 800 연산/렌더
- 카드 1개 이동 시마다 전체 재계산

### 3-4. React.memo / useCallback 미사용
- `DraggableCard` (L32) — props 안정된데 memo 없음
- `CardAttachments` — 4개 보드 컴포넌트에서 자식으로 사용되나 memo 없음
- `Dashboard` — 인라인 스타일 객체 9곳 + 인라인 핸들러
- `ClassroomDetail` — `toggleSelect`/`toggleAll`/`handleBatchDelete` 등 L50+ 미memo

효과: 부모 상태 변경마다 수십~수백 자식 re-render.

### 3-5. QR 코드 렌더링 비용
`src/components/ClassroomDetail.tsx:380-389`:
```ts
useEffect(() => {
  import("qrcode").then(QRCode => {
    QRCode.toDataURL(url, ...).then(setQrSrc);
  });
}, [student.qrToken]);
```
- 학생 500명이면 500 × dynamic import + 500 × QR 생성
- 각 `StudentRow` 마운트마다 실행

### 3-6. 드래그 DOM 직접 조작
`src/components/ColumnsBoard.tsx:352-357`:
```ts
handleDragStart: e.currentTarget.style.opacity = "0.5";
handleDragEnd:   e.currentTarget.style.opacity = "1";
```
- style 직접 쓰기 → 레이아웃 스래싱
- CSS 클래스 토글 권장

### 3-7. `max-height` 애니메이션
`src/styles/modal.css:24-27`:
```css
@keyframes attachIn {
  from { opacity: 0; max-height: 0; }
  to   { opacity: 1; max-height: 400px; }
}
```
- `max-height`는 GPU 가속 안 됨. 매 프레임 레이아웃 재계산.

## 4. 증거 목록

- `evidence/client_hotspots.txt` — 핫스팟 파일/라인 요약
- `evidence/bundle_imports.txt` — 번들 관련 import 목록

## 5. 수정 방향 (제안만)

### 5-1. `router.refresh()` → optimistic update
- `ClassroomDetail` 에서 학생 CRUD 후 로컬 `students` state 업데이트
- API 응답으로 서버 truth 검증 (실패 시 롤백)
- 필요 시 `startTransition` 으로 래핑

### 5-2. XLSX dynamic import
```ts
// before
import * as XLSX from "xlsx";
// after (파일 선택 핸들러 내부)
const XLSX = await import("xlsx");
```

### 5-3. 메모이제이션
- `ColumnsBoard` — `sectionCardsMap = useMemo(() => groupBy(cards, 'sectionId'), [cards])`
- `DraggableCard`, `CardAttachments` — `React.memo` 래핑 (props equality)
- 이벤트 핸들러 — `useCallback`

### 5-4. QR 코드 서버 캐시
- 학생 생성 시 서버에서 QR dataURL 생성 + `Student.qrDataUrl` 필드 저장
- 클라이언트는 저장된 dataURL 사용 (생성 부담 0)
- (schema 변경 필요 — server-query-perf 트랙의 migration 과 조율)

### 5-5. 드래그 CSS 토글
```tsx
<div className={isDragging ? "card dragging" : "card"}>
```
CSS:
```css
.card.dragging { opacity: 0.5; }
```

### 5-6. `max-height` → `transform` / `clip-path`
```css
@keyframes attachIn {
  from { opacity: 0; transform: scaleY(0); transform-origin: top; }
  to   { opacity: 1; transform: scaleY(1); }
}
```

### 5-7. 구현 순서 (phase2)
1. XLSX dynamic import (라인 수정 최소, 즉시 효과)
2. memo / useCallback (리스크 낮음)
3. `router.refresh()` → optimistic (로직 변경, 테스트 필요)
4. ColumnsBoard 메모이제이션
5. QR 서버 캐시 (schema 변경 동반, server-query-perf 트랙과 조율)
6. 드래그 CSS + max-height 교체
