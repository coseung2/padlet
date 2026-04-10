import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const cookies = req.headers.get("cookie") ?? "";
  const providerMatch = cookies.match(/llm_provider=([^;]+)/);
  const keyMatch = cookies.match(/llm_api_key=([^;]+)/);

  return NextResponse.json({
    provider: providerMatch?.[1] ?? "openai",
    hasKey: !!keyMatch?.[1],
  });
}

export async function POST(req: Request) {
  const { provider, apiKey } = await req.json();

  if (!provider || !apiKey) {
    return NextResponse.json({ error: "provider and apiKey required" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("llm_provider", provider, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  res.cookies.set("llm_api_key", apiKey, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return res;
}
