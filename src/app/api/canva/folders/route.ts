import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessToken, isCanvaConnected, canvaCreateFolder } from "@/lib/canva";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!(await isCanvaConnected(user.id))) {
      return NextResponse.json({ error: "canva_not_connected" }, { status: 401 });
    }

    const token = await getAccessToken(user.id);
    if (!token) {
      return NextResponse.json({ error: "canva_token_expired" }, { status: 401 });
    }

    const { name, parentFolderId } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const folder = await canvaCreateFolder(token, name, parentFolderId ?? "root");
    return NextResponse.json({ folder });
  } catch (e) {
    console.error("[POST /api/canva/folders]", e);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
