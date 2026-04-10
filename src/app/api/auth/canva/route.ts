import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildAuthorizationUrl, getCanvaClientId } from "@/lib/canva";

export async function GET() {
  if (!getCanvaClientId()) {
    return NextResponse.json(
      { error: "Canva API not configured. Set CANVA_CLIENT_ID in .env" },
      { status: 500 }
    );
  }

  const user = await getCurrentUser();
  const url = await buildAuthorizationUrl(user.id);
  return NextResponse.redirect(url);
}
