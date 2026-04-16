# ADR-001 — Realtime engine for Aura-board (자체 WS / socket.io)

- Status: **Accepted** (research decision; production adoption pending T0-③ feature task)
- Date: 2026-04-13
- Deciders: Aura-board solo owner (via research pipeline)
- Supersedes: none (first realtime ADR)
- Related: `src/lib/realtime.ts`, `docs/architecture.md#Realtime`, tasks `2026-04-12-breakout-section-isolation` (T0-①)

## Context

T0-① shipped channel-key helpers (`boardChannelKey`, `sectionChannelKey`) with a
no-op `publish()` on the assumption that the realtime engine would be picked
later. The roadmap (`canva project/plans/tablet-performance-roadmap.md §9`)
demands a decision before T0-③ can start. Target device is **Samsung Galaxy Tab
S6 Lite running Chrome Android** (mid-tier SoC, 4 GB RAM). Expected scale: 30
classrooms × 30 students ≈ 900 MAU, with 30-60 concurrent per active room.

Three candidates were evaluated: **Liveblocks** (SaaS), **Yjs** (self-hosted CRDT),
and **자체 WS** (`ws` or `socket.io`, custom protocol).

Full evaluation in `tasks/2026-04-13-realtime-engine-research/`.

## Decision

Adopt **자체 WS** as the production realtime transport:

- **Server**: a dedicated Node process hosting `ws` (or socket.io — interchangeable;
  default to socket.io for rooms + reconnect out of the box). Deployed on a
  provider that supports long-lived connections (Fly.io `nrt`, Railway, or a
  DigitalOcean droplet). **Not** Vercel Functions (no WS support).
- **Wire format**: JSON `{ channel, type, payload, v: 1 }` where `channel` is
  already defined by `boardChannelKey` / `sectionChannelKey`. Versioned so we
  can swap to binary (msgpack) without breaking older clients.
- **Client**: a thin wrapper around the browser's native WebSocket or the
  `socket.io-client`, exposed through `src/lib/realtime.ts`. Call sites that
  already use `publish()` require no change.
- **Auth**: WS upgrade signed by an HMAC token derived from the existing
  NextAuth session or the student-auth cookie — reusing patterns from
  `src/lib/student-auth.ts`.
- **Scale-out**: ship single-instance + sticky sessions for MVP. Redis adapter
  becomes a follow-up feature task when concurrent classroom count > 5.

**Rejected**: Liveblocks — proprietary lock-in, 50 KB client bundle hurts Tab S6
Lite, Free tier's 10 conn/room ceiling fails the 30-student classroom hard
requirement, Pro tier is justifiable only if we concede self-host ops burden.

**Deferred**: Yjs — valid *if and when* we add text-collaboration on cards.
Then the plan is to wrap a `Y.Doc` inside our own WS transport (a well-trodden
pattern), not to add a second transport stack.

## Consequences

### Positive
- Smallest client-side code on the critical path (13 KB socket.io-client; 0 KB raw WS). Parse cost on Tab S6 Lite is ~20 ms vs Liveblocks' ~80-100 ms.
- No vendor lock-in; wire format is ours.
- Channel helpers in `src/lib/realtime.ts` need zero API change — just the body of `publish()` changes from no-op to an actual emit.
- Cost is O(infra), not O(seat). Estimated $15-45/mo at target scale.
- Lowest possible latency floor — no SaaS edge hop.
- Transport is commodity; we can migrate to Cloudflare Durable Objects or
  Supabase Realtime later if our needs change.

### Negative
- We own reconnect, heartbeats, backpressure, auth, and (eventually)
  horizontal scale. Socket.io gives the first three for free; the fourth still
  needs Redis pub/sub + sticky sessions.
- **No CRDT**. Card-move is last-write-wins on server timestamp; fine for
  drag-drop, inadequate for text. Adding text-collab requires ADR-002 (Yjs wrap).
- **A separate non-Vercel compute lives in our stack**. Adds one host to
  monitor, one set of env vars, one more deploy pipeline. Mitigation: keep
  the WS service <400 LOC; treat it as dumb fan-out.
- Real-tablet measurement is still TBD — research was blocked by WSL2
  environment. T0-③ must include a physical-device benchmark as a Definition
  of Done checkbox.

### Neutral
- Migrating to Liveblocks later (if we reverse this decision) would require
  rewriting the transport adapter inside `src/lib/realtime.ts` and setting up
  auth endpoint — bounded to roughly 2-3 days, because the call-site contract
  is protected.

## Options considered (summary)

| Option | Weighted score | Verdict |
|---|---:|---|
| Liveblocks (SaaS) | 3.05 | REJECT — bundle + lock-in + per-room cost |
| Yjs (self-host) | 3.55 | REVISE — revisit when text-collab lands |
| 자체 WS / socket.io | **4.30** | **ADOPT** |

Full matrix and success_criteria pass/fail in `phase2/decision.md`.

## Follow-up

1. Open feature task `realtime-protocol-t0-3`:
   - Scope: ship `ws` server + typed client + real Tab S6 Lite benchmark.
   - Acceptance includes physical-tablet p95 echo latency and 30-tab
     Playwright stress test.
2. Keep the research sandbox (`research/prototypes/realtime-engine/`) for
   regression benchmarks — when we upgrade any realtime dep later, re-run
   `bundle-bench` to catch regressions against the numbers recorded here.
3. Document the wire protocol in `docs/architecture.md#Realtime` during T0-③.
