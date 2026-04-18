"use client";

/**
 * useInViewport — thin IntersectionObserver wrapper.
 *
 * Returns `true` while the observed element intersects the viewport
 * (root = null), and immediately flips to `false` once it leaves. The
 * iframe budget relies on aggressive unmount on exit, so we intentionally
 * do NOT add rootMargin expansion or hysteresis — we want the iframe gone
 * as soon as the card scrolls off-screen.
 *
 * SSR: returns `false` initially (matches server snapshot), then flips
 * after the IO fires on mount. This is safe because the iframe branch is
 * gated on both `inView` and `isActive`, and neither is true on first
 * paint.
 */

import { useEffect, useState, type RefObject } from "react";

export type UseInViewportOptions = {
  /** Optional IO threshold. Defaults to 0 (any pixel visible counts). */
  threshold?: number | number[];
  /** Optional IO rootMargin. Defaults to "0px". */
  rootMargin?: string;
  /** If true, disconnects the observer after the first true reading. Useful for one-shot activation. */
  once?: boolean;
};

export function useInViewport<T extends Element>(
  ref: RefObject<T | null>,
  options: UseInViewportOptions = {},
): boolean {
  const { threshold = 0, rootMargin = "0px", once = false } = options;
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Guard for environments without IntersectionObserver (jsdom, old
    // browsers). Default to "in view" so feature still works but loses
    // virtualization benefit gracefully.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const next = entry.isIntersecting;
        setInView(next);
        if (next && once) observer.disconnect();
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
    // `ref` is stable (returned by useRef), so deps list only the primitive
    // options. Array threshold should be memoised by caller if used.
  }, [ref, threshold, rootMargin, once]);

  return inView;
}
