import { QuizPlay } from "@/components/QuizPlay";
import { getCurrentStudent } from "@/lib/student-auth";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const student = await getCurrentStudent();

  return (
    <QuizPlay
      initialCode={code.toUpperCase()}
      studentName={student?.name}
      studentId={student?.id}
    />
  );
}
