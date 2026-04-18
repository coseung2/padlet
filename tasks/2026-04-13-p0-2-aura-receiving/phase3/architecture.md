# Phase 3 — Architecture

Stack is frozen (Next.js 16 + Prisma + NextAuth 5). This feature slots into existing patterns without introducing new tech.

## Data model delta (prisma)
```prisma
model ExternalAccessToken {
  id         String    @id @default(cuid())
  userId     String
  name       String    // "내 Canva 앱 v1"
  tokenHash  String    @unique
  lastUsedAt DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```
User model addition: `externalTokens ExternalAccessToken[]`.
Migration: `prisma migrate dev --name add-external-access-token`.

## Module layout
```
src/lib/external-auth.ts                       # issueToken/revokeToken/verifyToken + hash + rate limit
src/app/api/external/cards/route.ts            # POST handler
src/app/api/account/tokens/route.ts            # POST (issue) — lists via GET
src/app/api/account/tokens/[id]/route.ts       # DELETE (revoke)
src/app/account/tokens/page.tsx                # server component — list
src/app/account/tokens/TokensClient.tsx        # client — issue modal, revoke, copy
docs/external-api.md                           # API spec
```

## Module contracts

### `src/lib/external-auth.ts`
```ts
export const TOKEN_PREFIX = "aura_pat_";
export const TOKEN_CAP_PER_USER = 10;
export const RATE_LIMIT_PER_MIN = 60;

export async function issueToken(
  userId: string,
  name: string
): Promise<{ id: string; token: string; createdAt: Date }>;
// Generates aura_pat_<22>, hashes, insert row, returns plaintext ONCE.

export async function revokeToken(id: string, userId: string): Promise<boolean>;
// Soft-delete (set revokedAt). Scoped to userId — prevents cross-user revoke.

export async function verifyToken(
  authHeader: string | null
): Promise<{ user: User; tokenId: string } | null>;
// Parse "Bearer <token>", hash, findUnique by hash, reject revoked, touch lastUsedAt.

export async function listTokens(userId: string): Promise<{
  id: string; name: string; lastUsedAt: Date|null; createdAt: Date; revokedAt: Date|null;
}[]>;

export function checkRateLimit(tokenId: string): { ok: boolean; retryAfter: number };
// In-memory fixed window.

export function maskToken(raw: string): string;
// "aura_pat_********abcd"
```

### `POST /api/external/cards`
Request zod schema:
```ts
{
  boardId: string (cuid-like),
  sectionId?: string | null,
  title: string (1..200),
  content?: string (0..5000),
  imageDataUrl?: string (data:image/png;base64,...),
  linkUrl?: string (url),
  canvaDesignId?: string
}
```
Flow:
1. `verifyToken(req.headers.authorization)` → else 401
2. `checkRateLimit(tokenId)` → else 429
3. zod parse → else 400
4. `requirePermission(boardId, user.id, "edit")` → else 403 (viewer) / 403 (no membership)
5. If `sectionId` provided, verify it belongs to `boardId` → else 400
6. If `imageDataUrl`: decode, size check, write (blob or fs), set `imageUrl`
7. If `canvaDesignId`: set `linkUrl = https://www.canva.com/design/<id>/view` and invoke existing `resolveCanvaEmbedUrl` to pre-fill linkTitle/linkImage (reuse `src/lib/canva.ts`)
8. `db.card.create(...)` with minimal fields (position defaults x=0, y=0, w=240, h=160)
9. Response: `{ success: true, cardId, cardUrl: /board/<boardSlug>?card=<id> }`

### Teacher UI
- `/account/tokens` — server component reads `listTokens(user.id)`, renders `<TokensClient>` with hydration data.
- `<TokensClient>`:
  - Table: 라벨, 마지막 사용, 생성일, 폐기 버튼
  - 상단 "새 토큰 발급" 버튼 → 모달: 라벨 입력 → POST /api/account/tokens → 반환 `{ token }` 1회 표시 + "복사" + 경고 메시지.
  - Revoke → `DELETE /api/account/tokens/[id]` → toast + refresh.

## File-level responsibilities
| File | Responsibility |
|---|---|
| `external-auth.ts` | Token lifecycle + verify + rate-limit (pure lib) |
| `api/external/cards/route.ts` | HTTP wiring only — delegate to external-auth + card create |
| `api/account/tokens/route.ts` | GET list + POST issue; NextAuth auth via `getCurrentUser()` |
| `api/account/tokens/[id]/route.ts` | DELETE revoke; NextAuth auth |
| `account/tokens/page.tsx` | SSR shell + auth redirect |
| `account/tokens/TokensClient.tsx` | Client interactivity |
| `docs/external-api.md` | External-developer reference |

## Runtime choice
- `POST /api/external/cards` → Node runtime (default) because of Prisma + optional `@vercel/blob`. No Edge.
- Account endpoints → Node runtime, standard cookies/session.

## Env vars
- Existing: `NEXTAUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`.
- Optional new: `BLOB_READ_WRITE_TOKEN` (when present, use `@vercel/blob.put`; else fs fallback).
- Documented in `docs/external-api.md` + `next-env.d.ts` typing not required (process.env access typed as `string | undefined`).

## Dependency impact
- No new required npm deps. `@vercel/blob` is an **optional** dynamic import — only loaded when `BLOB_READ_WRITE_TOKEN` exists. If package not installed and env set, log warning + fs fallback. Keeps package.json unchanged in this phase; can be added later when blob is adopted project-wide.

## Testing strategy (phase9)
- curl smoke tests with 3 test cases (happy, 401, 429) using mock user via `as=owner` cookie bypass NOT applicable for Bearer endpoint — must use issued token.
- Direct DB seed of test token via `prisma/seed.ts` extension NOT required; issue via API in test script.

## Handoff to phase4
- UI designer uses `/account/tokens` layout above. Confirm: shadcn table + dialog patterns already in use. See `design-system.md` for tokens/buttons.
