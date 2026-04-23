#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname } from "node:path";

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
