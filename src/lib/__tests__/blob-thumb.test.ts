/**
 * Plain runner (no Jest/Vitest) — `npx tsx src/lib/__tests__/blob-thumb.test.ts`.
 * Pattern matches src/lib/__tests__/card-author.test.ts.
 *
 * sharp is not mockable, so we drive an actual PNG buffer through the
 * resize helper and assert the WebP magic number on the output. A 2×2
 * solid-colour PNG is enough — sharp will upscale to 160×120 WebP.
 *
 * blob.ts starts with `import "server-only"` which throws when loaded
 * outside a Next.js server build. Under the plain tsx runner we stub the
 * package via require.cache before importing blob.ts so the import chain
 * resolves cleanly.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _serverOnlyPath = require.resolve("server-only");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(require.cache as any)[_serverOnlyPath] = {
  id: _serverOnlyPath,
  filename: _serverOnlyPath,
  loaded: true,
  exports: {},
  children: [],
  paths: [],
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resizeBufferToWebP } = require("../blob") as typeof import("../blob");

let passed = 0;
let failed = 0;
const fails: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) passed++;
  else {
    failed++;
    fails.push(
      `${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
    );
  }
}

// 2×2 red PNG, base64 (smallest self-contained test fixture).
const PNG_2x2 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJRAQHXw0H6AAAAAElFTkSuQmCC",
  "base64",
);

async function runBlobThumbSpecs() {
  const out = await resizeBufferToWebP(PNG_2x2);

  // WebP: bytes 0-3 "RIFF", 8-11 "WEBP".
  check("RIFF header present", out.slice(0, 4).toString("ascii"), "RIFF");
  check("WEBP marker present", out.slice(8, 12).toString("ascii"), "WEBP");
  check("output is non-empty", out.byteLength > 0, true);

  console.log(`blob-thumb specs: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    for (const msg of fails) console.error("FAIL:", msg);
    process.exit(1);
  }
}

runBlobThumbSpecs().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
