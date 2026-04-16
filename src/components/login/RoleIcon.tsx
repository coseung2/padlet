// Line-art role icons for the login hub. Lucide-style stroke-based
// glyphs — no emoji. Caller supplies role id; component picks the SVG.

type RoleId = "teacher" | "student" | "parent";

export function RoleIcon({ role }: { role: RoleId }) {
  const common = {
    width: 48,
    height: 48,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (role === "teacher") {
    // Chalkboard + pointer + a drawn accent mark
    return (
      <svg {...common}>
        <rect x="6" y="8" width="36" height="26" rx="2" />
        <line x1="14" y1="34" x2="12" y2="40" />
        <line x1="34" y1="34" x2="36" y2="40" />
        <path d="M13 16 L22 16 M13 22 L28 22" />
        <path d="M34 14 l4 -4" />
        <circle cx="32" cy="16" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (role === "student") {
    // Open book with a bookmark
    return (
      <svg {...common}>
        <path d="M8 10 C14 10 20 11 24 14 C28 11 34 10 40 10 L40 36 C34 36 28 37 24 40 C20 37 14 36 8 36 Z" />
        <line x1="24" y1="14" x2="24" y2="40" />
        <path d="M30 10 L30 20 L33 17 L36 20 L36 10" />
      </svg>
    );
  }

  // parent
  // Two abstract figures holding hands under a roof
  return (
    <svg {...common}>
      <path d="M8 22 L24 8 L40 22" />
      <circle cx="18" cy="28" r="3.5" />
      <path d="M14 42 L14 34 a4 4 0 0 1 8 0 L22 42" />
      <circle cx="32" cy="30" r="2.5" />
      <path d="M29 42 L29 36 a3 3 0 0 1 6 0 L35 42" />
      <line x1="22" y1="36" x2="29" y2="36" />
    </svg>
  );
}
