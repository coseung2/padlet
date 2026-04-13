# Architecture Delta — drawing-studio-ibis-ux (v2)

## 1. 변경되는 것 vs 유지되는 것

### 유지 (v1 계약)
- `src/components/drawing/canvas/*` 전체 (BrushPresets, LayerStack, StrokeEngine, HistoryStack, FloodFill, Eyedropper, types) — API 시그니처 불변
- `src/components/drawing/ui/LayerPanel.tsx` — 내용 재사용, 외부 컨테이너만 변경
- `src/components/drawing/ui/SaveDialog.tsx` — 그대로
- `src/components/DrawingBoard.tsx` — DrawingStudio 에 viewerKind prop 전달, Drawpile URL 우선 분기 유지
- `src/app/api/student-assets/route.ts` — Blob + source + isSharedToClass 그대로

### 변경/신규
- `src/components/drawing/DrawingStudio.tsx` — 전면 레이아웃 재작성
- `src/components/drawing/ui/Toolbar.tsx` — 세로 → 가로 스트립으로 재작성
- `src/components/drawing/ui/TopBar.tsx` — 슬라이더 제거, 저장/펜only/fit 만 남김
- `src/components/drawing/ui/BottomBar.tsx` (신규) — undo/redo/📁 + 도구 스트립 + 색 팔레트
- `src/components/drawing/ui/RightRail.tsx` (신규) — 수직 슬라이더 3개(굵기·불투명·보정) + 레이어 토글
- `src/components/drawing/ui/HSVWheel.tsx` (신규) — 전면 HSV 모달
- `src/components/drawing/ui/LayerSheet.tsx` (신규) — 슬라이드 인 래퍼 (LayerPanel 감쌈)
- `src/components/drawing/ui/BrushPreviewDot.tsx` (신규) — 현재 색·굵기 원
- `src/components/drawing/hooks/useViewportGestures.ts` (신규) — 멀티터치 제스처 상태 관리
- `src/components/drawing/hooks/useStabilizer.ts` (신규) — stroke 좌표 EMA pipe
- `src/styles/drawing.css` — `.ds-*` v1 블록 전면 교체

## 2. 컴포넌트 트리

```
<DrawingStudio viewerKind>
  ├─ <TopBar>                    (36px — 💾저장 · 🖊펜only · ⤢fit · 100%)
  ├─ <div .ds-workspace>
  │    ├─ <div .ds-viewport>     (캔버스 + 제스처)
  │    │    ├─ <div .ds-paper>   (transform: scale/translate)
  │    │    │    └─ <canvas .ds-canvas>
  │    │    └─ <BrushPreviewDot>
  │    └─ <RightRail>            (64px — 굵기·불투명·보정 · 📁)
  ├─ <BottomBar>                 (56px — ⟲⟳📁 · 도구스트립 · 팔레트)
  ├─ <LayerSheet open>           (우측 슬라이드 인, LayerPanel 포함)
  ├─ <HSVWheel>                  (conditional)
  └─ <SaveDialog>                (conditional)
```

## 3. 상태 흐름

```
         useState                               Canvas Refs
  ┌──────────────────┐                       ┌─────────────┐
  │ layers           │                       │ composite   │──┐
  │ activeLayerId    │                       │ viewportEl  │  │
  │ tool             │      ┌─────────┐      │ strokeSes   │  │
  │ color            │ ───▶│ events  │◀────┤ activePtrId │  │
  │ size             │      │ pointer │      │ pendingRAF  │  │
  │ opacity          │      │ touch   │      │ smoothed    │  │
  │ stabilizer       │      │ key     │      └─────────────┘  │
  │ penOnly          │      └─────────┘                       │
  │ zoom, pan        │                                        │
  │ modal flags      │                                        ▼
  │   - colorOpen    │                              compose(composite, layers, rect?)
  │   - layerSheet   │
  │   - saveOpen     │
  └──────────────────┘
```

### zoom/pan 변수
- `zoom: number` — 0.25..8
- `pan: {x, y}` — CSS px offset
- 둘 다 `.ds-paper` 의 `transform: translate(${x}px,${y}px) scale(${zoom})` 으로 반영
- 캔버스 좌표 변환은 기존 `getBoundingClientRect()` 기반 `toCanvasCoords()` 그대로 유효 — 이미 transform 후 화면 위치를 읽기 때문

## 4. 멀티터치 제스처 훅

### `useViewportGestures`
```ts
type GestureState = {
  zoom: number;
  pan: { x: number; y: number };
  setZoom: (n: number) => void;
  setPan: (p: {x:number;y:number}) => void;
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
  onDoubleTap: () => void;
  cancelActiveStroke: () => void; // consumer 가 구현
};
```

