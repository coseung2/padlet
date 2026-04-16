/**
 * Unified auth helper.
 *
 * Priority:
 *   1. Real NextAuth session (Google OAuth) — takes precedence
 *   2. Mock auth via "as" cookie (dev-only, same as before)
 *
 * Both paths return the same shape so downstream code is unchanged.
 */
import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { auth } from "./auth-config";
import { isMockRoleKey, type MockRoleKey } from "./roles";

const MOCK_USERS: Record<MockRoleKey, string> = {
  owner: "u_owner",
  editor: "u_editor",
  viewer: "u_viewer",
};

export async function getCurrentUser() {
  // 1) Try real NextAuth session first
  const session = await auth();
  if (session?.user?.id) {
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user) {
      return { ...user, mockRole: null as string | null };
    }
  }

  // 2) Fall back to mock auth via "as" cookie (dev only)
  const cookieStore = await cookies();
  const asRole = cookieStore.get("as")?.value;
  // Production must never silently grant the mock owner identity to an
  // unauthenticated visitor. Without this guard a student-only session
  // (separate cookie) or a logged-out tab would be served as `u_owner`,
  // exposing teacher boards. Dev keeps the default-owner fallback so the
  // local workflow that hot-switches via UserSwitcher still works.
  if (process.env.NODE_ENV === "production" && !isMockRoleKey(asRole)) {
    throw new Error("Unauthenticated");
  }
  const roleKey: MockRoleKey = isMockRoleKey(asRole) ? asRole : "owner";
  const userId = MOCK_USERS[roleKey];
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(
      `Mock user "${userId}" not found. Did you run \`npm run seed\`?`
    );
  }
  return { ...user, mockRole: roleKey as string | null };
}

/**
 * Check if the current request has a real (non-mock) authenticated session.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.user?.id;
}
