# AGENTS.md — `@carbon/ai-chat`

Guidance for authoring inside [packages/ai-chat/](.). Read this before editing anything here.

## What this package is

The primary Carbon AI Chat app. Ships as:

- A React component tree rooted at [src/aiChatEntry.tsx](src/aiChatEntry.tsx).
- Lit web-component wrappers (`cds-aichat-container`, `cds-aichat-custom-element`) under [src/web-components/](src/web-components) that mount the same React tree via `@lit/react`.
- A server entry ([src/serverEntry.ts](src/serverEntry.ts)) exposing SSR-safe types/utilities only.

All entries compile via [tasks/rollup.aichat.js](tasks/rollup.aichat.js) to `dist/es/` (`cds--` prefix) and `dist/es-custom/` (`cds--custom` prefix, avoiding `@carbon/angular-components` collisions). TypeDoc emits to `dist/docs/`.

## Topic-specific guidance

Load only what you need:

- Working across the React/Lit boundary, shadow DOM, or slots → [architecture.md](references/architecture.md)
- Adding, editing, or wiring a service → [services.md](references/services.md)
- Writing or fixing a Jest test → [tests.md](references/tests.md)
- Shipping any UI change (WCAG 2.1 AA checklist, live-region patterns) → [Root accessibility.md](../../references/accessibility.md). For announcements use [`useAriaAnnouncer`](src/chat/hooks/useAriaAnnouncer.tsx) / [`AnnounceOnMountComponent`](src/chat/components/helpers/AnnounceOnMountComponent/AnnounceOnMountComponent.tsx); for blocking-error announcements pass `assertive: true` on the `AnnounceMessage`.
- Touching the store → [src/chat/store/AGENTS.md](src/chat/store/AGENTS.md)
- Touching public types or JSDoc → [src/types/AGENTS.md](src/types/AGENTS.md)
- Writing a code example (JSDoc `@example`, docs snippet) → [code-examples.md](references/code-examples.md)
- Editing public docs in [docs/](docs/) → [docs/AGENTS.md](docs/AGENTS.md)

## Where things live

- [src/chat/](src/chat/) — the chat application. Do most feature work here.
  - `AppShell.tsx`, `ChatAppEntry.tsx`, `AppShellPanels.tsx`, `AppShellWriteableElements.tsx` — top-level composition.
  - `store/` — Redux-style store. Hard rules in [src/chat/store/AGENTS.md](src/chat/store/AGENTS.md).
  - `services/` — long-lived singletons wired in `ServiceManager.ts` and `loadServices.ts`. See [services.md](references/services.md). `ChatActionsImpl.ts` is the instance-facing API — public methods added here must also be reflected on `ChatInstance` in `instance/`.
  - `instance/` — public `ChatInstance` object. Breaking changes here break every consumer; prefer additive API.
  - `events/` — typed pub/sub for the public event API. Event names and payloads are part of the public contract.
  - `schema/` — runtime message/config schema. Keep in sync with types in [src/types/](src/types/).
  - `hocs/`, `hooks/`, `contexts/`, `providers/` — React glue. Hooks reading the store use `useSelector` from the local store, not bespoke subscriptions.
  - `languages/` — `intl-messageformat` string bundles. Adding a key means adding it to every locale file in the same PR; English is the source of truth.
  - `components/` vs `components-legacy/` — **always author new UI in `components/`**. `components-legacy/` is closed to new components; bug fixes and refactoring transitions out are welcome. Lift to `@carbon/ai-chat-components` when a component has no chat-specific state.
  - `ai-chat-components/` — React bindings (`@lit/react`) around the sibling package's Lit components.
