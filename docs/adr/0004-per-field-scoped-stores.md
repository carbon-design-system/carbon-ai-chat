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

Chat state is readable as one object and no smaller. `getState()` returns `PublicChatState`, seventeen top-level fields covering persisted launcher and home-screen state, the human-agent connection, loading and hydration counters, `activeResponseId`, composer input, custom panels, and workspace data. The only change signal for it is a single `STATE_CHANGE` bus event carrying the whole snapshot twice, as `previousState` and `newState`.

Producing that snapshot is not cheap. A store subscriber (`chat/services/loadServices.ts:60`) rebuilds it on every state-changing dispatch (`chat/store/subscriptions.ts:64`), deep-cloning the persisted slice (`chat/services/ChatActionsImpl.ts:405`), calling `deepFreeze` at up to eight sites per rebuild (`:405, :409, :427, :437, :449, :468, :477, :482`), then deep-comparing the result with lodash `isEqual` (`chat/store/subscriptions.ts:66`) to decide whether to fire at all. One of those clones already carries local memoization, which is evidence the cost was felt and patched where it hurt rather than removed.

Every subscriber is then woken for every field it does not read. A host rendering only the transcript pays for a launcher expansion or a focus change, and the examples show what that costs in host code: each one seeds from `getState()` and hand-writes a `previousState`/`newState` comparison for the single field it wants (`examples/react/watch-state/src/App.tsx:77`, `examples/web-components/history-fullscreen/src/main.ts:94`).

The bundling also lets the contract drift. The producer spreads a top-level `history` key that `PublicChatState` does not declare (`chat/services/ChatActionsImpl.ts:477-493`); it typechecks only because the literal passes through `deepFreeze`, which returns `any` and so defeats the check entirely. The same data is already correctly exposed at `customPanels.history`. A surface nobody can read one field of is a surface nobody notices an extra field on.

A framework-agnostic core cannot ship this as its read model. It forces every non-React host to re-read and re-diff a whole snapshot to learn one value, when the primitive those hosts want — a value with a subscribe — binds to a Vue `shallowRef`, an Angular signal, or `useSyncExternalStore` in a line or two.

## Considered options

**A. Per-field scoped stores as the sole public read model — chosen.**

Each field is exposed as a small store with `get()` and `subscribe(listener)`, where the listener receives the new value. A host subscribes to what it reads and is woken by nothing else. The bundled `getState()` snapshot and the `STATE_CHANGE` event are deprecated in 1.x and removed in 2.0.0.

The primitive is deliberately the smallest thing that binds to every framework, and nothing in it is novel — it is the shape `useSyncExternalStore` was designed against.

**B. Keep the bundled snapshot, optimize the producer — rejected.** Memoize harder, drop the deep clone, replace `isEqual` with a shallow compare. It is the cheapest change and it makes the existing surface faster. Rejected because it treats the cost as a performance problem when it is an interface problem. However fast the rebuild gets, a subscriber still learns "something changed" and still has to diff to find out what, and every host keeps writing the same comparison by hand. The memoized clone already in the producer is what this option looks like after one round, and the surface did not get better.

**C. Keep `getState()` as a bundled getter composed over the stores — rejected.** The stores become the read model, and `getState()` survives as a deprecated convenience that assembles them. Nothing breaks, and the migration is optional indefinitely — which is exactly the problem. No 3.0.0 is scheduled, so a getter that survives the major names no removal release: two read models for as long as that holds, with the docs explaining when each is right — the question this record exists to answer once. The bundle also stops being reproducible: two of its fields are framework bookkeeping that get no store, so the getter could not return today's shape anyway. Against that stands the real price of removal, and it is small. Most `getState()` call sites in this repo's own demo and examples are one-shot reads in click handlers and render paths, and each becomes a mechanical store read at the major. This record takes that break knowingly.

