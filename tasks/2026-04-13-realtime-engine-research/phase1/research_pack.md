# Research Pack — realtime-engine-bench

Date: 2026-04-13
Question: `phase0/question.json` — 보드/섹션 실시간 동기화 엔진 선택 (Liveblocks / Yjs / 자체 WS).
Perf baseline: **Galaxy Tab S6 Lite, Chrome Android** (not iPad).
Channel keys already defined in `src/lib/realtime.ts`: `board:{boardId}` and `board:{boardId}:section:{sectionId}`.

---

## 0. Context that anchors the decision

- **Vercel deployment posture**: the product currently runs on Vercel (region `icn1`) + Supabase (`ap-northeast-2`). **Vercel Functions do not support long-lived WebSocket connections.** Therefore **자체 WS** requires a separate persistent Node process (Fly.io / Railway / Supabase Edge / Cloudflare Durable Objects), and Yjs (self-hosted) has the same constraint. Only **Liveblocks** removes this operational cost.
- **Channel model is already locked**: T0-① shipped `boardChannelKey` / `sectionChannelKey`. Whatever engine we pick must map onto this shape with a thin adapter — we are not re-architecting channels.
- **Scale**: target ≈ 30 classrooms × 30 students = 900 potential MAU. Typical concurrent = 1 classroom × 30 students × 1–2 rooms = **30–60 simultaneous conns per active room**, 1–5 rooms active at once. Peak ≈ 150 concurrent conns.

---

## 1. Liveblocks (SaaS)

**What it is**: managed realtime infra (Rooms API) with Storage (LiveObject/LiveMap/LiveList), Broadcast, Presence, Comments. Vendor-hosted — you hit their edge, no long-lived server on your side.

**Strengths**
- Zero infra for us. Edge-distributed.
- Per-room pricing (**not** per-MAU): Free 500 monthly active rooms; Pro $30/mo + $0.03 per extra room.
- Mature TypeScript SDK (`@liveblocks/client` 3.18.0, active monthly releases).
- Storage CRDT + Broadcast + Presence out of the box. Channel isolation is trivial — one `roomId` per board, or one per section for breakout.
- Payload caps generous: LiveObject 2 MB, broadcast 32 MB (v≥3.14).

**Weaknesses**
- **Vendor lock-in**: proprietary wire protocol. Migrating off Liveblocks later means rewriting call sites (unless we keep everything behind `src/lib/realtime.ts`).
- No self-host.
- Bundle cost: **49.9 KB min+gz** for `@liveblocks/client` (measured 2026-04-13 via esbuild+gzip against v3.18.0). That's the largest of the three.
- Cost at our scale is currently in the free tier but we have to model what counts as a "monthly active room." If each board+section combo is a distinct room, 30 classrooms × (1 board + N sections) could push past 500 rooms/mo — need to design room granularity carefully.

**Fit with existing code**
- `publish()` in `src/lib/realtime.ts` becomes `room.broadcastEvent({ type, payload })`.
- `boardChannelKey` / `sectionChannelKey` become `roomId` inputs to `createClient().enterRoom(...)`.
- Auth via Liveblocks auth token — integrates with NextAuth or student-auth cookie through a `/api/liveblocks-auth` route.

## 2. Yjs (CRDT, self-hosted)

**What it is**: CRDT library for shared data types (Y.Map, Y.Array, Y.Text) + `y-websocket` reference WebSocket provider & server. Binary wire protocol. MIT.

**Strengths**
- **MIT, self-hostable**. Zero vendor fee.
- Very small deltas — single structural op is a few bytes encoded binary. Y.Map set is typically <100 B on wire.
- Offline-first by design (CRDT merges). Great for spotty classroom Wi-Fi.
- Awareness API is built-in (presence/cursor without extra protocol work).
- Well-proven (used by every major editor — ProseMirror, TipTap, BlockNote).

