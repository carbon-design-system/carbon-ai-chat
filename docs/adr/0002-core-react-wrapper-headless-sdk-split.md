---
status: proposed
comments-by: 2026-08-18
date: 2026-08-06
deciders: '@carbon-design-system/carbon-ai-chat-developers'
consulted:
informed:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2030
discussion: https://github.com/carbon-design-system/carbon-ai-chat/discussions/2208
supersedes:
superseded-by:
---

# ADR-0002: The core, React wrapper, and headless SDK ship from one package

## Context and problem statement

### Every path boots React today

The package publishes three entry points — `.`, `./es-custom`, and `./server` — plus two web-component paths, and all of them run React. `cds-aichat-container` and `cds-aichat-custom-element` are real Lit elements, but they render no chat. They flatten props and forward slots to `cds-aichat-internal`, which appends a div to its own shadow root, calls `createRoot`, and renders the same React tree the React wrapper renders (`web-components/cds-aichat-container/cds-aichat-internal.tsx:142`). `react` and `react-dom` are hard peer dependencies.

The cost is visible in this repo. Of the 41 examples under `examples/web-components/`, 39 declare `react` and `react-dom`, and not one of them contains a line of React.

### The seam already exists in the source tree

The split is closer to enforcement than to extraction. Inside `src/chat/`, the conversation machinery and the UI already live in different directories, and only one side uses React:

| Layer | Directories under `src/chat/` | Files | Import React |
| --- | --- | --- | --- |
| Conversation | `services/`, `store/`, `instance/`, `events/`, `schema/`, `utils/` | 75 | 4 |
| View | `components/`, `components-legacy/`, `hooks/`, `providers/`, `contexts/`, `hocs/` | 159 | 153 |

Three of those four imports are type-only and erase at build time. The fourth is real: `chat/utils/carbonIcon.ts` calls `createElement`, and every file importing it is a React component — a rendering helper filed under `utils/`.

Following imports rather than directories sharpens the same picture. Starting from the six modules that boot a conversation — `loadServices`, `chatBoot`, `doCreateStore`, `ChatInstanceImpl`, `ChatActionsImpl`, and `EventBus` — the module graph reaches 273 modules and drags in the whole React tree. It does that through exactly four import edges, three of them in one file: `ServiceManager.ts` imports `MainWindowFunctions` from `AppShell` (`:27`), `InputFunctions` from the input component (`:30`), and `AriaAnnouncerFunctionType` from a React context (`:12`). The fourth comes from `types/messaging/MessageTypeComponentProps.d.ts`. Cut those four and the graph collapses to 107 modules, with three residual React references that are all type usages. The collapsed graph is not yet framework-free, though: `types/messaging/Messages.ts` re-exports two button enums from the components package's React wrapper path (`:23-26`), and `ChatActionsImpl` and `types/utilities/inputUtils.ts` pull prompt-line helpers from a module that registers six Lit elements on load. Those edges are mechanical to re-point, but they are extraction work all the same.

The React wrapper is already thin: `src/react/` is two files, `ChatContainer.tsx` and `ChatCustomElement.tsx`.

### Source tree layout

The two layers and the SDK entry point map to three top-level directories under `src/`:

| Directory | Contents | May import from | React permitted |
| --- | --- | --- | --- |
| `src/shared/` | The framework-agnostic conversation layer: `services/`, `store/`, `instance/`, `events/`, `schema/`, and the shared utilities and public types. The base that nothing beneath it pulls upward. | Nothing inside `src/` | No |
| `src/sdk/` | The headless SDK entry point (`acquireChatSDK`), the public SDK types, and the lifecycle adapter. A curated surface over `src/shared/`. | `src/shared/` only | No |
| `src/chat/` | The React view layer: `components/`, `hooks/`, `providers/`, `contexts/`, `hocs/`, and the app shell. | `src/sdk/` and `src/shared/` | Yes |

The no-React constraint on `src/shared/` and `src/sdk/` is not a style preference — it is the mechanism. A React import in either directory means a non-React host that takes the SDK entry point pays the React cost, which is the problem the split exists to solve. `chat/utils/carbonIcon.ts` is the present violation: it calls `createElement` and is currently filed under the conversation layer's `utils/`. It moves to `src/react/` as part of the extraction work — it is a React rendering helper, and `src/react/` is where React helpers live.

The import graph rule is asymmetric by design:

