# AGENTS.md — `@carbon/ai-chat`

Guidance for [this package](.).

## What this package is

Carbon AI Chat ships as:

- A React component tree rooted at [the React entry](src/aiChatEntry.tsx).
- Lit web-component wrappers (`cds-aichat-container`, `cds-aichat-custom-element`) under [src/web-components/](src/web-components) that own startup and mount the React tree for every host. React components render through `cds-aichat-container`.
- [The server entry](src/serverEntry.ts) exports only types and utilities safe for server rendering.

All entries build through [the build task](tasks/rollup.aichat.js). Output goes to `dist/es/` with the `cds--` prefix and `dist/es-custom/` with `cds--custom`. The custom prefix avoids clashes with `@carbon/angular-components`. TypeDoc writes to `dist/docs/`.

**Carbon flavor**: use `@carbon/web-components` through `@lit/react`; see [the Carbon rules](../../references/code-patterns.md#carbon-flavor-by-area) for the area rules and skill override.

## Read the guide for your task

Load only what you need:

- Working across React and Lit, shadow DOM, or slots → [host guide](references/architecture.md).
- Adding, editing, or wiring a service → [service guide](references/services.md).
- Changing hooks or view-owned logic in `utils/` or `services/` → [hook guide](src/chat/hooks/AGENTS.md).
- Adding config fields or host properties or attributes, or editing CEM metadata → [manifest guide](references/manifests.md).
- Writing or fixing a Jest test → [test guide](references/tests.md).
- Changing host-visible behavior → [contract tests](references/tests.md#contract-tests-pin-host-behavior): add proof in the same commit; follow the stop rule and manifest workflow.
- Shipping UI (WCAG 2.1 AA, live regions, announcer helpers, and when to use `assertive`) → [access guide](../../references/accessibility.md).
- Touching the store → [store guide](src/chat/store/AGENTS.md).
- Touching public types or JSDoc → [type guide](src/types/AGENTS.md).
- Writing a code example (JSDoc `@example`, docs snippet) → [example guide](references/code-examples.md).
- Editing public docs in [docs/](docs/) → [docs guide](docs/AGENTS.md).

## Where things live

- [src/chat/](src/chat/) — the chat application. Do most feature work here.
  - `store/` — Redux-style store.
  - `services/` — chat services wired through `ServiceManager.ts` and `loadServices.ts`. It also holds view-owned classes with explicit cleanup. `ChatInstanceService.ts` holds the instance API. Add its new public methods to [`ChatInstance`](src/types/instance/ChatInstance.ts) too.
  - `events/` — typed pub/sub for the public event API. Event names and payloads are part of the public contract.
  - `schema/` — runtime message/config schema. Keep in sync with types in [src/types/](src/types/).
  - `languages/` — `intl-messageformat` strings in one locale file. [LanguagePack](src/types/config/LanguagePack.ts) is their public type. Adding a key grows the public API. Renaming one breaks it. Hosts translate through `PublicConfig.strings`; word new strings per [UI copy rules](../../.bob/skills/caic-copy-writer/references/ui-strings.md).
  - `components/` and `components-legacy/` — follow [component placement](../../references/code-patterns.md#component-placement) when adding or moving UI.
  - `ai-chat-components/` — React bindings (`@lit/react`) around the sibling package's Lit components.
- [src/react/](src/react/) — public React wrapper components re-exported from the package root.
- [src/web-components/](src/web-components/) — Lit hosts. Kept thin: bridge props/events/slots to the React core.
- [src/types/](src/types/) — public types. Exports from `aiChatEntry.tsx` are public API. Follow semver when you edit them. TypeDoc output ships as the public docs site.

## Build, test, lint

From this package directory:

```bash
npm run build      # rollup + element manifest
npm run build:docs # rollup + element manifest + typedoc
npm run docs       # typedoc only — the fast docs loop, no rollup needed
npm run clean      # remove dist/ and custom-elements.json
npm start          # rollup --watch + typedoc --watch + local doc server on :5001
```

## Gotchas

- **Custom store hooks**: `useSelector` comes from `src/chat/hooks/` — **not** `react-redux`. There is no `useDispatch`; dispatch through `serviceManager.store.dispatch` with an action creator from `store/actions.ts`.
- **Import extensions**: `moduleResolution` is `bundler`. Relative TS source imports work with or without `.js`. Omit it to follow repo style. Rollup, `tsc --noEmit`, and Jest accept both forms. For a deep package import, `bundler` checks the package's `exports` map. Use the real built path with `.js`, such as `@carbon/ai-chat-components/es/react/card.js`.
- **TS checks**: `tsconfig` sets `strictNullChecks: false` and `strictFunctionTypes: false`. Check for null or add guards.
- **React runs inside shadow DOM**: the `cds-aichat-*` custom elements mount React into a shadow root. User-defined responses and writeable elements use slotted content; follow existing patterns. Background in [host guide](references/architecture.md).

## Definition of done

Use the gate in [done guide](../../references/definition-of-done.md). If you change `src/types/`, `aiChatEntry.tsx`, or `serverEntry.ts`, also build a consumer against the new output. Use `demo/` or an example.

## Authoring rules

- **Public API changes**: exports from `aiChatEntry.tsx`, `serverEntry.ts`, or `types/` affect semver. Use a `feat`/`fix!`/`BREAKING CHANGE` footer. JSDoc/TypeDoc rules: [type guide](src/types/AGENTS.md).
- **i18n**: no user-visible strings in code. Route through `languages/`.
