"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MOCK_ROLE_KEYS, type MockRoleKey } from "@/lib/roles";

const META: Record<MockRoleKey, { label: string; emoji: string }> = {
  owner: { label: "Owner", emoji: "👑" },
  editor: { label: "Editor", emoji: "✏️" },
  viewer: { label: "Viewer", emoji: "👀" },
};

export function UserSwitcher({ currentRole }: { currentRole: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const makeHref = (role: MockRoleKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("as", role);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div
      className="user-switcher"
      role="radiogroup"
      aria-label="mock 사용자 역할 전환 (DEV only)"
    >
      {MOCK_ROLE_KEYS.map((r) => {
        const meta = META[r];
        const active = r === currentRole;
        return (
          <Link
            key={r}
            href={makeHref(r)}
            className={`user-switcher-btn ${active ? "is-active" : ""}`}
            role="radio"
            aria-checked={active}
          >
            <span aria-hidden>{meta.emoji}</span>
            <span>{meta.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
