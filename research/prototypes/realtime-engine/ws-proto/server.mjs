// Minimal socket.io echo server. Channel keys mirror src/lib/realtime.ts:
//   board:{boardId}               → socket.io room "board:{boardId}"
//   board:{boardId}:section:{sid} → socket.io room "board:{boardId}:section:{sid}"
//
// A client sends { channel, type, payload } and the server fans out to
// everyone else in that room (io.to(channel).except(socket.id).emit).
//
// Port 3202 — avoids 3000 / 3100 / 4000.

import { Server } from "socket.io";
import { createServer } from "node:http";

const port = Number(process.env.WS_PORT || 3202);
const http = createServer();
const io = new Server(http, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.on("join", (channel) => {
    if (typeof channel === "string" && channel.startsWith("board:")) {
      socket.join(channel);
    }
  });
  socket.on("event", (evt) => {
    if (!evt || typeof evt.channel !== "string") return;
    // fan out to room minus sender
    socket.to(evt.channel).emit("event", evt);
  });
});

http.listen(port, () => {
  console.log(`[ws-proto] socket.io server listening on http://localhost:${port}`);
});
