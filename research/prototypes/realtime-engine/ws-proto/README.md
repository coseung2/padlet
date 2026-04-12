# 자체 WS Prototype (socket.io)

Stands in for the "build our own" candidate. socket.io is chosen because its
rooms API maps 1:1 onto `boardChannelKey`/`sectionChannelKey` in `src/lib/realtime.ts`.
Raw `ws` would be smaller on the wire; switching is a drop-in replacement
in this proto.

## Run

```bash
npm install
WS_PORT=3202 npm run server &
WS_PORT=3202 npm run bench
```

Emits a JSON blob with the same shape as yjs-proto.
