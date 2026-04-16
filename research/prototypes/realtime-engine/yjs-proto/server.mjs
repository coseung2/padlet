// Minimal Yjs WebSocket server. We speak the y-websocket wire protocol by
// delegating message framing to a Y.Doc per docName (derived from URL path).
//
// Port 3201. Matches src/lib/realtime.ts channel-key convention via path.
//
// This is intentionally small — just enough to let two y-websocket clients
// sync a Y.Map. We use `ws` directly and lean on Yjs's own encoding helpers.

import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync.js";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

const port = Number(process.env.YJS_PORT || 3201);
const wss = new WebSocketServer({ port });

const docs = new Map(); // docName -> { doc, awareness, conns:Set<ws> }

function getDoc(name) {
  let entry = docs.get(name);
  if (!entry) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalState(null);
    entry = { doc, awareness, conns: new Set() };

    // Broadcast doc updates to all conns for this doc.
    doc.on("update", (update, origin) => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.writeUpdate(enc, update);
      const msg = encoding.toUint8Array(enc);
      for (const ws of entry.conns) if (ws !== origin && ws.readyState === 1) ws.send(msg);
    });
    awareness.on("update", ({ added, updated, removed }, origin) => {
      const changed = added.concat(updated).concat(removed);
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
      const msg = encoding.toUint8Array(enc);
      for (const ws of entry.conns) if (ws !== origin && ws.readyState === 1) ws.send(msg);
    });

    docs.set(name, entry);
  }
  return entry;
}

wss.on("connection", (ws, req) => {
  const docName = (req.url || "/").slice(1) || "default";
  const entry = getDoc(docName);
  entry.conns.add(ws);

  // Send initial sync step 1
  {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(enc, entry.doc);
    ws.send(encoding.toUint8Array(enc));
  }
  // Send current awareness
  const states = entry.awareness.getStates();
  if (states.size > 0) {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(entry.awareness, [...states.keys()]));
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
        syncProtocol.readSyncMessage(dec, enc, entry.doc, ws);
        if (encoding.length(enc) > 1) ws.send(encoding.toUint8Array(enc));
      } else if (type === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(entry.awareness, decoding.readVarUint8Array(dec), ws);
      }
    } catch (e) {
      console.error("[yjs-proto] message error", e);
    }
  });

  ws.on("close", () => {
    entry.conns.delete(ws);
    awarenessProtocol.removeAwarenessStates(entry.awareness, [entry.doc.clientID], ws);
  });
});

console.log(`[yjs-proto] y-websocket server listening on ws://localhost:${port}`);
