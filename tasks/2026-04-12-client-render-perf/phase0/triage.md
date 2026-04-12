# Triage — client-render-perf

## 증상 (관찰 가능한 행동만)

- 사용자 보고: "웹이 전체적으로 느려" 중 클라이언트 사이드 기여분
- 학생 CRUD 후 UI 갱신까지 수 초 지연
- 드래그 앤 드롭 시 프레임 드랍 체감
- 초기 페이지 로드 시 JS 번들 다운로드가 큼

## severity 근거

- **high** 분류
- 자주 반복되는 인터랙션(드래그, 학생 관리)의 체감 지연
- 기능 자체는 동작하므로 `critical` 아님

## 초기 관찰 (증거)

사전 분석에서 수집된 문제:

1. **`router.refresh()` 로 전체 페이지 리페치** — `src/components/ClassroomDetail.tsx:47-49` (학생 추가/삭제/QR 재발급마다 전체 데이터 재로드)
2. **XLSX 정적 import (~400KB)** — `src/components/AddStudentsModal.tsx:3`
3. **`getCardsForSection()` 렌더마다 8회 호출** — `src/components/ColumnsBoard.tsx:129`
4. **React.memo/useCallback 미사용** — `DraggableCard`, `CardAttachments`, `Dashboard`
5. **QR 코드 클라이언트 대량 생성** — `src/components/ClassroomDetail.tsx:380-389` (500 학생 × 동적 import + 생성)
6. **드래그 시 DOM style 직접 조작** — `src/components/ColumnsBoard.tsx:347-358`
7. **max-height 애니메이션** — `src/styles/modal.css:24-27`

## 스코프

- 클라이언트 컴포넌트 렌더링 성능
- 번들 사이즈 (dynamic import)
- 이벤트 핸들러/props 안정성 (memo/callback)
- 드래그 퍼포먼스 및 CSS 애니메이션

## 스코프 외

- 서버 사이드 쿼리 → `server-query-perf` 트랙
- 퀴즈 SSE → `quiz-sse-perf` 트랙

## 긴급 단축 여부

- `high` → 미적용
