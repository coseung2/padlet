/**
 * Integration spec for viewSection — runs against the live dev DB.
 * Run: cd <worktree>; npx tsx tasks/2026-04-12-breakout-section-isolation/phase9/regression_tests/view_section.test.ts
 *
 * This explicitly covers paths HTTP curl cannot reach because mock-auth dev
 * always treats anonymous callers as the seeded owner.
 */
import { viewSection, ForbiddenError } from "@/lib/rbac";
import { db } from "@/lib/db";

async function main() {
  let passed = 0;
  let failed = 0;
  const fails: string[] = [];

  async function expectForbidden(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      failed++;
      fails.push(`${label} — expected ForbiddenError`);
    } catch (e) {
      if (e instanceof ForbiddenError) {
        passed++;
      } else {
        failed++;
        fails.push(`${label} — wrong error: ${(e as Error).message}`);
      }
    }
  }

  async function expectOk(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      passed++;
    } catch (e) {
      failed++;
      fails.push(`${label} — unexpected error: ${(e as Error).message}`);
    }
  }

  // Rotate a fresh token for s_done to isolate from other concurrent runs.
  const token = "T_" + Math.random().toString(36).slice(2).padEnd(30, "X");
  await db.section.update({
    where: { id: "s_done" },
    data: { accessToken: token },
  });

  // AC#5 true anonymous + wrong token → 403
  await expectForbidden(
    "anonymous + wrong token → 403",
    () => viewSection("s_done", { token: "wrong" })
  );

  // AC#4 anonymous + correct token → allow
  await expectOk(
    "anonymous + correct token → allow",
    () => viewSection("s_done", { token })
  );

  // AC#9: anonymous + no token, no student → 403
  await expectForbidden(
    "anonymous + null token → 403",
    () => viewSection("s_done", { token: null, userId: null, studentClassroomId: null })
  );

  // Owner user (u_owner) → allow (no token needed)
  await expectOk(
    "owner user → allow",
    () => viewSection("s_done", { userId: "u_owner" })
  );

  // Non-member user → 403 (token null).
  await expectForbidden(
    "non-member user + null token → 403",
    () => viewSection("s_done", { userId: "u_nonmember_xyz" })
  );

  // Rotation invalidates the old token.
  const rotated = "R_" + Math.random().toString(36).slice(2).padEnd(30, "X");
  await db.section.update({
    where: { id: "s_done" },
    data: { accessToken: rotated },
  });
  await expectForbidden(
    "old token after rotation → 403",
    () => viewSection("s_done", { token })
  );
  await expectOk(
    "new rotated token → allow",
    () => viewSection("s_done", { token: rotated })
  );

  // Reset token to null for cleanliness
  await db.section.update({
    where: { id: "s_done" },
    data: { accessToken: null },
  });

  console.log(`viewSection specs: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    for (const f of fails) console.error("FAIL:", f);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
