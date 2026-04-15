"use client";

import { useCallback, useRef } from "react";
import { normalizeCode } from "@/lib/class-invite-codes-shared";

// parent-class-invite-v2 — 8-digit Crockford Base32 code input.
// Layout: 4-4 split with 16px gap between halves.
// Keyboard: arrow keys + backspace jump across slots; paste distributes.
// Contract: phase5/design_spec.md §4.1.

export interface CodeInput8Props {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

const SLOT_COUNT = 8;

export function CodeInput8({ value, onChange, onComplete, disabled, autoFocus }: CodeInput8Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setSlot = useCallback(
    (idx: number, raw: string) => {
      const normalized = normalizeCode(raw);
      if (normalized.length === 0) {
        // backspace on a filled slot clears and stays
        const next = value.slice(0, idx) + value.slice(idx + 1);
        onChange(next.slice(0, SLOT_COUNT));
        return;
      }
      // Accept either a single char (typed) or a full paste (distribute).
      const chars = normalized.split("");
      const next = (value.slice(0, idx) + chars.join("") + value.slice(idx + chars.length)).slice(
        0,
        SLOT_COUNT
      );
      onChange(next);
      const focusIdx = Math.min(idx + chars.length, SLOT_COUNT - 1);
      refs.current[focusIdx]?.focus();
      refs.current[focusIdx]?.select();
      if (next.length === SLOT_COUNT && onComplete) {
        onComplete(next);
      }
    },
    [onChange, onComplete, value]
  );

  return (
    <div
      role="group"
      aria-label="학급 코드 8자리"
      style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}
    >
      {Array.from({ length: SLOT_COUNT }).map((_, idx) => {
        const gapAfter = idx === 3 ? 8 : 0; // extra 8px between halves (total 16 with gap:8)
        return (
          <input
            key={idx}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={1}
            disabled={disabled}
            autoFocus={autoFocus && idx === 0}
            aria-label={`${idx + 1}번째 자리`}
            value={value[idx] ?? ""}
            onChange={(e) => setSlot(idx, e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData("text");
              setSlot(idx, pasted);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !(value[idx] ?? "")) {
                if (idx > 0) {
                  refs.current[idx - 1]?.focus();
                  refs.current[idx - 1]?.select();
                }
                return;
              }
              if (e.key === "ArrowLeft" && idx > 0) {
                e.preventDefault();
                refs.current[idx - 1]?.focus();
              } else if (e.key === "ArrowRight" && idx < SLOT_COUNT - 1) {
                e.preventDefault();
                refs.current[idx + 1]?.focus();
              }
            }}
            style={{
              width: 48,
              height: 56,
              marginRight: gapAfter,
              fontSize: 22,
              textAlign: "center",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-btn)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              textTransform: "uppercase",
            }}
          />
        );
      })}
    </div>
  );
}
