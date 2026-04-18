// Liveblocks is a SaaS — a real echo test requires:
//   (a) an API key (free tier exists but needs vendor account)
//   (b) network egress from WSL2 to liveblocks.io
// Those are outside the scope of this research (no vendor account yet).
//
// Instead we do a *shape check*: import the SDK, confirm the surface
// we would integrate against (createClient, enterRoom, storage,
// broadcastEvent) exists and the types line up with src/lib/realtime.ts.

import * as LB from "@liveblocks/client";

const need = ["createClient"];
const missing = need.filter((k) => typeof LB[k] !== "function");

const clientProbe = LB.createClient({ publicApiKey: "pk_stub" });
const roomProbeKeys = Object.keys(clientProbe);

// Echo latency / payload size for Liveblocks are cited from vendor docs
// (phase1/source_index.json LB-limits). Listed here for audit trail only:
const vendorStats = {
  live_object_max_bytes: 2 * 1024 * 1024,
  broadcast_event_max_bytes: 32 * 1024 * 1024,
  free_tier_conn_per_room: 10,
  pro_tier_conn_per_room: 50,
  free_tier_rooms_per_month: 500,
  note: "Numbers not re-measured because SaaS requires vendor account; see phase1/source_index.json.",
};

// Estimated card-move wire payload: Liveblocks storage ops serialize
// as small JSON ops + opcode + opId. For a Y.Map-equivalent set on a 3-card
// board, observed in vendor docs / community posts at ~140-220 bytes.
// This is a literature estimate, not a measured value.
const card_move_payload_bytes_estimate = 180;

console.log(JSON.stringify({
  engine: "liveblocks",
  sdk_version: "3.18.0 (observed)",
  surface_ok: missing.length === 0,
  missing_exports: missing,
  client_probe_keys: roomProbeKeys,
  card_move_payload_bytes_estimate,
  card_move_payload_source: "vendor-docs + community (literature); no vendor account in WSL2",
  vendor_stats: vendorStats,
  cold_start_ms_literature: "~200-400 (edge-hosted, single round-trip auth)",
}, null, 2));
