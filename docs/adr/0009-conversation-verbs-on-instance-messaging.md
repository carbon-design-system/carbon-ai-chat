---
status: proposed
comments-by: 2026-08-18
date: 2026-08-06
deciders: '@carbon-design-system/carbon-ai-chat-developers'
consulted:
informed:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2031
discussion: https://github.com/carbon-design-system/carbon-ai-chat/discussions/2213
supersedes:
superseded-by:
---

# ADR-0009: Every conversation verb is reached through `instance.messaging`

## Context and problem statement

Conversation verbs have two homes. `ChatInstanceMessaging` declares seven methods (`types/config/MessagingConfig.ts:95-171`), and two of them also exist at the instance root: `send` (`types/instance/ChatInstance.ts:97-100`) and `restartConversation` (`:189`). The root `restartConversation` already carries a `@deprecated` tag pointing at the messaging namespace, so the direction is set and half-applied — `send` is the one that never moved.

The larger problem is that the contract written on `send` is not the contract the code implements. Its JSDoc (`types/instance/ChatInstance.ts:79-82`) makes two promises. The first: it resolves "once a response has received and processed and both the `pre:receive` and `receive` events have fired." The second: it rejects "when too many errors have occurred and the system gives up retrying." Neither holds:

- It resolves as soon as the host's `customSendMessage` settles. The coordinator finishes with `received = null`, so `actions.receive` is skipped entirely (`chat/services/OutboundMessageCoordinator.ts:254-265`, `chat/services/MessageService.ts:299`).
- There is no retry loop anywhere in the send path, so nothing can exhaust one.

The same text is duplicated twice more in the implementation (`chat/services/ChatActionsImpl.ts:827-830` and `:893-896`), so a reader who checks the source finds the claim restated rather than corrected. This is a contract that has been wrong in three places for as long as it has been published.

The promise also cannot mean much while `customSendMessage` is typed `(...) => Promise<void> | void` (`types/config/PublicConfigMessaging.ts:56-60`). A host may return nothing, in which case the send promise settles immediately regardless of what the transport is doing.

Two smaller mismatches sit in the same path. The read-only guard is documented as a throw but is declared inside an `async` arrow (`chat/instance/ChatInstanceImpl.ts:84-88`), so it rejects — the repo's own spec pins the rejection. And it guards only the instance method; `ChatActionsImpl.send` has no such check, so the chat's own UI send path is not read-only at all.

## Considered options

**A. Every conversation verb is reached through `instance.messaging`, and the promise contract is documented as what the pipeline settles on — chosen.**

`send` joins the messaging namespace, bringing it to eight methods. The root `send` and `restartConversation` are deprecated in 1.x and removed in 2.0.0. The promise contract is rewritten to describe the real settlement points rather than the aspirational ones.

Grouping the verbs is what makes the headless surface legible: everything a conversation needs is reachable from one namespace, and that namespace is the member the conversation half of the instance carries.

**B. Keep both homes — rejected.** Costs nothing and breaks nobody. Rejected because two spellings of one verb is a permanent question for every consumer and every doc example. The root copy is also the one whose JSDoc is wrong, so keeping it means keeping the fiction or maintaining two true copies of one paragraph. And the root `restartConversation` is already deprecated toward the namespace. Keeping `send` at the root leaves the surface half-migrated, with no principle explaining which verb lives where.

**C. Collapse the namespace instead, and put the verbs at the root — rejected.** The mirror image: delete `instance.messaging` and hoist its members. Shorter to type, and the root is where `send` already is. Rejected because the namespace is what the conversation half is: the headless SDK hands out an instance whose conversation surface is `messaging`, and flattening it puts eight conversation methods next to a dozen view methods with nothing marking the seam. It also breaks far more surface than moving one method, since seven members would move rather than one.

**D. Make the code match the documentation — rejected.** Rather than rewriting the contract, implement it: retry until exhaustion, and resolve only after `pre:receive` and `receive` have fired. It is the option that keeps every published promise. Rejected on both halves.

Retry policy belongs to the host. The host owns the transport and is the only party that knows whether a request is safe to repeat, so a framework retry would duplicate side effects on any non-idempotent backend. Resolving after `receive` fails differently: a host that renders its own responses never delivers a message into the chat, so no receive event ever fires and the promise hangs forever. The documented contract was written for an architecture where the framework owned the transport. That stopped being true when `customSendMessage` arrived.

## Decision outcome

Every conversation verb is reached through `instance.messaging` and nowhere else.

- `send` joins the namespace: `instance.messaging.send(message, options?)`.
- Root `send` and `restartConversation` are `@deprecated` in 1.x, delegating to the namespace, and are removed in 2.0.0.

