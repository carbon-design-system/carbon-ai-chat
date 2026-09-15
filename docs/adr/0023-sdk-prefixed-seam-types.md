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

Hosts write the type of the chat object into their own callbacks, by hand, everywhere they use one. Cut that type in half and every one of those lines comes into question. So the split needs names for the halves, and a rule for which half a callback receives.

[ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) splits the package into a conversation layer and a view layer. It does not name the two halves. It also does not say what a callback gets once the type it gets today is cut in half. Both are this record's job.

Cutting that type is not free. Four public callback slots hand a host a `ChatInstance`: `customSendMessage` and `customLoadHistory` (`config/PublicConfigMessaging.ts:59` and `:68`), `EventBusHandler` (`instance/EventHandlers.ts:83`), and the service-desk factory (`config/ServiceDeskConfig.ts:119`). Hosts do not treat it as an implementation detail. This repo's own consumers annotate it 409 times — 82 in `demo/`, and 327 across 185 files under `examples/`. All 89 consumer `tsconfig.json` files set `strict: true`. The package itself sets `strictFunctionTypes: false` (`packages/ai-chat/tsconfig.json:16`). So the package build cannot see a parameter-variance break that every consumer would.

[ADR-0005](0005-chat-instance-survives-as-the-composition.md) decides the shape: whether the halves are siblings, and whether `ChatInstance` survives as their composition. That is not weighed here. This record names whatever shape that record returns, and decides how callbacks get their half.

## Considered options

**A. Name the halves `ChatSDKInstance` / `ChatViewInstance`, and parameterize the config on the instance type — chosen.**

The config types that carry callbacks take the instance type as a parameter. It defaults to the narrow half. The full-package config binds it to the composed instance:

```ts
interface ChatSDKConfig<I extends ChatSDKInstance = ChatSDKInstance> {
  messaging?: Messaging<I>;
}
interface ChatConfig extends ChatSDKConfig<ChatInstance>, ChatViewConfig {}
```

A host on the full package keeps getting `ChatInstance` in every callback. A host on the SDK gets `ChatSDKInstance`. Neither is a special case. They are the same type with a different argument. `tsc --strict` confirms it. Take today's host shape: a standalone function annotated `ChatInstance`, wired in by shorthand, calling a view-only member. It still compiles against the full config, and the bare SDK config rejects it, which is right. Callbacks written narrow stay assignable to the wide slot, so SDK-authored callbacks port upward without edits.

The names keep the `Chat` prefix. They ship next to `ChatInstance` and every other type in the package. A bare `ViewInstance` import tells a reader nothing about where it came from. `ChatViewInstance` sits next to `ChatInstance` in autocomplete, which is where most consumers meet a type first.

**B. Narrow the four slots directly to `ChatSDKInstance` — rejected.** This is the obvious reading of the split, and what the pre-record issues assumed: callbacks get the conversation half, full stop. Measured cost is what sinks it. It breaks all 409 in-repo annotations, and the error shows up in a file the host did not edit. The annotation lives in `customSendMessage.ts`, but the error lands on the `messaging: { customSendMessage }` wiring in `main.ts`, a file that never mentions the type. Worse, this is not just a rename. Callbacks reach for view members today. Across `demo/` and `examples/`, host code calls `instance.messaging` 518 times. It also calls `instance.customPanels` 62 times, `instance.updateIsMessageLoadingCounter` 44, and `instance.input` 15. Those 121 view-member sites do not compile after narrowing, under any type name, because the members are gone. A host would have to restructure the callback, not retype it.

**C. Two independent config trees — rejected.** `ChatConfig` and `ChatSDKConfig` each declare their own callbacks, with no inheritance between them. That avoids generics. Rejected because it duplicates the messaging, event, and service-desk surface, and leaves the copies to be kept in sync by hand. Drift is a matter of when, and it drifts in silence: nothing fails to build when one tree gains a field the other does not.

## Decision outcome

Callbacks receive the right instance half through a parameterized config, not through a second spelling.

The halves are named:

| Type | What it names |
| --- | --- |
| `ChatSDKInstance` | the conversation half — what a headless callback receives |
| `ChatViewInstance` | the view half |
| `ChatInstance` | the full-package instance the shells hand out |

Config splits by the same rule, into `ChatSDKConfig` and `ChatViewConfig`. The full-package config extends both. How those three relate is [ADR-0005](0005-chat-instance-survives-as-the-composition.md)'s call: whether the halves are siblings, and whether `ChatInstance` composes them.

The config types that carry callbacks take the instance type as a defaulted parameter. The full-package config binds that parameter to `ChatInstance`. A host on the whole package gets the composed instance in every callback, so the split costs it nothing.

Three of the four callback slots are reached through config, so the parameter covers them. The event handler is not. It arrives through `instance.on()`, so its type comes from whichever half declares the bus. `EventBusHandler` and `TypeAndHandler` therefore carry the same instance parameter. The bus is declared on the conversation half over `ChatSDKInstance`, and restated over `ChatInstance` on the composition. Without that, a full-package host's event handlers would narrow to the conversation half in silence — the exact break option C is rejected for, arriving through a different door.

Where that parameter sits matters. `EventBusHandler` already has one, for the event type, so the instance goes second: `EventBusHandler<T extends BusEvent = BusEvent, I = ChatInstance>`. Put it first and a host's `EventBusHandler<BusEventReceive>` still compiles, now meaning something else.

`ChatSDKHandle` follows the same prefix rule. It is the lifecycle type the SDK entry point resolves to. Its shape, and where lifecycle sits on it, are [ADR-0025](0025-the-sdk-entry-point-shape.md)'s.

The seam types ship from the package root in the release that adds them. The SDK entry point re-exports them when it appears. A type annotation written during 1.x keeps resolving after that.

### Consequences

Callbacks hand a full-package host exactly what they hand today. No annotation site breaks. No callback has to restructure because view members went missing.

The costs, taken knowingly:

**The type parameter is public API.** `ChatSDKConfig<I>` renders with a parameter in the API reference, and most readers should ignore it. The default keeps the bare name usable. But the parameter has to run through every type that carries a callback: the messaging config, the event handler, the service-desk factory params. That is roughly five types carrying a parameter for the sake of one entry point.

**`ChatConfig` is deliberately not assignable to `ChatSDKConfig`.** A host cannot hand a full-package config to the SDK entry point. That is correct: the SDK can only supply the narrow instance, so a callback expecting the composed one would be unsound. It still reads as a puzzle the first time someone hits it, and the error message will not explain why.

### For consumers

**Nothing breaks.** The seam types are additive. `ChatInstance` keeps every member it has today. The callback slots keep handing you the composed instance, because the full-package config binds them to it.

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

The narrower type shows up only if you reach for the headless SDK:

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
- [ADR-0005](0005-chat-instance-survives-as-the-composition.md) — how members split between the halves, which the sibling cut rests on.
- [ADR-0025](0025-the-sdk-entry-point-shape.md) — the `ChatSDKHandle` shape and lifecycle placement.
