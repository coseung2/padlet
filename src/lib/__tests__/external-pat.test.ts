/**
 * Lightweight unit-ish tests for external-pat (Seed 8 CR-10).
 *
 * Runs without a real DB — only pure helpers (hashSecret, parseBearer,
 * token regex). Execute:
 *
 *   AURA_PAT_PEPPER=$(openssl rand -hex 32) npx tsx src/lib/__tests__/external-pat.test.ts
 */
import { strict as assert } from "assert";
import {
  TOKEN_REGEX,
  TOKEN_FULL_PREFIX,
  TOKEN_PREFIX_LEN,
  TOKEN_SECRET_LEN,
  parseBearer,
  __test__,
} from "../external-pat";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}:`, e);
    process.exitCode = 1;
  }
}

// Regex shape ------------------------------------------------------------
run("regex accepts valid format", () => {
  const good = "aurapat_ABCD1234_" + "a".repeat(TOKEN_SECRET_LEN);
  assert.ok(TOKEN_REGEX.test(good));
});
run("regex rejects bad prefix length", () => {
  const bad = "aurapat_ABCD123_" + "a".repeat(TOKEN_SECRET_LEN); // 7-char prefix
  assert.ok(!TOKEN_REGEX.test(bad));
});
run("regex rejects bad secret length", () => {
  const bad = "aurapat_ABCD1234_" + "a".repeat(TOKEN_SECRET_LEN - 1);
  assert.ok(!TOKEN_REGEX.test(bad));
});
run("regex rejects legacy format", () => {
  assert.ok(!TOKEN_REGEX.test("aura_pat_deadbeef"));
});

// parseBearer -----------------------------------------------------------
run("parseBearer splits prefix/secret correctly", () => {
  const secret = "x".repeat(TOKEN_SECRET_LEN);
  const header = `Bearer aurapat_ABCD1234_${secret}`;
  const out = parseBearer(header);
  assert.ok(out);
  assert.equal(out.prefix.length, TOKEN_PREFIX_LEN);
  assert.equal(out.secret, secret);
});
run("parseBearer rejects bad header", () => {
  assert.equal(parseBearer(null), null);
  assert.equal(parseBearer("not-a-bearer"), null);
  assert.equal(parseBearer("Bearer oops"), null);
});

// generateSecret shape --------------------------------------------------
run("generateSecret produces valid format", () => {
  const g = __test__.generateSecret();
  assert.ok(g.full.startsWith(TOKEN_FULL_PREFIX));
  assert.ok(TOKEN_REGEX.test(g.full), `got ${g.full}`);
  assert.equal(g.prefix.length, TOKEN_PREFIX_LEN);
  assert.equal(g.secret.length, TOKEN_SECRET_LEN);
});

// hashSecret determinism ------------------------------------------------
run("hashSecret is deterministic within a process", () => {
  const s = "a".repeat(TOKEN_SECRET_LEN);
  const h1 = __test__.hashSecret(s);
  const h2 = __test__.hashSecret(s);
  assert.equal(h1, h2);
});

// Dummy hash exists -----------------------------------------------------
run("DUMMY_HASH is stable non-empty", () => {
  assert.ok(typeof __test__.DUMMY_HASH === "string");
  assert.equal(__test__.DUMMY_HASH.length, 64); // sha256 hex
});

console.log("\ndone");
