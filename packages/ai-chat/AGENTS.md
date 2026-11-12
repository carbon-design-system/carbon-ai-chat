# AGENTS.md — `@carbon/ai-chat`

Guidance for [packages/ai-chat/](.).

## What this package is

Carbon AI Chat ships as:

- A React component tree rooted at [src/aiChatEntry.tsx](src/aiChatEntry.tsx).
- Lit web-component wrappers (`cds-aichat-container`, `cds-aichat-custom-element`) under [src/web-components/](src/web-components) that own startup for every host. `cds-aichat-container` renders the React app. Inside it, private Lit views under `src/chat/components/` render the shell, home screen, header, launcher, input, and panels.
- A server entry ([src/serverEntry.ts](src/serverEntry.ts)) exposing SSR-safe types/utilities only.

All entries compile via [tasks/rollup.aichat.js](tasks/rollup.aichat.js) to `dist/es/` (`cds--` prefix) and `dist/es-custom/` (`cds--custom` prefix, avoiding `@carbon/angular-components` collisions). TypeDoc emits to `dist/docs/`.

**Carbon flavor**: use `@carbon/web-components` through `@lit/react`; see [code-patterns.md](../../references/code-patterns.md#carbon-flavor-by-area) for the area rules and skill override.

## Topic-specific guidance

Load only what you need:

- Working across the React/Lit boundary, shadow DOM, or slots → [architecture.md](references/architecture.md)
- Adding, editing, or wiring a service → [services.md](references/services.md)
- Changing assistant message flows, data helpers, or view ports → [messaging ownership](src/sdk/services/messaging/AGENTS.md)
- Changing hooks or view-owned logic in `utils/` or `services/` → [hooks/AGENTS.md](src/chat/hooks/AGENTS.md)
- Adding config fields or host properties/attributes, or editing CEM metadata → [manifests.md](references/manifests.md)
- Writing or fixing a Jest test → [tests.md](references/tests.md)
- Shipping any UI change (WCAG 2.1 AA checklist, live-region patterns, the announcer helpers, and when an announcement should be `assertive`) → [Root accessibility.md](../../references/accessibility.md)
- Adding code to `src/sdk/`, or deciding whether it's public → [src/sdk/AGENTS.md](src/sdk/AGENTS.md)
- Touching the store → [src/sdk/store/AGENTS.md](src/sdk/store/AGENTS.md)
- Touching public types or JSDoc → [src/types/AGENTS.md](src/types/AGENTS.md)
- Writing a code example (JSDoc `@example`, docs snippet) → [code-examples.md](references/code-examples.md)
- Editing public docs in [docs/](docs/) → [docs/AGENTS.md](docs/AGENTS.md)

## Where things live

- [src/sdk/](src/sdk/) — the headless engine: everything a chat needs to run without a view. `createChatSDK` starts a chat with no view, DOM, or storage, and returns a handle with `release()` and `destroy()`. `registry.ts` keeps one chat per namespace: a released chat waits a grace window, and a create on its namespace inside the window gets it back ([ADR-0003](../../docs/adr/0003-chat-survives-remount.md)). The SDK entry always goes through it; the prebuilt chat does only with `lifecycle.reuseInstance` on, and then gives each mount its own `ChatInstance`. A chat with a view and one without never adopt each other. Internal in 1.x: `index.ts` is its future public entry, and no package entry point exports it.
  - `store/` — Redux-style store, plus the seams the prebuilt chat uses to attach its view partition to it.
  - `services/` — chat-instance services wired through `ServiceManager.ts` and `loadServices.ts`. `ChatInstanceService.ts` is the instance-facing API — public methods added here must also be reflected on `ChatInstance` in [`src/types/instance/ChatInstance.ts`](src/types/instance/ChatInstance.ts).
  - `services/messaging/` — `MessageCoordinator` and its private workflows, pure `inbound/`, `outbound/`, and `state/` helpers, and the presentation port. The human-agent service lives in `services/haa/`.
  - `events/` — typed pub/sub for the public event API. Event names and payloads are part of the public contract.
  - `schema/` — runtime message/config schema. Keep in sync with types in [src/types/](src/types/).
  - `utils/` — helpers that conversation code uses. View code may import them too.
  - `languages/` — `intl-messageformat` string bundles, one locale file. [LanguagePack.ts](src/types/config/LanguagePack.ts) declares the public `LanguagePack` type over it, so adding a key widens public API and renaming one breaks it. Hosts translate through `PublicConfig.strings`; word new strings per [ui-strings.md](../../.bob/skills/caic-copy-writer/references/ui-strings.md).
- [src/chat/](src/chat/) — the prebuilt interface. Do most feature work here.
  - `state/` — the view partition, under `view` in the chat's one store: panels, layout, loading indicators, announcements, the unread agent count, the values derived from config (header, layout, launcher, and shortcut defaults, CSS overrides, and the theme), the open confirmation (`prompt`, whose answers `prompts.ts` keeps for as long as the chat), each message item's view flags, keyed by public item ID (`messageItemFlags.ts`), and the view half of saved state. Conversation code can't see it. Internal; never exported.
  - `services/` — view-owned classes with explicit cleanup: `ChatMountState`, extension hosts, the announcer, the theme watcher, the messaging presentation adapter, and the human-agent view callbacks.
  - `utils/` — view helpers, including DOM, focus, and shell lifecycle code.
  - `components/` and `components-legacy/` — follow [component placement](../../references/code-patterns.md#component-placement) when adding or moving UI. Private Lit views that read chat state extend `components/shared/NativeChatView.ts`.
- [src/react/](src/react/) — public React wrapper components re-exported from the package root.
- [src/web-components/](src/web-components/) — Lit hosts. They own startup, config updates, live regions, and extension hosts. Put new startup work here, not in React.
- [src/types/](src/types/) — public type surface. Anything exported through `aiChatEntry.tsx` is public API; treat edits with semver discipline. TypeDoc output ships as the public docs site.

## Source boundaries

A test fails when a folder imports outside its rules, through type-only imports too:

| Folder | May import |
| --- | --- |
| `src/sdk/` | `src/sdk/`, `src/types/` |
| `src/types/` | `src/types/`, plus types and JSON data from `src/sdk/` engine folders, not its entry files |
| everything else | anything |

Nothing `src/sdk/` reaches may import React, React DOM, Lit, or a module that registers a custom element. Each exception still allowed today is listed with the issue that removes it. So a new service that works without a view goes in `src/sdk/services/`. One that touches the DOM or `ChatMountState` goes in `src/chat/services/`. SDK code reaches the view only through the ports in [viewBindings.ts](src/sdk/services/viewBindings.ts), which the mounted view attaches. The rules and their exceptions are in [the boundary spec](tests/architecture/spec/sourceBoundaries_spec.ts). The prebuilt interface reads conversation data through `instance.state`, as a host does. Each read that doesn't yet is listed with its owner issue in [conversationReadGaps.ts](tests/architecture/conversationReadGaps.ts), and [its spec](tests/architecture/spec/conversationReadGaps_spec.ts) fails on a new one. [The SDK surface snapshot](tests/architecture/spec/sdkSurface_spec.ts) lists every type and field the SDK entry reaches, so a change to it shows up in review.

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

- **Custom store hooks**: `useSelector` comes from `src/chat/hooks/` — **not** `react-redux`. There is no `useDispatch`; dispatch through `serviceManager.store.dispatch` with an action creator from `src/sdk/store/actions.ts`, or `viewActions` from `src/chat/state/` for view state.
- **Two partitions, one store**: `ServiceManager.store` is typed with `ConversationState`, so SDK code can't read view state. In `chat/`, `chatStore(serviceManager)` gives the whole store, and view slices are under `state.view`.
- **Import extensions**: `moduleResolution` is `bundler`, so relative imports of TS source resolve **with or without** a trailing `.js`; extensionless is the convention across the tree, and rollup, `tsc --noEmit`, and Jest all accept either. A deep import into a dependency is different: `bundler` enforces the package's `exports` map, so write the real built file, `.js` included (e.g. `@carbon/ai-chat-components/es/react/card.js`).
- **Relaxed TS strictness**: `tsconfig` sets `strictNullChecks: false` and `strictFunctionTypes: false`. Don't assume null safety; check explicitly or add guards.
- **React runs inside shadow DOM**: the `cds-aichat-*` custom elements mount React into a shadow root. User-defined responses and writeable elements use slotted content; follow existing patterns. Background in [architecture.md](references/architecture.md).

## Definition of done

See [definition-of-done.md](../../references/definition-of-done.md) for the gate. Additionally: if you changed anything under `src/types/`, `aiChatEntry.tsx`, or `serverEntry.ts`, verify a consumer (`demo/` or an example) still builds against the new artifacts.

## Authoring rules

- **Public API changes**: anything exported from `aiChatEntry.tsx`, `serverEntry.ts`, or `types/` is semver-visible. Coordinate with a `feat`/`fix!`/`BREAKING CHANGE` footer. JSDoc/TypeDoc rules: [src/types/AGENTS.md](src/types/AGENTS.md).
- **i18n**: no user-visible strings in code. Route through `languages/`.
