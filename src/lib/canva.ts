/**
 * Canva Connect API helpers.
 * Docs: https://www.canva.dev/docs/connect/
 */

const CANVA_API = "https://api.canva.com/rest/v1";
const CANVA_AUTH = "https://www.canva.com/api/oauth/authorize";
const CANVA_TOKEN = `${CANVA_API}/oauth/token`;

// In-memory token store (per mock user). In production, use DB.
const tokenStore = new Map<string, { accessToken: string; refreshToken: string; expiresAt: number }>();

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

// Store code verifiers per session
const pkceStore = new Map<string, string>();

/* ── OAuth flow ── */
export async function buildAuthorizationUrl(userId: string): Promise<string> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  pkceStore.set(userId, verifier);

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
  const verifier = pkceStore.get(userId);
  if (!verifier) return false;
  pkceStore.delete(userId);

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
  tokenStore.set(userId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return true;
}

async function refreshAccessToken(userId: string): Promise<string | null> {
  const stored = tokenStore.get(userId);
  if (!stored) return null;

  const basic = Buffer.from(`${getCanvaClientId()}:${getCanvaClientSecret()}`).toString("base64");

  const res = await fetch(CANVA_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: stored.refreshToken,
    }),
  });

  if (!res.ok) {
    tokenStore.delete(userId);
    return null;
  }

  const data = await res.json();
  tokenStore.set(userId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}

export async function getAccessToken(userId: string): Promise<string | null> {
  const stored = tokenStore.get(userId);
  if (!stored) return null;

  // Refresh if expiring within 5 minutes
  if (stored.expiresAt - Date.now() < 5 * 60 * 1000) {
    return refreshAccessToken(userId);
  }
  return stored.accessToken;
}

export function isCanvaConnected(userId: string): boolean {
  return tokenStore.has(userId);
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
      const res = await fetch(url, { redirect: "manual" });
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

  // 3. Ask Canva's oEmbed endpoint. Short, hard timeout: the caller is on
  //    the card-create hot path.
  const endpoint = `https://www.canva.com/_oembed?url=${encodeURIComponent(
    canonicalUrl
  )}`;

  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(3000),
      headers: {
        "User-Agent": "Aura-board/1.0 (+https://aura-board-app.vercel.app)",
      },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as Record<string, unknown>;

    // 4. Validate — require a thumbnail and the "rich" type Canva actually
    //    advertises. We intentionally ignore body.html to avoid any
    //    dangerouslySetInnerHTML path.
    if (body.type !== "rich") return null;
    if (typeof body.thumbnail_url !== "string") return null;

    return {
      iframeSrc: `https://www.canva.com/design/${designId}/view?embed&meta`,
      thumbnailUrl: String(body.thumbnail_url),
      title: String(body.title ?? "Canva design"),
      authorName: String(body.author_name ?? ""),
      width: Number(body.width ?? 1600),
      height: Number(body.height ?? 900),
      designId,
    };
  } catch {
    return null;
  }
}
