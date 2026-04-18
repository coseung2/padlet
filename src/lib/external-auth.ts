/**
 * Unified bearer-token verification for /api/external/*.
 *
 * Accepts:
 *   - a student OAuth access token (`aurastu_...`) issued via
 *     /api/external/student-login or /api/oauth/* — treats the student's
 *     classroom's teacher as the effective resource owner so downstream
 *     RBAC / membership queries keep working unchanged.
 *   - a Canva Apps SDK JWT (`getCanvaUserToken()`) mapped to a Student via
 *     `CanvaAppLink`.
 *
 * Teacher PAT (`aurapat_...`) was removed 2026-04-15 — Canva app switched
 * to per-student scoped tokens and no third-party integrations depend on
 * teacher PATs.
 */
import "server-only";
import { db } from "./db";
import type { User, Student } from "@prisma/client";
import { verifyAccessToken } from "./oauth-server";
import { verifyCanvaToken, looksLikeCanvaJwt } from "./canva-jwt";

export type BearerResult =
  | {
      ok: true;
      kind: "oauth";
      user: User;
      tokenId: string;
      tokenPrefix: string;
      scopes: string[];
      // Always [] for OAuth — preserved in the shape so downstream board
      // allowlist checks (`if scopeBoardIds.length > 0 …`) fall through.
      scopeBoardIds: string[];
      student: Student & { classroomId: string };
    }
  | {
      ok: false;
      code:
        | "invalid_token_format"
        | "invalid_token"
        | "token_revoked"
        | "revoked"
        | "expired"
        | "orphan";
    };

export async function verifyBearer(authHeader: string | null): Promise<BearerResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, code: "invalid_token_format" };
  }
  const token = authHeader.slice(7).trim();

  if (token.startsWith("aurastu_")) return oauthPathway(token);
  if (looksLikeCanvaJwt(token)) return canvaJwtPathway(token);

  return { ok: false, code: "invalid_token_format" };
}

async function canvaJwtPathway(token: string): Promise<BearerResult> {
  // Canva Apps SDK: the app calls getCanvaUserToken() on the client and
  // sends the JWT to our backend. We verify the signature against Canva's
  // JWKS, then resolve the Canva user id (`sub`) to a Student via the
  // CanvaAppLink mapping populated during OAuth consent.
  let claims;
  try {
    claims = await verifyCanvaToken(token);
  } catch {
    return { ok: false, code: "invalid_token" };
  }

  const link = await db.canvaAppLink.findUnique({
    where: { canvaUserId: claims.canvaUserId },
    include: {
      student: { include: { classroom: { include: { teacher: true } } } },
    },
  });
  if (!link || !link.student?.classroom?.teacher) {
    return { ok: false, code: "orphan" };
  }

  const scopeList = link.scope.split(/\s+/).filter(Boolean);
  return {
    ok: true,
    kind: "oauth",
    user: link.student.classroom.teacher,
    tokenId: `canva:${claims.canvaUserId}`,
    tokenPrefix: claims.canvaUserId.slice(0, 8),
    scopes: scopeList,
    scopeBoardIds: [],
    student: link.student as Student & { classroomId: string },
  };
}

async function oauthPathway(plaintext: string): Promise<BearerResult> {
  const r = await verifyAccessToken(plaintext);
  if (!r.ok) return { ok: false, code: r.code };

  const student = await db.student.findUnique({
    where: { id: r.studentId },
    include: { classroom: { include: { teacher: true } } },
  });
  if (!student || !student.classroom?.teacher) {
    return { ok: false, code: "orphan" };
  }

  const scopeList = r.scope.split(/\s+/).filter(Boolean);

  return {
    ok: true,
    kind: "oauth",
    user: student.classroom.teacher,
    tokenId: r.tokenHash.slice(0, 16),
    tokenPrefix: plaintext.slice(8, 16), // after "aurastu_"
    scopes: scopeList,
    scopeBoardIds: [],
    student: student as Student & { classroomId: string },
  };
}