- [src/react/](src/react/) — public React wrapper components re-exported from the package root.
- [src/web-components/](src/web-components/) — Lit hosts. Kept thin: bridge props/events/slots to the React core.
- [src/types/](src/types/) — public type surface. Anything exported through `aiChatEntry.tsx` is public API; treat edits with semver discipline. **Read [src/types/AGENTS.md](src/types/AGENTS.md) before editing** — TypeDoc output ships as the public docs site.
- [tests/](tests/) — Jest specs in `spec/` folders under `tests/<area>/`. Setup in `setup.ts`; shared fixtures in `test_helpers.ts`. See [tests.md](references/tests.md).
- [docs/](docs/) — consumer-facing docs published via TypeDoc. See [docs/AGENTS.md](docs/AGENTS.md) before editing.

## Build, test, lint

From this package directory:

```bash
npm run build      # rollup + typedoc
npm start          # rollup --watch + typedoc --watch + local doc server on :5001
npm test           # jest with coverage
npx jest path/to/file_spec.ts
npx jest -t "pattern"
```

## Gotchas

- **Custom store hooks**: `useSelector` and `useDispatch` come from `src/chat/store/hooks/` — **not** `react-redux`. Import from the local store.
- **Relative-import extensions**: `moduleResolution` is classic `node`, so relative imports of `.ts`/`.tsx` source resolve **with or without** a trailing `.js` — extensionless is the de-facto convention across the tree, and both `npm run build` (rollup) and `tsc --noEmit` accept either. Jest's `moduleNameMapper` strips a trailing `.js` from relative imports, so tests handle both too. Keep the extension only when the target is a real built `.js` file in a dependency (e.g. `import Card from "@carbon/ai-chat-components/es/react/card.js"`) — those are actual files, not TS source.
- **Relaxed TS strictness**: `tsconfig` sets `strictNullChecks: false` and `strictFunctionTypes: false`. Don't assume null safety; check explicitly or add guards.
- **React runs inside shadow DOM**: the `cds-aichat-*` custom elements mount React into a shadow root. User-defined responses and writeable elements use slotted content; follow existing patterns. Background in [architecture.md](references/architecture.md).

## Definition of done

See [definition-of-done.md](../../references/definition-of-done.md) for the gate. Additionally: if you changed anything under `src/types/`, `aiChatEntry.tsx`, or `serverEntry.ts`, verify a consumer (`demo/` or an example) still builds against the new artifacts.

## Authoring rules

- **Public API changes**: anything exported from `aiChatEntry.tsx`, `serverEntry.ts`, or `types/` is semver-visible. Coordinate with a `feat`/`fix!`/`BREAKING CHANGE` footer. JSDoc/TypeDoc rules: [src/types/AGENTS.md](src/types/AGENTS.md).
- **Store**: see [src/chat/store/AGENTS.md](src/chat/store/AGENTS.md). Reducers stay pure; side effects go through services or `store/actions.ts` / `store/subscriptions.ts`. `humanAgentReducers.ts` is a separate slice on purpose.
- **Services**: see [services.md](references/services.md). Wire through `ServiceManager` and `loadServices`; dispose in `ChatInstanceImpl.destroy()` and the matching `unloadServices()`.
- **i18n**: no user-visible strings in code. Route through `languages/`.
- **Tests**: see [tests.md](references/tests.md). Colocate helpers in `tests/test_helpers.ts`. Store tests exercise reducers directly; service tests use the mocks in `tests/services/`.
- **SCSS / RTL / prefix discipline**: see [code-patterns.md](../../references/code-patterns.md). Prefix discipline is build-breaking — never hardcode `cds--`; use `#{$prefix}--` in SCSS and the prefix helpers in TS.

## Troubleshooting

- **Build fails**: ensure `@carbon/ai-chat-components` is built first — `npm run build --workspace=@carbon/ai-chat-components`.
- **TypeDoc errors**: verify all `@param` tags in JSDoc match actual function parameters.
- **React portal not rendering**: check the browser console for shadow DOM errors; verify `window.chatInstance` exists. Background in [architecture.md](references/architecture.md).

## Related guidance

- [Root AGENTS.md](../../AGENTS.md) — monorepo conventions
- [../ai-chat-components/AGENTS.md](../ai-chat-components/AGENTS.md) — Lit component authoring
- [../../references/code-review.md](../../references/code-review.md) — review rubric
