import { QuizPlay } from "@/components/QuizPlay";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <QuizPlay initialCode={code.toUpperCase()} />;
}
