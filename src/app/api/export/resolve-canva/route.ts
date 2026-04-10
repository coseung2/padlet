import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  try {
    // 1. Follow redirects to get the final Canva URL
    let finalUrl = url;

    if (url.includes("canva.link")) {
      const res = await fetch(url, { redirect: "manual" });
      const location = res.headers.get("location");
      if (location) finalUrl = location;
    }

    // 2. Extract design ID from URL
    const designIdMatch = finalUrl.match(/\/design\/([A-Za-z0-9_-]+)\//);
    if (!designIdMatch) {
      return NextResponse.json({ error: "Could not extract design ID" }, { status: 400 });
    }
    const designId = designIdMatch[1];

    // 3. Fetch OG metadata for thumbnail and title
    const pageRes = await fetch(finalUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });

    let title: string | null = null;
    let thumbnail: string | null = null;

    if (pageRes.ok) {
      const html = await pageRes.text();
      const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
        ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
        ?? null;
      const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
        ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
        ?? null;
      title = ogTitle;
      thumbnail = ogImage;
    }

    return NextResponse.json({
      designId,
      title,
      thumbnail,
      pageCount: null, // page count requires Canva API (MCP)
      finalUrl,
    });
  } catch (e) {
    console.error("[GET /api/export/resolve-canva]", e);
    return NextResponse.json({ error: "Failed to resolve" }, { status: 500 });
  }
}
