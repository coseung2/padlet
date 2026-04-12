// Reproduces bundle-size numbers in phase1/research_pack.md §4.
// For each candidate package, builds a minified ESM browser bundle with
// esbuild and reports min+gzip size.
//
// Usage: node bench.mjs
// Requires: npm install (installs yjs, y-websocket, @liveblocks/client, socket.io-client, esbuild)

import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const packages = [
  "yjs",
  "y-websocket",
  "@liveblocks/client",
  "socket.io-client",
];

const dir = mkdtempSync(join(tmpdir(), "rt-bundle-"));
const results = [];

for (const pkg of packages) {
  const entry = join(dir, "entry.js");
  const out = join(dir, "out.js");
  writeFileSync(entry, `import * as x from "${pkg}"; globalThis.__x = x;\n`);
  await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    outfile: out,
    logLevel: "silent",
    nodePaths: [join(process.cwd(), "node_modules")],
  });
  const raw = readFileSync(out);
  const gz = gzipSync(raw);
  results.push({
    package: pkg,
    min_bytes: raw.length,
    min_gz_bytes: gz.length,
    min_gz_kb: +(gz.length / 1024).toFixed(1),
  });
}

rmSync(dir, { recursive: true, force: true });
console.log(JSON.stringify({ measured_at: new Date().toISOString(), results }, null, 2));
