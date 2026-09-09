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

A host with no interface needs two things this package has never offered: a way to start a conversation without mounting anything, and a way to say it is finished with one. There is no component to unmount, so nothing else can say it.

[ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) decides that the headless SDK ships as an entry point over the conversation layer, and when it ships. It does not say what calling that entry point looks like. It does not say what you hold afterwards.

The question is not open-ended, because boot already has a shape. `initServiceManagerAndInstance` is an `async` function (`chat/utils/chatBoot.ts:93`). It builds the config, creates the service manager, and returns an instance. It already splits construction from rendering, and its own comment says the function does not render. What makes it unusable headlessly is nearly down to one argument: a required `container: HTMLElement`, which only a mounted component produces. One more thing gets in the way. A theme watcher reaches for `document` before that container is even assigned, so the headless boot has to guard it.

So the entry point is mostly a question of what to remove and what to hand back. The one new thing is lifecycle. The instance has no `render()`, `destroy()`, or `release()` today, and nothing on it can be reworked into one. The closest candidate is `destroySession`, and it is not close. It resets the persisted state a returning browser reads, which [ADR-0005](0005-chat-instance-survives-as-the-composition.md) classifies view. So it disposes of nothing, and it does not appear on this surface. A headless host has no component to unmount, so it needs a way to say it is finished. The shells need something too: a way to push config changes they now apply through an internal path.

Where those verbs sit matters more than it looks. Four public callback slots receive an instance. Whatever those callbacks can reach, they can call.

## Considered options

**A. An `acquire` that returns a handle carrying lifecycle — chosen.**

`acquireChatSDK(config?)` resolves to a handle. The handle is the conversation surface plus the verbs that manage the instance's life. The acquire is async because boot already is. The entry point is that same boot, with the container requirement removed and the service manager kept private.

**B. A constructor rather than an acquire — rejected.** `new ChatSDK(config)`, with an `await ready` for the async part. It is familiar, and it makes the object's identity obvious. Rejected because boot is truly async: it loads a locale, builds services, and hydrates persisted state. So a constructor has to return a half-built object and then signal that it is ready. Every consumer then has two states to handle instead of one, and the half-built state is reachable and mostly useless. A function that resolves when the thing is ready has one state.

**C. Lifecycle folded into the conversation half — rejected.** Drop the separate handle. Let `acquireChatSDK` resolve to a `ChatSDKInstance` that carries the lifecycle verbs too. One name instead of two. Rejected because callbacks receive the conversation half. Fold lifecycle in, and a `customSendMessage` handler can tear down the instance that invoked it, mid-turn. That risk is not hypothetical, and convention does not hold it back: the type system hands out the capability. Lifecycle belongs to whoever acquired the SDK. It does not belong to everything the SDK hands the instance to.

**D. Lifecycle as free functions — rejected.** `releaseChatSDK(instance)` sits beside the acquire, so nothing rides on the instance at all. It closes the same footgun as the chosen option. Rejected because it splits the verb from the thing it acts on. You then find the verb through the module, not the object. And nothing stops a callback from importing the function and calling it on the instance it was handed. The capability has to be absent from what callbacks receive, not merely hard to reach.

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

**Lifecycle sits on the handle and nowhere else.** A callback receives `ChatSDKInstance`, which has none of these verbs. So nothing the SDK hands the instance to can tear it down. That guarantee holds in the types, verified against `tsc --strict` on both the SDK and full-package paths. It has to hold at runtime too. So the handle is built over the instance, rather than the instance carrying the verbs with the types hiding them.

**`updateConfig` is async, and it replaces rather than patches.** A config change reloads the language pack, re-resolves the namespace, and re-wires the human-agent service. So the caller has something to await. It takes a complete config: anything left out of `next` counts as removed. Both it and `acquireChatSDK` snapshot what they are handed. Plain objects and arrays are copied, and functions and class instances are kept by identity. So a host that keeps a reference and edits it in place changes nothing.

**The shells reach the same config-update code, through their own acquire.** They cannot call this `updateConfig` directly. A shell holds a full-package config, which [ADR-0023](0023-sdk-prefixed-seam-types.md) makes non-assignable to `ChatSDKConfig` on purpose. So the shells acquire through an internal entry point typed for the composed instance, and both entry points reconcile config through one implementation. What matters is that no private update path exists beside it. The shipped UI exercises the logic the SDK uses, so it cannot rot while an internal one stays healthy.

