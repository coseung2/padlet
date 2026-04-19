"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  card: { id: string; cardNumber: string; status: string };
};

export function WalletCardQR({ card }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const fetchRef = useRef(false);

  const fetchToken = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const res = await fetch("/api/my/wallet/card-qr", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { token: string; expiresAt: number };
      setToken(data.token);
      setExpiresAt(data.expiresAt);
      // Generate QR image
      const { default: QRCode } = await import("qrcode");
      const url = await QRCode.toDataURL(data.token, { width: 220, margin: 1 });
      setQrDataUrl(url);
    } finally {
      fetchRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Tick progress every 200ms, refetch on expiry
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => {
      const remaining = expiresAt - Math.floor(Date.now() / 1000);
      if (remaining <= 0) {
        fetchToken();
      } else {
        setProgress((60 - remaining) / 60);
      }
    }, 200);
    return () => clearInterval(t);
  }, [expiresAt, fetchToken]);

  // Pause on hidden tab, resume on visible
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible") {
        fetchToken();
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchToken]);

  async function handleCopy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard denied — surface token as fallback
    }
  }

  return (
    <div className="wallet-card-qr">
      <header className="wallet-card-header">
        <h3>내 카드</h3>
        <span className="wallet-card-number">{card.cardNumber}</span>
      </header>

      <div
        className="wallet-qr-frame"
        role="img"
        aria-label={`카드 QR 코드. ${Math.max(0, expiresAt - Math.floor(Date.now() / 1000))}초 후 갱신됩니다.`}
      >
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="" width={220} height={220} />
        ) : (
          <div className="wallet-qr-skeleton" />
        )}
      </div>

      <div className="wallet-qr-timer">
        <div
          className="wallet-qr-timer-bar"
          style={{ width: `${progress * 100}%` }}
        />
        <div className="wallet-qr-timer-label">
          {Math.max(0, expiresAt - Math.floor(Date.now() / 1000))}초 뒤 새 QR
        </div>
      </div>

      <button
        type="button"
        className="wallet-qr-copy"
        onClick={handleCopy}
        disabled={!token}
      >
        {copied ? "복사됨!" : "토큰 복사"}
      </button>
      <p className="wallet-qr-help">
        매점원이 QR을 스캔하거나 토큰을 붙여넣어 결제합니다.
      </p>
    </div>
  );
}
