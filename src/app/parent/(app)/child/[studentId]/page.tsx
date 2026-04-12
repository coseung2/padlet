import { redirect } from "next/navigation";

// Default landing inside /parent/child/[studentId] → plant tab.
export default async function ChildIndex({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  redirect(`/parent/child/${studentId}/plant`);
}