### The assembled surface

Three stores below are new. `state` gains the conversation-state stores `messages`, `status`, and `error`, which this record defines. Everything else is what the handle amounts to once its sibling records are applied. It is gathered in one place because no single record shows it:

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

**The conversation-state stores are the one piece defined here.** The stores from [ADR-0004](0004-per-field-scoped-stores.md) cover chat state. But the transcript was never part of `PublicChatState`, so no store carried it. And the first question a headless host asks is about the conversation itself. So `state` gains the three stores shown above: `messages`, `status`, and `error`. You read and watch them exactly like every other field. They follow [ADR-0004](0004-per-field-scoped-stores.md)'s contract to the letter. `get()` returns the same frozen value until the store next notifies. `subscribe` fires only on change. There is no separate event to watch. Nothing in them is ever persisted; the transcript does not enter browser storage. They ship with the rest of the stores in 1.x. And `state.messages` is the read behind [ADR-0003](0003-instance-lifetime-belongs-to-the-acquire.md)'s durable question: a host deciding whether to run boot-once work asks `state.messages.get().length === 0`.

`send` and `restartConversation` do not appear at the top level. [ADR-0009](0009-conversation-verbs-on-instance-messaging.md) removes those root spellings at 2.0.0, and the SDK ships no earlier. You reach both through `messaging`.

The view half is absent by design, not by oversight. A headless host has no panels, no input, and no scroll. So the members that drive them are not on this surface, and neither are their state stores. `destroySession` is out for the same reason: its payload is the launcher, home-screen, and disclaimer state such a host never had. What the host does have is the whole conversation: sending, receiving, history, human agents, events, and conversation state.

### Consequences

There is one way to get an SDK, and one place lifecycle lives. The capability to tear down an instance is out of reach from the code most likely to be handed one.

The costs, taken knowingly:

**Two types for one thing.** A consumer holds a `ChatSDKHandle` but passes a `ChatSDKInstance` around. They have to learn why the narrower one exists. The reason is good, and the extra name is still a cost.

**The handle is the only route to lifecycle, so a host has to keep it.** A host that acquires, destructures what it needs, and drops the handle cannot release or reconfigure later. That is the price of keeping the verbs off the instance.

**Chainable methods return the instance, not the handle.** `on`, `off`, and `once` return the conversation surface, so a chain does not carry lifecycle. Write `const chat = (await acquireChatSDK()).on(...)` and you quietly end up holding the narrower type.

**Snapshots cost a copy per update.** Every `updateConfig` copies the plain data it is handed. That is what makes replace-not-mutate true. It is also real work, on a call a shell makes for every prop diff.

**`serviceDesk` is on this surface, but the human-agent story is not headless end to end.** The verbs here are safe. Both are state, events, and calls into the host's own service desk, with no DOM anywhere in the path. The service behind them imports nothing from the view. Two pieces of the flow around them still assume a UI. A service desk that calls `screenShareRequest` gets a promise that only the shipped modal resolves, so headless it never settles. And no verb _starts_ an agent conversation. Today that runs off the connect card the view renders. So an SDK host can end and suspend a conversation it has no supported way to begin. Both are gaps in the surface rather than in the classification, and closing either one is a sibling record's work.

### For consumers

**This is almost all new surface.** The SDK entry point does not exist yet. ADR-0002 stages it no earlier than 2.0.0.

One part is not new, and you can see it in the shells today. The React and web-component shells already reconcile a prop change as a wholesale replace. Each change rebuilds the complete config from current props, and the result is snapshotted. A field left out reverts to its default rather than surviving (`chat/utils/dynamicConfigUpdates.ts:82-95`). Mutating a config object in place has no effect either, because the shells compare by identity. `updateConfig` is that same implementation under a public name. So a host moving to the SDK inherits reconciliation behavior the shells already ship.

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

Two things to know before you write against it. Keep the handle rather than destructuring it away, because `release`, `destroy`, and `updateConfig` exist nowhere else. And hand `updateConfig` a complete config rather than a patch, because anything you leave out counts as removed.

## More information

- [ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) — where the SDK ships and when, and the boundary question this record's surface stops at.
- [ADR-0003](0003-instance-lifetime-belongs-to-the-acquire.md) — what `release()` and `destroy()` mean.
- [ADR-0023](0023-sdk-prefixed-seam-types.md) — the type names.
