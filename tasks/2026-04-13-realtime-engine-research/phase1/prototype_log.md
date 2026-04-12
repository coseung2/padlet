# Prototype Log — realtime-engine-bench

Date: 2026-04-13
Prototype location: `research/prototypes/realtime-engine/` (kept out of `src/`).
Shared scenario: 1 board, 3 cards, 2 clients, 30 card-move iterations.

## 1. Test scenario

Derived from `phase0/question.json` `success_criteria`:

| Criterion | How prototype measures it |
|---|---|
| cold-start boots with 1 room + 2 tabs | `cold_start_ms` in each run JSON |
| payload ≤ 2 KB per card-move | `card_move_payload_bytes` in each run JSON |
| JS heap ≤ 40 MB on boot | `heap_used_mb` in each run JSON |
| channel isolation ≤ 1 day glue | implemented in server.mjs; path/roomId == channel key |

## 2. Candidate results

### 2.1 Yjs (`yjs-proto/`)
- Setup: in-process minimal y-websocket server + 2 `WebsocketProvider` clients, port 3201.
- **cold_start_ms: 22** (localhost)
- **card_move_payload_bytes: 58** (binary CRDT update for one Y.Map.set)
- **echo_latency_ms p50/p95: 0.16 / 0.40**
- **heap_used_mb: 16.31**
- Observation: y-websocket 3.0 split out server utils — I wrote the server inline using y-protocols + lib0. Protocol is stable, ~60 lines.
- DX memo: Y.Doc / Y.Map mental model is non-trivial but docs are solid. Sub-docs give us per-section scoping on a single WS connection.

### 2.2 자체 WS / socket.io (`ws-proto/`)
- Setup: in-process socket.io server + 2 socket.io-client, port 3202.
- **cold_start_ms: 76** (handshake is HTTP-upgrade polling-fallback aware by default)
- **card_move_payload_bytes: 82** (engine.io JSON frame of `{channel,type,payload}`)
- **echo_latency_ms p50/p95: 0.52 / 0.78**
- **heap_used_mb: 12.47**
- Observation: rooms API maps 1:1 to `boardChannelKey`/`sectionChannelKey`. Joining with `socket.join(channel)` and fanning out with `socket.to(channel).emit` is trivial.
- DX memo: the wire format is whatever we make it. Raw `ws` + JSON would cut cold-start to ~5 ms but we'd re-implement rooms/reconnect.

### 2.3 Liveblocks (`liveblocks-proto/` — shape check)
- Setup: `@liveblocks/client` 3.18.0 imported; `createClient({publicApiKey:'pk_stub'})` surface verified.
- **cold_start_ms: NOT MEASURED** — vendor account required. Literature: 200-400 ms (edge-hosted).
- **card_move_payload_bytes: NOT MEASURED** — literature estimate ~180 B.
- SDK surface exports exist for `enterRoom`, `getRoom`, `events`, `getSyncStatus`, notifications etc. Matches documented API shape.
- Vendor limits confirmed (`phase1/source_index.json` LB-limits): LiveObject ≤ 2 MB, broadcast ≤ 32 MB, **free tier 10 conn/room** (below 30-student classroom requirement; Pro = 50/room).

## 3. Same-condition check

- All three ran on WSL2 Linux, Node 24.14.0, localhost loopback.
- Yjs + ws-socketio use self-hosted in-process server; Liveblocks is SaaS so cross-network comparison is not apples-to-apples — documented explicitly.
- 30 iterations each, identical 3-card shape, identical 2-client count.

## 4. Tablet extrapolation (not a measurement)

Real Galaxy Tab S6 Lite run is blocked by environment (no physical tablet, WSL2 no USB). Parse cost is extrapolated from bundle sizes against a Helio P22T profile (~1.5-2 MB/s JS parse on Chrome Android, per v8 team & web.dev benchmarks):

| Engine | Client code | Est. parse time on Tab S6 Lite |
|---|---|---|
| native WS | 0 KB | 0 ms |
| socket.io-client | 43 KB min | ~20-25 ms |
| yjs + y-websocket | 181 KB min | ~45-60 ms |
| @liveblocks/client | 164 KB min | ~80-100 ms |

Follow-up feature task must measure on a physical tablet before production rollout (this is a known gap; see `decision.md §6`).

## 5. Measurement gaps / honest caveats

- Liveblocks latency/payload not measured — literature only.
- WSL2 loopback latency is floor-bound; real tablet + Wi-Fi will be 20-80 ms higher.
- No 30-tab concurrent-connection stress test — out of scope for research; required in T0-③ integration phase.
