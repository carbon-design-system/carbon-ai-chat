---
status: proposed
comments-by: 2026-08-18
date: 2026-08-06
deciders: '@carbon-design-system/carbon-ai-chat-developers'
consulted:
informed:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2030
discussion: https://github.com/carbon-design-system/carbon-ai-chat/discussions/2209
supersedes:
superseded-by:
---

# ADR-0003: Instance lifetime belongs to the acquire, not the host mount

## Context and problem statement

A chat is built by a mount effect and belongs to it. `ChatAppEntry`'s effect calls `initServiceManagerAndInstance` (`chat/ChatAppEntry.tsx:188-193`) with no condition and no registry lookup, so every mount constructs a fresh service manager, a fresh store, and a fresh instance.

The effect returns no cleanup, so the previous graph is not torn down — it is abandoned. Nothing in `packages/ai-chat/src` disposes a service manager at all; there is no `unloadServices` and no `destroy` on the instance. Each boot registers store subscriptions (`chat/services/loadServices.ts:59-78`) that nothing removes, so a remount leaves a live set behind on a store nobody releases. The consequence for the consumer is not a clean restart; it is amnesia plus a leak.

The conversation does not come back on its own. `PersistedState` carries view state, unread and launcher flags, disclaimers, the home screen, and human-agent state — and no messages. Only a host-supplied history loader can restore a transcript.

The human-agent case is louder than a lost transcript. On the new boot, hydration reads the persisted connection flag and either forces a desk-level reconnect or ends the chat and writes "chat was ended" messages into the transcript (`chat/services/haa/HumanAgentServiceImpl.ts:793-850`). A remount the host did not think of as a lifecycle event can therefore tell a user their agent conversation is over.

Hosts hit this through ordinary React: a StrictMode double-mount, a changing `key`, or conditional rendering. `ChatContainer` pins `key="stable-chat-instance"` on its own child (`react/ChatContainer.tsx:378`), which guards remounts originating inside `ChatContainer` and nothing above it.

## Considered options

**A. Acquisition is create-or-adopt, behind an opt-in flag — chosen.**

A namespace-keyed registry holds live instances. An acquire either creates one or adopts the one already there, so a remount is handed the running conversation instead of a new one. It sits behind an opt-in `featureFlags.reuseInstance`, because changing lifecycle semantics under hosts that never asked is itself a break.

Two teardown verbs follow from it. `release()` says "done with this handle, but something may come back": it drops this handle's claim, the grace window opens when the last claim drops, and an acquire inside that window adopts the same instance under a fresh handle. `destroy()` says "gone for good": evict and unload now, with no window and nothing able to re-adopt. One verb cannot express both, because the registry has to know whether to hold or drop.

**B. Cold-boot on every mount — rejected.** The status quo, and it costs nothing to keep. Rejected because it makes an ordinary React idiom destructive: the host cannot tell which of its own renders will discard a conversation, and the only mitigation available is documentation telling hosts to mount once and never move the component. That is a constraint the framework imposes and cannot enforce.

**C. An `adopted` boolean on the acquire return — rejected.** The obvious way to let a caller branch its boot-once work: the acquire says whether it created or adopted, and the host skips its own setup when told "adopted". It was built this way in the reuse prototype, and it lied: a mount that released while boot was still in flight left the next acquirer told "adopted" when none of the boot-once work had run, rendering a chat that never opened. The prototype then repaired it into this option's strongest form — "adopted" redefined as "adopted a completed boot", a per-call answer derived from a durable fact. That form works, and it is still rejected, for a smaller reason: the acquire already resolves only when boot is complete ([ADR-0025](0025-the-sdk-entry-point-shape.md)), so the framework fact the flag encoded is subsumed by the contract of the acquire itself. What remains is the host's own run-once seeding, and that is a question about the conversation — answerable at any time, with no flag to hand out.

**D. Reuse always on, with no flag — rejected.** Simpler surface, no configuration, and it makes the good behavior the default. Rejected because it changes lifetime semantics under existing hosts silently. A host that today relies on a remount clearing state would keep its conversation instead, and nothing about the upgrade would tell it. The flag is the migration.

**E. One teardown verb, with the grace window as an internal detail — rejected.** Fewer names, and the caller never has to choose. Rejected because the two intents differ in a way only the caller knows: whether something may come back. A single verb has to guess, and either it holds instances a host meant to discard, or it discards instances a host meant to hold. The cost of the pair is real and is stated below.

## Decision outcome

Instance lifetime belongs to the acquire, not to the host mount.

