/**
 * Isomorphic role constants and types.
 * Safe to import from both server and client components.
 * (Keep this file free of server-only imports like `next/headers`.)
 */

export const MOCK_ROLE_KEYS = ["owner", "editor", "viewer"] as const;
export type MockRoleKey = (typeof MOCK_ROLE_KEYS)[number];

export function isMockRoleKey(x: string | undefined | null): x is MockRoleKey {
  return x === "owner" || x === "editor" || x === "viewer";
}