The promise that `messaging.send` returns settles on what the pipeline actually does:

| Outcome                                 | Settlement   |
| --------------------------------------- | ------------ |
| The host's `customSendMessage` resolves | resolves     |
| The host's `customSendMessage` rejects  | rejects      |
| The send path fails terminally          | rejects      |
| The turn is stopped                     | **resolves** |
| The conversation is restarted           | **resolves** |
| The chat is in read-only mode           | rejects      |
| A file upload is still in flight        | rejects      |

It fires `PRE_SEND`, then `SEND`. It does not wait for a response, and it does not retry — retry is the host's, because the host owns the transport.

Stop and restart resolve rather than reject, because neither is a failure. A host that awaits a send and then stops it has not encountered an error, and making it reject would push every caller into a `try`/`catch` that has to re-classify the reason.

Two things this record names as defects rather than ratifying:

- **A send with a file upload in flight resolves without sending.** `doSend` warns and returns (`chat/services/ChatActionsImpl.ts:914-925`), so the promise resolves successfully with no message sent. Silent success for a message that never left is the worst available outcome, so the table above rejects it. A refused send must also leave no state behind: today it clears `activeResponseId` before the guard runs, so the chat reports a turn that never began.
- **The read-only guard is instance-only.** `ChatActionsImpl.send` has no check, so the chat's own send path bypasses it. Read-only is a property of the chat, not of which caller reached it.

Rejecting was not the only way out of the upload case. Queueing the send until the transfer finishes is closest to what pressing send meant, but it makes settlement wait on what the framework does not control — the network, or whether the user removes the file. That is the unbounded wait option D was rejected for. A failed transfer would still have to reject, so queueing adds a mode rather than replacing one. Sending without the pending attachments is the same silent loss in a different costume. Rejecting is also the more capable contract: `hasInFlightUploads` is public state, so a host that wants to defer can write that itself, while a host that wants to know its message vanished cannot.

### Consequences

The conversation surface has one shape. A headless consumer reaches everything through one namespace, and there is no per-verb question about whether the root or the namespace is the real one.

The costs, taken knowingly:

**A published contract is being corrected, not just moved.** Anyone who wrote against the documented behavior — expecting `send` to resolve after `receive`, or expecting retries — has code built on something that never worked that way. Their code is not broken by this record, but their understanding is, and the correction only reaches them if they read the changed JSDoc.

**The 1.x line carries both spellings.** The root methods stay for the whole line, tagged. The surface is larger until 2.0.0, not smaller.

**The promise stays weak while the callback may return `void`.** A host returning nothing still gets an immediately-settled promise. Tightening the callback to async-only is breaking and belongs to the 2.0.0 window; until then the contract above is accurate but only as strong as what the host returns.

**A timeout still rejects, for now.** While the framework arms a request timeout, an exceeded timeout is a terminal failure and rejects. A later record removes that machinery, at which point the leg disappears with it — the contract above stays true either way, because it describes settlement rather than causes.

### For consumers

**Nothing breaks in 1.x.** `instance.messaging.send` appears; `instance.send` keeps working and gains a `@deprecated` tag naming the replacement. Your editor strikes it through, and that is the notice that it goes at 2.0.0.

```ts
// 1.x today, and still fine — deprecated, delegating
await instance.send('What is the weather?');

// the replacement
await instance.messaging.send('What is the weather?');
```

**Read the settlement table above if you await that promise.** It is likely to differ from what you expected, because the previous documentation described behavior the code never had. In particular:

```ts
await instance.messaging.send(text);
// The response has NOT necessarily arrived here.
// This resolves when your customSendMessage settles.
// To act on the response, handle it where you receive it.
```

If you need to act once a response exists, do it in your own `customSendMessage`, or subscribe to the receive event — not by awaiting the send.

Stopping a turn resolves the pending send rather than rejecting it, so a `catch` does not run on stop. The same holds when the conversation restarts. Neither is a failure, so neither is reported as one.

**Two settlement outcomes change.** Both are defect fixes named above, and both are visible:

- A send issued while a file upload is in flight now rejects. Today it resolves successfully without sending anything. If you await `send` and have no `catch`, add one.
- Read-only now blocks the chat's own send path, not just `instance.send`. A host that relied on the UI still sending while read-only will find it does not.

## More information

- [ADR-0023](0023-sdk-prefixed-seam-types.md) — the type names used here.
- [ADR-0005](0005-chat-instance-survives-as-the-composition.md) — `messaging` is classified there as a conversation member, which is what makes this namespace the headless surface.
- Sibling record, forthcoming before 2.0.0: the turn boundary, which decides what the promise means once the callback is async-only.
