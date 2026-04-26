"use client";

/**
 * DrawingStudio v2 — Ibis Paint 스타일 UI/UX.
 *
 * 레이아웃
 *   TopBar(36)  ·  (Viewport + RightRail)  ·  BottomBar(56)
 *
 * 멀티터치
 *   2-finger pinch   → zoom
 *   2-finger drag    → pan
 *   2-finger tap     → undo
 *   3-finger tap     → redo
 *   double tap       → fit to viewport
 *
 * parent seed + v1 계약 유지: StudentAsset 스키마 불변, /api/student-assets
 * 응답 envelope 불변, `NEXT_PUBLIC_DRAWPILE_URL` 설정 시 이 컴포넌트는
 * 렌더되지 않고 DrawingBoard 가 iframe 을 띄움.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { TopBar } from "./ui/TopBar";
import { BottomBar } from "./ui/BottomBar";
import { RightRail } from "./ui/RightRail";
import { LayerSheet } from "./ui/LayerSheet";
import { LayerPanel } from "./ui/LayerPanel";
import { HSVWheel } from "./ui/HSVWheel";
import { SaveDialog } from "./ui/SaveDialog";
import { BrushPreviewDot } from "./ui/BrushPreviewDot";
import {
  CANVAS_W,
  CANVAS_H,
  compose,
  generateThumb,
  initialStack,
  type CanvasSize,
} from "./canvas/LayerStack";
import { AssetInsertModal } from "./AssetInsertModal";
import {
  beginStroke,
  drawSegment,
  endStroke,
  type StrokeSession,
} from "./canvas/StrokeEngine";
import { HistoryStack, applyPatch } from "./canvas/HistoryStack";
import { floodFill } from "./canvas/FloodFill";
import { sampleHex } from "./canvas/Eyedropper";
import { useViewportGestures } from "./hooks/useViewportGestures";
import { useStabilizer } from "./hooks/useStabilizer";
import { useLayerOps } from "./hooks/useLayerOps";
import { useDrawingSave } from "./hooks/useDrawingSave";
import { useDrawingShortcuts } from "./hooks/useDrawingShortcuts";
import type { Layer, StrokeSample, Tool } from "./canvas/types";

type Props = {
  viewerKind?: "teacher" | "student" | "none";
  onSaved?: () => void;
  /** Canvas dimensions in px. Defaults to the legacy 1200×1600 A4-ish portrait
      when the parent does not show the size picker. */
  canvasSize?: CanvasSize;
  classroomId?: string | null;
};

const RECENT_KEY = "drawing-studio-recent-colors";

