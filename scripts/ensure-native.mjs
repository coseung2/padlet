#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname } from "node:path";

// Vercel/CI 는 매 빌드가 fresh 컨테이너라 OS 변경 감지가 불필요하고,
// NODE_ENV=production 상태에서 npm install 을 재실행하면 devDependencies
// 가 제거되어 TypeScript 빌드가 깨진다. 로컬 왕복에만 필요한 안전장치.
if (process.env.VERCEL || process.env.CI) process.exit(0);

const STAMP = "node_modules/.native-os";
const current = `${process.platform}-${process.arch}`;

if (!existsSync("node_modules")) {
  console.log(`[ensure-native] node_modules 없음 → npm install 먼저 돌려주세요.`);
  process.exit(0);
}

const prev = existsSync(STAMP) ? readFileSync(STAMP, "utf8").trim() : null;

if (prev === current) process.exit(0);

console.log(
  `[ensure-native] OS/arch ${prev ?? "(없음)"} → ${current}. npm install 실행...`
);
// npm rebuild 가 아니라 npm install — sharp/rollup/swc 처럼 OS별
// optional dependency 로 바이너리를 분리하는 패키지는 rebuild 만으로는
// 현재 OS용 optional 이 재선택되지 않는다.
execSync("npm install", { stdio: "inherit" });
mkdirSync(dirname(STAMP), { recursive: true });
writeFileSync(STAMP, current);
console.log(`[ensure-native] 완료.`);
