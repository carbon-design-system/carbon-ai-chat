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

A chat belongs to the mount effect that built it. `ChatAppEntry`'s effect calls `initServiceManagerAndInstance` (`chat/ChatAppEntry.tsx:188-193`) with no condition and no registry lookup. So every mount builds a fresh service manager, a fresh store, and a fresh instance.

The old graph is not torn down. It is dropped. The effect returns no cleanup, and nothing in `packages/ai-chat/src` disposes a service manager at all. There is no `unloadServices`, and no `destroy` on the instance. Each boot adds store subscriptions (`chat/services/loadServices.ts:59-79`) that nothing removes. A remount leaves those alive on a store nobody frees. The consumer does not get a clean restart. The chat forgets everything, and the old one leaks.

The conversation does not come back on its own. `PersistedState` carries view state, unread and launcher flags, disclaimers, the home screen, and human-agent state. It carries no messages. Only a history loader from the host can restore a transcript.

The human-agent case is worse than a lost transcript. On the new boot, hydration reads the saved connection flag. It then either forces a desk-level reconnect, or it ends the chat and writes "chat was ended" messages into the transcript (`chat/services/haa/HumanAgentServiceImpl.ts:793-850`). So a remount the host never saw as a lifecycle event can tell a user their agent conversation is over.

Hosts hit this through plain React: a StrictMode double-mount, a changing `key`, or a conditional render. `ChatContainer` pins `key="stable-chat-instance"` on its own child (`react/ChatContainer.tsx:297`). That guards remounts that start inside `ChatContainer`, and nothing above it.

## Considered options

**A. Acquisition is create-or-adopt, behind an opt-in flag — chosen.**

A registry keyed by namespace holds live instances. An acquire either creates an instance or adopts the one already there. A remount is handed the running conversation instead of a new one. It sits behind an opt-in `featureFlags.reuseInstance`, because changing lifecycle rules under hosts that never asked is itself a break.

Two teardown verbs follow from it. `release()` says "done with this handle, but something may come back". It drops this handle's claim. The grace window opens when the last claim drops, and an acquire inside that window adopts the same instance under a fresh handle. `destroy()` says "gone for good": evict and unload now, with no window and nothing able to re-adopt. One verb cannot express both, because the registry has to know whether to hold or drop.

**B. Cold-boot on every mount — rejected.** The status quo, and it costs nothing to keep. Rejected because it makes a plain React idiom destructive. The host cannot tell which of its own renders will throw away a conversation. The only fix on offer is a doc telling hosts to mount once and never move the component. That is a rule the framework imposes and cannot enforce.

**C. An `adopted` boolean on the acquire return — rejected.** The obvious way to let a caller branch its boot-once work. The acquire says whether it created or adopted, and the host skips its own setup when told "adopted". The reuse prototype built it this way, and it lied. A mount that released while boot was still in flight left the next acquirer told "adopted" when none of the boot-once work had run. It rendered a chat that never opened. The prototype then repaired it into this option's strongest form: "adopted" redefined as "adopted a completed boot", a per-call answer drawn from a lasting fact. That form works. It is still rejected, for a smaller reason. The acquire already resolves only when boot is complete ([ADR-0025](0025-the-sdk-entry-point-shape.md)), so the contract of the acquire itself already carries the framework fact the flag encoded. What remains is the host's own run-once seeding. That is a question about the conversation, answerable at any time, with no flag to hand out.

**D. Reuse always on, with no flag — rejected.** Simpler surface, no config, and it makes the good behavior the default. Rejected because it quietly changes lifetime rules under hosts that already ship. A host that relies today on a remount clearing state would keep its conversation instead. Nothing in the upgrade would tell it. The flag is the migration.

**E. One teardown verb, with the grace window as an internal detail — rejected.** Fewer names, and the caller never has to choose. Rejected because the two intents differ in a way only the caller knows: whether something may come back. A single verb has to guess. It then either holds instances a host meant to drop, or drops instances a host meant to hold. The cost of the pair is real, and it is stated below.

## Decision outcome

Instance lifetime belongs to the acquire, not to the host mount.

