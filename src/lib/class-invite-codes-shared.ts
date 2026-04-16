// parent-class-invite-v2 — client-safe helpers.
// No Node-only APIs. Imported by both the server module
// (src/lib/class-invite-codes.ts) and Client Components like CodeInput8.

export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_LENGTH = 8;

export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/O/g, "0");
}

export function formatCodeForDisplay(code: string): string {
  if (code.length !== CODE_LENGTH) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
