import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessToken, isCanvaConnected, canvaGetDesign, resolveCanvaDesignId } from "@/lib/canva";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!(await isCanvaConnected(user.id))) {
      return NextResponse.json({ error: "canva_not_connected" }, { status: 401 });
    }

    const token = await getAccessToken(user.id);
    if (!token) {
      return NextResponse.json({ error: "canva_token_expired" }, { status: 401 });
    }

    // id can be a design ID or a URL
    let designId = id;
    if (id.startsWith("http")) {
      designId = await resolveCanvaDesignId(decodeURIComponent(id)) ?? id;
    }

    const design = await canvaGetDesign(token, designId);
    return NextResponse.json({ design });
  } catch (e) {
    console.error("[GET /api/canva/design/:id]", e);
    return NextResponse.json({ error: "Failed to get design" }, { status: 500 });
  }
}