**D. Per-field events on the existing bus — rejected.** Keep the read model as it is and fix the notification: fire `STATE_CHANGE:<field>` per field, or carry a `changedFields` payload on the existing event. It deletes the hand-written guard with no new instance surface, no removal at 2.0.0, and no granularity decision that cannot be taken back — the cheapest option on this list by a wide margin. Rejected because the bus is the wrong primitive for a read model. There is no seed: a host still calls `getState()` first, so the bundle survives as the way to read a value. Unsubscribing needs the same handler reference rather than a returned function. And nothing binds it to `useSyncExternalStore`, a Vue `shallowRef`, or an Angular signal without a hand-written adapter per field — which is the whole point of the framework-agnostic core. It also grows the event enum by one member per field, forever.

**E. Expose the store itself — rejected.** Hand the host the underlying store and let it select. Maximum power, no new surface to design. Rejected because it publishes the internal state shape as public API. Every reducer change becomes a consumer-visible change, and the internal state is not the public contract — `PublicChatState` exists precisely because the two differ.

**F. The same stores, with `subscribe` also firing immediately on subscribe — rejected.** The contract Svelte stores and RxJS `BehaviorSubject` set: subscribing delivers the current value synchronously, then every change. It saves a call, it makes the seed impossible to forget — under change-only, a subscriber that skips `get()` shows nothing until the first change — and it is what a host arriving from those ecosystems expects `subscribe` to mean.

Rejected because the two contracts are not symmetric, and change-only is the one that composes. A host that wants seed-plus-watch builds it in one line — `listener(store.get()); store.subscribe(listener)` — with no gap, because nothing interleaves two synchronous calls. A host that wants changes only cannot recover them from an immediate-fire store without a skip-the-first-call guard, and a subscriber doing effect work — an analytics event when `activeResponseId` changes — needs exactly that guard — the same species of hand-written guard this record exists to delete. The frameworks the core binds to already never fire on subscribe: `useSyncExternalStore` uses `subscribe` purely as an invalidation signal and reads through the snapshot, Zustand subscribers fire only on change, and Redux's fire only on dispatch. Svelte is the real exception — its `$store` auto-subscription requires immediate fire — and adapts in a line: `readable(store.get(), (set) => { set(store.get()); return store.subscribe(set); })`. Immediate fire also runs host code synchronously inside the `subscribe` call, before the unsubscribe function has been returned to the caller — a re-entrancy hazard the change-only contract rules out.

## Decision outcome

Chat state is read through per-field scoped stores. Each store exposes:

```ts
interface ChatStore<T> {
  get: () => T;
  subscribe: (listener: (value: T) => void) => () => void;
}
```

`get` and `subscribe` are bound function properties rather than methods, so they can be passed as bare references — which is what a `useSyncExternalStore` binding does.

- `subscribe` fires **only on change**, never on subscribe. A host that wants the current value calls `get()`. This keeps `subscribe` doing one thing and binds directly to `useSyncExternalStore` without a discarded first call.
- `subscribe` returns its unsubscribe function.
- Stores are scoped per field rather than per leaf. The rule is that a store exists where a host would independently re-render: a field a host watches on its own gets a store, and a field only ever read alongside its siblings stays inside the parent's value.
- This is the sole public read model. `getState()` and `BusEventType.STATE_CHANGE` are `@deprecated` in 1.x and removed in 2.0.0. The conversation transcript joins the same model as three stores of its own — `messages`, `status`, and `error`, defined in [ADR-0025](0025-the-sdk-entry-point-shape.md).
- The undeclared top-level `history` field is not carried forward. `customPanels.history` is the one place that data is read.
- **The stores partition by the same rule as the instance members.** [ADR-0005](0005-chat-instance-survives-as-the-composition.md) sets the rule; this record applies it to `state`, field by field, in the table below — because this record is what creates the member.

The assignment, per field:

