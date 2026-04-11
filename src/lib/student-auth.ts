import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "./db";

const SECRET = process.env.AUTH_SECRET ?? "dev-secret";
const COOKIE_NAME = "student_session";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days

interface StudentPayload {
  studentId: string;
  classroomId: string;
  exp: number;
}

function sign(payload: StudentPayload): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

function verify(token: string): StudentPayload | null {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(b64).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString()) as StudentPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createStudentSession(studentId: string, classroomId: string) {
  const payload: StudentPayload = {
    studentId,
    classroomId,
    exp: Date.now() + MAX_AGE * 1000,
  };
  const token = sign(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getCurrentStudent() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verify(token);
  if (!payload) return null;
  const student = await db.student.findUnique({
    where: { id: payload.studentId },
    include: { classroom: true },
  });
  return student;
}

export async function clearStudentSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