- Acquisition is **create-or-adopt** against a registry keyed by namespace. An acquire returns a running instance where one exists.
- It is opt-in, behind `featureFlags.reuseInstance`. Reuse changes lifecycle rules, so it never arrives unasked. The `featureFlags` key is itself new. This record adds it to the public config, with `reuseInstance` as its first member. That key is how a shell host reaches reuse in 1.x.
- Every acquire takes its own claim. Each call returns its own handle over the shared instance, and the handle is the claim. **`release()`** drops this handle's claim. A second call on the same handle does nothing. The grace window opens only when the last claim drops. An acquire inside that window adopts the instance under a fresh handle and cancels the unload.
- The window defaults to 3000 ms, and `featureFlags.reuseInstanceGraceMs` tunes it. When it runs out, the instance unloads just as `destroy()` would. Expiry is teardown at a delay, and it takes the human-agent connection with it.
- **`destroy()`** evicts and unloads at once, whatever other claims are live. No window, and nothing can re-adopt.
- Both live on `ChatSDKHandle`, beside `updateConfig`. [ADR-0025](0025-the-sdk-entry-point-shape.md) owns that placement, and owns why lifecycle sits on the handle rather than on the instance. This record decides only what the two verbs mean.
- They are SDK surface, so they ship on [ADR-0002](0002-core-react-wrapper-headless-sdk-split.md)'s schedule: no earlier than 2.0.0, and not in 1.x. The shells reach the same registry without handing out a handle. So a 1.x host gets remount survival through the shell, not through these verbs. A shell unmount acts as an implicit `release()`. There is no early-teardown verb in 1.x. A flag-on host that wants an instance gone waits out the window. That cost is taken knowingly, and the 3-second default bounds it.
- The acquire return carries **no `adopted` flag**, and no per-call fact like it. A caller that needs to know whether to run boot-once work asks a lasting question about the conversation instead.
- The reuse prototype's surface matches this record before it merges. The public `instance.destroy` and the `onAttach` remount fact it carried do not ship. Lifecycle stays off the instance ([ADR-0025](0025-the-sdk-entry-point-shape.md)), and the per-call fact is rejected above.
- `reuseInstance` stays opt-in through 1.x. Whether 2.0.0 flips the default is left open. It is named here so nobody reads the prototype's docs as having settled it. A flip of the default is its own record, with its own migration story.

### Consequences

A remount stops being a lifecycle event. A host can move the component, render it by condition, or run StrictMode, and never has to ask whether that throws away a conversation. The human-agent reconnect-or-end path stops firing on renders the host never saw as lifecycle at all.

The costs, taken knowingly:

**With the flag off — the default — `release()` and `destroy()` do the same thing.** There is no registry entry to hold, so both unload at once. A consumer who builds without reuse cannot tell the verbs apart. They may pick either, then get new behavior the day the flag goes on. The names carry the whole difference, so they have to say what they mean. The docs have to state this plainly, rather than describe two verbs as though the gap always showed.

**A released instance stays alive for the grace window.** A human-agent connection, a subscription, and any in-flight turn outlive the unmount by that long — three seconds by default. That is the point, and it is what a remount adopts. But a host that released on purpose pays for a reuse it does not want, unless it calls `destroy()`.

**Namespace is the identity.** Two mounts that share a namespace adopt each other, even when their configs differ. The adopting acquire reconfigures the running instance through the same replace-not-patch path as `updateConfig` ([ADR-0025](0025-the-sdk-entry-point-shape.md)). So anything the second config leaves out is dropped, not inherited. That includes a `serviceDeskFactory`, and dropping it cuts a live human-agent conversation the first mount was holding. A host that runs two truly separate chats has to give them different namespaces. Development builds make the mistake loud. A second live acquire on a namespace already claimed logs a console error, and it names both the namespace and the fix.

**The registry is module-level state.** Two copies of the package on one page do not share it. Reuse then fails across them, and nothing says so.

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

**Do not branch boot-once work on whether you adopted.** Ask a lasting question about the conversation instead. That answer is true whenever you ask it:

```ts
// Instead of: if (!adopted) { seedWelcome(); }
if (chat.state.messages.get().length === 0) {
  seedWelcome();
}
```

[ADR-0025](0025-the-sdk-entry-point-shape.md) defines the store that answers it, `state.messages`. What matters is the shape of the question. Ask something about the conversation, true whenever you ask, rather than something about this one call.

If you are on `1.x` and not using reuse, do one thing today. Make sure a remount cannot happen unnoticed: a stable `key`, and no conditional render around the chat.

## More information

- [ADR-0025](0025-the-sdk-entry-point-shape.md) — the entry point these verbs hang off, and why lifecycle sits on the handle rather than the instance.
- [ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) — when SDK surface may ship.
- [ADR-0004](0004-per-field-scoped-stores.md) — the per-field read model for chat state.
- [ADR-0023](0023-sdk-prefixed-seam-types.md) — the type names used here.
