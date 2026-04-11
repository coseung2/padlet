import { randomUUID, randomBytes } from "crypto";
import { db } from "./db";

function randomAlphanumeric(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 for clarity
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

export async function generateClassroomCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomAlphanumeric(6);
    const existing = await db.classroom.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique classroom code after 10 attempts");
}

export function generateQrToken(): string {
  return randomUUID();
}

export async function generateTextCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomAlphanumeric(6);
    const existing = await db.student.findUnique({ where: { textCode: code } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique text code after 10 attempts");
}
