/**
 * /account/tokens — Teacher self-service for external PATs (P0-②).
 *
 * Server component: authenticates via getCurrentUser() then seeds the
 * client component with the initial list. Plaintext tokens are never
 * rendered here (DB stores hashes only); the one-time plaintext is
 * surfaced only by the inline POST response inside <TokensClient/>.
 */
import { getCurrentUser } from "@/lib/auth";
import { listTokens } from "@/lib/external-auth";
import TokensClient from "./TokensClient";

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const user = await getCurrentUser();
  const rows = await listTokens(user.id);
  const initial = rows.map((r: (typeof rows)[number]) => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt.toISOString(),
    lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
  }));
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">내 외부 연동 토큰</h1>
        <p className="text-sm text-slate-600">
          Canva 콘텐츠 퍼블리셔 등 외부 앱이 이 계정 보드에 카드를 자동
          생성할 때 사용하는 Personal Access Token입니다. 최대 10개까지
          발급 가능합니다.
        </p>
      </header>
      <TokensClient initial={initial} />
    </main>
  );
}
