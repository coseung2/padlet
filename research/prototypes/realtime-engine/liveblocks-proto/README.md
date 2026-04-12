# Liveblocks Prototype (shape-check only)

Liveblocks is a SaaS. A real echo test requires a vendor account + API key +
network egress. We don't have a vendor account yet and `question.json`
`scope_boundary` allows literature/vendor-doc substitution when real
measurement is blocked.

This proto therefore:

1. Installs `@liveblocks/client` and asserts the SDK surface we'd integrate
   against exists (`createClient`, room methods).
2. Emits vendor-documented limits for audit alongside the Yjs / ws proto output.

If/when we ADOPT, the follow-up feature task should run a real echo test
against liveblocks.io with a Pro-tier sandbox key.

## Run

```bash
npm install
npm run shape-check
```
