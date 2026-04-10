import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/canva";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  const success = await exchangeCode(state, code);
  if (!success) {
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }

  // Redirect back to the board
  return NextResponse.redirect(new URL("/", req.url));
}
