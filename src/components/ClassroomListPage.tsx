"use client";

import { useRouter } from "next/navigation";
import { ClassroomList } from "./ClassroomList";

type ClassroomItem = {
  id: string;
  name: string;
  code: string;
  _count: { students: number; boards: number };
};

type Props = {
  initialClassrooms: ClassroomItem[];
};

export function ClassroomListPage({ initialClassrooms }: Props) {
  const router = useRouter();

  return (
    <ClassroomList
      classrooms={initialClassrooms}
      onRefresh={() => router.refresh()}
    />
  );
}
