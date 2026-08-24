---
status: proposed
comments-by: 2026-08-18
date: 2026-08-06
deciders: '@carbon-design-system/carbon-ai-chat-developers'
consulted:
informed:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2030
discussion: https://github.com/carbon-design-system/carbon-ai-chat/discussions/2215
supersedes:
superseded-by:
---

# ADR-0025: The SDK is acquired, and lifecycle lives on what the acquire returns

## Context and problem statement

[ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) decides that the headless SDK ships as an entry point over the conversation layer, and when. It does not say what calling that entry point looks like, or what you hold afterwards.

The question is not open-ended, because boot already has a shape. `initServiceManagerAndInstance` is an `async` function that builds the config, creates the service manager, and returns an instance (`chat/utils/chatBoot.ts:93`). It already separates construction from rendering — its own comment says the function does not render. What makes it unusable headlessly is nearly down to one argument: a required `container: HTMLElement`, which only a mounted component produces — plus a theme watcher that reaches for `document` before that container is even assigned, which the headless boot has to guard.

So the entry point is mostly a question of what to remove and what to hand back. The one genuinely new thing is lifecycle. No `render()`, `destroy()`, or `release()` exists on the instance today, and nothing on the instance can be repurposed into one. The closest candidate is `destroySession`, and it is not close: it resets the persisted state a returning browser reads, which [ADR-0005](0005-chat-instance-survives-as-the-composition.md) classifies view, so it neither disposes anything nor appears on this surface. A headless host has no component to unmount, so it needs a way to say it is finished — and the shells need a way to push config changes that today they apply through an internal path.

Where those verbs sit matters more than it looks. Four public callback slots receive an instance, and whatever those callbacks can reach, they can call.

## Considered options

**A. An `acquire` that returns a handle carrying lifecycle — chosen.**

`acquireChatSDK(config?)` resolves to a handle. The handle is the conversation surface plus the verbs that manage the instance's life. Acquisition is asynchronous because boot already is; the entry point is that same boot with the container requirement removed and the service manager kept private.

**B. A constructor rather than an acquire — rejected.** `new ChatSDK(config)`, with an `await ready` for the async part. Familiar, and it makes the object's identity obvious. Rejected because boot is genuinely asynchronous — it loads a locale, builds services, and hydrates persisted state — so a constructor has to return a half-built object and publish a readiness signal. Every consumer then has two states to handle instead of one, and the half-built state is reachable and mostly useless. A function that resolves when the thing is ready has one state.

**C. Lifecycle folded into the conversation half — rejected.** Drop the separate handle and let `acquireChatSDK` resolve to a `ChatSDKInstance` that also carries the lifecycle verbs. One name instead of two. Rejected because callbacks receive the conversation half. Fold lifecycle in, and a `customSendMessage` handler can tear down the instance that invoked it, mid-turn. That is not a hypothetical guarded by convention; it is the type system handing out the capability. Lifecycle belongs to whoever acquired the SDK, not to everything the SDK hands the instance to.

**D. Lifecycle as free functions — rejected.** `releaseChatSDK(instance)` beside the acquire, so nothing rides on the instance at all. It closes the same footgun as the chosen option. Rejected because it separates the verb from the thing it acts on, so discovery goes through the module rather than the object, and nothing stops a callback importing the function and calling it on the instance it was handed. The capability has to be absent from what callbacks receive, not merely inconvenient.

## Decision outcome

The SDK is acquired, and what the acquire returns is where lifecycle lives.

```ts
declare function acquireChatSDK(config?: ChatSDKConfig): Promise<ChatSDKHandle>;

interface ChatSDKHandle extends ChatSDKInstance {
  release(): void;
  destroy(): void;
  updateConfig(next: ChatSDKConfig): Promise<void>;
}
```

**Lifecycle sits on the handle and nowhere else.** A callback receives `ChatSDKInstance`, which has none of these verbs, so nothing the SDK hands the instance to can tear it down. That guarantee holds in the types — verified against `tsc --strict` on both the SDK and full-package paths — and it must hold at runtime too, so the handle is built over the instance rather than the instance carrying the verbs with the types hiding them.

