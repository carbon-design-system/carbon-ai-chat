---
status: proposed
comments-by: 2026-08-18
date: 2026-08-06
deciders: '@carbon-design-system/carbon-ai-chat-developers'
consulted:
informed:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2030
discussion: https://github.com/carbon-design-system/carbon-ai-chat/discussions/2214
supersedes:
superseded-by:
---

# ADR-0023: Callbacks survive the split unchanged through a parameterized config

## Context and problem statement

[ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) splits the package into a conversation layer and a view layer. It does not say what the two halves are called, or what a callback receives once the type it receives today has been cut in half. Those are this record's.

The type being cut is not free. `ChatInstance` is what four public callback slots hand a host: `customSendMessage` and `customLoadHistory` (`config/PublicConfigMessaging.ts:59` and `:68`), `EventBusHandler` (`instance/EventHandlers.ts:83`), and the service-desk factory (`config/ServiceDeskConfig.ts:118`). Hosts do not treat it as an implementation detail. This repo's own consumers annotate it 409 times — 82 in `demo/`, 327 across 185 files under `examples/`. All 89 consumer `tsconfig.json` files set `strict: true`, while the package itself sets `strictFunctionTypes: false` (`packages/ai-chat/tsconfig.json:16`), so the package build cannot see a parameter-variance break that every consumer would.

Whether the halves are siblings, and whether `ChatInstance` survives as their composition, are not weighed here — [ADR-0005](0005-chat-instance-survives-as-the-composition.md) decides the shape. This record names whatever shape that record returns, and decides how callbacks receive their half.

## Considered options

**A. Name the halves `ChatSDKInstance` / `ChatViewInstance`, and parameterize the config on the instance type — chosen.**

The callback-bearing config types take the instance type as a parameter, defaulted to the narrow half. The full-package config binds it to the composed instance:

```ts
interface ChatSDKConfig<I extends ChatSDKInstance = ChatSDKInstance> {
  messaging?: Messaging<I>;
}
interface ChatConfig extends ChatSDKConfig<ChatInstance>, ChatViewConfig {}
```

A host using the full package keeps receiving `ChatInstance` in every callback. A host using the SDK receives `ChatSDKInstance`. Neither is a special case; they are the same type with a different argument. Verified against `tsc --strict`: today's host shape — a standalone function annotated `ChatInstance`, wired in by shorthand, calling a view-only member — still compiles against the full config, while the same function is correctly rejected by the bare SDK config. Callbacks written narrow stay assignable to the wide slot, so SDK-authored callbacks port upward without edits.

The `Chat` prefix is kept because these names are exported alongside `ChatInstance` and every other type in the package. A bare `ViewInstance` import tells a reader nothing about where it came from; `ChatViewInstance` is findable next to `ChatInstance` in autocomplete, which is where most consumers first encounter types.

**B. Narrow the four slots directly to `ChatSDKInstance` — rejected.** The obvious reading of the split, and what the pre-record issues assumed: callbacks receive the conversation half, full stop. Rejected on measured cost. It breaks all 409 in-repo annotations, and the diagnostic surfaces somewhere the host did not edit — the annotation lives in `customSendMessage.ts`, but the error lands at the `messaging: { customSendMessage }` wiring in `main.ts`, a file that never mentions the type. Worse, it is not only a rename. Callbacks reach for view members today: across `demo/` and `examples/`, callback bodies call `instance.messaging` 410 times, but also `instance.updateIsMessageLoadingCounter` 14 times, plus `instance.customPanels` and `instance.input`. Those 16 sites do not compile after narrowing under any type name, because the members are gone. A host would have to restructure the callback, not retype it.

**C. Two independent config trees — rejected.** `ChatConfig` and `ChatSDKConfig` each declare their own callbacks with no inheritance between them, avoiding generics entirely. Rejected because it duplicates the messaging, event, and service-desk surface and leaves the copies to be kept in sync by hand. Drift is a matter of when, and it drifts silently — nothing fails to build when one tree gains a field the other does not.

## Decision outcome

Callbacks receive the right instance half through a parameterized config, not through a second spelling.

The halves are named:

