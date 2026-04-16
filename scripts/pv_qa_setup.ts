// QA setup for Parent Viewer Access PV-1~PV-5. Idempotent.
// Run: npx tsx scripts/pv_qa_setup.ts
//
// Seeds two teachers + one classroom per teacher + two students in teacher A's
// classroom (so cross-student 403 can be exercised), plus reports IDs.
import { db } from "../src/lib/db";

async function upsertUser(id: string, email: string, name: string) {
  return db.user.upsert({
    where: { id },
    update: { email, name },
    create: { id, email, name },
  });
}

async function main() {
  const teacherA = await upsertUser("pv_qa_teacher_a", "pv-qa-teacher-a@example.com", "PV QA Teacher A");

  const classroomA = await db.classroom.upsert({
    where: { id: "pv_qa_classroom_a" },
    update: {},
    create: {
      id: "pv_qa_classroom_a",
      name: "PV QA Classroom A",
      code: "PVQA0A",
      teacherId: teacherA.id,
    },
  });

  const studentA1 = await db.student.upsert({
    where: { id: "pv_qa_student_a1" },
    update: {},
    create: {
      id: "pv_qa_student_a1",
      classroomId: classroomA.id,
      number: 1,
      name: "학생A1",
      qrToken: "pv_qa_qr_a1",
      textCode: "PVQAA1",
    },
  });

  const studentA2 = await db.student.upsert({
    where: { id: "pv_qa_student_a2" },
    update: {},
    create: {
      id: "pv_qa_student_a2",
      classroomId: classroomA.id,
      number: 2,
      name: "학생A2",
      qrToken: "pv_qa_qr_a2",
      textCode: "PVQAA2",
    },
  });

  console.log(
    JSON.stringify(
      {
        teacherAId: teacherA.id,
        classroomAId: classroomA.id,
        studentA1Id: studentA1.id,
        studentA2Id: studentA2.id,
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
