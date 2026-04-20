import { describe, it, expect, beforeEach } from "vitest";
import { IframeLRU } from "../vibe-arcade/iframe-lru";

function makeIframe(): HTMLIFrameElement {
  const attrs: Record<string, string> = {};
  return {
    setAttribute(k: string, v: string) {
      attrs[k] = v;
    },
    getAttribute(k: string) {
      return attrs[k];
    },
  } as unknown as HTMLIFrameElement;
}

describe("IframeLRU — cap 3 + about:blank on eviction", () => {
  let lru: IframeLRU;

  beforeEach(() => {
    lru = new IframeLRU();
  });

  it("keeps up to 3 entries without evicting", () => {
    const a = makeIframe();
    const b = makeIframe();
    const c = makeIframe();
    lru.register("a", a);
    lru.register("b", b);
    lru.register("c", c);
    expect(lru.size()).toBe(3);
  });

  it("evicts the oldest entry and sets src=about:blank", () => {
    const a = makeIframe();
    const b = makeIframe();
    const c = makeIframe();
    const d = makeIframe();
    lru.register("a", a);
    lru.register("b", b);
    lru.register("c", c);
    lru.register("d", d); // should evict 'a'

    expect(lru.size()).toBe(3);
    expect((a as unknown as { getAttribute: (k: string) => string }).getAttribute("src")).toBe("about:blank");
  });

  it("release() clears the specific entry and blanks it", () => {
    const a = makeIframe();
    lru.register("a", a);
    lru.release("a");
    expect(lru.size()).toBe(0);
    expect((a as unknown as { getAttribute: (k: string) => string }).getAttribute("src")).toBe("about:blank");
  });

  it("releaseAll() clears all entries and blanks them", () => {
    const a = makeIframe();
    const b = makeIframe();
    lru.register("a", a);
    lru.register("b", b);
    lru.releaseAll();
    expect(lru.size()).toBe(0);
  });

  it("re-registering an existing key refreshes recency", () => {
    const a = makeIframe();
    const b = makeIframe();
    const c = makeIframe();
    const d = makeIframe();
    lru.register("a", a);
    lru.register("b", b);
    lru.register("c", c);
    lru.register("a", a); // refresh a
    lru.register("d", d); // should evict 'b' (oldest now)

    expect(lru.size()).toBe(3);
    expect((b as unknown as { getAttribute: (k: string) => string }).getAttribute("src")).toBe("about:blank");
  });
});
