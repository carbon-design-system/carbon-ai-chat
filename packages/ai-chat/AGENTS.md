# AGENTS.md — `@carbon/ai-chat`

Guidance for authoring inside [packages/ai-chat/](.). Read this before editing anything here.

## What this package is

The primary Carbon AI Chat app. Ships as:

- A React component tree rooted at [src/aiChatEntry.tsx](src/aiChatEntry.tsx).
- Lit web-component wrappers (`cds-aichat-container`, `cds-aichat-custom-element`) under [src/web-components/](src/web-components) that mount the same React tree via `@lit/react`.
- A server entry ([src/serverEntry.ts](src/serverEntry.ts)) exposing SSR-safe types/utilities only.

All entries compile via [tasks/rollup.aichat.js](tasks/rollup.aichat.js) to `dist/es/` (`cds--` prefix) and `dist/es-custom/` (`cds--custom` prefix, avoiding `@carbon/angular-components` collisions). TypeDoc emits to `dist/docs/`.

## Where things live

- [src/chat/](src/chat/) — the chat application. Do most feature work here.
  - `AppShell.tsx`, `ChatAppEntry.tsx`, `AppShellPanels.tsx`, `AppShellWriteableElements.tsx` — top-level composition.
  - `store/` — Redux-style store. See [src/chat/store/AGENTS.md](src/chat/store/AGENTS.md) for hard rules (pure reducers, synchronous dispatch, no middleware).
  - `services/` — long-lived singletons wired in `ServiceManager.ts` and `loadServices.ts`. `ChatActionsImpl.ts` is the instance-facing API — public methods added here must also be reflected on the `ChatInstance` type in `instance/`.
  - `instance/` — the public `ChatInstance` object. Breaking changes here are breaking changes for every consumer; prefer additive API.
  - `events/` — typed pub/sub for the public event API. Event names and payloads are part of the public contract.
  - `schema/` — runtime message/config schema. Keep in sync with types in [src/types/](src/types/).
  - `hocs/`, `hooks/`, `contexts/`, `providers/` — React glue. Hooks reading the store should use `useSelector` from the local store, not bespoke subscriptions.
  - `languages/` — `intl-messageformat` string bundles. When adding a key, add it to every locale file in the same PR; English is the source of truth.
  - `components/` vs `components-legacy/` — **always author new UI in `components/`**. `components-legacy/` is closed to new components; bug fixes and refactoring transitions out are welcome. Lift a component to `@carbon/ai-chat-components` when it has no chat-specific state and could plausibly be consumed outside the chat app.
  - `ai-chat-components/` — React bindings (`@lit/react`) around the sibling package's Lit components.
- [src/react/](src/react/) — public React wrapper components re-exported from the package root.
- [src/web-components/](src/web-components/) — Lit hosts. Kept thin: bridge props/events/slots to the React core.
- [src/types/](src/types/) — public type surface. Anything exported through `aiChatEntry.tsx` is public API; treat edits with semver discipline. **Read [src/types/AGENTS.md](src/types/AGENTS.md) before editing** — TypeDoc output ships as the public docs site, is indexed into Elasticsearch, and is served by an MCP developer-helper. JSDoc here is product copy.
- [tests/](tests/) — Jest specs in `spec/` folders under `tests/<area>/` (e.g. `tests/store/spec/*_spec.ts`). Naming is `_spec.ts(x)`, not `.test.ts`, and tests are not colocated with source — opposite of `@carbon/ai-chat-components`. Areas: `store/`, `services/`, `instance/`, `config/`, `transforms/`, `utils/`. `setup.ts` installs DOM + testing-library setup; `test_helpers.ts` has shared fixtures.
- [docs/](docs/) — consumer-facing docs published via TypeDoc. See [docs/AGENTS.md](docs/AGENTS.md) before editing — these files ship to the public site.

## Build, test, lint

From this package directory:

```bash
npm run build      # rollup + typedoc
npm start          # rollup --watch + typedoc --watch + local doc server on :5001
npm test           # jest with coverage
npx jest path/to/file_spec.ts
npx jest -t "pattern"
```

The rollup config watches `../ai-chat-components/es/**`. Editing the sibling package too? Run `npm run aiChat:start` from the repo root to rebuild both.

## Gotchas

- **Custom store hooks**: `useSelector` and `useDispatch` come from `src/chat/store/hooks/` — **not** `react-redux`. Import from the local store.
- **ESM `.js` extensions in imports**: TS source uses explicit `.js` extensions on relative imports even when the file is `.ts`/`.tsx` (e.g. `import { foo } from "./bar.js"`). Jest's `moduleNameMapper` rewrites these at test time. Omitting the extension breaks the build.
- **Relaxed TS strictness**: `tsconfig` sets `strictNullChecks: false` and `strictFunctionTypes: false`. Don't assume null safety; check explicitly or add guards.
- **React runs inside shadow DOM**: the `cds-aichat-*` custom elements mount React into a shadow root. User-defined responses and writeable elements use slotted content; follow the existing patterns rather than reaching into the shadow tree.

## Definition of done

See root [AGENTS.md](../../AGENTS.md#definition-of-done) for the gate. Additionally: if you changed anything under `src/types/`, `aiChatEntry.tsx`, or `serverEntry.ts`, verify a consumer (`demo/` or an example) still builds against the new artifacts.

## Authoring rules

- **Prefix discipline (CRITICAL — build-breaking)**: never hardcode `cds--` in SCSS or TSX class strings. Use `#{$prefix}--` in SCSS and the prefix helpers in TS, otherwise the `es-custom` build breaks.
- **RTL**: use CSS logical properties (`inline-start`, `block-end`, etc.). Validate via the demo's direction switcher before shipping.
- **Public API changes**: anything exported from `aiChatEntry.tsx`, `serverEntry.ts`, or `types/` is semver-visible. Coordinate with a `feat`/`fix!`/`BREAKING CHANGE` footer. JSDoc/TypeDoc rules: [src/types/AGENTS.md](src/types/AGENTS.md).
- **Store**: see [src/chat/store/AGENTS.md](src/chat/store/AGENTS.md). Reducers stay pure; side effects go through services or `store/actions.ts` / `store/subscriptions.ts`. `humanAgentReducers.ts` is a separate slice on purpose.
- **Services**: wire new services through `ServiceManager` and `loadServices`; dispose them in `ChatInstanceImpl.destroy()` and the matching `unloadServices()` teardown. See `tests/services/` for disposal patterns — leaking a subscription across instance re-creation is a common regression.
- **i18n**: no user-visible strings in code. Route through `languages/`.
- **Tests**: colocate helpers in `tests/test_helpers.ts`. Store tests should exercise reducers directly; service tests should use the mocks in `tests/services/`. For instance-level regressions, add to `tests/instance/`.
