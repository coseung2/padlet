/**
 * Unified bearer-token verification for /api/external/*.
 *
 * Accepts either:
 *   - a teacher PAT (`aurapat_...`) — existing path, proxies to verifyPat,
 *   - a student OAuth access token (`aurastu_...`) issued via /oauth/* —
 *     treats the student's classroom's teacher as the effective PAT owner
 *     so downstream RBAC / membership queries keep working unchanged.
 *
 * Returns a discriminated result. Callers branch on `kind` only when they
 * need the raw origin (auditing, scope allowlists); most handlers just
 * consume the normalised `{ user, scopes, scopeBoardIds }` fields.
 */
import "server-only";
import { db } from "./db";
import { verifyPat } from "./external-pat";
import type { User, Student } from "@prisma/client";
import { verifyAccessToken } from "./oauth-server";

export type BearerResult =
  | {
      ok: true;
      kind: "pat";
      user: User;
      tokenId: string;
      tokenPrefix: string;
      scopes: string[];
      scopeBoardIds: string[];
      student: null;
    }
  | {
      ok: true;
      kind: "oauth";
      // The teacher who owns the student's classroom — used for boardMember
      // lookups so the existing RBAC code path doesn't need to special-case
      // student auth.
      user: User;
      tokenId: string;
      tokenPrefix: string;
      scopes: string[];
      scopeBoardIds: string[]; // always [] for OAuth v1
      // Student the token is bound to — handlers can use this to enforce
      // classroom scoping in lieu of the student_session cookie.
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
    // verifyPat tolerates missing Bearer prefix; route to it so the existing
    // error codes (invalid_token_format) are preserved.
    return patPathway(authHeader);
  }
  const token = authHeader.slice(7).trim();

  if (token.startsWith("aurapat_")) return patPathway(authHeader);
  if (token.startsWith("aurastu_")) return oauthPathway(token);

  return { ok: false, code: "invalid_token_format" };
}

async function patPathway(authHeader: string | null): Promise<BearerResult> {
  const r = await verifyPat(authHeader);
  if (!r.ok) return { ok: false, code: r.code };
  return {
    ok: true,
    kind: "pat",
    user: r.value.user,
    tokenId: r.value.tokenId,
    tokenPrefix: r.value.tokenPrefix,
    scopes: r.value.scopes,
    scopeBoardIds: r.value.scopeBoardIds,
    student: null,
  };
}

async function oauthPathway(plaintext: string): Promise<BearerResult> {
  const r = await verifyAccessToken(plaintext);
  if (!r.ok) return { ok: false, code: r.code };

  // Hydrate student → classroom → teacher. We intentionally take three
  // queries' worth of latency (one join would be cheaper) because the
  // existing PAT-centric handlers expect plain `User` / `Student` Prisma
  // shapes; collapsing them would ripple into every consumer.
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
