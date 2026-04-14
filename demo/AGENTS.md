# AGENTS.md — Demo app

Guidance for authoring inside [demo/](.). Read this before changing the demo.

## What this is

`@carbon/ai-chat-examples-demo` — the canonical demo and integration-test harness for `@carbon/ai-chat`. Where we exercise the **whole** config surface (toggles, mock service desk, Playwright suites). Single-feature examples belong in [examples/](../examples/), not here.

## Layout

```
demo/
  src/
    main.ts                     # entry — reads query params, mounts Lit root
    framework/                  # sidebar + config plumbing
      demo-*-switcher.ts        # one file per toggle (theme, layout, history, ...)
      config-manager.ts,
      react-app-manager.ts,
      set-chat-config-manager.ts
    customSendMessage/          # mock backend — one do*.ts per response type
    react/                      # React-based extension examples mounted by the demo
    web-components/             # Lit-based extension examples mounted by the demo
    mockServiceDesk/            # fake human-agent service desk
    fixtures/                   # canned messages used by the mock backend
    types/
  tests/                        # Playwright specs + node polyfills + alias loader
  playwright.config.ts
  webpack.config.js
  TEST_PLAN.md                  # manual QA checklist
```

## Authoring rules

- **Adding a new config toggle**: create a `demo-<thing>-switcher.ts` in `framework/`, register it where the other switchers are wired (search `demo-layout-switcher` for the pattern), and persist its state through `config-manager.ts` so query-string deep links keep working. Also add it to [TEST_PLAN.md](TEST_PLAN.md).
- **Adding a new mock response**: add a `do<Thing>.ts` in `customSendMessage/` and route it from `customSendMessage.ts`. Keep fixtures in `fixtures/`, not inline, so Playwright can assert against them.
- **React vs web-components parity**: anything in `src/react/` should have a `src/web-components/` counterpart with the same filename stem so the framework can switch between them (`DemoApp.tsx` ↔ `demo-app.ts`).
- **Writeable elements / custom footer / user-defined responses**: follow the existing `*WriteableElementExample` and `UserDefinedResponseExample` patterns and mirror them across both directories.
- **Service desk changes**: the mock service desk in `mockServiceDesk/` is the reference implementation of the service-desk interface. Keep it updated when the interface in `@carbon/ai-chat` changes — tests here often catch breaking changes first.
- **Playwright tests**: put new specs under `tests/`. The `node-polyfill.js` + `alias-loader.js` are required via `NODE_OPTIONS`; use `npm test`, not `playwright test` directly. When behavior changes, update [TEST_PLAN.md](TEST_PLAN.md) alongside the automated test.
- **Dependencies**: as a `"private": true` app, depend freely on `@carbon/react`, `@carbon/web-components`, etc. — but don't import demo-only helpers from `@carbon/ai-chat` source.

## Definition of done

- `npm run build --workspace=@carbon/ai-chat-examples-demo`
- `npm run test --workspace=@carbon/ai-chat-examples-demo`
- If you added or changed a config toggle, update [TEST_PLAN.md](TEST_PLAN.md).

## Build, run, test

See root [AGENTS.md](../AGENTS.md) for monorepo setup. The demo consumes the **built** artifacts of `@carbon/ai-chat` and `@carbon/ai-chat-components`, so the watcher (`npm run aiChat:start`) must be running in another terminal or webpack will resolve stale `dist/es/`.

Local shortcuts from this directory:

```bash
npm start          # webpack dev-server
npm run build      # production webpack build
npm test           # playwright (uses node-polyfill.js + alias-loader.js)
```

Single Playwright test:

```bash
npx playwright test tests/<file>.spec.ts
npx playwright test -g "pattern"
npx playwright test --ui
```
