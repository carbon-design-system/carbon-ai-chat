# AGENTS.md — `@carbon/ai-chat`

Guidance for [this package](.).

## What this package is

Carbon AI Chat ships as:

- A React component tree rooted at [the React entry](src/aiChatEntry.tsx).
- Lit web-component wrappers (`cds-aichat-container`, `cds-aichat-custom-element`) under [src/web-components/](src/web-components) that own startup for every host. `cds-aichat-container` renders the React app. Inside it, private Lit views under `src/chat/components/` render the shell, home screen, header, launcher, input, and panels.
- [The server entry](src/serverEntry.ts) exports only types and utilities safe for server rendering.

All entries build through [the build task](tasks/rollup.aichat.js). Output goes to `dist/es/` with the `cds--` prefix and `dist/es-custom/` with `cds--custom`. The custom prefix avoids clashes with `@carbon/angular-components`. TypeDoc writes to `dist/docs/`.

**Carbon flavor**: use `@carbon/web-components` through `@lit/react`; see [the Carbon rules](../../references/code-patterns.md#carbon-flavor-by-area) for the area rules and skill override.

## Read the guide for your task

Load only what you need:

- Working across React and Lit, shadow DOM, or slots → [host guide](references/architecture.md).
- Adding, editing, or wiring a service → [service guide](references/services.md).
- Changing assistant message flows, data helpers, or view ports → [messaging guide](src/sdk/services/messaging/AGENTS.md).
- Changing hooks or view-owned logic in `utils/` or `services/` → [hook guide](src/chat/hooks/AGENTS.md).
- Adding config fields or host properties or attributes, or editing CEM metadata → [manifest guide](references/manifests.md).
- Writing or fixing a Jest test → [test guide](references/tests.md).
- Changing host-visible behavior → [contract tests](references/tests.md#contract-tests-pin-host-behavior): add proof in the same commit; follow the stop rule and manifest workflow.
- Shipping UI (WCAG 2.1 AA, live regions, announcer helpers, and when to use `assertive`) → [access guide](../../references/accessibility.md).
- Adding code to `src/sdk/`, or deciding whether it's public → [SDK guide](src/sdk/AGENTS.md).
- Touching the store → [store guide](src/sdk/store/AGENTS.md).
- Touching public types or JSDoc → [type guide](src/types/AGENTS.md).
- Writing a code example (JSDoc `@example`, docs snippet) → [example guide](references/code-examples.md).
- Editing public docs in [docs/](docs/) → [docs guide](docs/AGENTS.md).

## Where things live

- [src/sdk/](src/sdk/) — the headless engine: everything a chat needs to run without a view. `createChatSDK` starts a chat with no view, DOM, or storage, and returns a handle with `release()` and `destroy()`. `registry.ts` keeps one chat per namespace: a released chat waits a grace window, and a create on its namespace inside the window gets it back ([ADR-0003](../../docs/adr/0003-chat-survives-remount.md)). The SDK entry always goes through it; the prebuilt chat does only with `lifecycle.reuseInstance` on, and then gives each mount its own `ChatInstance`. A chat with a view and one without never adopt each other. Internal in 1.x: `index.ts` is its future public entry, and no package entry point exports it.
  - `store/` — Redux-style store, plus the seams the prebuilt chat uses to attach its view partition to it.
  - `services/`: chat services wired through `ServiceManager.ts` and `loadServices.ts`. `ChatInstanceService.ts` holds the instance API. Add its new public methods to [`ChatInstance`](src/types/instance/ChatInstance.ts) too.
  - `services/messaging/`: `MessageCoordinator` and its private workflows, pure `inbound/`, `outbound/`, and `state/` helpers, and the presentation port. The human-agent service lives in `services/haa/`.
  - `events/` — typed pub/sub for the public event API. Event names and payloads are part of the public contract.
  - `schema/` — runtime message/config schema. Keep in sync with types in [src/types/](src/types/).
  - `utils/` — helpers that conversation code uses. View code may import them too.
- [src/languages/](src/languages/) — `intl-messageformat` strings in one locale file. [LanguagePack](src/types/config/LanguagePack.ts) is their public type. Adding a key grows the public API. Renaming one breaks it. Hosts translate through `PublicConfig.strings`; word new strings per [UI copy rules](../../.bob/skills/caic-copy-writer/references/ui-strings.md).
- [src/chat/](src/chat/) — the prebuilt interface. Do most feature work here.
  - `state/` — the view partition, under `view` in the chat's one store: panels, layout, loading indicators, announcements, the unread agent count, the values derived from config (header, layout, launcher, and shortcut defaults, CSS overrides, and the theme), the open confirmation (`prompt`, whose answers `prompts.ts` keeps for as long as the chat), and the view half of saved state. Conversation code can't see it. Internal; never exported.
  - `services/` — view-owned classes with explicit cleanup: `ChatMountState`, extension hosts, the announcer, the theme watcher, the messaging presentation adapter, and the human-agent view callbacks.
  - `utils/` — view helpers, including DOM, focus, and shell lifecycle code.
  - `components/` and `components-legacy/` — follow [component placement](../../references/code-patterns.md#component-placement) when adding or moving UI. Private Lit views that read chat state extend `components/shared/NativeChatView.ts`.
- [src/react/](src/react/) — public React wrapper components re-exported from the package root.
- [src/web-components/](src/web-components/) — Lit hosts. They own startup, config updates, live regions, and extension hosts. Put new startup work here, not in React.
- [src/types/](src/types/) — public types. Exports from `aiChatEntry.tsx` are public API. Follow semver when you edit them. TypeDoc output ships as the public docs site.

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
- **Import extensions**: `moduleResolution` is `bundler`. Relative TS source imports work with or without `.js`. Omit it to follow repo style. Rollup, `tsc --noEmit`, and Jest accept both forms. For a deep package import, `bundler` checks the package's `exports` map. Use the real built path with `.js`, such as `@carbon/ai-chat-components/es/react/card.js`.
- **TS checks**: `tsconfig` sets `strictNullChecks: false` and `strictFunctionTypes: false`. Check for null or add guards.
- **React runs inside shadow DOM**: the `cds-aichat-*` custom elements mount React into a shadow root. User-defined responses and writeable elements use slotted content; follow existing patterns. Background in [host guide](references/architecture.md).

## Definition of done

Use the gate in [done guide](../../references/definition-of-done.md). If you change `src/types/`, `aiChatEntry.tsx`, or `serverEntry.ts`, also build a consumer against the new output. Use `demo/` or an example.

## Authoring rules

- **Public API changes**: exports from `aiChatEntry.tsx`, `serverEntry.ts`, or `types/` affect semver. Use a `feat`/`fix!`/`BREAKING CHANGE` footer. JSDoc/TypeDoc rules: [type guide](src/types/AGENTS.md).
- **i18n**: no user-visible strings in code. Route through [src/languages/](src/languages/).
