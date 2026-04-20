// Vibe-arcade iframe LRU manager (Seed 13 · Seed 5 승계, AC-N3).
// 동시 마운트 iframe 최대 3개. 새 마운트 요청 시 가장 오래된 것을 about:blank 언마운트.
// 카탈로그 iframe 0 원칙은 호출 측(Catalog 컴포넌트)에서 준수.

export type SandboxIframeHandle = {
  key: string;
  el: HTMLIFrameElement;
  mountedAt: number;
};

const CAP = 3;

export class IframeLRU {
  private entries = new Map<string, SandboxIframeHandle>();

  register(key: string, el: HTMLIFrameElement): void {
    if (this.entries.has(key)) {
      // Refresh recency by reinserting.
      this.entries.delete(key);
    }
    this.entries.set(key, { key, el, mountedAt: Date.now() });
    this.evictIfOverCap();
  }

  release(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.blankAndDetach(entry.el);
    this.entries.delete(key);
  }

  releaseAll(): void {
    for (const [, entry] of this.entries) this.blankAndDetach(entry.el);
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }

  private evictIfOverCap(): void {
    while (this.entries.size > CAP) {
      const next = this.entries.entries().next();
      if (next.done) break;
      const [oldestKey, entry] = next.value;
      this.blankAndDetach(entry.el);
      this.entries.delete(oldestKey);
    }
  }

  private blankAndDetach(el: HTMLIFrameElement): void {
    try {
      el.setAttribute("src", "about:blank");
    } catch {
      /* Detached element — ignore. */
    }
  }
}

// Module-level singleton. Survives React re-mounts within the same page.
export const iframeLru = new IframeLRU();
