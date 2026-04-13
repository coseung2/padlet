/**
 * Canva Connect API helpers.
 * Docs: https://www.canva.dev/docs/connect/
 *
 * Tokens and the transient PKCE verifier are persisted in
 * CanvaConnectAccount (Prisma) so the teacher's connection survives Vercel
 * Function cold starts. Earlier in-memory Maps (tokenStore / pkceStore)
 * silently logged teachers out whenever a new container handled a request.
 */
import { db } from "./db";

const CANVA_API = "https://api.canva.com/rest/v1";
const CANVA_AUTH = "https://www.canva.com/api/oauth/authorize";
const CANVA_TOKEN = `${CANVA_API}/oauth/token`;

export function getCanvaClientId() {
  return process.env.CANVA_CLIENT_ID ?? "";
}

function getCanvaClientSecret() {
  return process.env.CANVA_CLIENT_SECRET ?? "";
}

function getRedirectUri() {
  return process.env.CANVA_REDIRECT_URI ?? "http://localhost:3000/api/auth/canva/callback";
}

/* ── PKCE helpers ── */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64url");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("base64url");
}

/* ── OAuth flow ── */
export async function buildAuthorizationUrl(userId: string): Promise<string> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  // Persist the verifier (upsert — teacher may restart the flow without
  // finishing the previous one). accessToken/refreshToken are NOT cleared so
  // a mid-flow re-authorize doesn't log the user out of an already-working
  // session; they're only rewritten on successful exchangeCode.
  await db.canvaConnectAccount.upsert({
    where: { userId },
    create: { userId, pkceVerifier: verifier },
    update: { pkceVerifier: verifier },
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getCanvaClientId(),
    redirect_uri: getRedirectUri(),
    code_challenge: challenge,
    code_challenge_method: "s256",
    scope: "design:meta:read design:content:read folder:read folder:write",
    state: userId,
  });

  return `${CANVA_AUTH}?${params}`;
}

export async function exchangeCode(userId: string, code: string): Promise<boolean> {
  const row = await db.canvaConnectAccount.findUnique({ where: { userId } });
  const verifier = row?.pkceVerifier;
  if (!verifier) return false;

  const basic = Buffer.from(`${getCanvaClientId()}:${getCanvaClientSecret()}`).toString("base64");

  const res = await fetch(CANVA_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!res.ok) {
    console.error("[Canva] Token exchange failed:", await res.text());
    return false;
  }

  const data = await res.json();
  await db.canvaConnectAccount.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      pkceVerifier: null,
    },
  });
  return true;
}

async function refreshAccessToken(userId: string): Promise<string | null> {
  const row = await db.canvaConnectAccount.findUnique({ where: { userId } });
  if (!row?.refreshToken) return null;

  const basic = Buffer.from(`${getCanvaClientId()}:${getCanvaClientSecret()}`).toString("base64");

  const res = await fetch(CANVA_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: row.refreshToken,
    }),
  });

  if (!res.ok) {
    // Refresh failed (likely revoked / expired). Clear tokens so the next
    // request surfaces canva_not_connected and prompts re-authorize.
    await db.canvaConnectAccount.update({
      where: { userId },
      data: { accessToken: null, refreshToken: null, expiresAt: null },
    });
    return null;
  }

  const data = await res.json();
  await db.canvaConnectAccount.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
  return data.access_token;
}

export async function getAccessToken(userId: string): Promise<string | null> {
  const row = await db.canvaConnectAccount.findUnique({ where: { userId } });
  if (!row?.accessToken || !row.expiresAt) return null;

  // Refresh if expiring within 5 minutes.
  if (row.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    return refreshAccessToken(userId);
  }
  return row.accessToken;
}

export async function isCanvaConnected(userId: string): Promise<boolean> {
  const row = await db.canvaConnectAccount.findUnique({
    where: { userId },
    select: { accessToken: true },
  });
  return !!row?.accessToken;
}