**`updateConfig` is asynchronous, and replaces rather than patches.** A config change reloads the language pack, re-resolves the namespace, and re-wires the human-agent service, so a caller has something to await. It takes a complete config: anything omitted from `next` is treated as removed. Both it and `acquireChatSDK` snapshot what they are handed — plain objects and arrays copied, functions and class instances kept by identity — so a host that keeps a reference and edits it in place changes nothing.

**The shells reach the same config-update implementation, through their own acquire.** They cannot call this `updateConfig` directly: a shell holds a full-package config, which [ADR-0023](0023-sdk-prefixed-seam-types.md) deliberately makes non-assignable to `ChatSDKConfig`. So the shells acquire through an internal entry point typed for the composed instance, and both entry points reconcile config through one implementation. What matters is that no private update path exists beside it — the logic the shipped UI exercises is the logic the SDK uses, so it cannot rot while an internal one stays healthy.

### The assembled surface

Three stores below are new: `state` gains the conversation-state stores `messages`, `status`, and `error`, defined by this record. Everything else is what the handle amounts to once its sibling records are applied, gathered in one place because no single record shows it:

```ts
interface ChatSDKHandle extends ChatSDKInstance {
  // lifecycle — this record; semantics from ADR-0003
  release(): void;
  destroy(): void;
  updateConfig(next: ChatSDKConfig): Promise<void>;
}

interface ChatSDKInstance {
  // the conversation namespace — membership from ADR-0009
  messaging: ChatInstanceMessaging;

  // the event bus — assigned to this half by ADR-0005, carrying the full event enum
  on(handlers: TypeAndHandler | TypeAndHandler[]): ChatSDKInstance;
  off(handlers: TypeAndHandler | TypeAndHandler[]): ChatSDKInstance;
  once(handlers: TypeAndHandler | TypeAndHandler[]): ChatSDKInstance;

  // per-field read model — store shape and half-assignment from ADR-0004,
  // which retires the bundled getState(). Only the five conversation-
  // classified stores appear here; the thirteen view stores do not.
  state: {
    humanAgent: ChatStore<PublicChatHumanAgentState>;
    activeResponseId: ChatStore<string | null>;

    /** The conversation's turns, oldest first — each frozen, including
        partially streamed content while status is `streaming`. */
    messages: ChatStore<readonly Message[]>;

    /** The messaging lifecycle: `ready`, `submitted`, `streaming`, or `error`. */
    status: ChatStore<MessagesStatus>;

    /** The current blocking error, or `null` when there is none. */
    error: ChatStore<Readonly<MessagesError> | null>;
  };

  // human-agent actions — classified conversation by ADR-0005
  serviceDesk: ChatInstanceServiceDeskActions;
}
```

| Piece | Decided by |
| --- | --- |
| `release()` / `destroy()` semantics | [ADR-0003](0003-instance-lifetime-belongs-to-the-acquire.md) |
| The read model behind `state` | [ADR-0004](0004-per-field-scoped-stores.md) |
| Which members are conversation rather than view | [ADR-0005](0005-chat-instance-survives-as-the-composition.md) |
| What lives under `messaging` | [ADR-0009](0009-conversation-verbs-on-instance-messaging.md) |
| The conversation-state stores `messages`, `status`, `error` | this record |
| Every type name here | [ADR-0023](0023-sdk-prefixed-seam-types.md) |

**The conversation-state stores are the one piece defined here.** The stores from [ADR-0004](0004-per-field-scoped-stores.md) cover chat state, but the transcript was never part of `PublicChatState`, so no store carried it — and the first question a headless host asks is about the conversation itself. `state` therefore gains the three stores shown above — `messages`, `status`, and `error` — read and watched exactly like every other field. They follow [ADR-0004](0004-per-field-scoped-stores.md)'s contract to the letter: `get()` returns the same frozen value until the store next notifies, `subscribe` fires only on change, and there is no separate event to watch. Nothing in them is ever persisted; the transcript does not enter browser storage. They ship with the rest of the stores in 1.x, and `state.messages` is the read behind [ADR-0003](0003-instance-lifetime-belongs-to-the-acquire.md)'s durable question: a host deciding whether to run boot-once work asks `state.messages.get().length === 0`.

