"use client";

import { useState } from "react";

export function CopyButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(token);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore — browser may deny clipboard in embedded contexts
        }
      }}
      style={{
        marginTop: 12,
        padding: "10px 16px",
        borderRadius: 8,
        border: "1px solid var(--color-border, #e2e2ea)",
        background: copied ? "#1f9d55" : "var(--color-primary, #097fe8)",
        color: "white",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {copied ? "복사됨 ✓" : "코드 복사하기"}
    </button>
  );
}
