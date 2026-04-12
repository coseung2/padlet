/**
 * YouTube URL parsing (ES-6).
 *
 * Accepts watch URLs, youtu.be shortlinks, and /shorts/. Returns 11-char id
 * or null if unrecognized. No network fetch — thumbnail URL is deterministic.
 */
const YT_PATTERN =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})(?:[?&].*)?$/i;

export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.trim().match(YT_PATTERN);
  return m ? m[1] : null;
}

export function youtubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function isYoutubeUrl(url: string): boolean {
  return extractYoutubeId(url) !== null;
}
