"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// PV-6 parent PWA bottom nav. Fixed 56px, 3 tabs. Uses inline styles + CSS
// vars so it stays on the design-system palette without pulling in a CSS
// module. Kept "use client" only for the usePathname active-state.

const ITEMS = [
  { href: "/parent/home", label: "자녀", emoji: "\u{1F46A}" },
  { href: "/parent/notifications", label: "알림", emoji: "\u{1F514}" },
  { href: "/parent/account", label: "계정", emoji: "\u2699\uFE0F" },
] as const;

export function ParentBottomNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="학부모 하단 메뉴"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: "calc(56px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "var(--color-surface, #fff)",
        borderTop: "1px solid var(--color-border, #e5e7eb)",
        display: "flex",
        zIndex: 50,
      }}
    >
      {ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/parent/home" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: 8,
              color: active
                ? "var(--color-primary, #4f46e5)"
                : "var(--color-text-muted, #6b7280)",
              textDecoration: "none",
              fontSize: 11,
              fontWeight: active ? 600 : 500,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.emoji}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
