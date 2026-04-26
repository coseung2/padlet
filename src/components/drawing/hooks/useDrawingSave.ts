"use client";

import { useState } from "react";
import { flatten } from "../canvas/LayerStack";
import type { Layer } from "../canvas/types";

type Args = {
  layers: Layer[];
  viewerKind: "teacher" | "student" | "none";
  onSaved?: () => void;
};

export function useDrawingSave({ layers, viewerKind, onSaved }: Args) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save({ title, shared }: { title: string; shared: boolean }) {
    setSaving(true);
    setSaveError(null);
    try {
      // Guard against silently exporting a transparent PNG when every layer
      // (including the white "배경" layer) is hidden — flatten() honours
      // visibility and would otherwise produce blank output without warning.
      if (!layers.some((l) => l.visible)) {
        throw new Error(
          "표시된 레이어가 없어요. 레이어를 켜고 다시 저장하세요."
        );
      }
      const flat = flatten(layers);
      const blob = await new Promise<Blob | null>((resolve) =>
        flat.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) throw new Error("PNG 변환 실패");
      if (viewerKind === "student") {
        const form = new FormData();
        form.append(
          "file",
          new File([blob], `${title}.png`, { type: "image/png" })
        );
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
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      return { ok: true as const };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "저장 실패";
      setSaveError(msg);
      return { ok: false as const };
    } finally {
      setSaving(false);
    }
  }

  return { saving, saveError, save };
}
