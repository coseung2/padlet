/**
 * Cloudflare Stream direct upload URL issuance (ES-7).
 *
 * Returns null when CF_ACCOUNT_ID or CF_STREAM_API_TOKEN are not configured.
 * The API route then responds 501 "not configured" and the UI hides the upload
 * option. Teacher boards with videoProviders including "cfstream" remain valid;
 * students are offered YouTube fallback.
 */
export type DirectUploadResult = {
  uploadURL: string;
  uid: string;
};

export function cfStreamEnabled(): boolean {
  return Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_STREAM_API_TOKEN);
}

export async function createDirectUploadUrl(opts: {
  maxDurationSeconds?: number | null;
  maxSizeMb?: number | null;
}): Promise<DirectUploadResult | null> {
  const account = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_STREAM_API_TOKEN;
  if (!account || !token) return null;

  const body: Record<string, unknown> = {};
  if (opts.maxDurationSeconds) body.maxDurationSeconds = opts.maxDurationSeconds;
  // maxSizeMb has no direct CF field; it's enforced client-side pre-upload.

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    success?: boolean;
    result?: { uploadURL?: string; uid?: string };
  };
  if (!json.success || !json.result?.uploadURL || !json.result?.uid) return null;
  return { uploadURL: json.result.uploadURL, uid: json.result.uid };
}
