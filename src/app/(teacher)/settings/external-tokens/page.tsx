/**
 * /(teacher)/settings/external-tokens — teacher PAT self-service (Seed 8 CR-9).
 *
 * Server component: authenticates → hydrates list → renders
 * <ExternalTokensClient/>. Plaintext tokens NEVER flow through here; the
 * one-time full token is produced only by the POST /api/tokens response
 * inside the client modal.
 *
 * UI is tuned for Galaxy Tab S6 Lite (1200×800, portrait/landscape): touch
 * targets ≥ 44px, large tappable modal buttons, and a tier-aware CTA.
 */
import { getCurrentUser } from "@/lib/auth";
import { listTokens, TOKEN_CAP_PER_USER } from "@/lib/external-pat";
import { isProTier } from "@/lib/tier";
import ExternalTokensClient, { type ClientToken } from "./ExternalTokensClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ExternalTokensPage() {
  const user = await getCurrentUser();
  const rows = await listTokens(user.id);
  const pro = isProTier(user.id);
  const initial: ClientToken[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    tokenPrefix: r.tokenPrefix,
    scopes: r.scopes,
    scopeBoardIds: r.scopeBoardIds,
    createdAt: r.createdAt.toISOString(),
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    revokedAt: r.revokedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
  }));
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">외부 연동 토큰 (PAT)</h1>
        <p className="text-sm text-slate-600">
          Canva 등 외부 앱이 이 계정 보드에 카드를 자동 생성할 때 사용하는
          Personal Access Token입니다. 최대 {TOKEN_CAP_PER_USER}개까지 발급 가능합니다.
        </p>
      </header>
      {!pro && (
        <div
          className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          role="region"
          aria-label="Pro 업그레이드 안내"
        >
          <strong>Pro 플랜 필요</strong>
          <p className="mt-1">
            Canva Content Publisher 연동(<code>cards:write</code>)은 Pro 요금제
            전용입니다. <a className="underline" href="https://aura-board-app.vercel.app/pricing">Pro 업그레이드</a>
          </p>
        </div>
      )}
      <ExternalTokensClient initial={initial} isPro={pro} cap={TOKEN_CAP_PER_USER} />
    </main>
  );
}