/* ── API calls ── */
export async function canvaExportDesign(
  token: string,
  designId: string,
  format: "pdf" | "png" = "pdf"
): Promise<string[]> {
  // 1. Create export job
  const createRes = await fetch(`${CANVA_API}/exports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      design_id: designId,
      format: { type: format },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Export create failed: ${err}`);
  }

  const { job } = await createRes.json();
  const jobId: string = job.id;

  // 2. Poll for completion (max 60 seconds)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const pollRes = await fetch(`${CANVA_API}/exports/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();
    if (pollData.job.status === "success") {
      return pollData.job.urls ?? [];
    }
    if (pollData.job.status === "failed") {
      throw new Error(`Export failed: ${pollData.job.error?.message ?? "unknown"}`);
    }
  }

  throw new Error("Export timed out");
}

/* ── Design info ── */
export type CanvaDesignInfo = {
  id: string;
  title: string;
  pageCount: number;
  thumbnail: { url: string; width: number; height: number } | null;
  viewUrl: string | null;
  editUrl: string | null;
  updatedAt: number;
};

export async function canvaGetDesign(token: string, designId: string): Promise<CanvaDesignInfo> {
  const res = await fetch(`${CANVA_API}/designs/${designId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Get design failed: ${err}`);
  }

  const { design } = await res.json();
  return {
    id: design.id,
    title: design.title,
    pageCount: design.page_count,
    thumbnail: design.thumbnail ?? null,
    viewUrl: design.urls?.view_url ?? null,
    editUrl: design.urls?.edit_url ?? null,
    updatedAt: design.updated_at,
  };
}

/* ── Folders ── */
export type CanvaFolder = {
  id: string;
  name: string;
};

export async function canvaCreateFolder(
  token: string,
  name: string,
  parentFolderId: string = "root"
): Promise<CanvaFolder> {
  const res = await fetch(`${CANVA_API}/folders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, parent_folder_id: parentFolderId }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Create folder failed: ${err}`);
  }

  const { folder } = await res.json();
  return { id: folder.id, name: folder.name };
}

export type CanvaFolderItem = {
  type: "design" | "folder" | "image";
  id: string;
  name: string;
  thumbnail?: { url: string; width: number; height: number };
  pageCount?: number;
};