export function DrawingStudio({
  viewerKind = "student",
  onSaved,
  canvasSize: canvasSizeProp,
  classroomId,
}: Props) {
  const canvasSize: CanvasSize = canvasSizeProp ?? { w: CANVAS_W, h: CANVAS_H };

  // ─── Layer state ─────────────────────────────────────────
  const [layers, setLayers] = useState<Layer[]>(() => initialStack(canvasSize));
  const [assetInsertOpen, setAssetInsertOpen] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState<string>(
    () => layers[layers.length - 1].id
  );

  // ─── Tool state ──────────────────────────────────────────
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState<string>("#111111");
  const [size, setSize] = useState<number>(8);
  const [opacity, setOpacity] = useState<number>(1);
  const [stabilizer, setStabilizer] = useState<number>(3);
  const [penOnly, setPenOnly] = useState<boolean>(false);

  // ─── Modal / sheet ───────────────────────────────────────
  const [colorOpen, setColorOpen] = useState(false);
  const [layerSheetOpen, setLayerSheetOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  // ─── Undo/Redo ───────────────────────────────────────────
  const historyRef = useRef(new HistoryStack());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ─── Canvas refs ─────────────────────────────────────────
  const compositeRef = useRef<HTMLCanvasElement>(null);
  const strokeRef = useRef<StrokeSession | null>(null);
  const activePointerId = useRef<number | null>(null);
  const pendingFrameRef = useRef<number | null>(null);

  // ─── Stabilizer ──────────────────────────────────────────
  const stable = useStabilizer(stabilizer);

  // ─── Recent colours ─────────────────────────────────────
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [colorOpen]);

  const cancelActiveStroke = useCallback(() => {
    if (!strokeRef.current) return;
    // 진행 중 stroke 은 history 에 커밋하지 않고 버림 — 멀티터치 제스처가
    // 시작되면 stroke 취소가 자연스럽다.
    strokeRef.current = null;
    activePointerId.current = null;
    stable.reset();
  }, [stable]);

  // ─── Undo / Redo (단일 정의, 버튼 + 제스처 공용) ───────────
  //
  // setLayers 를 통해 shallow-copied 배열을 돌려주기 때문에 이 핸들러가
  // 불릴 때마다 layers reference 가 바뀌고, 이후 `useEffect(() =>
  // scheduleCompose(), [layers])` 에 의해 자동으로 재합성이 예약된다.
  // applyPatch 는 layer.canvas 를 mutation 하지만 이 re-render 경로가
  // compose 를 다시 트리거하므로 캔버스가 최신 픽셀로 페인트된다.
  const handleUndo = useCallback(() => {
    const entry = historyRef.current.undo();
    if (!entry) return;
    setLayers((curr) => {
      const l = curr.find((x) => x.id === entry.layerId);
      if (l) applyPatch(l.canvas, entry.before, entry.rect);
      return [...curr];
    });
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const handleRedo = useCallback(() => {
    const entry = historyRef.current.redo();
    if (!entry) return;
    setLayers((curr) => {
      const l = curr.find((x) => x.id === entry.layerId);
      if (l) applyPatch(l.canvas, entry.after, entry.rect);
      return [...curr];
    });
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const { zoom, pan, fit, onTouchStart, onTouchMove, onTouchEnd } =
    useViewportGestures({
      onUndo: handleUndo,
      onRedo: handleRedo,
      cancelActiveStroke,
    });

  // ─── Compose scheduling ──────────────────────────────────
  const scheduleCompose = useCallback(() => {
    if (pendingFrameRef.current != null) return;
    pendingFrameRef.current = requestAnimationFrame(() => {
      pendingFrameRef.current = null;
      const target = compositeRef.current;
      if (!target) return;
      compose(target, layers);
    });
  }, [layers]);

  useEffect(() => {
    scheduleCompose();
  }, [scheduleCompose, layers]);

  // ─── Thumb refresh ───────────────────────────────────────
  useEffect(() => {
    const t = window.setInterval(() => {
      setLayers((curr) =>
        curr.map((l) => ({ ...l, thumbUrl: generateThumb(l) }))
      );
    }, 1500);
    return () => window.clearInterval(t);
  }, []);

  const activeLayer = useMemo(
    () =>
      layers.find((l) => l.id === activeLayerId) ?? layers[layers.length - 1],
    [layers, activeLayerId]
  );

  // ─── Pointer → Stroke ────────────────────────────────────
  const toSample = useCallback(
    (e: PointerEvent): StrokeSample => {
      const canvas = compositeRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasSize.w / rect.width;
      const scaleY = canvasSize.h / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        pressure: e.pressure,
        tiltX: e.tiltX ?? 0,
        tiltY: e.tiltY ?? 0,
        timestamp: e.timeStamp ?? Date.now(),
      };
    },
    [canvasSize.w, canvasSize.h]
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    if (penOnly && e.pointerType !== "pen") return;

    const layer = activeLayer;
    if (!layer || !layer.visible) return;

    const sample = toSample(e.nativeEvent as PointerEvent);

    if (tool === "bucket") {
      floodFill(layer.canvas, sample.x, sample.y, color);
      scheduleCompose();
      return;
    }
    if (tool === "eyedropper") {
      const target = compositeRef.current;
      if (target) {
        const hex = sampleHex(target, sample.x, sample.y);
        if (hex) setColor(hex);
      }
      return;
    }

    stable.begin(sample);
    compositeRef.current?.setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    strokeRef.current = beginStroke(
      layer,
      tool,
      { color, size, opacity },
      sample
    );
    scheduleCompose();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    if (!strokeRef.current) return;
    if (penOnly && e.pointerType !== "pen") return;

    const native = e.nativeEvent;
    const coalesced =
      typeof (native as PointerEvent).getCoalescedEvents === "function"
        ? (native as PointerEvent).getCoalescedEvents()
        : [];
    const samples = coalesced.length > 0 ? coalesced : [native as PointerEvent];
    for (const p of samples) {
      drawSegment(strokeRef.current, stable.process(toSample(p)));
    }
    scheduleCompose();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    try {
      compositeRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const entry = strokeRef.current ? endStroke(strokeRef.current) : null;
    strokeRef.current = null;
    stable.reset();
    if (entry) {
      historyRef.current.push(entry);
      setCanUndo(historyRef.current.canUndo());
      setCanRedo(historyRef.current.canRedo());
    }
    scheduleCompose();
  };

  // ─── Layer ops ───────────────────────────────────────────
  const {
    addLayer,
    deleteLayer,
    duplicateAt,
    toggleVisible,
    reorderLayer,
    setLayerOpacity,
    setLayerBlend,
    insertAsset: insertAssetRaw,
  } = useLayerOps({ layers, canvasSize, setLayers, setActiveLayerId });

  const insertAsset = useCallback(
    async (asset: Parameters<typeof insertAssetRaw>[0]) => {
      await insertAssetRaw(asset);
      setAssetInsertOpen(false);
    },
    [insertAssetRaw]
  );

  // ─── Save ────────────────────────────────────────────────
  const { saving, saveError, save } = useDrawingSave({
    layers,
    viewerKind,
    onSaved,
  });

  const handleSave = async (args: { title: string; shared: boolean }) => {
    const result = await save(args);
    if (result.ok) setSaveOpen(false);
  };

  // ─── Shortcuts ───────────────────────────────────────────
  useDrawingShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    fit,
    setTool,
    setSize,
    setLayerSheetOpen,
    setColorOpen,
    setSaveOpen,
  });

  return (
    <div className="ds-root">
      <TopBar
        zoom={zoom}
        penOnly={penOnly}
        onSave={() => setSaveOpen(true)}
        onFit={fit}
        onPenOnlyToggle={() => setPenOnly((p) => !p)}
      />

      <div className="ds-workspace">
        <div
          className="ds-viewport"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onDoubleClick={fit}
        >
          <div
            className="ds-paper"
            style={{
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <canvas
              ref={compositeRef}
              width={canvasSize.w}
              height={canvasSize.h}
              className="ds-canvas"
              style={{ touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
          <BrushPreviewDot
            color={color}
            size={size}
            opacity={opacity}
            zoom={zoom}
            tool={tool}
          />
        </div>

        <RightRail
          size={size}
          opacity={opacity}
          stabilizer={stabilizer}
          layerSheetOpen={layerSheetOpen}
          onSizeChange={setSize}
          onOpacityChange={setOpacity}
          onStabilizerChange={setStabilizer}
          onLayerToggle={() => setLayerSheetOpen((o) => !o)}
        />
      </div>

      <BottomBar
        tool={tool}
        color={color}
        recent={recent}
        canUndo={canUndo}
        canRedo={canRedo}
        onToolChange={setTool}
        onColorClick={() => setColorOpen(true)}
        onColorPick={setColor}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onLayerToggle={() => setLayerSheetOpen((o) => !o)}
      />

      <LayerSheet open={layerSheetOpen} onClose={() => setLayerSheetOpen(false)}>
        <LayerPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onSelect={setActiveLayerId}
          onAdd={addLayer}
          onDelete={deleteLayer}
          onDuplicate={duplicateAt}
          onToggleVisible={toggleVisible}
          onReorder={reorderLayer}
          onOpacityChange={setLayerOpacity}
          onBlendChange={setLayerBlend}
        />
      </LayerSheet>

      {colorOpen && (
        <HSVWheel
          value={color}
          onChange={setColor}
          onClose={() => setColorOpen(false)}
        />
      )}

      <button
        type="button"
        className="ds-asset-fab"
        aria-label="에셋 불러오기"
        title="디자인 에셋 불러오기"
        onClick={() => setAssetInsertOpen(true)}
      >
        🖼️
      </button>

      {assetInsertOpen && (
        <AssetInsertModal
          classroomId={classroomId ?? null}
          onInsert={insertAsset}
          onClose={() => setAssetInsertOpen(false)}
        />
      )}

      {saveOpen && (
        <SaveDialog
          busy={saving}
          error={saveError}
          mode={viewerKind === "student" ? "library" : "download"}
          onCancel={() => setSaveOpen(false)}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}