`send` and `restartConversation` do not appear at the top level because [ADR-0009](0009-conversation-verbs-on-instance-messaging.md) removes those root spellings at 2.0.0, and the SDK ships no earlier. Both are reached through `messaging`.

The view half is absent by construction, not by omission. A headless host has no panels, no input, and no scroll, so the members that drive them are not on this surface — including their state stores, and including `destroySession`, whose payload is the launcher, home-screen, and disclaimer state such a host never had. What it does have is the whole conversation: sending, receiving, history, human agents, events, and conversation state.

### Consequences

There is one way to get an SDK and one place lifecycle lives, and the capability to tear down an instance is unreachable from the code most likely to be handed one.

The costs, taken knowingly:

**Two types for one thing.** A consumer holds a `ChatSDKHandle` but passes a `ChatSDKInstance` around, and has to understand why the narrower one exists. The reason is good and the extra name is still a cost.

**The handle is the only route to lifecycle, so it has to be kept.** A host that acquires, destructures what it needs, and drops the handle cannot release or reconfigure later. That is the price of keeping the verbs off the instance.

**Chainable methods return the instance, not the handle.** `on`, `off`, and `once` return the conversation surface, so a chain does not carry lifecycle. A host that writes `const chat = (await acquireChatSDK()).on(...)` silently ends up holding the narrower type.

**Config snapshotting costs a copy per update.** Every `updateConfig` copies the plain data it is handed. That is what makes replace-not-mutate true, and it is real work on a call a shell makes on every prop diff.

**`serviceDesk` is on this surface, but the human-agent story is not headless end to end.** The verbs here are safe — both are state, events, and calls into the host's own service desk, with no DOM anywhere in the path — and the service behind them imports nothing from the view. Two pieces of the flow around them still assume a UI. A service desk that calls `screenShareRequest` gets a promise that only the shipped modal resolves, so headless it never settles. And there is no verb that _starts_ an agent conversation: today that runs off the connect card the view renders, which leaves an SDK host able to end and suspend a conversation it has no supported way to begin. Both are gaps in the surface rather than in the classification, and closing either is a sibling record's work.

### For consumers

**This is almost all new surface.** The SDK entry point does not exist yet, and ADR-0002 stages it no earlier than 2.0.0.

One part is not new, and you can see it in the shells today. The React and web-component shells already reconcile prop changes as a wholesale replace: each change rebuilds the complete config from current props, the result is snapshotted, and an omitted field reverts to its default rather than surviving (`chat/utils/dynamicConfigUpdates.ts:84`). Mutating a config object in place has no effect either, because the shells compare by identity. `updateConfig` is that same implementation given a public name, so a host moving to the SDK inherits reconciliation behavior the shells already ship.

```ts
import { acquireChatSDK, MessageState } from '@carbon/ai-chat/sdk';

const chat = await acquireChatSDK({
  messaging: {
    customSendMessage: async (request, options, instance) => {
      const answer = await callYourBackend(request);
      await instance.messaging.upsertMessage(
        answer.id,
        MessageState.COMPLETE,
        () => answer
      );
    },
  },
});

await chat.messaging.send('Hello');

// keep the handle — it is the only route to these
await chat.updateConfig(nextConfig);
chat.release();
```

Two things to know before you write against it. Keep the handle rather than destructuring it away, because `release`, `destroy`, and `updateConfig` exist nowhere else. And hand `updateConfig` a complete config rather than a patch, because anything you leave out is treated as removed.

## More information

- [ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) — where the SDK ships and when, and the boundary question this record's surface stops at.
- [ADR-0003](0003-instance-lifetime-belongs-to-the-acquire.md) — what `release()` and `destroy()` mean.
- [ADR-0023](0023-sdk-prefixed-seam-types.md) — the type names.
