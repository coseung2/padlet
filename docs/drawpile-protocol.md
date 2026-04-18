# Drawpile ↔ Aura-board postMessage Protocol

> **Status: NOT YET IMPLEMENTED (requires Drawpile fork patch).**
> Spec below is the contract that `DrawingBoard.tsx` will enforce once the
> Drawpile fork's save bridge is shipped. Until then, the iframe loads the
> vanilla Drawpile web client (or nothing, if `NEXT_PUBLIC_DRAWPILE_URL` is
> unset) and no messages are exchanged.

## Origins
- Parent (Aura-board): `https://aura-board.app` (prod) or `http://localhost:3000` (dev).
- Child (Drawpile fork): `process.env.NEXT_PUBLIC_DRAWPILE_URL`, e.g. `https://drawpile.aura-board.app`.

Both sides MUST validate `event.origin` against an allowlist and reject all other senders.

## Frame attributes
```html
<iframe
  src={DRAWPILE_URL}
  title="그림보드 작업실"
  sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
/>
```

## Events — child → parent

### `drawpile:ready`
Sent once when the Drawpile web client finishes booting and is ready to accept
commands. Parent responds with `drawpile:load` if a previously-saved asset
should be opened.

```json
{ "type": "drawpile:ready", "version": "1" }
```

### `drawpile:save`
Sent when the user confirms "저장" inside Drawpile. Parent creates (or updates)
a `StudentAsset` row via `POST /api/student-assets/ingest` (not yet
implemented).

```json
{
  "type": "drawpile:save",
  "payload": {
    "assetId": "ck…",                // present on re-save of an existing asset
    "fileUrl": "https://…/file.png", // URL hosted by Drawpile server
    "thumbnailUrl": "https://…/thumb.png",
    "title": "string",
    "width": 1280,
    "height": 720,
    "format": "png"                  // "png" | "ora"
  }
}
```

### `drawpile:error`
```json
{ "type": "drawpile:error", "message": "string" }
```

## Events — parent → child

### `drawpile:load`
```json
{ "type": "drawpile:load", "payload": { "fileUrl": "https://…/file.ora" } }
```

## Security
- Parent rejects any message whose `event.origin` does not exactly match the
  configured Drawpile origin.
- Child rejects any non-allowlisted parent origin.
- `fileUrl` MUST be on the Drawpile origin; parent does not follow redirects
  for the resulting ingest.
- Parent MUST NOT echo `event.data` back into the DOM without sanitization.

## Not in scope of this task (deferred)
- Implementing the listener in `DrawingBoard.tsx` (postMessage handler).
- Adding the `POST /api/student-assets/ingest` endpoint.
- Modifying the Drawpile fork to emit these events from its save action.
- Live COOP/COEP headers on the Aura-board origin.
