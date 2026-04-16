/**
 * Shared types for the drawing studio runtime. Kept separate from the
 * brush/engine modules so UI can import them without pulling in canvas
 * machinery during SSR.
 */

export type BlendMode = "normal" | "multiply" | "screen" | "overlay";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;     // 0..1
  blendMode: BlendMode;
  canvas: HTMLCanvasElement;
  thumbUrl: string | null; // rolling 40x40 snapshot for the panel
}

export interface StrokeSample {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  timestamp: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const BLEND_MAP: Record<BlendMode, GlobalCompositeOperation> = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
};

export type Tool =
  | "pencil"
  | "pen"
  | "marker"
  | "airbrush"
  | "watercolor"
  | "crayon"
  | "eraser"
  | "bucket"
  | "eyedropper";