export async function canvaListFolderItems(
  token: string,
  folderId: string
): Promise<CanvaFolderItem[]> {
  const items: CanvaFolderItem[] = [];
  let continuation: string | undefined;

  do {
    const params = new URLSearchParams({ limit: "50" });
    if (continuation) params.set("continuation", continuation);

    const res = await fetch(`${CANVA_API}/folders/${folderId}/items?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) break;

    const data = await res.json();
    for (const item of data.items ?? []) {
      if (item.type === "design") {
        items.push({
          type: "design",
          id: item.design?.id ?? item.id,
          name: item.design?.title ?? "Untitled",
          thumbnail: item.design?.thumbnail,
          pageCount: item.design?.page_count,
        });
      } else if (item.type === "folder") {
        items.push({
          type: "folder",
          id: item.folder?.id ?? item.id,
          name: item.folder?.name ?? "Untitled",
          thumbnail: item.folder?.thumbnail,
        });
      }
    }
    continuation = data.continuation;
  } while (continuation);

  return items;
}

export async function canvaMoveItem(token: string, itemId: string, toFolderId: string): Promise<boolean> {
  const res = await fetch(`${CANVA_API}/folders/move`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ item_id: itemId, to_folder_id: toFolderId }),
  });
  return res.status === 204 || res.ok;
}

export async function resolveCanvaDesignId(url: string): Promise<string | null> {
  let finalUrl = url;

  if (url.includes("canva.link")) {
    try {
      // Short-link expansion — hard cap the redirect HEAD so a slow
      // canva.link response cannot blow past the outer 3s oEmbed budget.
      const res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(2000),
      });
      finalUrl = res.headers.get("location") ?? url;
    } catch {}
  }

  const match = finalUrl.match(/\/design\/([A-Za-z0-9_-]+)\//);
  return match?.[1] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────
// oEmbed live-embed support (task 2026-04-12-canva-oembed)
// ─────────────────────────────────────────────────────────────────────────

export type CanvaEmbed = {
  iframeSrc: string;
  thumbnailUrl: string;
  title: string;
  authorName: string;
  width: number;
  height: number;
  designId: string;
};

// Pure sync predicate — no network. Accepts www-prefixed and bare variants.
export function isCanvaDesignUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  let host: string;
  let pathname: string;
  try {
    const u = new URL(rawUrl);
    host = u.hostname.toLowerCase();
    pathname = u.pathname;
  } catch {
    return false;
  }
  const canonicalHost =
    host === "canva.com" || host === "www.canva.com" || host === "canva.link";
  if (!canonicalHost) return false;
  if (host === "canva.link") return true;
  return /\/design\/[A-Za-z0-9_-]+/.test(pathname);
}

// Pure sync extractor — returns null when the URL is not a canva.com design
// page we can name a designId for. Does NOT resolve canva.link short-links.
export function extractCanvaDesignId(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    if (host !== "canva.com" && host !== "www.canva.com") return null;
    const m = u.pathname.match(/\/design\/([A-Za-z0-9_-]+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Build the iframe src for a canva.com design URL. Canva "공개 보기" links
 * carry a share token in the path (`/design/{designId}/{shareToken}/view`)
 * and without it the embed renders Canva's login gate instead of the
 * actual design. We strip the query string (utm_*, utlId, etc.) and append
 * `?embed&meta` while preserving the share token segment when present.
 *
 * Returns null for URLs we don't recognise as canva design pages.
 */
export function buildCanvaEmbedSrc(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    if (host !== "canva.com" && host !== "www.canva.com") return null;

    // Accept either /design/{id}/view or /design/{id}/{shareToken}/view.
    const m = u.pathname.match(/\/design\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_-]+))?\/view/);
    if (!m) return null;
    const [, designId, shareToken] = m;
    const pathPrefix = shareToken
      ? `/design/${designId}/${shareToken}/view`
      : `/design/${designId}/view`;
    // `?embed` is the only flag Canva documents publicly. `&meta` was a
    // legacy internal flag that occasionally triggers state-deserialize
    // errors on "공개 보기" share designs (reported: "Expected object
    // value for key D, found undefined at path .Bj.A"). Keep URL minimal.
    return `https://www.canva.com${pathPrefix}?embed`;
  } catch {
    return null;
  }
}

// Async resolver — may do 1 short-link HEAD plus 1 oEmbed fetch.
// Returns null on any failure so callers can fall back to the link-preview
// path without a throw.
export async function resolveCanvaEmbedUrl(
  rawUrl: string
): Promise<CanvaEmbed | null> {
  if (!isCanvaDesignUrl(rawUrl)) return null;

  // 1. Resolve short-link to its canva.com location when needed.
  const designId = await resolveCanvaDesignId(rawUrl);
  if (!designId) return null;

  // 2. Canonicalize to the /view URL so oEmbed responds consistently.
  const canonicalUrl = `https://www.canva.com/design/${designId}/view`;

  // 3. Ask Canva's oEmbed endpoint. Canva is currently migrating from the
  //    legacy www.canva.com path to api.canva.com — try the new endpoint
  //    first and fall back to the legacy one. Each attempt has its own
  //    short timeout so a stalled endpoint can't exhaust the budget twice.
  const endpoints = [
    `https://api.canva.com/_spi/presentation/_oembed?url=${encodeURIComponent(canonicalUrl)}`,
    `https://www.canva.com/_oembed?url=${encodeURIComponent(canonicalUrl)}`,
  ];

  for (const endpoint of endpoints) {
    const body = await fetchCanvaOEmbed(endpoint);
    if (!body) continue;

    // 4. Validate — require a thumbnail and the "rich" type Canva actually
    //    advertises. Ignore body.html intentionally (no
    //    dangerouslySetInnerHTML path — phase3 §5-6).
    if (body.type !== "rich") continue;
    if (typeof body.thumbnail_url !== "string") continue;

    return {
      iframeSrc: `https://www.canva.com/design/${designId}/view?embed&meta`,
      thumbnailUrl: String(body.thumbnail_url),
      title: String(body.title ?? "Canva design"),
      authorName: String(body.author_name ?? ""),
      width: Number(body.width ?? 1600),
      height: Number(body.height ?? 900),
      designId,
    };
  }

  return null;
}

async function fetchCanvaOEmbed(
  endpoint: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(3000),
      headers: {
        "User-Agent": "Aura-board/1.0 (+https://aura-board-app.vercel.app)",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