- Acquisition is **create-or-adopt** against a registry keyed by namespace. An acquire returns a running instance where one exists.
- It is opt-in, behind `featureFlags.reuseInstance`. Reuse changes lifecycle semantics, so it does not arrive unrequested. The `featureFlags` key is itself new — this record adds it to the public config, with `reuseInstance` as its first member, which is how a shell host reaches it in 1.x.
- Every acquire takes its own claim: each call returns its own handle over the shared instance, and the handle is the claim. **`release()`** drops this handle's claim — a second call on the same handle is a no-op. The grace window opens only when the last claim drops, and an acquire inside it adopts the instance under a fresh handle and cancels the unload.
- The window defaults to 3000 ms, tunable via `featureFlags.reuseInstanceGraceMs`. When it elapses, the instance unloads exactly as `destroy()` would have — expiry is destruction at a delay, the human-agent connection included.
- **`destroy()`** evicts and unloads immediately, regardless of other live claims. No window, and nothing can re-adopt.
- Both live on `ChatSDKHandle`, beside `updateConfig`. That placement — and why lifecycle sits on the handle rather than on the instance — is [ADR-0025](0025-the-sdk-entry-point-shape.md)'s; this record decides only what the two verbs mean.
- They are SDK surface, so they ship on [ADR-0002](0002-core-react-wrapper-headless-sdk-split.md)'s schedule: no earlier than 2.0.0, and not in 1.x. The shells reach the same registry without exposing a handle, so a 1.x host gets remount survival through the shell rather than through these verbs. A shell unmount is an implicit `release()`. There is no early-teardown verb in 1.x — a flag-on host that wants an instance gone waits out the window, a cost taken knowingly and bounded by the 3-second default.
- The acquire return carries **no `adopted` flag**, and no equivalent per-call fact. A caller that needs to know whether to run boot-once work asks a durable question about the conversation instead.
- The reuse prototype's surface conforms to this record before it merges: the public `instance.destroy` and the `onAttach` remount fact it carried do not ship. Lifecycle stays off the instance ([ADR-0025](0025-the-sdk-entry-point-shape.md)), and the per-call fact is rejected above.
- `reuseInstance` stays opt-in through 1.x. Whether 2.0.0 flips the default is left open — named here so nobody reads the prototype's documentation as having decided it. A default flip is its own record with its own migration story.

### Consequences

A remount stops being a lifecycle event. A host can move the component, render it conditionally, or run StrictMode without deciding whether that discards a conversation, and the human-agent reconnect-or-end path stops firing on renders the host did not think of as lifecycle at all.

The costs, taken knowingly:

**With the flag off — the default — `release()` and `destroy()` do the same thing.** There is no registry entry to hold, so both unload immediately. A consumer developing without reuse cannot tell the verbs apart, may pick either, and gets different behavior the day the flag goes on. The names carry the whole distinction, so they have to say what they mean, and the documentation has to state this plainly rather than describing two verbs as though the difference were always observable.

**A released instance stays alive for the grace window.** A human-agent connection, a subscription, and any in-flight turn outlive the unmount by that long — three seconds by default. That is the point — it is what a remount adopts — but a host that released deliberately is paying for a reuse it does not want unless it calls `destroy()`.

**Namespace is the identity.** Two mounts sharing a namespace adopt each other even when their configs differ. The adopting acquire reconfigures the running instance through the same replace-not-patch path as `updateConfig` ([ADR-0025](0025-the-sdk-entry-point-shape.md)), so anything the second config omits is removed rather than inherited — including a `serviceDeskFactory`, which severs a live human-agent conversation the first mount was holding. A host running two genuinely independent chats has to give them different namespaces. Development builds make the mistake loud: a second live acquire on an already-claimed namespace logs a console error naming the namespace and the fix.

**The registry is module-level state.** Two copies of the package on a page do not share it, so reuse silently does not happen across them.

### For consumers

**Nothing changes unless you opt in.** Without `featureFlags.reuseInstance`, acquisition behaves as it does today: every acquire builds a new chat.

With it on, a remount keeps the conversation:

```ts
// The host unmounts and remounts — a StrictMode double-mount, a key change,
// a conditional render. With the flag on, the second acquire adopts the first.
const chat = await acquireChatSDK({ namespace: 'support', ...config });
// ... host unmounts
chat.release(); // grace window opens; the conversation stays alive
// ... host remounts inside the window
const same = await acquireChatSDK({ namespace: 'support', ...config });
// a fresh handle over the same instance — same transcript, same connection
```

Use `destroy()` when the conversation is finished rather than paused:

```ts
chat.destroy(); // evicted now; a later acquire builds a new chat
```

The verbs are 2.0.0 surface, but the reuse itself is not. In 1.x the flag rides the shell config, and unmount plays the part of `release()`:

```tsx
<ChatContainer
  namespace="support"
  featureFlags={{ reuseInstance: true }}
  messaging={{ customSendMessage }}
/>
// unmount → implicit release(); a remount inside the window adopts
```

There is no early-teardown verb in 1.x. An unmounted chat waits out the window, three seconds by default.

**Do not branch boot-once work on whether you adopted.** Ask a durable question about the conversation instead, because that answer is true whenever you ask it:

```ts
// Instead of: if (!adopted) { seedWelcome(); }
if (chat.state.messages.get().length === 0) {
  seedWelcome();
}
```

The store that answers it — `state.messages` — is defined in [ADR-0025](0025-the-sdk-entry-point-shape.md). What matters is the shape of the question: ask something about the conversation, which is true whenever you ask, rather than something about this particular call.

If you are on `1.x` and not using reuse, the thing worth doing today is making sure a remount cannot happen unnoticed — a stable `key`, and no conditional render around the chat.

## More information

- [ADR-0025](0025-the-sdk-entry-point-shape.md) — the entry point these verbs hang off, and why lifecycle sits on the handle rather than the instance.
- [ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) — when SDK surface may ship.
- [ADR-0004](0004-per-field-scoped-stores.md) — the per-field read model for chat state.
- [ADR-0023](0023-sdk-prefixed-seam-types.md) — the type names used here.
