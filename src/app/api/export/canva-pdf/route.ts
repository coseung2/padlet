import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getCurrentUser } from "@/lib/auth";
import {
  getAccessToken,
  isCanvaConnected,
  canvaExportDesign,
  resolveCanvaDesignId,
} from "@/lib/canva";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    // Check Canva connection
    if (!isCanvaConnected(user.id)) {
      return NextResponse.json(
        { error: "canva_not_connected", message: "Canva 계정을 연결해주세요." },
        { status: 401 }
      );
    }

    const token = await getAccessToken(user.id);
    if (!token) {
      return NextResponse.json(
        { error: "canva_token_expired", message: "Canva 인증이 만료되었습니다. 다시 연결해주세요." },
        { status: 401 }
      );
    }

    const { urls } = await req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
    }

    // 1. Resolve all Canva URLs to design IDs
    const designIds: string[] = [];
    for (const url of urls) {
      const id = await resolveCanvaDesignId(url);
      if (id) designIds.push(id);
    }

    if (designIds.length === 0) {
      return NextResponse.json({ error: "No valid Canva designs found" }, { status: 422 });
    }

    // 2. Export each design as PDF via Canva API
    const pdfUrls: string[] = [];
    for (const designId of designIds) {
      try {
        const exportUrls = await canvaExportDesign(token, designId, "pdf");
        pdfUrls.push(...exportUrls);
      } catch (e) {
        console.error(`[Export] Design ${designId} failed:`, e);
      }
    }

    if (pdfUrls.length === 0) {
      return NextResponse.json({ error: "All exports failed" }, { status: 500 });
    }

    // 3. Download and merge PDFs
    const mergedPdf = await PDFDocument.create();

    for (const pdfUrl of pdfUrls) {
      try {
        const res = await fetch(pdfUrl);
        if (!res.ok) continue;
        const buffer = await res.arrayBuffer();
        const sourcePdf = await PDFDocument.load(buffer);
        const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        for (const page of pages) {
          mergedPdf.addPage(page);
        }
      } catch (e) {
        console.error("[Export] PDF download/merge failed:", e);
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      return NextResponse.json({ error: "No pages in merged PDF" }, { status: 500 });
    }

    const pdfBytes = await mergedPdf.save();

    return new NextResponse(pdfBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=canva_export.pdf",
      },
    });
  } catch (e) {
    console.error("[POST /api/export/canva-pdf]", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