**Weaknesses**
- We need a persistent Node host. `y-websocket` server has ~100 KB memory per doc and scales horizontally only with Redis pub/sub or `y-redis` streams — that's real infra to run and monitor.
- Document grows with op count (not content), and on-disk persistence isn't provided out-of-box; `y-redis` or custom persistence needed for durability.
- Learning curve: the Y.Doc mental model (shared types, transactions, awareness) is heavier than "broadcast JSON."
- Bundle: **yjs 29.4 + y-websocket 27.6 ≈ 57 KB min+gz** (shares `lib0`, actual combined ≈ 48–50 KB after tree-share).

**Fit with existing code**
- `publish()` becomes a Y.Doc mutation inside a transaction; subscribers observe Y.Map events.
- Channel keys map to y-websocket **doc names**: URL `wss://rt.example/yjs/board:{id}` or `…/board:{id}:section:{id}` — same key helpers.
- Requires running `y-websocket` server (Node) somewhere outside Vercel Functions.

## 3. 자체 WS (ws / socket.io + custom protocol)

**What it is**: build the realtime layer ourselves on top of `ws` (raw) or `socket.io` (rooms, reconnect, fallbacks). We define JSON/msgpack wire events corresponding to `RealtimeEvent` in `src/lib/realtime.ts`.

**Strengths**
- Maximum control over wire format → smallest payloads possible (tune msgpack/cbor to <100 B per card-move).
- `ws` has the smallest client footprint (native browser WebSocket = 0 KB bundle impact) and ~3 KB/conn server memory.
- `socket.io` gives us rooms, reconnect, and heartbeats for free (client 13.5 KB min+gz) — rooms API maps almost 1:1 to our channel keys.
- No vendor cost.
- Channel isolation is trivial in code (Map<channelKey, Set<WebSocket>>).

