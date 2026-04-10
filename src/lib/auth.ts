/**
 * DEV-ONLY mock auth. Replace with real auth before production.
 *
 * The current user is picked from a cookie named "as" which is set by
 * src/proxy.ts when the URL has `?as=owner|editor|viewer`.
 * If no cookie is present, defaults to "owner".
 */
import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { isMockRoleKey, type MockRoleKey } from "./roles";

const MOCK_USERS: Record<MockRoleKey, string> = {
  owner: "u_owner",
  editor: "u_editor",
  viewer: "u_viewer",
};

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const asRole = cookieStore.get("as")?.value;
  const roleKey: MockRoleKey = isMockRoleKey(asRole) ? asRole : "owner";
  const userId = MOCK_USERS[roleKey];
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(
      `Mock user "${userId}" not found. Did you run \`npm run seed\`?`
    );
  }
  return { ...user, mockRole: roleKey };
}
