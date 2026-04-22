"use client";

// 앱 전체 이모지를 Twemoji SVG로 렌더링.
// 윈도우 Segoe/Noto 비일관성을 제거하고 크로스 플랫폼 동일한 모양으로 통일.
//
// 동작 방식:
//   1) 마운트 시 Twemoji IIFE 스크립트를 CDN에서 한 번 로드(window.twemoji 주입)
//   2) pathname 바뀔 때마다 document.body 재파싱
//   3) 동적으로 주입되는 이모지(모달·SSE 스트림 등)를 위해 MutationObserver로
//      requestIdleCallback 래핑한 debounced 재파싱
//
// Twemoji가 텍스트 노드에서 찾은 이모지를 <img class="emoji"> 로 교체하므로
// 이미 교체된 이미지는 스캔에서 제외돼 무한 루프가 생기지 않는다.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    twemoji?: {
      parse: (
        el: HTMLElement | Document,
        options?: { base?: string; folder?: string; ext?: string; className?: string },
      ) => void;
    };
  }
}

const TWEMOJI_JS =
  "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/twemoji.min.js";
// jdecked 커뮤니티 포크 — jsDelivr GitHub 라우트. 트위터 원본이 MaxCDN 만료 후에도 사용 가능.
const TWEMOJI_ASSETS_BASE =
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/";

let loaderPromise: Promise<void> | null = null;

function loadTwemoji(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.twemoji) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TWEMOJI_JS;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => {
      loaderPromise = null;
      reject(new Error("twemoji load failed"));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

function parseBody() {
  if (!window.twemoji) return;
  window.twemoji.parse(document.body, {
    base: TWEMOJI_ASSETS_BASE,
    folder: "svg",
    ext: ".svg",
    className: "emoji",
  });
}

export function TwemojiRoot() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let pending = false;

    async function kick() {
      try {
        await loadTwemoji();
        if (cancelled) return;
        parseBody();
      } catch (err) {
        // 로드 실패 — 플랫폼 기본 이모지로 fallback (noop)
        if (process.env.NODE_ENV !== "production") {
          console.warn("[twemoji]", err);
        }
      }
    }

    void kick();

    // 동적으로 추가되는 노드(모달, SSE 스트림 등)를 위해 body 변이 감시.
    // rAF로 debounce — Twemoji가 img를 삽입하면서 트리거되는 재귀를 막는다.
    const schedule = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (!cancelled) parseBody();
      });
    };

    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        // Twemoji 자체가 주입한 <img class="emoji">만 변한 경우엔 재파싱할 필요 없음.
        if (
          m.type === "childList" &&
          Array.from(m.addedNodes).every(
            (n) => n instanceof HTMLImageElement && n.classList.contains("emoji"),
          )
        ) {
          continue;
        }
        schedule();
        break;
      }
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [pathname]);

  return null;
}
