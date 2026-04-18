-- NOT AUTO-APPLIED. Scaffold only (PV-12 pattern). API-layer guards are primary
-- for v1; RLS is defense-in-depth to be enabled in a later ops task once
-- connection-pool identity propagation (app.student_id / app.user_id /
-- app.parent_id) is wired up in src/lib/db.ts.

ALTER TABLE "AssignmentSlot" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AssignmentSlot_student_self" ON "AssignmentSlot"
  FOR SELECT USING ("studentId" = current_setting('app.student_id', true));

CREATE POLICY "AssignmentSlot_teacher_own_classroom" ON "AssignmentSlot"
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM "Board" b
      JOIN "Classroom" c ON c.id = b."classroomId"
      WHERE b.id = "AssignmentSlot"."boardId"
        AND c."teacherId" = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "AssignmentSlot_parent_of_student" ON "AssignmentSlot"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM "ParentChildLink" pcl
      WHERE pcl."studentId" = "AssignmentSlot"."studentId"
        AND pcl."parentId" = current_setting('app.parent_id', true)
        AND pcl."deletedAt" IS NULL
    )
  );
