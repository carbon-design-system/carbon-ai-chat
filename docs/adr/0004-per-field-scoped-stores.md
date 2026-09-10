---
status: proposed
comments-by: 2026-08-18
date: 2026-08-06
deciders: '@carbon-design-system/carbon-ai-chat-developers'
consulted:
informed:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2030
discussion: https://github.com/carbon-design-system/carbon-ai-chat/discussions/2210
supersedes:
superseded-by:
---

# ADR-0004: Chat state is read through per-field scoped stores

## Context and problem statement

Chat state is readable as one object and no smaller. `getState()` returns `PublicChatState`: seventeen top-level fields. They cover persisted launcher and home-screen state, the human-agent connection, loading and hydration counters, `activeResponseId`, composer input, custom panels, and workspace data. One bus event signals a change to any of them, `STATE_CHANGE`. It carries the whole snapshot twice, as `previousState` and `newState`.

That snapshot is not cheap to build. A store subscriber (`chat/services/loadServices.ts:60`) rebuilds it on every state-changing dispatch (`chat/store/subscriptions.ts:64`). Each rebuild deep-clones the persisted slice (`chat/services/ChatActionsImpl.ts:400`) and calls `deepFreeze` at up to eight sites (`:400, :404, :422, :432, :442, :461, :470, :475`). It then deep-compares the result with lodash `isEqual` (`chat/store/subscriptions.ts:66`), only to decide whether to fire at all. One of those clones already carries local memoization. That memo is the evidence: the cost was felt, then patched where it hurt rather than removed.

The event then wakes every subscriber for every field it does not read. A host that renders only the transcript pays for a launcher expansion or a focus change. The examples show what that costs in host code. One seeds from `getState()`. Both hand-write a `previousState`/`newState` comparison for the single field they want (`examples/react/watch-state/src/App.tsx:77`, `examples/web-components/history-fullscreen/src/main.ts:94`).

The bundle also lets the contract drift. The producer spreads a top-level `history` key that `PublicChatState` does not declare (`chat/services/ChatActionsImpl.ts:475-486`, the `history` key itself at `:485`). It typechecks for one reason: the literal passes through `deepFreeze`, which returns `any` and so defeats the check entirely. The same data is already exposed correctly at `customPanels.history`. Nobody can read one field of this surface, so nobody notices an extra field on it.

A framework-agnostic core cannot ship this as its read model. To learn one value, every non-React host must re-read and re-diff a whole snapshot. What those hosts want is smaller: a value with a subscribe. That primitive binds to a Vue `shallowRef`, an Angular signal, or `useSyncExternalStore` in a line or two.

## Considered options

**A. Per-field scoped stores as the sole public read model — chosen.**

Each field gets a small store with `get()` and `subscribe(listener)`. The listener receives the new value. A host subscribes to what it reads, and nothing else wakes it. The bundled `getState()` snapshot and the `STATE_CHANGE` event are deprecated in 1.x and removed in 2.0.0.

The primitive is small by design: the smallest thing that binds to every framework. Nothing in it is new. It is the shape `useSyncExternalStore` was designed against.

**B. Keep the bundled snapshot, optimize the producer — rejected.** Memoize harder, drop the deep clone, and replace `isEqual` with a shallow compare. It is the cheapest change, and it makes the existing surface faster. Rejected because it treats the cost as a performance problem. The cost is an interface problem. However fast the rebuild gets, a subscriber still learns only that something changed. It still has to diff to find out what, and every host keeps writing the same comparison by hand. The memoized clone already in the producer is what this option looks like after one round. The surface did not get better.

**C. Keep `getState()` as a bundled getter composed over the stores — rejected.** The stores become the read model. `getState()` survives as a deprecated convenience that assembles them. Nothing breaks, and the migration stays optional forever — which is exactly the problem. No 3.0.0 is scheduled, so a getter that survives the major names no removal release. That leaves two read models for as long as that holds, and docs to explain when each is right — the question this record exists to answer once. The bundle also stops being reproducible. Two of its fields are framework bookkeeping and get no store, so the getter could not return today's shape anyway. Against that stands the real price of removal, and it is small. Most `getState()` call sites in this repo's own demo and examples are one-shot reads in click handlers and render paths. Each becomes a mechanical store read at the major. This record takes that break knowingly.

