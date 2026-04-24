// POST /api/teacher/oauth-clients/:clientId/disconnect
//
// 교사 본인이 자기 설정 페이지에서 누른 "연결 해제" — 해당 client 가 자신에게
// 발급받은 모든 access/refresh token 을 revoke. Aura 쪽 "연결 해제" 와는
// 양방향으로 동기화되며 (Aura 가 누르면 /api/oauth/revoke 로 우리 토큰 폐기,
// 우리 쪽에서 누르면 여기서 폐기) 다음 호출이 401 → Aura 가 reconnect 유도.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { clientId } = await params;

  const now = new Date();
  const [accessRes, refreshRes] = await db.$transaction([
    db.oAuthAccessToken.updateMany({
      where: { userId: user.id, clientId, revokedAt: null },
      data: { revokedAt: now },
    }),
    db.oAuthRefreshToken.updateMany({
      where: { userId: user.id, clientId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);

  return NextResponse.json({
    revoked: {
      accessTokens: accessRes.count,
      refreshTokens: refreshRes.count,
    },
  });
}