| Half | Stores |
| --- | --- |
| Conversation, on `ChatSDKInstance` | `humanAgent`, `activeResponseId`, `messages`, `status`, `error` — the last three defined by [ADR-0025](0025-the-sdk-entry-point-shape.md) |
| View | `viewState`, `launcherIsExpanded`, `launcherShouldStartCallToActionCounterIfEnabled`, `showUnreadIndicator`, `homeScreenState`, `disclaimersAccepted`, `hasSentNonWelcomeMessage`, `input`, `customPanels`, `workspace`, `isMessageLoadingCounter`, `isMessageLoadingText`, `isHydratingCounter` |
| No store | `wasLoadedFromBrowser`, `version` |

`input` is one store — content, focus, and uploads together. That is the per-field rule at its hardest case. The two no-store fields are framework bookkeeping. They leave the public surface with `getState()` at 2.0.0.

Equality is the store's contract, not an implementation detail, and it binds both sides. A store notifies when its value changes by reference, and `get()` returns that same reference until the next notification — values are computed once per change and cached, never rebuilt per read. The store objects on `state` are stable properties too, not getters that mint a new store per access. Hosts may rely on all of it, which is what makes a memoized selector or a `React.memo` boundary safe above one — and what makes the `useSyncExternalStore` binding below correct rather than an infinite render loop.

### Consequences

A host is woken for what it reads. The producer stops rebuilding, deep-cloning, and deep-freezing a seventeen-field object on every state-changing dispatch, and the hand-written `previousState`/`newState` guard disappears from consumer code.

The costs, taken knowingly:

**Removal lands in 2.0.0, and there is no later window.** `getState()` and `STATE_CHANGE` are deprecated for the whole 1.x line and removed at the major. A host that never migrates breaks at that upgrade, and the deprecation is the only notice it gets.

**Reference stability becomes a contract, and the bill is larger than a reducer rule.** Promising it means a reducer can no longer return a fresh-but-equal object without waking every subscriber of that field — and today's central `CHANGE_STATE` reducer deep-merges the whole tree, handing every slice a fresh reference on any non-config dispatch. That reducer needs an audit, and the derived values that are composed or cloned per read today — `humanAgent`, `input`, `customPanels`, `workspace` — need per-store memoization so `get()` can return a stable reference. This is a discipline the internal code adopts wholesale, in exchange for hosts being able to reason about when they re-render.

**Granularity is a judgment, and it will be wrong somewhere.** The rule above decides most cases, but a field that turns out to need splitting later can only gain a store additively, and one that was split too finely leaves a store nobody uses. Neither is reversible inside 1.x.

**Seven published state types depend on what happens next.** `PublicChatState` and its `Public*` members exist to type the bundle. They are retained as the value types the stores are parameterized on rather than deleted, so a host that named one in its own code keeps compiling.

### For consumers

**In 1.x, nothing breaks.** The stores arrive as new surface; `getState()` and `STATE_CHANGE` keep working and gain a `@deprecated` tag with the replacement named. Your editor will strike them through, and that is the notice that removal comes at 2.0.0.

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

The guard is gone because the store only fires for its own field, and unsubscribing is the returned function rather than an `off` call with a matching handler.

In React, a store binds directly:

```ts
const activeResponseId = useSyncExternalStore(
  instance.state.activeResponseId.subscribe,
  instance.state.activeResponseId.get
);
```

Every other framework is the same two calls wearing that framework's reactive primitive: seed from `get()`, forward `subscribe` into it, and hand the returned unsubscribe to the cleanup hook.

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

Each snippet is within a couple of lines of the whole integration — the primitive is small enough that a per-framework adapter would be mostly boilerplate.

**One thing to check before you migrate.** If you read a top-level `history` field off `getState()`, it was never part of the declared type — read `customPanels.history` instead, which is where that data is contracted to live.

## More information

- [ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) — the framework-agnostic core this read model is a precondition for.
- [ADR-0005](0005-chat-instance-survives-as-the-composition.md) — the instance partition; `getState` is classified there as a straddler, and this record is the one that deprecates it.
- [ADR-0023](0023-sdk-prefixed-seam-types.md) — the type names used here.
