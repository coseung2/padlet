// Self-contained 자체 WS (socket.io) bench: server + 2 clients in-process.

import { Server } from "socket.io";
import { createServer } from "node:http";
import { io as clientIo } from "socket.io-client";

const port = Number(process.env.WS_PORT || 3202);
const http = createServer();
const io = new Server(http, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.on("join", (ch) => {
    if (typeof ch === "string" && ch.startsWith("board:")) socket.join(ch);
  });
  socket.on("event", (evt) => {
    if (!evt || typeof evt.channel !== "string") return;
    socket.to(evt.channel).emit("event", evt);
  });
});

await new Promise((r) => http.listen(port, r));

const url = `http://localhost:${port}`;
const channel = "board:bench";

function makeClient() {
  return clientIo(url, { transports: ["websocket"] });
}

const t0 = Date.now();
const a = makeClient();
const b = makeClient();
await Promise.all([
  new Promise((r) => a.once("connect", r)),
  new Promise((r) => b.once("connect", r)),
]);
a.emit("join", channel);
b.emit("join", channel);
await new Promise((r) => setTimeout(r, 50));
const coldStartMs = Date.now() - t0;

const moveEvent = {
  channel,
  type: "card.move",
  payload: { id: "c1", x: 100, y: 100 },
};
const movePayloadBytes = Buffer.byteLength(JSON.stringify(moveEvent));

const latencies = [];
for (let i = 0; i < 30; i++) {
  const start = performance.now();
  const done = new Promise((r) => b.once("event", r));
  a.emit("event", { channel, type: "card.move", payload: { id: "c2", x: i, y: i } });
  await done;
  latencies.push(performance.now() - start);
}
latencies.sort((x, y) => x - y);
const p50 = latencies[Math.floor(latencies.length * 0.5)];
const p95 = latencies[Math.floor(latencies.length * 0.95)];

const mem = process.memoryUsage();
console.log(JSON.stringify({
  engine: "ws-socketio",
  cold_start_ms: coldStartMs,
  card_move_payload_bytes: movePayloadBytes,
  echo_latency_ms: { p50: +p50.toFixed(2), p95: +p95.toFixed(2) },
  heap_used_mb: +(mem.heapUsed / 1024 / 1024).toFixed(2),
  rss_mb: +(mem.rss / 1024 / 1024).toFixed(2),
  clients: 2,
  card_count: 3,
  iterations: 30,
  wire_format: "socket.io default (engine.io framed JSON)",
}, null, 2));

a.disconnect();
b.disconnect();
io.close();
http.close();
process.exit(0);