- **`src/sdk/` must not import from `src/chat/`**, ever. An SDK entry point that reaches into the view layer drags in React, framework state, and DOM assumptions — all of which belong to the view. No exception for types: a type import that can only be satisfied by a React-bearing module still pulls the module into the build graph.
- **`src/chat/` may import from `src/sdk/` and `src/shared/`**. The React UI drives the same conversation machinery the SDK wraps, so those edges are correct.
- **`src/shared/` imports nothing from `src/`**. It is the dependency floor; anything it imported upward would create a cycle or collapse the layering.

`src/react/` and `src/web-components/` sit beside these three and mount the view layer. They are entry-point hosts, not part of the layer hierarchy, so they carry no import restriction beyond being entry points.

### What forces a UI today

Three things. `initServiceManagerAndInstance` takes a required `container: HTMLElement` (`chat/utils/chatBoot.ts:93`), even though its own documentation says the function does not render. That container is only ever produced by a mounted component. And the theme watcher built during boot falls back to `document.documentElement`, because the container is not assigned yet when it constructs (`chat/services/loadServices.ts:82`), then starts a `MutationObserver` on it whenever the theme is inherited — the default. Beyond those, nothing in the conversation path itself needs a DOM — the send path ends in the host's own `customSendMessage`, so the framework performs no I/O of its own.

### Two layers, three ways in

The split produces two runtime layers, not three:

- **The conversation layer**, informally the core: services, store, instance, events, schema, and utilities, plus the public types — the 107 modules that remain once the four edges are cut. It talks to the assistant, holds the state, and fires the events. It renders nothing and depends on no framework.
- **The view layer**: the React UI in `chat/components` with its hooks, providers, and contexts.

Three entry points sit on top, and they are siblings rather than a stack:

- **The React wrapper** (`src/react/`) mounts the view layer.
- **The web-component host** mounts the same view layer through a Lit shell.
- **The headless SDK** skips the view layer and drives the conversation layer directly.

So the React application consumes the conversation layer, and the SDK consumes it too. Nothing consumes the SDK — it is a way in, not a tier beneath the core.

That makes "core" and "SDK" two views of one body of code rather than two pieces. The core is the implementation; the SDK is the public surface over it — a curated entry point, the public types, and the lifecycle. It is also why the seam vocabulary has no `ChatCore*` type — see [ADR-0023](0023-sdk-prefixed-seam-types.md), which owns that call.

**Where that public surface ends is not settled by this record.** Which capabilities of the conversation layer become SDK surface, which stay internal, and how the boundary is enforced all depend on decisions still open about the state surface and the instance surface. A dedicated record settles it once those land. This record decides that the boundary exists and where it ships, not where it falls.

### What is undecided

The direction is treated as settled across the 1.x program, with no record of why or of what lost. This record answers one question: where the SDK ships, and when. What the two halves are called, and what a callback receives once `ChatInstance` is cut in half, are [ADR-0023](0023-sdk-prefixed-seam-types.md)'s.

## Considered options

**A. An additional entry point in `@carbon/ai-chat` — chosen.**

The SDK becomes a new entry point beside the existing ones, over the same core the React wrapper uses. There is precedent: the package already publishes `.`, `./es-custom`, and `./server`, and `./server` carries its own type entry. One version, one release, one dependency for a host that wants both halves. Publication is additive, so the entry point can appear in any release once the surface behind it is stable.

**B. A separate `@carbon/ai-chat-sdk` package — rejected.** The cleanest statement of the split: a host that wants no UI installs nothing that draws one, and the boundary is enforced by package layout rather than convention. Rejected on version coupling. Both packages share the core, so they must move in lockstep — every core change becomes a coordinated release, and any host using the SDK _and_ the chat carries two dependencies that must not drift. A second package also front-loads the work, because a half-split package cannot publish. The entry point gives the consumer the same import ergonomics without either cost, and forecloses nothing: a package can still be carved out later.

**C. Commit the SDK to 2.0.0 itself — rejected.** Puts the SDK in the release everyone already takes, so hosts migrate once. Rejected because it holds the major hostage to packaging work. If the surface is not ready, either 2.0.0 slips or it ships something rushed to meet a date — and the SDK has the least prior art here, so it is the likeliest piece to need another turn. Publication is additive, so committing buys nothing that waiting does not. It stays available as a fallback: if the surface is ready when 2.0.0 closes, it ships there.

