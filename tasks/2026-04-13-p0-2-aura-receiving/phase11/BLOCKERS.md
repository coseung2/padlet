# P0-② Blockers — items outside agent autonomy

The Aura-board receiving side is complete. To actually publish cards from
Canva, the two external items below must be completed by the user.

## B1. Canva Apps SDK project — `canva project/content-publisher-app/`

**What**: A new Canva Apps SDK app (Node/TypeScript) that runs inside Canva
and calls `POST https://<aura-host>/api/external/cards` with the teacher's PAT.

**Steps**:
1. `npm create @canva/app@latest content-publisher-app` (inside repo root or a sibling path).
2. Implement UI: select board (paste boardId or choose from dropdown populated by GET /api/boards if exposed), enter title/content, optional link.
3. On submit: `fetch(AURA_HOST + "/api/external/cards", { method: "POST", headers: { Authorization: "Bearer " + pat, "Content-Type": "application/json" }, body: JSON.stringify({ boardId, title, content, canvaDesignId }) })`.
4. Store PAT in Canva app safe-storage (Canva Apps SDK provides encrypted user-scoped storage).

**Reference**: docs/external-api.md §2 has the contract.

**Who**: User (심보승) — requires Canva developer account + Apps SDK setup.

## B2. Canva Developer Portal registration

**What**: Register the above app in Canva Developer Portal and deploy to the
"광릉초6학년1반" Canva team so teachers and students can enable it.

**Steps**:
1. Sign in to https://www.canva.com/developers/apps/
2. Create new app → upload/link the `content-publisher-app/` project.
3. Configure: app name, description, team visibility = 광릉초6학년1반.
4. Request review or deploy to team (team-only deploys bypass public review).
5. Verify inside Canva editor: "Apps" → 내 앱 → content-publisher-app.

**Who**: User — Canva account owner of the 광릉초6학년1반 team.

## Neither blocker affects the Aura-board receiving side
- All receiving infrastructure (API + auth + UI + docs) is live after merge.
- Any HTTPS client (curl, Postman, future custom script) can already use the API.
- Canva app will slot in whenever B1/B2 land.