알고리즘:
1. `touchstart`: touches.length === 2 → pinch session 시작 (startDist, startZoom, startMid, startPan, tapStart=now)
   `touchstart`: touches.length === 3 → fingers=3 으로 업그레이드
2. `touchmove`: 핀치 dist 비율로 zoom, midpoint delta 로 pan. 이동 발생 → tapStart=0 (tap 취소)
3. `touchend`: tapStart≠0 + 경과<250ms → fingers 에 따라 undo/redo. touches.length < 2 → session 종료
4. stroke 충돌: touchstart 진입 시 consumer 의 `cancelActiveStroke()` 호출해 stroke 취소

### `useStabilizer`
```ts
type StabilizerAPI = {
  begin(sample: StrokeSample): StrokeSample;
  process(sample: StrokeSample): StrokeSample;
  reset(): void;
};
```
- `begin`: `smoothed = sample`
- `process`: `smoothed = smoothed + α * (raw - smoothed)`, α = max(0.05, 1 - stab/12)
- Output sample 은 새 x/y 로 override, pressure/tilt/timestamp 는 raw 그대로

## 5. 색상 모달 알고리즘

- Hue 링: 360 분할 arc 렌더 (w=26px thickness)
- SV 사각형: ImageData 기반 rendering, 현재 Hue 값 때마다 재생성
- 링 클릭: atan2(dy, dx) → Hue degree
- SV 클릭: rect-relative x/y → s = x/W, v = 1 - y/H
- Hex 입력: 6글자 입력 완료 시 commit
- 최근색 / 팔레트: 각 탭 시 commit + state update

## 6. BottomBar 구조

```
<div .ds-bottombar>
  <div .ds-bb-left>      ⟲ ⟳ 📁
  <div .ds-bb-tools>     (가로 스크롤) 연필 펜 마커 에어 수채 크레용 지우개 버킷 스포이트
  <div .ds-bb-colors>    [현재색 원] | 팔레트 8 | 최근 6
</div>
```

## 7. RightRail 구조

```
<div .ds-rightrail>
  <Vslider label="굵기" 1..120 value={size} />
  <Vslider label="투명" 0..100 value={opacity*100} />
  <Vslider label="보정" 0..10 value={stabilizer} />
  <button .ds-layer-toggle>📁</button>
</div>
```

`<Vslider>` 내부: 세로 CSS Grid, 위에서 아래로 label / track / value. track 은 `<input type="range" class="ds-vslider">` 에 `writing-mode: bt-lr` + `transform: rotate(-90deg)` 폴백 조합. Chrome 은 `orient="vertical"` 지원, Firefox/Safari 는 `appearance: slider-vertical` / `-webkit-appearance: slider-vertical`.

## 8. Drawpile 분기 불변

`DrawingBoard.tsx` 의 기존 분기 유지:
```tsx
{tab === "studio" ? (
  DRAWPILE_URL ? <iframe ... /> : <DrawingStudio viewerKind={viewerKind} onSaved={loadShared} />
) : ... }
```
DrawingStudio 내부 구조가 바뀌어도 외부 prop API(viewerKind, onSaved) 불변.

## 9. 접근성 매트릭스

| 요소 | role | aria | keyboard |
|---|---|---|---|
| 도구 버튼 | button | aria-pressed, aria-label(한국어) | Tab 순회 |
| 색 스와치 | button | aria-label `색 #rrggbb` | Tab 순회 |
| 수직 슬라이더 | `<input type="range">` | native | 화살표 |
| 레이어 카드 | role=listitem | aria-selected | Space/Enter |
| HSV canvas | role=slider (근사) | aria-valuenow Hue° | 키보드 접근 v3 |
| 단축키 | — | — | Ctrl+Z/Y/Shift+Z, L, E, B, [ ], 0 |

## 10. 성능 예산

- Pointer stroke: ≤ 4ms/RAF
- compose(rect): ≤ 6ms
- Pinch zoom repaint: transform 이라 GPU — ≤ 2ms
- HSV 모달 SV square render: 최대 200×200 ImageData ≈ 40k 픽셀 → ≤ 10ms (Hue 변경 시만)
- Stabilizer: 샘플당 O(1), 무시 가능

## 11. 검증 게이트 체크
- 파일 구조 명시 ✅
- 상태 흐름 도식화 ✅
- 제스처/스태빌라이저/색상 모달 알고리즘 ✅
- v1 계약 보존 명시 (§ 1 유지 목록 / § 8 Drawpile 분기) ✅
- phase4 디자인 인풋 명시 (§ 2 컴포넌트 트리, § 6~7) ✅

**→ phase4 design_planner 진행**
