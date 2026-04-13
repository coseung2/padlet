# Architecture Delta — ibispaint-drawing-studio

## 1. 파일 구조

```
src/components/drawing/
├── DrawingStudio.tsx         # 엔트리. 레이어 상태 + 도구 상태 + 합성 compose 훅
├── canvas/
│   ├── LayerStack.ts         # Layer[] 자료구조 + compose(target, rect?)
│   ├── StrokeEngine.ts       # Pointer → 좌표버퍼 → brush profile 기반 draw
│   ├── BrushPresets.ts       # 6개 brush profile 정의 (연필/펜/마커/에어/수채/크레용)
│   ├── FloodFill.ts          # scanline flood fill (유틸: 페인트버킷)
│   ├── Eyedropper.ts         # 합성 pixel sample
│   └── HistoryStack.ts       # dirty-rect patch 기반 50스텝 undo/redo
├── ui/
│   ├── Toolbar.tsx           # 좌측 세로 도구 9종 + 현재색 버튼
│   ├── LayerPanel.tsx        # 우측 레이어 리스트 + 추가/삭제/복제/순서/가시성
│   ├── TopBar.tsx            # undo/redo/clear/save + 굵기/opacity 슬라이더
│   ├── ColorWheel.tsx        # HSV 휠 팝오버
│   ├── BrushSizePopover.tsx  # 슬라이더 + 프리셋 샘플
│   └── SaveDialog.tsx        # 제목 + 반 공유 토글 + 저장
├── hooks/
│   ├── useLayerCompositor.ts # RAF-batch 합성 훅
│   └── usePointerStroke.ts   # palm rejection + getCoalescedEvents → StrokeEngine
└── index.ts                  # export { DrawingStudio }
```

## 2. 데이터 모델

### Layer
```ts
interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;              // 0..1
  blendMode: "normal" | "multiply" | "screen" | "overlay";
  canvas: HTMLCanvasElement;    // 1200x1600 offscreen
  locked: boolean;              // MVP에선 false 고정
}

interface DrawingState {
  layers: Layer[];              // index 0 = 배경(흰색 기본), last = 맨 위
  activeLayerId: string;
  width: 1200;
  height: 1600;
}
```

### BrushProfile
```ts
interface BrushProfile {
  id: "pencil" | "pen" | "marker" | "airbrush" | "watercolor" | "crayon";
  // 샘플별 점/라인 그리기 함수
  render(
    ctx: CanvasRenderingContext2D,
    stroke: StrokeSample[],     // 최근 N 샘플
    state: BrushState
  ): BoundingBox;
  // UI 프리뷰용 썸네일 렌더
  sampleThumb(ctx: CanvasRenderingContext2D): void;
}

interface BrushState {
  color: string;      // hex
  size: number;       // px, 1..120
  opacity: number;    // 0..1
  flow: number;       // 0..1 (stroke 당 누적률)
}

interface StrokeSample {
  x: number;
  y: number;
  pressure: number;   // 0..1 (pointer API)
  tiltX: number;      // -90..90
  tiltY: number;
  timestamp: number;
}
```

### HistoryEntry
```ts
interface HistoryEntry {
  layerId: string;
  rect: { x: number; y: number; w: number; h: number };
  before: ImageData;  // 해당 영역의 이전 픽셀 (undo용)
  after: ImageData;   // 새 픽셀 (redo용)
}

class HistoryStack {
  private entries: HistoryEntry[] = [];
  private index = -1;
  private readonly cap = 50;
  push(entry: HistoryEntry): void;
  undo(): HistoryEntry | null;
  redo(): HistoryEntry | null;
}
```

## 3. 주요 알고리즘

### 3-1. 브러시 프리셋 구현 전략

| 프리셋 | 구현 요약 |
|---|---|
| 연필 | hardness 0.9 round → `arc` + fill, pressure 곱으로 radius, 샘플 간격 `size * 0.3`, subtle noise alpha |
| 펜 | `moveTo/lineTo` + `stroke`, lineWidth 고정, globalAlpha 1 |
| 마커 | translucent round stroke, opacity 0.5, 겹칠 때 자연스러운 누적 (source-over) |
| 에어브러시 | 각 샘플마다 radial gradient fill (center=pressure*255 alpha, edge=0), tiltX/Y로 gradient 중심 오프셋 → 기울어진 스프레이 효과 |
| 수채 | opacity 0.15 stroke + 샘플별 재도포 시 blur approximation (샘플 간 여러 stamp로 edge 번짐) |
| 크레용 | stroke path를 따라 stipple dots (size*0.2 random radius, random offset < size*0.6), pressure → density |

### 3-2. Pointer → Stroke 파이프라인

1. `pointerdown`: palm rejection 체크 → accepted면 pointerId 고정, stroke 시작 + prev rect 저장
2. `pointermove`: `getCoalescedEvents()` 결과 각각을 `StrokeSample`로 변환 → 큐에 push → RAF scheduled flush
3. RAF flush: 큐 dequeue → 현재 brush profile.render 호출 → 해당 레이어 canvas에 draw → `dirty rect` 업데이트
4. `pointerup`/`pointercancel`: stroke 종료, dirty rect 기반 HistoryEntry 생성(before 이미 저장됨, after=현재 ctx.getImageData) → HistoryStack.push
5. Compose 레이어는 `useLayerCompositor` 훅이 dirty rect 변경 감지 후 main canvas에 drawImage + 블렌드

