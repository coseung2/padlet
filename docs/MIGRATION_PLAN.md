# External Access Token — 3-stage Migration Plan

> Scope: Seed 8 (2026-04-12-canva-publisher-receiver) CR-1 / CR-8.
> Source of truth: `canva project/plans/canva-publisher-receiver-roadmap.md` §1.2, §4.

SHA-256 is one-way, so the v1 `tokenHash` column cannot be reverse-engineered into
the new `tokenPrefix`. Legacy rows must therefore be revoked and reissued. This
migration rolls out in three stages with a mandatory 7-day waiting period between
Stages 2 and 3 so teachers have time to reissue.

## Stage 1 — Additive nullable prefix (✅ SHIPPED in this PR)

- `prisma/schema.prisma` → `tokenPrefix String?` (nullable, `@unique`, `@@index`)
- New columns: `scopes`, `scopeBoardIds`, `expiresAt`, `updatedAt`
- Apply: `prisma db push` (no data migration; all legacy rows keep `tokenPrefix = null`)
- Risk: zero — fully additive, no production traffic impact.
- Verify: `SELECT COUNT(*) FROM "ExternalAccessToken" WHERE "tokenPrefix" IS NULL;`
  returns the total legacy row count; new tokens issued by this PR will populate it.

## Stage 2 — Mass revoke + teacher notification (DEFERRED)

Execute ≥24h after Stage 1 has been verified in prod.

1. Run data migration:
   ```sql
   UPDATE "ExternalAccessToken"
   SET    "revokedAt" = NOW()
   WHERE  "revokedAt" IS NULL AND "tokenPrefix" IS NULL;
   ```
2. Send Resend email to each affected teacher:
   - Subject: "[Aura-board] 외부 연동 토큰 재발급 필요 (보안 업그레이드)"
   - Body: "기존 PAT 포맷이 보안 업그레이드로 교체되었습니다. 설정 > 외부 연동 토큰에서 재발급해 주세요."
3. Record send evidence in `tasks/2026-04-12-canva-publisher-receiver/phase10/deploy_log.md`.

**Rollback**: revert SQL + do not re-send email (email cannot be unsent — legacy tokens already revoked).

## Stage 3 — NOT NULL flip (≥7 days after Stage 2)

1. Confirm `SELECT COUNT(*) FROM "ExternalAccessToken" WHERE "tokenPrefix" IS NULL AND "revokedAt" IS NULL;` returns **0**.
2. Edit `prisma/schema.prisma`:
   - `tokenPrefix String @unique` (remove `?`)
3. Apply migration. Prisma will error if any null rows remain — confirm #1 first.
4. Update `src/lib/external-pat.ts` to drop the "(legacy)" branch note in `listTokens`.

**Rollback**: revert schema edit (`tokenPrefix String?`) + `prisma db push`.

## Timeline (target)

| Stage | Target | Responsible |
|---|---|---|
| 1 | Merged with this PR | This task |
| 2 | +24h after prod verify | Separate ops PR |
| 3 | +7d after Stage 2 | Separate ops PR |

No user action is required for Stage 1. Stages 2 and 3 are tracked as separate
"ops" PRs (not feature work) and require the Resend email template to be drafted
before Stage 2 executes.