**D. Per-field events on the existing bus — rejected.** Keep the read model as it is and fix the notification. Fire `STATE_CHANGE:<field>` per field, or carry a `changedFields` payload on the existing event. It deletes the hand-written guard. It adds no instance surface, removes nothing at 2.0.0, and takes no granularity decision that cannot be taken back. By a wide margin, it is the cheapest option on this list. Rejected because the bus is the wrong primitive for a read model. There is no seed. A host still calls `getState()` first, so the bundle survives as the way to read a value. To unsubscribe, a host needs the same handler reference rather than a returned function. And nothing binds the event to `useSyncExternalStore`, a Vue `shallowRef`, or an Angular signal without a hand-written adapter per field — which is the whole point of the framework-agnostic core. It also grows the event enum by one member per field, forever.

**E. Expose the store itself — rejected.** Hand the host the underlying store and let it select. Maximum power, and no new surface to design. Rejected because it publishes the internal state shape as public API. Every reducer change then becomes a change consumers can see. The internal state is not the public contract; `PublicChatState` exists precisely because the two differ.

**F. The same stores, with `subscribe` also firing immediately on subscribe — rejected.** Svelte stores and RxJS `BehaviorSubject` set this contract: subscribing delivers the current value at once, then every change. It saves a call. It makes the seed impossible to forget — under change-only, a subscriber that skips `get()` shows nothing until the first change. And it is what `subscribe` means to a host that arrives from those ecosystems.

Rejected because the two contracts are not symmetric, and change-only is the one that composes. A host that wants seed-plus-watch builds it in one line — `listener(store.get()); store.subscribe(listener)` — with no gap, because nothing interleaves two synchronous calls. A host that wants changes only cannot recover them from an immediate-fire store without a skip-the-first-call guard. A subscriber that does effect work — an analytics event when `activeResponseId` changes — needs exactly that guard. It is the same species of hand-written guard this record exists to delete. The frameworks the core binds to already never fire on subscribe. `useSyncExternalStore` uses `subscribe` purely as an invalidation signal and reads through the snapshot. Zustand subscribers fire only on change, and Redux's fire only on dispatch. Svelte is the real exception, because its `$store` auto-subscription requires immediate fire. It adapts in a line: `readable(store.get(), (set) => { set(store.get()); return store.subscribe(set); })`. Immediate fire also runs host code synchronously inside the `subscribe` call, before the caller holds the unsubscribe function. The change-only contract rules that re-entrancy hazard out.

## Decision outcome

Chat state is read through per-field scoped stores. Each store exposes:

```ts
interface ChatStore<T> {
  get: () => T;
  subscribe: (listener: (value: T) => void) => () => void;
}
```

`get` and `subscribe` are bound function properties, not methods. A host can pass them as bare references, which is what a `useSyncExternalStore` binding does.

- `subscribe` fires **only on change**, never on subscribe. A host that wants the current value calls `get()`. That keeps `subscribe` doing one thing. It also binds straight to `useSyncExternalStore`, with no first call to throw away.
- `subscribe` returns its unsubscribe function.
- Stores are scoped per field, not per leaf. The rule: a store exists where a host would re-render on its own. A field a host watches by itself gets a store. A field only ever read alongside its siblings stays inside the parent's value.
- This is the sole public read model. `getState()` and `BusEventType.STATE_CHANGE` are `@deprecated` in 1.x and removed in 2.0.0. The conversation transcript joins the same model as three stores of its own: `messages`, `status`, and `error`, defined in [ADR-0025](0025-the-sdk-entry-point-shape.md).
- The undeclared top-level `history` field is not carried forward. `customPanels.history` is the one place that data is read.
- **The stores partition by the same rule as the instance members.** [ADR-0005](0005-chat-instance-survives-as-the-composition.md) sets that rule. This record applies it to `state`, field by field, in the table below, because this record is what creates the member.

The assignment, per field:

| Half | Stores |
| --- | --- |
| Conversation, on `ChatSDKInstance` | `humanAgent`, `activeResponseId`, `messages`, `status`, `error` — the last three defined by [ADR-0025](0025-the-sdk-entry-point-shape.md) |
| View | `viewState`, `launcherIsExpanded`, `launcherShouldStartCallToActionCounterIfEnabled`, `showUnreadIndicator`, `homeScreenState`, `disclaimersAccepted`, `hasSentNonWelcomeMessage`, `input`, `customPanels`, `workspace`, `isMessageLoadingCounter`, `isMessageLoadingText`, `isHydratingCounter` |
| No store | `wasLoadedFromBrowser`, `version` |

`input` is one store — content, focus, and uploads together. That is the per-field rule at its hardest case. The two no-store fields are framework bookkeeping. They leave the public surface with `getState()` at 2.0.0.

Equality is the store's contract, not an implementation detail, and it binds both sides. A store notifies when its value changes by reference. `get()` returns that same reference until the next notification. Values are computed once per change and cached, never rebuilt per read. The store objects on `state` are stable properties too, not getters that mint a new store per access. Hosts may rely on all of it. That is what makes a memoized selector or a `React.memo` boundary safe above a store. It is also what makes the `useSyncExternalStore` binding below correct rather than an infinite render loop.