### 3-3. Flood fill (페인트버킷)

Scanline 알고리즘 (iterative stack):
- 클릭 좌표의 해당 레이어 픽셀 RGBA 샘플 → 목표색
- 스택에 seed push → 좌우 확장 + 상하 새 scanline push
- 픽셀 거리(`|rgba - target| < tolerance`) 판정으로 영역 결정
- 1200×1600 = 1.92M px 최대 — Uint8ClampedArray에 직접 쓰기 (ImageData), 한 번에 putImageData

### 3-4. Undo/Redo

- `pointerdown`에서 stroke 시작 시: 해당 레이어의 예상 영향 bbox를 0으로 마크, brush size × 2 padding
- stroke 종료 시: 실제 영향 bbox 확정, before/after ImageData 추출 (cap 2MB 체크 — 초과 시 전체 레이어 snapshot)
- Undo: HistoryStack.undo() → putImageData(before, rect.x, rect.y) → dirty rect 재합성

### 3-5. Compose

```ts
function compose(target: HTMLCanvasElement, state: DrawingState) {
  const ctx = target.getContext("2d")!;
  ctx.clearRect(0, 0, state.width, state.height);
  for (const layer of state.layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = blendMap[layer.blendMode];
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
  }
}
```

- dirty-rect 변형: `ctx.clearRect(dx, dy, dw, dh)` + 각 레이어 `ctx.drawImage(layer.canvas, dx, dy, dw, dh, dx, dy, dw, dh)`
- blendMap: `{normal: "source-over", multiply: "multiply", screen: "screen", overlay: "overlay"}`

## 4. DrawingBoard 분기 계약 (parent seed 존중)

`src/components/DrawingBoard.tsx` 현재 로직 유지 + 한 줄 분기 추가:

```tsx
{tab === "studio" ? (
  DRAWPILE_URL ? (
    // parent seed path — Drawpile iframe
    <iframe src={DRAWPILE_URL} ... />
  ) : viewerKind === "student" ? (
    // 신설 path — 브라우저 내장 스튜디오
    <DrawingStudio
      classroomId={classroomId}
      onSaved={loadShared}
    />
  ) : (
    <div className="drawing-placeholder">...</div>
  )
) : ...}
```

**계약**
- `NEXT_PUBLIC_DRAWPILE_URL` 설정 시 스튜디오 비활성 — Drawpile이 담당
- 학생만 스튜디오 접근, 교사는 placeholder 유지
- StudentAsset / AssetAttachment / Board.layout 스키마 불변

## 5. API 계약 (/api/student-assets POST 확장)

기존 계약 유지 + FormData 필드 2개 추가:

| 필드 | 타입 | 용도 | 기존? |
|---|---|---|---|
| `file` | File | PNG/JPEG/GIF/WebP | ✅ |
| `title` | string | 파일 제목 | ✅ |
| `source` | string | "upload" | "drawing-studio" | 🆕 |
| `isSharedToClass` | "true" | 클래스 공유 플래그 | 🆕 |

응답 형식 변경 없음. Vercel Blob 우선, fs fallback 유지.

## 6. 성능 예산 (Galaxy Tab S6 Lite)

| 작업 | 예산 |
|---|---|
| Pointer → StrokeEngine 처리 | ≤ 4ms per RAF frame |
| Layer compose (dirty rect 최적화) | ≤ 6ms per frame |
| Flood fill (1200×1600 최대) | ≤ 400ms (진행 스피너 표시) |
| 저장 합성 + PNG toBlob | ≤ 1500ms |
| Undo restore (단일 patch) | ≤ 20ms |

## 7. 에러 / 경계

- Pointer API 미지원 브라우저: `PointerEvent` 지원 확인 + unsupported 시 안내 카드
- `getCoalescedEvents` 미지원: 단일 샘플 처리로 폴백
- 레이어 compose 실패: 마지막 유효 compose frame 유지, console.warn
- 저장 실패: 토스트 + 재시도 버튼 (blob 토큰 미설정 시 공용 메시지)
- 페인트버킷 too-large: 작업 cancel + 안내 토스트

## 8. 접근성

- 모든 도구 버튼 `aria-pressed` + `role="radio"` + 한글 라벨
- 레이어 가시성 토글 `aria-pressed`
- 색상 휠에 키보드 대체(숫자 입력 hex 필드) — v2 고려
- 단축키: `B`(브러시 패널 열기), `E`(지우개), `U`(undo), `Y`(redo), `[`/`]`(크기) — MVP 포함

## 9. 검증 게이트 체크
- 파일 구조 명시 ✅
- 데이터 모델 명시 ✅
- 주요 알고리즘 9종 명시 ✅
- parent seed 계약 보존 ✅
- phase4 디자인 인풋 준비 (UI 레이아웃 개괄 §1/§8) ✅

**→ phase4 design_planner 진행**
