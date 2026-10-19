# AGENTS.md — `@carbon/ai-chat`

Guidance for [packages/ai-chat/](.).

## What this package is

Carbon AI Chat ships as:

- A React component tree rooted at [src/aiChatEntry.tsx](src/aiChatEntry.tsx).
- Lit web-component wrappers (`cds-aichat-container`, `cds-aichat-custom-element`) under [src/web-components/](src/web-components) that own startup and mount the React tree for every host. React components render through `cds-aichat-container`.
- A server entry ([src/serverEntry.ts](src/serverEntry.ts)) exposing SSR-safe types/utilities only.

All entries compile via [tasks/rollup.aichat.js](tasks/rollup.aichat.js) to `dist/es/` (`cds--` prefix) and `dist/es-custom/` (`cds--custom` prefix, avoiding `@carbon/angular-components` collisions). TypeDoc emits to `dist/docs/`.

**Carbon flavor**: use `@carbon/web-components` through `@lit/react`; see [code-patterns.md](../../references/code-patterns.md#carbon-flavor-by-area) for the area rules and skill override.

## Topic-specific guidance

Load only what you need:

- Working across the React/Lit boundary, shadow DOM, or slots → [architecture.md](references/architecture.md)
- Adding, editing, or wiring a service → [services.md](references/services.md)
- Changing hooks or view-owned logic in `utils/` or `services/` → [hooks/AGENTS.md](src/chat/hooks/AGENTS.md)
- Writing or fixing a Jest test → [tests.md](references/tests.md)
- Shipping any UI change (WCAG 2.1 AA checklist, live-region patterns, the announcer helpers, and when an announcement should be `assertive`) → [Root accessibility.md](../../references/accessibility.md)
- Touching the store → [src/chat/store/AGENTS.md](src/chat/store/AGENTS.md)
- Touching public types or JSDoc → [src/types/AGENTS.md](src/types/AGENTS.md)
- Writing a code example (JSDoc `@example`, docs snippet) → [code-examples.md](references/code-examples.md)
- Editing public docs in [docs/](docs/) → [docs/AGENTS.md](docs/AGENTS.md)

## Where things live

- [src/chat/](src/chat/) — the chat application. Do most feature work here.
  - `store/` — Redux-style store.
  - `services/` — chat-instance services wired through `ServiceManager.ts` and `loadServices.ts`, plus view-owned classes with explicit cleanup. `ChatInstanceService.ts` is the instance-facing API — public methods added here must also be reflected on `ChatInstance` in [`src/types/instance/ChatInstance.ts`](src/types/instance/ChatInstance.ts).
  - `events/` — typed pub/sub for the public event API. Event names and payloads are part of the public contract.
  - `schema/` — runtime message/config schema. Keep in sync with types in [src/types/](src/types/).
  - `languages/` — `intl-messageformat` string bundles, one locale file. [LanguagePack.ts](src/types/config/LanguagePack.ts) declares the public `LanguagePack` type over it, so adding a key widens public API and renaming one breaks it. Hosts translate through `PublicConfig.strings`; word new strings per [ui-strings.md](../../.bob/skills/caic-copy-writer/references/ui-strings.md).
  - `components/` and `components-legacy/` — follow [component placement](../../references/code-patterns.md#component-placement) when adding or moving UI.
  - `ai-chat-components/` — React bindings (`@lit/react`) around the sibling package's Lit components.
- [src/react/](src/react/) — public React wrapper components re-exported from the package root.
- [src/web-components/](src/web-components/) — Lit hosts. Kept thin: bridge props/events/slots to the React core.
- [src/types/](src/types/) — public type surface. Anything exported through `aiChatEntry.tsx` is public API; treat edits with semver discipline. TypeDoc output ships as the public docs site.

## Build, test, lint

From this package directory:

```bash
npm run build      # rollup only
npm run build:docs # rollup + typedoc
npm run docs       # typedoc only — the fast docs loop, no rollup needed
npm run clean      # remove dist/ — a build overwrites it but never empties it
npm start          # rollup --watch + typedoc --watch + local doc server on :5001
```

## Gotchas

- **Custom store hooks**: `useSelector` comes from `src/chat/hooks/` — **not** `react-redux`. There is no `useDispatch`; dispatch through `serviceManager.store.dispatch` with an action creator from `store/actions.ts`.
- **Import extensions**: `moduleResolution` is `bundler`, so relative imports of TS source resolve **with or without** a trailing `.js`; extensionless is the convention across the tree, and rollup, `tsc --noEmit`, and Jest all accept either. A deep import into a dependency is different: `bundler` enforces the package's `exports` map, so write the real built file, `.js` included (e.g. `@carbon/ai-chat-components/es/react/card.js`).
- **Relaxed TS strictness**: `tsconfig` sets `strictNullChecks: false` and `strictFunctionTypes: false`. Don't assume null safety; check explicitly or add guards.
- **React runs inside shadow DOM**: the `cds-aichat-*` custom elements mount React into a shadow root. User-defined responses and writeable elements use slotted content; follow existing patterns. Background in [architecture.md](references/architecture.md).

## Definition of done

See [definition-of-done.md](../../references/definition-of-done.md) for the gate. Additionally: if you changed anything under `src/types/`, `aiChatEntry.tsx`, or `serverEntry.ts`, verify a consumer (`demo/` or an example) still builds against the new artifacts.

## Authoring rules

- **Public API changes**: anything exported from `aiChatEntry.tsx`, `serverEntry.ts`, or `types/` is semver-visible. Coordinate with a `feat`/`fix!`/`BREAKING CHANGE` footer. JSDoc/TypeDoc rules: [src/types/AGENTS.md](src/types/AGENTS.md).
- **i18n**: no user-visible strings in code. Route through `languages/`.