| Type | What it names |
| --- | --- |
| `ChatSDKInstance` | the conversation half — what a headless callback receives |
| `ChatViewInstance` | the view half |
| `ChatInstance` | the full-package instance the shells hand out |

Config decomposes by the same rule into `ChatSDKConfig` and `ChatViewConfig`, with the full-package config extending both. How those three relate — whether the halves are siblings and whether `ChatInstance` composes them — is [ADR-0005](0005-chat-instance-survives-as-the-composition.md)'s.

The callback-bearing config types carry the instance type as a defaulted parameter, and the full-package config binds it to `ChatInstance`. A host using the whole package receives the composed instance in every callback, so the split costs it nothing.

Three of the four callback slots are reached through config, so the parameter covers them. The event handler is not. It arrives through `instance.on()`, so its type comes from whichever half declares the bus. `EventBusHandler` and `TypeAndHandler` therefore carry the same instance parameter, and the bus is declared on the conversation half over `ChatSDKInstance`, restated over `ChatInstance` on the composition. Without that, a full-package host's event handlers would silently narrow to the conversation half — the exact break option C is rejected for, arriving through a different door.

Where that parameter sits matters. `EventBusHandler` already has one, for the event type, so the instance goes second: `EventBusHandler<T extends BusEvent = BusEvent, I = ChatInstance>`. Put it first and a host's `EventBusHandler<BusEventReceive>` still compiles, now meaning something else.

`ChatSDKHandle` — the lifecycle type the SDK entry point resolves to — follows the same prefix rule, but its shape and the placement of lifecycle on it are [ADR-0025](0025-the-sdk-entry-point-shape.md)'s.

The seam types are exported from the package root from the release that ships them, and re-exported from the SDK entry point when that appears. A type annotation written during 1.x keeps resolving after the entry point exists.

### Consequences

Callbacks keep handing a full-package host exactly what they hand today. No annotation site breaks, and no callback has to restructure because view members went missing.

The costs, taken knowingly:

**The type parameter is public API.** `ChatSDKConfig<I>` renders with a parameter in the API reference, and most readers should ignore it. The default keeps the bare name usable, but the parameter has to be threaded through every callback-bearing type — the messaging config, the event handler, the service-desk factory params. That is roughly five types carrying a parameter for the benefit of one entry point.

**`ChatConfig` is deliberately not assignable to `ChatSDKConfig`.** A host cannot hand a full-package config to the SDK entry point. This is correct — the SDK can only supply the narrow instance, so a callback expecting the composed one would be unsound — but it reads as a puzzle the first time someone hits it, and the error message will not explain why.

### For consumers

**Nothing breaks.** The seam types are additive, `ChatInstance` keeps every member it has today, and the callback slots keep handing you the composed instance because the full-package config binds them to it.

Your existing code is untouched, including the parts that reach for view members inside a callback:

```ts
import { MessageState, type ChatInstance } from '@carbon/ai-chat';

async function customSendMessage(
  request: MessageRequest,
  options: CustomSendMessageOptions,
  instance: ChatInstance // still correct after the split
) {
  instance.updateIsMessageLoadingCounter('increase'); // a view member — still here
  const answer = await callYourBackend(request);
  await instance.messaging.upsertMessage(
    answer.id,
    MessageState.COMPLETE,
    () => answer
  );
}

const config = { messaging: { customSendMessage } };
```

The narrower type appears only if you reach for the headless SDK:

```ts
import { MessageState, type ChatSDKInstance } from '@carbon/ai-chat';

const customSendMessage = async (
  request,
  options,
  instance: ChatSDKInstance
) => {
  const answer = await callYourBackend(request);
  await instance.messaging.upsertMessage(
    answer.id,
    MessageState.COMPLETE,
    () => answer
  );
  // no view members here — there is no view
};
```

A callback written against `ChatSDKInstance` also works in the full package, so SDK code ports upward without edits. The reverse does not, and should not: a callback that expects the view cannot run headless.

## More information

- [ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) — the packaging split these names describe, and when the SDK entry point ships.
- [ADR-0005](0005-chat-instance-survives-as-the-composition.md) — the member-set partition the sibling cut rests on.
- [ADR-0025](0025-the-sdk-entry-point-shape.md) — the `ChatSDKHandle` shape and lifecycle placement.
