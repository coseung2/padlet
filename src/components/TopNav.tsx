"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { AuthHeader } from "./AuthHeader";

/**
 * Global top navigation — handoff Shell.jsx TopNav pattern (T3-1).
 * Tabs are pinned to teacher routes that always make sense out of context.
 * Class-scoped subpages (boards / bank / store / roles) stay under each
 * classroom detail's own nav — surfacing them globally would require a
 * currently-selected class, which this header does not carry.
 */
const TABS = [
  {
    id: "dashboard",
    label: "보드",
    href: "/",
    isActive: (pathname: string) => pathname === "/",
  },
  {
    id: "classrooms",
    label: "학급",
    href: "/classroom",
    isActive: (pathname: string) => pathname.startsWith("/classroom"),
  },
] as const;

export function TopNav() {
  const pathname = usePathname() ?? "";

  return (
    <header className="ab-topnav">
      <div className="ab-topnav-left">
        <Link
          href="/"
          className="ab-topnav-logo"
          aria-label="Aura-board 홈"
        >
          <Logo size={32} withWordmark />
        </Link>
        <nav className="ab-topnav-links" aria-label="주 메뉴">
          {TABS.map((t) => {
            const active = t.isActive(pathname);
            return (
              <Link
                key={t.id}
                href={t.href}
                className={`ab-topnav-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="ab-topnav-right">
        <AuthHeader />
      </div>
    </header>
  );
}
