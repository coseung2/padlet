// 챗 응답에서 ```html ...```, ```css ...```, ```js ...``` 블록을 찾아
// 마지막 것으로 html/css/js state 를 세팅. 학생은 탭 없이 챗만 쓰니
// 자동 반영이 필수 (수동 복붙 경로가 사라졌음).
export function extractCodeBlocks(text: string): {
  html?: string;
  css?: string;
  js?: string;
} {
  const blocks: { html?: string; css?: string; js?: string } = {};
  const re = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const lang = (m[1] ?? "").toLowerCase();
    const body = m[2].replace(/\n$/, "");
    if (lang.startsWith("html") || lang === "htm") blocks.html = body;
    else if (lang === "css") blocks.css = body;
    else if (
      lang === "js" ||
      lang === "javascript" ||
      lang === "mjs" ||
      lang === "jsx"
    )
      blocks.js = body;
  }
  if (!blocks.html && /<!doctype html|<html[\s>]/i.test(text)) {
    const m2 = text.match(
      /<!doctype html[\s\S]*?<\/html\s*>|<html[\s\S]*?<\/html\s*>/i
    );
    if (m2) blocks.html = m2[0];
  }
  return blocks;
}
