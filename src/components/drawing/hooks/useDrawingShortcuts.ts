"use client";

import { useEffect } from "react";
import type { Tool } from "../canvas/types";

type Args = {
  onUndo: () => void;
  onRedo: () => void;
  fit: () => void;
  setTool: (t: Tool) => void;
  setSize: (fn: (s: number) => number) => void;
  setLayerSheetOpen: (fn: (o: boolean) => boolean) => void;
  setColorOpen: (open: boolean) => void;
  setSaveOpen: (open: boolean) => void;
};

export function useDrawingShortcuts({
  onUndo,
  onRedo,
  fit,
  setTool,
  setSize,
  setLayerSheetOpen,
  setColorOpen,
  setSaveOpen,
}: Args) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey)
      ) {
        e.preventDefault();
        onRedo();
      } else if (e.key === "e") setTool("eraser");
      else if (e.key === "b") setTool("pencil");
      else if (e.key === "[") setSize((s) => Math.max(1, s - 2));
      else if (e.key === "]") setSize((s) => Math.min(120, s + 2));
      else if (e.key === "l") setLayerSheetOpen((o) => !o);
      else if (e.key === "0") fit();
      else if (e.key === "Escape") {
        setColorOpen(false);
        setSaveOpen(false);
        setLayerSheetOpen(() => false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    onUndo,
    onRedo,
    fit,
    setTool,
    setSize,
    setLayerSheetOpen,
    setColorOpen,
    setSaveOpen,
  ]);
}
