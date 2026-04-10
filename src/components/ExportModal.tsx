"use client";

import { useState, useEffect } from "react";
import type { CardData } from "./DraggableCard";

type Props = {
  sectionTitle: string;
  cards: CardData[];
  onClose: () => void;
};

type DesignInfo = {
  cardId: string;
  linkUrl: string;
  title: string;
  pageCount: number | null;
  thumbnail: string | null;
  status: "loading" | "ready" | "error";
};

export function ExportModal({ sectionTitle, cards, onClose }: Props) {
  const canvaCards = cards.filter(
    (c) => c.linkUrl && (c.linkUrl.includes("canva.link") || c.linkUrl.includes("canva.com"))
  );
  const [designs, setDesigns] = useState<DesignInfo[]>(
    canvaCards.map((c) => ({
      cardId: c.id,
      linkUrl: c.linkUrl!,
      title: c.linkTitle || c.title,
      pageCount: null,
      thumbnail: c.linkImage || null,
      status: "loading" as const,
    }))
  );
  const [selected, setSelected] = useState<Set<string>>(new Set(canvaCards.map((c) => c.id)));
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState("");

  // Fetch accurate design info from Canva API on mount
  useEffect(() => {
    async function fetchDesignInfo() {
      for (let i = 0; i < canvaCards.length; i++) {
        const card = canvaCards[i];
        try {
          // Resolve shortlink first
          const resolveRes = await fetch(
            `/api/export/resolve-canva?url=${encodeURIComponent(card.linkUrl!)}`
          );
          if (!resolveRes.ok) throw new Error("resolve failed");
          const { designId } = await resolveRes.json();
          if (!designId) throw new Error("no design ID");

          // Get design info via Canva API
          const infoRes = await fetch(`/api/canva/design/${designId}`);
          if (infoRes.ok) {
            const { design } = await infoRes.json();
            setDesigns((prev) =>
              prev.map((d) =>
                d.cardId === card.id
                  ? {
                      ...d,
                      title: design.title,
                      pageCount: design.pageCount,
                      thumbnail: design.thumbnail?.url || d.thumbnail,
                      status: "ready" as const,
                    }
                  : d
              )
            );
          } else {
            // Canva not connected — use OG data
            setDesigns((prev) =>
              prev.map((d) =>
                d.cardId === card.id ? { ...d, status: "ready" as const } : d
              )
            );
          }
        } catch {
          setDesigns((prev) =>
            prev.map((d) =>
              d.cardId === card.id ? { ...d, status: "error" as const } : d
            )
          );
        }
      }
    }
    fetchDesignInfo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalPages = designs
    .filter((d) => selected.has(d.cardId) && d.pageCount)
    .reduce((sum, d) => sum + (d.pageCount ?? 0), 0);

  async function handleExport() {
    const selectedCards = canvaCards.filter((c) => selected.has(c.id));
    if (selectedCards.length === 0) return;

    setExporting(true);
    setProgress(`${selectedCards.length}개 디자인 PDF 내보내는 중...`);

    try {
      const urls = selectedCards.map((c) => c.linkUrl!);
      const res = await fetch("/api/export/canva-pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "unknown" }));
        if (data.error === "canva_not_connected" || data.error === "canva_token_expired") {
          if (window.confirm("Canva 계정 연결이 필요합니다. 지금 연결할까요?")) {
            window.location.href = "/api/auth/canva";
          }
          setExporting(false);
          setProgress("");
          return;
        }
        alert(`내보내기 실패: ${data.message || data.error}`);
        setExporting(false);
        setProgress("");
        return;
      }

      setProgress("PDF 다운로드 중...");
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${sectionTitle}_export.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setProgress("완료!");
      setTimeout(onClose, 1500);
    } catch (err) {
      console.error(err);
      alert("내보내기 중 오류가 발생했습니다.");
      setExporting(false);
      setProgress("");
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={exporting ? undefined : onClose} />
      <div className="add-card-modal export-modal">
        <div className="modal-header">
          <h2 className="modal-title">{sectionTitle} — PDF 내보내기</h2>
          <button type="button" className="modal-close" onClick={onClose} disabled={exporting}>×</button>
        </div>

        <div className="modal-body">
          {canvaCards.length === 0 ? (
            <p className="export-hint">이 섹션에 Canva 링크가 있는 카드가 없습니다.</p>
          ) : (
            <>
              <p className="export-summary">
                Canva 디자인 {selected.size}개 선택
                {totalPages > 0 && ` · 총 ${totalPages}페이지`}
              </p>

              <div className="export-design-list">
                {designs.map((d) => (
                  <label
                    key={d.cardId}
                    className={`export-design-item ${selected.has(d.cardId) ? "ready" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(d.cardId)}
                      onChange={() => toggle(d.cardId)}
                      disabled={exporting}
                      className="export-item-check"
                    />
                    {d.thumbnail && (
                      <img src={d.thumbnail} alt="" className="export-design-thumb" />
                    )}
                    <div className="export-design-info">
                      <div className="export-design-title">{d.title}</div>
                      <div className="export-design-meta">
                        {d.status === "loading" && "디자인 정보 가져오는 중..."}
                        {d.status === "ready" && (d.pageCount ? `${d.pageCount}페이지` : "준비됨")}
                        {d.status === "error" && "정보 가져오기 실패"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {progress && <div className="export-ready-msg">{progress}</div>}

              <div className="modal-actions">
                <button type="button" onClick={onClose} disabled={exporting} className="modal-btn-cancel">
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting || selected.size === 0}
                  className="modal-btn-submit"
                >
                  {exporting ? "내보내는 중..." : `PDF 내보내기 (${selected.size})`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
