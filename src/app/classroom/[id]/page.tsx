import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

// Landing route redirects to the students tab. All classroom management
// lives under /classroom/:id/{students,boards,roles,bank,store}.
export default async function ClassroomDetailPage({ params }: Props) {
  const { id } = await params;
  redirect(`/classroom/${id}/students`);
}
