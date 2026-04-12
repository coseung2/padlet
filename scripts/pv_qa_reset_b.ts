import { db } from "../src/lib/db";
(async () => {
  // Clean up parent B + cascade links so we can retry fresh
  await db.parent.deleteMany({ where: { email: { contains: "pv-parent-B" } } });
  await db.parent.deleteMany({ where: { email: { contains: "pv-parent-b" } } });
  // Revoke all pending invites for student_a2 so the next POST mints fresh
  await db.parentInviteCode.updateMany({
    where: { studentId: "pv_qa_student_a2", revokedAt: null },
    data: { revokedAt: new Date() },
  });
  console.log("reset OK");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
