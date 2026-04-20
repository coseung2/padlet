import { describe, it, expect, beforeAll } from "vitest";

describe("vibe-arcade play-token HMAC", () => {
  beforeAll(() => {
    process.env.PLAYTOKEN_JWT_SECRET = "test_secret_32chars_minimum_please_ok";
  });

  it("issues a verifiable token", async () => {
    const { issuePlayToken, verifyPlayToken } = await import("../vibe-arcade/play-token");
    const token = issuePlayToken("project_123", "playsession_abc");
    const check = verifyPlayToken(token);
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.projectId).toBe("project_123");
      expect(check.playSessionId).toBe("playsession_abc");
    }
  });

  it("rejects a tampered signature", async () => {
    const { issuePlayToken, verifyPlayToken } = await import("../vibe-arcade/play-token");
    const token = issuePlayToken("project_x", "ps_x");
    const [payload] = token.split(".");
    const tampered = `${payload}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    const check = verifyPlayToken(tampered);
    expect(check.ok).toBe(false);
  });

  it("rejects malformed input", async () => {
    const { verifyPlayToken } = await import("../vibe-arcade/play-token");
    expect(verifyPlayToken("no-dot-here").ok).toBe(false);
  });
});
