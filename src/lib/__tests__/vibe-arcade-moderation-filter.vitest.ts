import { describe, it, expect } from "vitest";
import { scanText, scanHtml } from "../vibe-arcade/moderation-filter";

describe("scanText — profanity + PII", () => {
  it("passes clean Korean sentence", () => {
    expect(scanText("안녕하세요. 오늘의 틱택토 게임을 만들래요.").pass).toBe(true);
  });

  it("catches a profanity hit", () => {
    const r = scanText("이 게임은 씨발 너무 어려워");
    expect(r.pass).toBe(false);
    expect(r.hits.some((h) => h.kind === "profanity")).toBe(true);
  });

  it("catches a Korean phone number", () => {
    const r = scanText("전화번호 010-1234-5678 이예요");
    expect(r.pass).toBe(false);
    expect(r.hits.some((h) => h.kind === "pii" && h.detail.startsWith("phone_kr"))).toBe(true);
  });

  it("catches an email address", () => {
    const r = scanText("메일 alice@example.com 주세요");
    expect(r.pass).toBe(false);
    expect(r.hits.some((h) => h.kind === "pii" && h.detail.startsWith("email"))).toBe(true);
  });

  it("catches an RRN pattern", () => {
    const r = scanText("주민번호 123456-1234567");
    expect(r.pass).toBe(false);
    expect(r.hits.some((h) => h.kind === "pii" && h.detail.startsWith("rrn_kr"))).toBe(true);
  });
});

describe("scanHtml — unsafe tags + schemes + external origins", () => {
  it("passes a simple inline HTML artifact", () => {
    const html = "<!doctype html><html><body><h1>hi</h1><script>alert(1)</script></body></html>";
    const r = scanHtml(html);
    expect(r.pass).toBe(true);
  });

  it("rejects <iframe>", () => {
    const r = scanHtml("<!doctype html><body><iframe src='x'></iframe></body>");
    expect(r.pass).toBe(false);
    expect(r.hits.some((h) => h.kind === "html_tag" && h.detail === "iframe")).toBe(true);
  });

  it("rejects javascript: scheme", () => {
    const r = scanHtml("<a href='javascript:alert(1)'>x</a>");
    expect(r.pass).toBe(false);
    expect(r.hits.some((h) => h.kind === "js_scheme")).toBe(true);
  });

  it("rejects off-whitelist external URL", () => {
    const r = scanHtml(`<script src="https://evil.example/x.js"></script>`);
    expect(r.pass).toBe(false);
    expect(r.hits.some((h) => h.kind === "external_url")).toBe(true);
  });

  it("accepts whitelisted CDN (jsdelivr, cdnjs, unpkg)", () => {
    const html = `
      <script src="https://cdn.jsdelivr.net/npm/foo@1"></script>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/foo/1/x.css">
      <script src="https://unpkg.com/foo@1"></script>`;
    const r = scanHtml(html);
    expect(r.hits.some((h) => h.kind === "external_url")).toBe(false);
  });
});
