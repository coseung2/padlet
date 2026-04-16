// In-process bench: spins up the Yjs WS server AND two clients in the same
// Node process, so the run is self-contained (no background dependencies).
// Outputs JSON to stdout.

import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync.js";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { WebsocketProvider } from "y-websocket";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const PORT = Number(process.env.YJS_PORT || 3201);

// ---- Minimal server (same logic as server.mjs, inlined) ----
const wss = new WebSocketServer({ port: PORT });
const docs = new Map();
function getDoc(name) {
  let e = docs.get(name);
  if (!e) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalState(null);
    e = { doc, awareness, conns: new Set() };
    doc.on("update", (u, origin) => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.writeUpdate(enc, u);
      const msg = encoding.toUint8Array(enc);
      for (const ws of e.conns) if (ws !== origin && ws.readyState === 1) ws.send(msg);
    });
    awareness.on("update", ({ added, updated, removed }, origin) => {
      const ch = added.concat(updated).concat(removed);
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, ch));
      const msg = encoding.toUint8Array(enc);
      for (const ws of e.conns) if (ws !== origin && ws.readyState === 1) ws.send(msg);
    });
    docs.set(name, e);
  }
  return e;
}
wss.on("connection", (ws, req) => {
  const name = (req.url || "/").slice(1) || "default";
  const e = getDoc(name);
  e.conns.add(ws);
  {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(enc, e.doc);
    ws.send(encoding.toUint8Array(enc));
  }
  ws.on("message", (data) => {
    try {
      const bytes = new Uint8Array(data);
      const dec = decoding.createDecoder(bytes);
      const type = decoding.readVarUint(dec);
      const enc = encoding.createEncoder();
      if (type === MESSAGE_SYNC) {
        encoding.writeVarUint(enc, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(dec, enc, e.doc, ws);
        if (encoding.length(enc) > 1) ws.send(encoding.toUint8Array(enc));
      } else if (type === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(e.awareness, decoding.readVarUint8Array(dec), ws);
      }
    } catch (err) { /* ignore */ }
  });
  ws.on("close", () => {
    e.conns.delete(ws);
    awarenessProtocol.removeAwarenessStates(e.awareness, [e.doc.clientID], ws);
  });
});

// ---- Two clients ----
const url = `ws://localhost:${PORT}`;
const room = "board:bench";

function makeClient() {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(url, room, doc, { WebSocketPolyfill: WebSocket });
  return { doc, provider, map: doc.getMap("cards") };
}

const t0 = Date.now();
const a = makeClient();
const b = makeClient();
await new Promise((resolve) => {
  let ready = 0;
  const check = (isSynced) => { if (isSynced && ++ready === 2) resolve(); };
  a.provider.on("sync", check);
  b.provider.on("sync", check);
});
const coldStartMs = Date.now() - t0;

const cards = [
  { id: "c1", x: 10, y: 10, title: "Card 1" },
  { id: "c2", x: 20, y: 20, title: "Card 2" },
  { id: "c3", x: 30, y: 30, title: "Card 3" },
];
a.doc.transact(() => { for (const c of cards) a.map.set(c.id, c); });
await new Promise((r) => setTimeout(r, 100));

let moveBytes = 0;
const updHandler = (u) => { moveBytes = u.byteLength; };
a.doc.on("update", updHandler);
a.map.set("c1", { ...cards[0], x: 100, y: 100 });
a.doc.off("update", updHandler);

// Round trip
const latencies = [];
for (let i = 0; i < 30; i++) {
  const start = performance.now();
  await new Promise((resolve) => {
    const h = () => { b.map.unobserve(h); resolve(); };
    b.map.observe(h);
    a.map.set("c2", { ...cards[1], x: i, y: i });
  });
  latencies.push(performance.now() - start);
}
latencies.sort((x, y) => x - y);
const p50 = latencies[Math.floor(latencies.length * 0.5)];
const p95 = latencies[Math.floor(latencies.length * 0.95)];

const mem = process.memoryUsage();
console.log(JSON.stringify({
  engine: "yjs",
  cold_start_ms: coldStartMs,
  card_move_payload_bytes: moveBytes,
  echo_latency_ms: { p50: +p50.toFixed(2), p95: +p95.toFixed(2) },
  heap_used_mb: +(mem.heapUsed / 1024 / 1024).toFixed(2),
  rss_mb: +(mem.rss / 1024 / 1024).toFixed(2),
  clients: 2,
  card_count: 3,
  iterations: 30,
  note: "server + clients in-process; localhost WSL2. Real Galaxy Tab numbers TBD.",
}, null, 2));

a.provider.destroy();
b.provider.destroy();
wss.close();
process.exit(0);