**Weaknesses**
- **Most dev effort**: reconnect, heartbeat, auth, backpressure, persistence, conflict resolution are all on us. No offline merge.
- Same infra pain as Yjs: need a persistent Node host off Vercel. Scaling = sticky sessions or a pub/sub (Redis).
- **No CRDT** — concurrent edits to same card need server-side ordering or last-write-wins. Acceptable for drag-drop (LWW is fine) but not for text.
- Maintenance burden long-term (we'd re-invent Liveblocks/Yjs poorly if feature set grows).

**Fit with existing code**
- `publish()` becomes `ws.send(JSON.stringify({ channel, type, payload }))`.
- Channel keys are literally the `room` identifiers in socket.io rooms, or Map keys in raw ws. Zero abstraction mismatch.
- Auth: we wrap WS upgrade with our NextAuth / student-auth cookie check. Known pattern.

---

## 4. Bundle size (measured 2026-04-13, esbuild+gzip, browser ESM bundle)

| Package | Version | min+gzip |
|---|---|---|
| @liveblocks/client | 3.18.0 | **49.9 KB** |
| yjs | 13.6.30 | 29.4 KB |
| y-websocket | 3.0.0 | 27.6 KB |
| yjs + y-websocket combined | — | ~50 KB (dedup `lib0`) |
| socket.io-client | 4.8.3 | **13.5 KB** |
| native WebSocket | — | 0 KB |

Method: `esbuild entry.js --bundle --minify --format=esm --platform=browser` then `gzip -c`. Full reproducer in `phase1/prototypes/bundle-bench/`.

For Galaxy Tab S6 Lite (mid-tier SoC, 4 GB RAM) the parse/eval time of ~50 KB additional JS is in the ~40–80 ms range — acceptable but not free. Raw WebSocket wins decisively on bundle.

---

## 5. Channel-isolation difficulty (scored qualitatively)

| Engine | Mapping to `boardChannelKey`/`sectionChannelKey` | Difficulty |
|---|---|---|
| Liveblocks | 1 roomId string = 1 channel key. `enterRoom(key)` handles isolation. | **Trivial** (<½ day) |
| Yjs | 1 Y.Doc per channel, connect via `new WebsocketProvider(url, docName)`. Sub-docs optional. | Easy (1 day, incl. server side doc registry) |
| 자체 WS (socket.io) | `socket.join(channelKey)`; `io.to(channelKey).emit(...)`. | **Trivial** (½ day) |
| 자체 WS (raw ws) | In-memory `Map<channelKey, Set<ws>>`. | Easy (1 day w/ reconnect glue) |

All three pass the "≤ 1 day of engine-specific glue" `adopt_if` criterion.

---

## 6. Scalability — 30-student classroom

| Axis | Liveblocks | Yjs (y-websocket) | 자체 WS (ws) |
|---|---|---|---|
| Conn limit per room | 10 free / 50 Pro / 100 Enterprise | Instance RAM-bound (~1K conns on 1 GB) | ~50K/server |
| Scale-out model | Vendor-handled | Redis pubsub or y-redis streams | Redis adapter / sticky sessions |
| Presence included | Yes (Presence API) | Yes (Awareness) | DIY |
| Offline reconnect | Yes | Yes (CRDT merges) | Socket.io yes / raw ws DIY |

**Hard gate**: Liveblocks **Free 10 conn/room** is below our 30-student classroom. Pro ($30/mo) raises to 50/room — sufficient. **Free-tier Liveblocks fails the 30-student classroom requirement; Pro passes.**

---

## 7. Cost model (30 classrooms × 30 students, 현실적 시나리오)

Assume room = 1 per board, ~2 active rooms per classroom per day, 20 school days/mo, all 30 classrooms active = **30 boards × 20 days ≈ 600 monthly active rooms**.

| Option | Fixed $/mo | Variable | Total est. |
|---|---|---|---|
| Liveblocks Free | 0 | caps out at 500 rooms, 10 conn/room ← **INSUFFICIENT** | — |
| Liveblocks Pro | $30 | +$0.03 × 100 extra rooms = $3 | **~$33/mo** |
| Yjs self-host | $7 Fly.io 256MB → $25 Fly.io 1GB + $10 Redis | WS egress ~minimal | **$15–45/mo** |
| 자체 WS ws | same as Yjs | same | **$15–45/mo** |

All three pass the "≤ $50/mo OR self-host with no per-seat fee" `adopt_if` criterion (Liveblocks Pro marginal).

**Hidden cost**: Yjs / 자체 WS eat ~½ day/mo of ops for monitoring the WS node. Liveblocks eats zero ops.

---

## 8. External dependency / lock-in

- **Liveblocks**: HIGH lock-in. Proprietary protocol. Shutdown risk = P4 (company seems healthy, but any SaaS carries it). Mitigation: all call sites go through `src/lib/realtime.ts` adapter so swap is a single file.
- **Yjs**: LOW lock-in. OSS. Worst case, the wire format is versioned and we own our server. Could migrate to Loro/Automerge later but cost is high (CRDT semantics differ).
- **자체 WS**: LOWEST lock-in. Wire format is ours. Can swap transports (ws → socket.io → SSE) without touching callers.

---

## 9. Dev effort (to first working T0-③ milestone)

| Task | Liveblocks | Yjs | 자체 WS (socket.io) |
|---|---|---|---|
| Scaffolding | 0.5 d | 1 d | 1 d |
| Channel wire-up | 0.5 d | 1 d | 0.5 d |
| Auth integration | 0.5 d | 1 d | 0.5 d |
| Offline/reconnect | 0 d (built-in) | 0.5 d | 0.5 d (socket.io) / 2 d (raw ws) |
| Deploy infra | 0 d (SaaS) | 1 d (Fly+Redis) | 1 d (Fly+Redis) |
| **Total** | **~1.5 d** | **~4.5 d** | **~3.5 d** |

---

## 10. Summary of findings

- Liveblocks: lowest dev effort, highest bundle (+50 KB), highest lock-in, modest cost, Free tier inadequate for 30-student rooms (needs Pro).
- Yjs: best for offline/CRDT semantics and bundle-per-feature ratio, highest learning curve, self-host infra burden.
- 자체 WS (socket.io): smallest bundle, maximum control, moderate dev effort, same infra burden as Yjs, no offline merge guarantee — fine for LWW drag-drop but weak if text collaboration is later required.
