# Phase 5 — Design Spec (V1 채택)

## Tokens used (existing design-system)
- `--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-muted`
- `--radius-md`, `--radius-lg`
- `--space-2`, `--space-3`, `--space-4`, `--space-6`
- `--shadow-sm`, `--shadow-md`

## DrawingBoard layout
```
┌─ board-header (기존) ─────────────────────────────────┐
│                                                       │
├─ drawing-wrapper ────────────────────────┬─ sidebar ─┤
│  ┌ tabs (작업실 | 갤러리) ────┐           │  내 그림   │
│  │                             │           │  [+ upload]│
│  └─────────────────────────────┘           │  ┌──┐    │
│  ┌ panel ──────────────────────┐           │  │  │    │
│  │ iframe / gallery grid /     │           │  └──┘    │
│  │ placeholder                 │           │  ...     │
│  │                             │           │          │
│  └─────────────────────────────┘           │          │
└────────────────────────────────────────────┴──────────┘
```

## Component spec

### DrawingBoard.tsx
- Root: `<section className="drawing-board">` flex row.
- Main area: flex 1, min-width 0. Contains tabs + tab panel.
- Tabs: `<div role="tablist" className="drawing-tabs">` with two `<button role="tab">`.
- Tab panel: `<div role="tabpanel" className="drawing-panel">`.
- Sidebar: `<aside className="drawing-sidebar">` (학생 로그인 시만 렌더; 교사는 panel 전체 폭).

### 작업실 panel
- `NEXT_PUBLIC_DRAWPILE_URL` 있음:
  ```tsx
  <iframe
    src={drawpileUrl}
    title="그림보드 작업실"
    className="drawing-iframe"
    sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
  />
  ```
- 미설정:
  ```tsx
  <div className="drawing-placeholder">
    <div className="placeholder-icon" aria-hidden>🎨</div>
    <h3>그림보드 서버 미배포</h3>
    <p>Drawpile 서버가 아직 준비되지 않았어요.</p>
    <p className="muted">운영자: <code>BLOCKERS.md</code> 의 배포 체크리스트 참조.</p>
  </div>
  ```

### 갤러리 panel
- `GET /api/student-assets?scope=shared&classroomId=...` (Board.classroomId)
- 결과 0개 → `<div className="gallery-empty">공유된 그림이 아직 없어요</div>`
- 결과 있음 → grid 썸네일. 클릭 → 간단 상세 modal (phase7 에서는 alert 로 스텁).

### StudentLibrary.tsx (sidebar, 학생 only)
- 헤더: "내 그림" + 업로드 버튼 `+`.
- 업로드: hidden input + 클릭 → POST /api/student-assets → 목록 prepend + toast.
- 목록: `GET /api/student-assets?scope=mine` 초기 로드. 썸네일 96x96 + 타이틀.
- 에러: 섹션 끝에 `<p className="muted">불러오기 실패</p>`.

### LibraryPickerModal (AddCardModal 내부)
- AddCardModal 폼 안에 '내 라이브러리' 버튼 (학생 세션일 때만 render — server-side render 아닌, client-side guard).
- 버튼 클릭 → local state `pickerOpen=true` → overlay.
- picker 안에서 selection 시 부모 AddCardModal 에 `imageUrl` + `assetId` 세팅.
- AddCardModal 제출 시 `imageUrl` 포함. 서버 응답에서 card.id 받은 후 `POST /api/student-assets/{assetId}/attach { cardId }` 호출. (post-create attach; 실패 시 조용히 무시 — Card.imageUrl 은 이미 세팅됨.)

## CSS additions (globals.css append)
```css
.drawing-board { display: flex; gap: var(--space-4); padding: var(--space-4); flex: 1; min-height: 0; }
.drawing-main  { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.drawing-tabs  { display: flex; gap: var(--space-2); padding-bottom: var(--space-3); }
.drawing-tab   { padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-muted); cursor: pointer; }
.drawing-tab[aria-selected="true"] { background: var(--color-bg); color: var(--color-text); border-color: var(--color-text); }
.drawing-panel { flex: 1; min-height: 480px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; }
.drawing-iframe { flex: 1; border: 0; width: 100%; height: 100%; min-height: 480px; background: #fff; }
.drawing-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3); padding: var(--space-6); text-align: center; }
.placeholder-icon { font-size: 48px; line-height: 1; }
.drawing-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-3); padding: var(--space-4); }
.gallery-thumb { aspect-ratio: 1; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--color-border); background: var(--color-bg); cursor: pointer; }
.gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }
.gallery-empty { padding: var(--space-6); color: var(--color-muted); text-align: center; }
.drawing-sidebar { flex: 0 0 280px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-3); overflow: auto; }
.drawing-sidebar-header { display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
.library-list { display: flex; flex-direction: column; gap: var(--space-2); }
.library-item { display: flex; gap: var(--space-2); align-items: center; padding: var(--space-2); border-radius: var(--radius-md); }
.library-item img { width: 48px; height: 48px; border-radius: var(--radius-md); object-fit: cover; }
.library-picker-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 60; }
.library-picker { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-4); width: min(640px, 90vw); max-height: 80vh; overflow: auto; }
.library-picker-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.library-picker-item { aspect-ratio: 1; border: 2px solid transparent; border-radius: var(--radius-md); overflow: hidden; cursor: pointer; }
.library-picker-item.selected { border-color: var(--color-text); }
.library-picker-item img { width: 100%; height: 100%; object-fit: cover; }
```

## Rejected (archived, not implemented)
- V2 하단 dock
- V3 탭 내부 통합
- V4 모달 only
