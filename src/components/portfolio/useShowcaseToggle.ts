"use client";

import { useState, useCallback } from "react";
import type { PortfolioCardDTO } from "@/lib/portfolio-dto";

// student-portfolio (2026-04-26): 자랑해요 토글 훅. 낙관적 업데이트 + 한도
// 초과 (409) 시 모달 노출용 state 반환. 호출자가 ShowcaseLimitModal 을
// 직접 렌더한다.
//
// 사용 예:
//   const { toggle, limitModal, dismissLimit, busy } = useShowcaseToggle({
//     onAfterToggle: (cardId, on) => updateLocalCard(cardId, on),
//   });
//   toggle(card);   // ON 또는 OFF (현재 isShowcasedByMe 기준)

type LimitModalState = {
  cardId: string;          // 시도하던 새 카드
  showcased: PortfolioCardDTO[];   // 현재 등록된 자랑해요 (서버 응답)
};

export function useShowcaseToggle(args: {
  /** 토글 성공 후 호출 — 호출자가 자기 state 갱신 */
  onAfterToggle: (cardId: string, on: boolean) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);  // 진행 중 cardId
  const [limitModal, setLimitModal] = useState<LimitModalState | null>(null);

  const toggle = useCallback(
    async (card: { id: string; isShowcasedByMe: boolean }) => {
      if (busy === card.id) return;
      setBusy(card.id);
      try {
        if (card.isShowcasedByMe) {
          // OFF
          const res = await fetch(
            `/api/showcase?cardId=${encodeURIComponent(card.id)}`,
            { method: "DELETE" }
          );
          if (res.ok || res.status === 404) {
            args.onAfterToggle(card.id, false);
          } else {
            console.error("[useShowcaseToggle DELETE]", res.status);
          }
          return;
        }
        // ON
        const res = await fetch("/api/showcase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.id }),
        });
        if (res.status === 201) {
          args.onAfterToggle(card.id, true);
          return;
        }
        if (res.status === 409) {
          const body = (await res.json().catch(() => ({}))) as {
            showcased?: PortfolioCardDTO[];
          };
          setLimitModal({
            cardId: card.id,
            showcased: body.showcased ?? [],
          });
          return;
        }
        console.error("[useShowcaseToggle POST]", res.status);
      } finally {
        setBusy(null);
      }
    },
    [busy, args]
  );

  /** 한도 모달에서 사용자가 1개 선택 → 그 카드 OFF + 새 카드 ON 재시도 */
  const replaceWith = useCallback(
    async (removeCardId: string) => {
      if (!limitModal) return;
      setBusy(limitModal.cardId);
      try {
        const delRes = await fetch(
          `/api/showcase?cardId=${encodeURIComponent(removeCardId)}`,
          { method: "DELETE" }
        );
        if (!delRes.ok && delRes.status !== 404) {
          console.error("[useShowcaseToggle replace DELETE]", delRes.status);
          return;
        }
        args.onAfterToggle(removeCardId, false);
        const addRes = await fetch("/api/showcase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: limitModal.cardId }),
        });
        if (addRes.status === 201) {
          args.onAfterToggle(limitModal.cardId, true);
          setLimitModal(null);
        } else {
          console.error("[useShowcaseToggle replace POST]", addRes.status);
        }
      } finally {
        setBusy(null);
      }
    },
    [limitModal, args]
  );

  const dismissLimit = useCallback(() => setLimitModal(null), []);

  return { toggle, busy, limitModal, replaceWith, dismissLimit };
}
