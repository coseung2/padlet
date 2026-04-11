"use client";

import { useState, useEffect } from "react";

type Props = {
  student: {
    id: string;
    name: string;
    qrToken: string;
    textCode: string;
  };
  size?: number;
};

export function StudentQRCard({ student, size = 160 }: Props) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      const url = `${window.location.origin}/qr/${student.qrToken}`;
      QRCode.toDataURL(url, { width: size, margin: 2 }).then((dataUrl) => {
        if (!cancelled) setQrSrc(dataUrl);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [student.qrToken, size]);

  return (
    <div className="student-qr-card">
      <div className="student-qr-image-wrap">
        {qrSrc ? (
          <img
            src={qrSrc}
            alt={`${student.name} QR 코드`}
            className="student-qr-image"
            width={size}
            height={size}
          />
        ) : (
          <div className="student-qr-placeholder" />
        )}
      </div>
      <div className="student-qr-name">{student.name}</div>
      <code className="student-qr-text-code">{student.textCode}</code>
    </div>
  );
}
