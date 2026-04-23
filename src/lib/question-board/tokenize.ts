// 질문 보드 응답 텍스트 토큰화 + 빈도 집계.
// MVP 휴리스틱:
//   1) 공백 + 기본 구두점(. , ! ? 등)으로 split
//   2) 2자 이하 토큰 제거 (의미 희박)
//   3) 한국어 흔한 조사(을/를/이/가/은/는/도/의/에/로) 어미 1자 스트립
//   4) 소문자 정규화 (영문 대응)
// 형태소 분석/동의어는 후속 task. 이 휴리스틱으로는 "감사를" ↔ "감사" 를
// 같은 토큰으로 묶는 정도만 커버됨.

const KOREAN_PARTICLES_1 = new Set([
  "을",
  "를",
  "이",
  "가",
  "은",
  "는",
  "도",
  "의",
  "에",
  "로",
  "와",
  "과",
]);

const PUNCT_RE = /[.,!?;:()\[\]{}<>"'`~·…""'']/g;

export function tokenize(text: string): string[] {
  if (!text) return [];
  const cleaned = text.replace(PUNCT_RE, " ").toLowerCase();
  const raw = cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  return raw.map(stripKoreanParticle);
}

function stripKoreanParticle(token: string): string {
  if (token.length < 3) return token;
  const last = token.charAt(token.length - 1);
  if (KOREAN_PARTICLES_1.has(last)) {
    return token.slice(0, -1);
  }
  return token;
}

// 응답 배열 → 단어별 빈도 맵. 내림차순 정렬.
export function frequencyCounts(texts: string[]): Array<{ word: string; count: number }> {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const token of tokenize(text)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}
