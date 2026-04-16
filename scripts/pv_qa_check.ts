import { db } from "../src/lib/db";
(async () => {
  const u = await db.user.findUnique({ where: { id: "u_owner" } });
  console.log("u_owner:", u ? `${u.id} ${u.email}` : "MISSING");
  const rc = await db.classroom.update({
    where: { id: "pv_qa_classroom_a" },
    data: { teacherId: u ? u.id : "pv_qa_teacher_a" },
  });
  console.log("classroom teacherId now:", rc.teacherId);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
