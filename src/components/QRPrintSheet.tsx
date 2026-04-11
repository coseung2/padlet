"use client";

import { useState } from "react";

type Student = {
  id: string;
  name: string;
  qrToken: string;
  textCode: string;
};

type Props = {
  students: Student[];
  classroomName: string;
};

export function QRPrintSheet({ students, classroomName }: Props) {
  const [generating, setGenerating] = useState(false);

  async function handlePrint() {
    if (students.length === 0) {
      alert("출력할 학생이 없습니다.");
      return;
    }

    setGenerating(true);
    try {
      const [{ default: jsPDF }, QRCode] = await Promise.all([
        import("jspdf"),
        import("qrcode"),
      ]);

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = 210;
      const pageHeight = 297;
      const cols = 5;
      const rows = 6;
      const perPage = cols * rows;

      const cardW = 36;
      const cardH = 42;
      const marginX = (pageWidth - cols * cardW) / 2;
      const marginY = 20;
      const qrSize = 24;

      // Generate all QR data URLs
      const qrDataUrls = await Promise.all(
        students.map((s) => {
          const url = `${window.location.origin}/qr/${s.qrToken}`;
          return QRCode.toDataURL(url, { width: 200, margin: 1 });
        })
      );

      const totalPages = Math.ceil(students.length / perPage);
      const dateStr = new Date().toLocaleDateString("ko-KR");

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) doc.addPage();

        // Header
        doc.setFontSize(12);
        doc.text(`${classroomName} - QR 카드`, pageWidth / 2, 10, {
          align: "center",
        });
        doc.setFontSize(8);
        doc.text(dateStr, pageWidth / 2, 15, { align: "center" });

        const startIdx = page * perPage;
        const endIdx = Math.min(startIdx + perPage, students.length);

        for (let i = startIdx; i < endIdx; i++) {
          const pos = i - startIdx;
          const col = pos % cols;
          const row = Math.floor(pos / cols);

          const x = marginX + col * cardW;
          const y = marginY + row * cardH;

          // Card border
          doc.setDrawColor(200);
          doc.setLineWidth(0.3);
          doc.rect(x + 1, y + 1, cardW - 2, cardH - 2);

          // QR image
          const qrX = x + (cardW - qrSize) / 2;
          doc.addImage(qrDataUrls[i], "PNG", qrX, y + 2, qrSize, qrSize);

          // Student name
          doc.setFontSize(7);
          doc.text(students[i].name, x + cardW / 2, y + qrSize + 5, {
            align: "center",
          });

          // Text code
          doc.setFontSize(6);
          doc.text(students[i].textCode, x + cardW / 2, y + qrSize + 9, {
            align: "center",
          });
        }
      }

      doc.save(`${classroomName}_QR카드.pdf`);
    } catch (err) {
      console.error("PDF 생성 실패:", err);
      alert("PDF 생성에 실패했습니다.");
    }
    setGenerating(false);
  }

  return (
    <button
      type="button"
      className="classroom-action-btn classroom-action-btn-print"
      onClick={handlePrint}
      disabled={generating || students.length === 0}
    >
      {generating ? "생성 중..." : "QR 카드 출력"}
    </button>
  );
}
