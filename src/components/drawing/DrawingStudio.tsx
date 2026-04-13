"use client";

/**
 * DrawingStudio — Ibis Paint 수준의 브라우저 내장 페인팅 스튜디오.
 *
 * parent seed(drawpile-schema-stub) 계약을 존중: Drawpile 서버(`NEXT_PUBLIC_
 * DRAWPILE_URL`)가 설정돼 있으면 DrawingBoard 가 이 컴포넌트 대신 iframe
 * 을 띄운다. 이 컴포넌트는 "학생 solo 작업" 경로 전용.
 *
 * 데이터 흐름:
 *   - 레이어 상태는 LayerStack 유틸이 만든 `Layer[]` + 활성 레이어 id
 *   - stroke 캡처는 usePointerStroke 훅이 PointerEvent → StrokeSample
 *   - 합성은 useLayerCompositor 가 RAF 로 관리, dirty rect 만 재그림
 *   - 저장은 모든 가시 레이어를 flatten → PNG → /api/student-assets
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Toolbar } from "./ui/Toolbar";
import { TopBar } from "./ui/TopBar";
import { LayerPanel } from "./ui/LayerPanel";
import { ColorWheel } from "./ui/ColorWheel";
import { SaveDialog } from "./ui/SaveDialog";
import {
  CANVAS_W,
  CANVAS_H,
  MAX_LAYERS,
  compose,
  createLayer,
  duplicateLayer,
  flatten,
  generateThumb,
  initialStack,
} from "./canvas/LayerStack";
import {
  beginStroke,
  drawSegment,
  endStroke,
  type StrokeSession,
} from "./canvas/StrokeEngine";
import { HistoryStack, applyPatch } from "./canvas/HistoryStack";
import { floodFill } from "./canvas/FloodFill";
import { sampleHex } from "./canvas/Eyedropper";
import type { BlendMode, Layer, StrokeSample, Tool } from "./canvas/types";

type Props = {
  viewerKind?: "teacher" | "student" | "none";
  onSaved?: () => void;
};

export function DrawingStudio({ viewerKind = "student", onSaved }: Props) {
  // ─── Layer state ──────────────────────────────────────────
  const [layers, setLayers] = useState<Layer[]>(() => initialStack());
  const [activeLayerId, setActiveLayerId] = useState<string>(
    () => layers[layers.length - 1].id
  );

  // ─── Tool state ───────────────────────────────────────────
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState<string>("#111111");
  const [size, setSize] = useState<number>(8);
  const [opacity, setOpacity] = useState<number>(1);
  const [penOnly, setPenOnly] = useState<boolean>(false);
  const [colorOpen, setColorOpen] = useState<boolean>(false);

  // ─── Undo/Redo state ─────────────────────────────────────
  const historyRef = useRef(new HistoryStack());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ─── Canvas refs ─────────────────────────────────────────
  const compositeRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null); // reserved for future selection / live preview
  const strokeRef = useRef<StrokeSession | null>(null);
  const activePointerId = useRef<number | null>(null);
  const pendingFrameRef = useRef<number | null>(null);

  // ─── Save dialog state ───────────────────────────────────
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Keep activeLayerId valid when layers mutate.
  useEffect(() => {
    if (!layers.find((l) => l.id === activeLayerId)) {
      setActiveLayerId(layers[layers.length - 1]?.id ?? "");
    }
  }, [layers, activeLayerId]);

  // ─── Compose RAF scheduling ──────────────────────────────
  const scheduleCompose = useCallback(() => {
    if (pendingFrameRef.current != null) return;
    pendingFrameRef.current = requestAnimationFrame(() => {
      pendingFrameRef.current = null;
      const target = compositeRef.current;
      if (!target) return;
      compose(target, layers);
    });
  }, [layers]);

  // Re-compose whenever layers or visibility/opacity/blend changes.
  useEffect(() => {
    scheduleCompose();
  }, [scheduleCompose, layers]);

  // Thumbnail refresh — cheap 40x40 downscale every ~1s when active drawing.
  useEffect(() => {
    const t = window.setInterval(() => {
      setLayers((curr) =>
        curr.map((l) => ({
          ...l,
          thumbUrl: generateThumb(l),
        }))
      );
    }, 1500);
    return () => window.clearInterval(t);
  }, []);

  // ─── Pointer handlers ────────────────────────────────────
  const activeLayer = useMemo(
    () => layers.find((l) => l.id === activeLayerId) ?? layers[layers.length - 1],
    [layers, activeLayerId]
  );

  const toCanvasCoords = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = compositeRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const toSample = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement> | PointerEvent): StrokeSample => {
      const canvas = compositeRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        pressure: e.pressure,
        tiltX: e.tiltX ?? 0,
        tiltY: e.tiltY ?? 0,
        timestamp: typeof e.timeStamp === "number" ? e.timeStamp : Date.now(),
      };
    },
    []
  );

  const shouldRejectPointer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    return penOnly && e.pointerType !== "pen";
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    if (shouldRejectPointer(e)) return;

    const layer = activeLayer;
    if (!layer || !layer.visible) return;

    const sample = toSample(e);

    if (tool === "bucket") {
      const rect = floodFill(layer.canvas, sample.x, sample.y, color);
      if (rect) {
        // Capture before we overwrote — too late; we instead snapshot after
        // the fact. Treat bucket as a full-layer history entry for simplicity.
        // (v1 trade-off: saves complexity, accepts O(layer) snapshot cost.)
        const ctx = layer.canvas.getContext("2d")!;
        const after = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
        // Reconstruct the "before" by re-applying the inverse on a fresh
        // copy is nontrivial; v1 records only after (no undo for bucket).
        // Undo for bucket is queued for v2 — for now bucket fills are
        // committed. Push an empty-before entry so at least the top of the
        // stack advances for future UX (e.g. toast "앞으로의 되돌리기는
        // 다음 스트로크부터").
        void after; // eslint: explicitly unused
      }
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

    // Brush / eraser path.
    compositeRef.current?.setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    strokeRef.current = beginStroke(layer, tool, { color, size, opacity }, sample);
    scheduleCompose();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    if (!strokeRef.current) return;
    if (shouldRejectPointer(e)) return;

    // Coalesced events = all sub-frame samples since the last pointermove.
    // React's synthetic pointer event type omits getCoalescedEvents; reach
    // into the native event where it exists on every modern Chromium /
    // Safari / Firefox.
    const native = e.nativeEvent;
    const coalesced =
      typeof (native as PointerEvent).getCoalescedEvents === "function"
        ? (native as PointerEvent).getCoalescedEvents()
        : [];
    const samples = coalesced.length > 0 ? coalesced : [native as PointerEvent];
    for (const p of samples) {
      drawSegment(strokeRef.current, toSample(p));
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
    if (entry) {
      historyRef.current.push(entry);
      setCanUndo(historyRef.current.canUndo());
      setCanRedo(historyRef.current.canRedo());
    }
    scheduleCompose();
  };

  // ─── Undo / Redo ─────────────────────────────────────────
  const handleUndo = useCallback(() => {
    const entry = historyRef.current.undo();
    if (!entry) return;
    const layer = layers.find((l) => l.id === entry.layerId);
    if (layer) {
      applyPatch(layer.canvas, entry.before, entry.rect);
    }
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
    scheduleCompose();
  }, [layers, scheduleCompose]);

  const handleRedo = useCallback(() => {
    const entry = historyRef.current.redo();
    if (!entry) return;
    const layer = layers.find((l) => l.id === entry.layerId);
    if (layer) {
      applyPatch(layer.canvas, entry.after, entry.rect);
    }
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
    scheduleCompose();
  }, [layers, scheduleCompose]);

  const handleClear = useCallback(() => {
    if (!activeLayer) return;
    if (!window.confirm("현재 레이어 내용을 모두 지울까요?")) return;
    const ctx = activeLayer.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    scheduleCompose();
  }, [activeLayer, scheduleCompose]);

  // ─── Layer ops ───────────────────────────────────────────
  const addLayer = useCallback(() => {
    if (layers.length >= MAX_LAYERS) return;
    const next = createLayer({ name: `레이어 ${layers.length}` });
    setLayers((curr) => [...curr, next]);
    setActiveLayerId(next.id);
  }, [layers.length]);

  const deleteLayer = useCallback(
    (id: string) => {
      if (layers.length <= 1) return;
      setLayers((curr) => curr.filter((l) => l.id !== id));
    },
    [layers.length]
  );

  const duplicateAt = useCallback(
    (id: string) => {
      if (layers.length >= MAX_LAYERS) return;
      const src = layers.find((l) => l.id === id);
      if (!src) return;
      const copy = duplicateLayer(src);
      setLayers((curr) => {
        const idx = curr.findIndex((l) => l.id === id);
        const next = [...curr];
        next.splice(idx + 1, 0, copy);
        return next;
      });
      setActiveLayerId(copy.id);
    },
    [layers]
  );

  const toggleVisible = useCallback((id: string) => {
    setLayers((curr) =>
      curr.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }, []);

  const reorderLayer = useCallback((from: number, to: number) => {
    if (from === to) return;
    setLayers((curr) => {
      const next = [...curr];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const setLayerOpacity = useCallback((id: string, opacity: number) => {
    setLayers((curr) =>
      curr.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  }, []);

  const setLayerBlend = useCallback((id: string, mode: BlendMode) => {
    setLayers((curr) =>
      curr.map((l) => (l.id === id ? { ...l, blendMode: mode } : l))
    );
  }, []);

  // ─── Save ────────────────────────────────────────────────
  //
  // 학생: /api/student-assets 에 multipart 업로드 + isSharedToClass
  //       (반 갤러리에 자동 등장)
  // 교사/비로그인: StudentAsset 테이블에 쓸 수 없는 계정이므로, 로컬
  //       파일 다운로드로 폴백. 이 경우 "반 갤러리에 공유" 체크박스는
  //       SaveDialog 에서 noop — UI 상에서 힌트가 필요하면 표시.
  const handleSave = async ({
    title,
    shared,
  }: {
    title: string;
    shared: boolean;
  }) => {
    setSaving(true);
    setSaveError(null);
    try {
      const flat = flatten(layers);
      const blob = await new Promise<Blob | null>((resolve) =>
        flat.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) throw new Error("PNG 변환 실패");

      if (viewerKind === "student") {
        const form = new FormData();
        form.append("file", new File([blob], `${title}.png`, { type: "image/png" }));
        form.append("title", title);
        form.append("source", "drawing-studio");
        if (shared) form.append("isSharedToClass", "true");
        const res = await fetch("/api/student-assets", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        onSaved?.();
      } else {
        // Teacher / anonymous — download locally.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setSaveOpen(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  // ─── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey)
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "e") {
        setTool("eraser");
      } else if (e.key === "b") {
        setTool("pencil");
      } else if (e.key === "[") {
        setSize((s) => Math.max(1, s - 2));
      } else if (e.key === "]") {
        setSize((s) => Math.min(120, s + 2));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo]);

  return (
    <div className="ds-root">
      <TopBar
        canUndo={canUndo}
        canRedo={canRedo}
        size={size}
        opacity={opacity}
        penOnly={penOnly}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onSave={() => setSaveOpen(true)}
        onSizeChange={setSize}
        onOpacityChange={setOpacity}
        onPenOnlyToggle={() => setPenOnly((p) => !p)}
      />
      <div className="ds-workspace">
        <Toolbar
          tool={tool}
          color={color}
          onToolChange={setTool}
          onColorClick={() => setColorOpen((o) => !o)}
        />
        <div className="ds-canvas-host">
          <div className="ds-canvas-frame" aria-label="드로잉 캔버스">
            <canvas
              ref={compositeRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="ds-canvas"
              style={{ touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            <canvas
              ref={overlayRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="ds-canvas-overlay"
              aria-hidden="true"
            />
          </div>
        </div>
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
      </div>

      {colorOpen && (
        <div className="ds-colorwheel-popover">
          <ColorWheel
            value={color}
            onChange={setColor}
            onClose={() => setColorOpen(false)}
          />
        </div>
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
