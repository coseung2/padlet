import { clearStudentSession } from "@/lib/student-auth";
import { NextResponse } from "next/server";

export async function POST() {
  await clearStudentSession();
  return NextResponse.json({ success: true }, { status: 200 });
}
