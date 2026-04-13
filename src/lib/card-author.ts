// Pure helpers used by CardAuthorFooter. Lives in lib/ to keep the
// component free of testable logic and let the existing tsx-runner test
// pattern (no Jest/Vitest in the repo) cover them.

export function pickAuthorName(
  external?: string | null,
  student?: string | null,
  author?: string | null,
): string | null {
  return external ?? student ?? author ?? null;
}

export function formatRelativeKo(iso: string, now: number = Date.now()): {
  rel: string;
  abs: string;
} {
  const date = new Date(iso);
  const ms = now - date.getTime();
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  let rel: string;
  if (sec < 30) rel = "방금";
  else if (min < 1) rel = `${sec}초 전`;
  else if (hr < 1) rel = `${min}분 전`;
  else if (day < 1) rel = `${hr}시간 전`;
  else if (day < 7) rel = `${day}일 전`;
  else rel = date.toLocaleDateString("ko-KR");

  const abs = date.toLocaleString("ko-KR");
  return { rel, abs };
}
