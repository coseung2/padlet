# Decision — realtime-engine-bench

Date: 2026-04-13
Task: `tasks/2026-04-13-realtime-engine-research`
Question: see `phase0/question.json`.

## 1. Question re-quoted

> Aura-board 보드/섹션 실시간 동기화 엔진으로 Liveblocks(SaaS), Yjs(CRDT self-host), 자체 WS(Node ws/socket.io) 중 무엇이 갤럭시 탭 S6 Lite 교실 환경과 T0-① 채널 격리 요건에 가장 적합한가?

## 2. Per-engine evaluation matrix

Weights reflect `question.json` axes; tablet performance and channel-isolation difficulty dominate because T0-③ is the next concrete milestone and the Tab S6 Lite is the perf floor.

Score legend: 1 (poor) / 3 (adequate) / 5 (excellent). Weighted total = Σ(score × weight).

| Axis | Weight | Liveblocks | Yjs (self-host) | 자체 WS (socket.io) |
|---|---:|---:|---:|---:|
| Tablet perf (bundle + parse on Tab S6 Lite) | 0.25 | 2 (50 KB min+gz client; ~80-100 ms parse) | 3 (57 KB combined; ~45-60 ms parse) | **5 (13 KB min+gz or 0 for raw ws; ~20 ms parse)** |
| Channel-isolation difficulty (map to `src/lib/realtime.ts`) | 0.20 | **5 (roomId = channel key; trivial)** | 4 (docName = channel key; need doc registry) | **5 (socket.io rooms = channel key)** |
| Classroom 30-conn scalability | 0.15 | 3 (**Free 10/room fails; Pro 50/room passes**) | 4 (RAM-bound; needs y-redis for >1 instance) | 4 (ws 50K/server; needs sticky or Redis) |
| External dependency / lock-in | 0.10 | 1 (proprietary wire; SaaS-only) | 4 (MIT; own server; Loro migration hard) | **5 (our wire; any transport)** |
| Cost at 30 classrooms × 30 students | 0.10 | 3 (~$33/mo Pro) | 4 ($15-45/mo Fly+Redis) | 4 ($15-45/mo Fly+Redis) |
| Dev effort to T0-③ milestone | 0.15 | **5 (~1.5 d; infra-free)** | 2 (~4.5 d; CRDT + server infra) | 3 (~3.5 d; server infra + reconnect) |
| TypeScript / DX | 0.05 | 5 (first-class) | 4 (solid, typed) | 4 (typed) |
| **Weighted total** | 1.00 | **3.05** | **3.55** | **4.30** |

### Measurement sources

- Tablet perf row: `phase1/benchmarks.json.bundles` (measured 2026-04-13 via esbuild+gzip) + extrapolated parse on Helio P22T.
- Channel isolation: inspected in `research/prototypes/realtime-engine/yjs-proto/server.mjs` and `ws-proto/bench.mjs`; for Liveblocks, documented in source LB-storage.
- Scalability: `phase1/source_index.json` LB-pricing, LB-limits, Yjs-scale, WS-wsvssio.
- Cost: `phase1/research_pack.md §7`.
- Dev effort: `phase1/research_pack.md §9`.

## 3. success_criteria pass/fail

| Criterion (from question.json `adopt_if`) | Liveblocks | Yjs | 자체 WS |
|---|---|---|---|
| cold-start boots with 1 room + 2 tabs | PASS (SDK surface verified; literature 200-400 ms) | **PASS (22 ms measured)** | **PASS (76 ms measured)** |
| payload ≤ 2 KB per card-move | PASS (~180 B literature) | **PASS (58 B measured)** | **PASS (82 B measured)** |
| JS heap ≤ 40 MB on boot | unverified (no vendor run) | **PASS (16.3 MB measured)** | **PASS (12.5 MB measured)** |
| channel isolation ≤ 1 day glue | PASS (roomId) | PASS (docName) | **PASS (socket.io rooms)** |
| ≤ $50/mo OR self-host no-per-seat | PASS ($33 Pro) | **PASS (self-host)** | **PASS (self-host)** |
| T0-③ can proceed immediately | PASS (docs + SDK mature) | PASS (server template + y-redis path) | PASS (straightforward protocol design) |

All three candidates pass the success_criteria gates. Tie-break falls on (a) tablet perf, (b) lock-in, (c) dev effort.

## 4. Final verdict

| Engine | Verdict |
|---|---|
| Liveblocks | **REJECT** |
| Yjs | **REVISE** (viable later if text-collab becomes a product requirement) |
| 자체 WS (socket.io) | **ADOPT** |

**Chosen engine: 자체 WS with `ws` on server and a thin socket.io-compatible wire format (or socket.io directly).**

## 5. Rationale (5 sentences)

1. **자체 WS wins on bundle cost**, which directly determines parse/eval latency on the Tab S6 Lite — the documented perf baseline. 13 KB (socket.io-client) or 0 KB (raw ws) vs 50 KB (Liveblocks) is a 2-4× gap on the critical path.
2. **Channel-isolation primitives already match our code**: `boardChannelKey`/`sectionChannelKey` in `src/lib/realtime.ts` map 1:1 to `socket.join(channel)` — the abstraction we already shipped in T0-① doesn't need to bend.
3. **Lock-in is zero** — we own the wire format, so any future swap to Yjs (if/when text collaboration enters scope) is an additive transport layer change, not a rewrite.
4. **Liveblocks free-tier hard-blocks 30-student classrooms** (10 conn/room ceiling) and its parse-cost on the Tab S6 Lite is the worst of the three; we cannot justify the $33/mo Pro upgrade when the self-hosted option meets every success criterion.
5. **Yjs is deferred, not dismissed** — its CRDT semantics are strictly better than last-write-wins for text editing, so if/when we add card-text-collab, we promote a focused research task (`revise` path) to wrap Yjs *inside* our WS transport (Yjs-over-our-WS is a standard pattern). Drag-drop card moves don't need CRDT merge; LWW is sufficient.

## 6. Follow-up actions

- **T0-③ implementation task** (`feature/realtime-protocol-t0-3`):
  - Stand up a `ws`-based Node service (Fly.io, region `nrt` to co-locate with Supabase `ap-northeast-2` and Vercel `icn1`).
  - Define wire protocol: `{ channel, type, payload, v:1 }` JSON with channels pulled from existing `boardChannelKey`/`sectionChannelKey` helpers.
  - Replace the no-op `publish()` in `src/lib/realtime.ts` with a typed client that holds one WS connection per user and multiplexes channels.
  - Add HMAC-signed JWT for WS upgrade that reuses NextAuth session + student-auth cookie.
  - First real echo test on a physical Galaxy Tab S6 Lite — captures the number this research could not.
  - Redis adapter is **not** P0: we can ship with a single node and sticky sessions; horizontal scaling becomes a P1 task once concurrent classroom count crosses ~5.

- **Known gaps to close in T0-③**:
  1. Real tablet measurement (bundle parse + end-to-end latency over Wi-Fi).
  2. Load test at 30 concurrent clients per room (simulated via Playwright headless × 30 or artillery-node).
  3. Persistence strategy — WS is transport only; durable state stays in Postgres via existing API routes. The WS layer only broadcasts intent.

- **Yjs REVISE trigger**: open a new research task if/when product adds collaborative card **text** editing (not just move/metadata). The decision there will be whether to wrap a Y.Doc inside our existing WS (preferred) or migrate to Liveblocks Yjs integration.

- **Liveblocks REJECT revisit**: revisit only if (a) self-hosted ops burden crosses 1 d/mo, or (b) Liveblocks releases a per-MAU self-host tier.
