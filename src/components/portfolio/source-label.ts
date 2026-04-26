// student-portfolio (2026-04-26): 카드 출처 라벨 빌더 (client-side mirror).
// API 응답에는 boardLayout 이 포함되니 동일 규칙으로 재계산.
//   - 주제별(layout=columns): "{보드 제목} · {칼럼 제목}"
//   - 그 외 layout: "{보드 제목}"
// 사용자 명시 사양 ("주제별보드가 아니라면 주제는 생략").

export function buildSourceLabel(args: {
  boardTitle: string;
  boardLayout: string;
  sectionTitle: string | null;
}): string {
  if (args.boardLayout === "columns" && args.sectionTitle) {
    return `${args.boardTitle} · ${args.sectionTitle}`;
  }
  return args.boardTitle;
}