**D. An experimental SDK export in 1.x — rejected.** Puts the shape in front of real hosts early, which is what an unproven surface wants. Rejected because an export is a commitment even when tagged. The tag makes a surface removable, not free: hosts adopt it, build on it, and file issues against it, and the shape hardens under that weight before it has settled. Holding the SDK back exists to let the core stabilize first, and a 1.x preview spends exactly that runway.

**E. Stay React-centric — rejected.** Costs nothing and breaks nobody. Rejected because it is the status quo the split exists to end. A non-React host either adopts React or does without, and a headless consumer has no path at all. The framework-agnostic core is also the precondition for the web-component direction, so declining it forecloses more than the SDK.

## Decision outcome

`@carbon/ai-chat` splits into a framework-agnostic core, a thin React wrapper over it, and a headless SDK — all published from this one package, the SDK as an additional entry point.

Staging follows from publication being additive:

- Additive surface and deprecations land in 1.x. Removals wait for 2.0.0.
- No SDK _runtime_ surface ships in 1.x — no entry point, no acquire, not even an experimental export. The seam type names ship earlier, because a type is not a capability; see [ADR-0023](0023-sdk-prefixed-seam-types.md).
- The SDK entry point ships no earlier than 2.0.0, possibly in 2.0.0 itself. It is not committed to that release, because committing holds the major to packaging work.

What the entry point looks like and what it hands back are [ADR-0025](0025-the-sdk-entry-point-shape.md)'s. The type names it uses are [ADR-0023](0023-sdk-prefixed-seam-types.md)'s. This record decides only that the SDK is an entry point in this package, and when it may appear.

### Consequences

The packaging question stops reopening. An issue touching the seam has a decided answer for where the SDK lives and when it ships, and the argument moves to what the halves are called, which ADR-0023 owns.

**It opens a path to a Lit view that this record does not take.** The view layer is React today, but every Carbon element it renders already comes from a Lit library, reached through `@lit/react` wrappers at 42 sites — `src/chat/` imports Lit directly zero times. Those wrappers exist only because the view is React; a Lit view would delete them and let the elements be used natively. A framework-free core is what makes that buildable at all, and it would leave React in two places: the React entry points, where it belongs, and the icon utility. The shells would then invert — today a Lit element wraps a React tree, and it would become a React wrapper over a Lit view.

None of that is the goal of this pass, and nothing here commits to it. It is worth recording because it is the reason to enforce the core boundary strictly rather than approximately: a boundary that merely holds today is enough for the SDK, but only a boundary that stays clean keeps this option open.

The costs, taken knowingly:

**One package makes the boundary a convention, not a wall.** A separate package would make importing view code from the SDK path impossible. An entry point makes it merely wrong, so it needs enforcement that package layout would have provided for free.

**The SDK's release stays uncommitted.** "No earlier than 2.0.0, possibly in it" is not a date, and a host waiting on the headless path cannot plan against it. That is the cost of refusing to hold the major hostage; the alternative was promising a date this program cannot honestly keep.

### For consumers

**Nothing breaks, and nothing is added to your install.** This split is additive from end to end. It ships no new package, so there is no second dependency to add and no version to keep in step. Your existing imports, config, and callbacks are untouched — [ADR-0023](0023-sdk-prefixed-seam-types.md) covers what happens to the types you annotate.

What you gain is one more way in. The SDK is an entry point beside the ones you already use:

```ts
// 2.0.0 at the earliest — the SDK entry point
import {
  acquireChatSDK,
  MessageState,
  type ChatSDKInstance,
} from '@carbon/ai-chat/sdk';

const sdk = await acquireChatSDK({
  messaging: {
    customSendMessage: async (request, options, instance: ChatSDKInstance) => {
      const answer = await callYourBackend(request);
      await instance.messaging.upsertMessage(
        answer.id,
        MessageState.COMPLETE,
        () => answer
      );
      // no view members here — there is no view
    },
  },
});
sdk.release();
```

Nothing about adding that entry point changes the package you already depend on, and you can ignore it entirely. If you render a chat, this record costs you nothing.

## More information

- [ADR-0025](0025-the-sdk-entry-point-shape.md) — what the entry point looks like, what it hands back, and the assembled surface the siblings add up to.
- [ADR-0023](0023-sdk-prefixed-seam-types.md) — what the two halves are called, and what a callback receives.
- [ADR-0005](0005-chat-instance-survives-as-the-composition.md) — the instance member list and the partition verdict the split rests on.
