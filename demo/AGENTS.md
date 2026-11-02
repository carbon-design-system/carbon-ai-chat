# AGENTS.md — Demo app

Guidance for authoring inside [demo/](.). Read this before changing the demo.

## What this is

`@carbon/ai-chat-examples-demo` — the canonical demo and integration-test harness for `@carbon/ai-chat`. Where we exercise the **whole** config surface (toggles, mock service desk, Playwright suites). Single-feature examples belong in [examples/](../examples/), not here.

## Layout

- `src/framework/` — config switchers and state plumbing.
- `src/customSendMessage/` — mock backend responses.
- `src/mockServiceDesk/` — fake human-agent service desk.
- `src/fixtures/` — canned messages for the mock backend.
- `src/host-compatibility/` — host compatibility harness.
- `tests/` — Playwright specs and node polyfills.

## Authoring rules

- **Adding a new config toggle**: create a `demo-<thing>-switcher.ts` in `framework/`, register it where the other switchers are wired (search `demo-layout-switcher` for the pattern), and persist its state through `config-manager.ts` so query-string deep links keep working. Also add it to [TEST_PLAN.md](TEST_PLAN.md).
- **Adding a new mock response**: add a `do<Thing>.ts` in `customSendMessage/` and route it from `customSendMessage.ts`. Keep fixtures in `fixtures/`, not inline, so Playwright can assert against them.
- **React vs web-components parity**: anything in `src/react/` should have a `src/web-components/` counterpart with the same filename stem so the framework can switch between them (`DemoApp.tsx` ↔ `demo-app.ts`).
- **Slots / custom footer / user-defined responses**: follow the existing `*WriteableElementExample` and `UserDefinedResponseExample` patterns and mirror them across both directories.
- **Service desk changes**: the mock service desk in `mockServiceDesk/` is the reference implementation of the service-desk interface. Keep it updated when the interface in `@carbon/ai-chat` changes — tests here often catch breaking changes first.
- **Playwright tests**: put new specs under `tests/`. `node-polyfill.js` is required via `NODE_OPTIONS`; use `npm test`, not `playwright test` directly. Don't reach for `--experimental-loader` here — an off-thread loader and Playwright's own sync `module.registerHooks` transform can't coexist, and the pair fails while loading the CJS entry point. When behavior changes, update [TEST_PLAN.md](TEST_PLAN.md) alongside the automated test.
- **Carbon flavor**: match the directory using [code-patterns.md](../references/code-patterns.md#carbon-flavor-by-area).
- **Dependencies**: as a `"private": true` app, depend freely on `@carbon/react`, `@carbon/web-components`, etc. — but don't import demo-only helpers from `@carbon/ai-chat` source.
- **Copy on screen**: the demo is a harness, not a shipped surface, so it has no copy type of its own. Voice still binds ([tone.md](../references/tone.md)), and anything a person reads follows [ui-strings.md](../.bob/skills/caic-copy-writer/references/ui-strings.md) — type 6 — minus the public-API gate that applies inside the package.

## Definition of done

For guidance-only edits, use the [guidance gate](../references/definition-of-done.md#minimum-gate-by-area-edited). For demo code changes:

- `npm run build --workspace=@carbon/ai-chat-examples-demo`
- `npm run test --workspace=@carbon/ai-chat-examples-demo`
- If you added or changed a config toggle, update [TEST_PLAN.md](TEST_PLAN.md).

## Build, run, test

See root [AGENTS.md](../AGENTS.md) for monorepo setup. The demo consumes the **built** artifacts of `@carbon/ai-chat` and `@carbon/ai-chat-components`, so use the [build preflight](../references/commands.md#build-preflight). `vite.config.ts` lists those packages under `optimizeDeps.exclude` so a package rebuild reaches the browser without a manual optimizer purge.

Local shortcuts from this directory:

```bash
npm start          # Vite dev server (default port 3001)
npm run build      # type-check, then production Vite build
npm run preview    # serve the production build
npm test           # playwright against `build` + `preview` (uses node-polyfill.js)
```

Single Playwright test:

```bash
npm test -- tests/<file>.spec.ts
npm test -- -g "pattern"
npm test -- --ui
```

These commands preserve the script's `NODE_OPTIONS` preload.

When `CI` is unset, Playwright reuses any server already on port 3001 and skips its own build and preview. The suite expects the production preview. If a server answers on port 3001, such as the `aiChat:start` dev server, do not run the suite against it. Ask the user to stop that server, build the packages after asking, then run the suite.