### Consequences

A host wakes for what it reads. On every state-changing dispatch, the producer stops rebuilding, deep-cloning, and deep-freezing a seventeen-field object. The hand-written `previousState`/`newState` guard disappears from consumer code.

The costs, taken knowingly:

**Removal lands in 2.0.0, and there is no later window.** `getState()` and `STATE_CHANGE` are deprecated for the whole 1.x line and removed at the major. A host that never migrates breaks at that upgrade. The deprecation is the only notice it gets.

**Reference stability becomes a contract, and the bill is larger than a reducer rule.** Promise it, and a reducer can no longer return a fresh-but-equal object: that wakes every subscriber of the field. Today's central `CHANGE_STATE` reducer deep-merges the whole tree. It hands every slice a fresh reference on any non-config dispatch. That reducer needs an audit. The derived values composed or cloned per read today — `humanAgent`, `input`, `customPanels`, `workspace` — need per-store memoization, so `get()` can return a stable reference. The internal code adopts this discipline wholesale. In exchange, hosts can reason about when they re-render.

**Granularity is a judgment, and it will be wrong somewhere.** The rule above decides most cases. A field that turns out to need splitting later can only gain a store additively. A field split too finely leaves a store nobody uses. Neither is reversible inside 1.x.

**Seven published state types depend on what happens next.** `PublicChatState` and its `Public*` members exist to type the bundle. They are kept rather than deleted: the stores take them as their value types. A host that named one in its own code keeps compiling.

### For consumers

**In 1.x, nothing breaks.** The stores arrive as new surface. `getState()` and `STATE_CHANGE` keep working, and each gains a `@deprecated` tag that names its replacement. Your editor strikes them through. That is your notice that removal comes at 2.0.0.

The migration is smaller than the deprecation makes it sound. Today:

```ts
const { activeResponseId } = instance.getState();

instance.on({
  type: BusEventType.STATE_CHANGE,
  handler: ({ previousState, newState }) => {
    // fires for every field; guard by hand for the one you want
    if (previousState.activeResponseId !== newState.activeResponseId) {
      onActiveResponseChanged(newState.activeResponseId);
    }
  },
});
```

After:

```ts
const store = instance.state.activeResponseId;

const current = store.get();
const unsubscribe = store.subscribe(onActiveResponseChanged);
```

The guard is gone, because the store fires only for its own field. To unsubscribe, you call the returned function rather than `off` with a matching handler.

In React, a store binds directly:

```ts
const activeResponseId = useSyncExternalStore(
  instance.state.activeResponseId.subscribe,
  instance.state.activeResponseId.get
);
```

Every other framework is the same two calls in that framework's reactive primitive. Seed from `get()`, forward `subscribe` into it, and hand the returned unsubscribe to the cleanup hook.

```ts
// Angular — a signal field; the constructor is an injection context
readonly activeResponseId = signal(store.get());
constructor() {
  inject(DestroyRef).onDestroy(store.subscribe((v) => this.activeResponseId.set(v)));
}
```

```ts
// Vue — a shallowRef in setup; onUnmounted takes the returned unsubscribe directly
const activeResponseId = shallowRef(store.get());
onUnmounted(store.subscribe((v) => (activeResponseId.value = v)));
```

```ts
// Svelte — the readable from option E; $activeResponseId works in any component that imports it
const activeResponseId = readable(store.get(), (set) => {
  set(store.get());
  return store.subscribe(set);
});
```

```ts
// Lit — a ReactiveController owns the subscription across the host's lifecycle
hostConnected() {
  this.value = store.get();
  this.host.requestUpdate(); // the value may have moved while disconnected
  this.unsubscribe = store.subscribe((value) => {
    this.value = value;
    this.host.requestUpdate();
  });
}
hostDisconnected() {
  this.unsubscribe();
}
```

Each snippet is within a couple of lines of the whole integration. The primitive is small enough that a per-framework adapter would be mostly boilerplate.

**One thing to check before you migrate.** If you read a top-level `history` field off `getState()`, switch to `customPanels.history`. The top-level field was never part of the declared type. `customPanels.history` is where that data is contracted to live.

## More information

- [ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) — the framework-agnostic core this read model is a precondition for.
- [ADR-0005](0005-chat-instance-survives-as-the-composition.md) — the instance partition. `getState` is classified there as a straddler, and this record is the one that deprecates it.
- [ADR-0023](0023-sdk-prefixed-seam-types.md) — the type names used here.
