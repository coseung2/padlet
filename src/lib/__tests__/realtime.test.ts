/**
 * Unit spec — realtime channel key helpers (Breakout T0-①).
 * Run: `npx tsx src/lib/__tests__/realtime.test.ts`
 */
import { boardChannelKey, sectionChannelKey } from "../realtime";

let passed = 0;
let failed = 0;
const fails: string[] = [];

function expectEqual(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    fails.push(`${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function expectThrows(label: string, fn: () => unknown) {
  try {
    fn();
    failed++;
    fails.push(`${label} — expected throw, but returned normally`);
  } catch {
    passed++;
  }
}

expectEqual("boardChannelKey basic", boardChannelKey("b_demo"), "board:b_demo");
expectEqual(
  "sectionChannelKey basic",
  sectionChannelKey("b1", "s1"),
  "board:b1:section:s1"
);
expectEqual(
  "sectionChannelKey tolerates cuid-looking ids",
  sectionChannelKey("cl123", "cl456"),
  "board:cl123:section:cl456"
);

expectThrows("boardChannelKey rejects blank", () => boardChannelKey(""));
expectThrows("sectionChannelKey rejects blank boardId", () => sectionChannelKey("", "s1"));
expectThrows("sectionChannelKey rejects blank sectionId", () => sectionChannelKey("b1", ""));

console.log(`realtime specs: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  for (const msg of fails) console.error("FAIL:", msg);
  process.exit(1);
}
