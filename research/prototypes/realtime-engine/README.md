# Aura-board Realtime Engine Prototypes

Sandbox for `tasks/2026-04-13-realtime-engine-research`.
**Not production code** — intentionally outside `src/`.

## Structure

```
realtime-engine/
├── bundle-bench/       # reproduces the 2026-04-13 bundle-size numbers
├── yjs-proto/          # Yjs + y-websocket echo server + 2-tab client
├── ws-proto/           # socket.io echo server + 2-tab client (자체 WS candidate)
└── liveblocks-proto/   # SDK shape-check — does NOT hit Liveblocks cloud
```

## Shared scenario

All three prototypes run the same minimal scenario:

- 3 cards ({id, x, y, title}) on a single "board"
- 2 browser tabs (or 2 Node WS clients) each move cards every 250 ms
- 30 events total per tab per run (N=30)
- Measure: payload bytes on wire, round-trip echo latency (ms), approximate JS heap

On WSL2 we cannot drive a real Galaxy Tab S6 Lite. These prototypes are correctness + payload-size checks only; tablet perf numbers in `benchmarks.json` cite
either measurement on the dev host OR literature from `phase1/source_index.json`.

## Run

Each proto has its own `package.json`. `cd <proto> && npm install && npm run bench`.

**Do not** install these packages into the product `package.json`.
