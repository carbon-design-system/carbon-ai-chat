---
status: proposed
comments-by: 2026-08-18
date: 2026-08-06
deciders: '@carbon-design-system/carbon-ai-chat-developers'
consulted:
informed:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2031
discussion: https://github.com/carbon-design-system/carbon-ai-chat/discussions/2212
supersedes:
superseded-by:
---

# ADR-0007: Both message-delivery APIs run on one store pipeline

## Context and problem statement

The chat has two ways to deliver a message, and they do not act alike. One streams the reply in as it arrives; the other drops it in whole, and the view never follows it.

Each way runs over its own store pipeline. `addMessageChunk` writes through `STREAMING_START`, `STREAMING_ADD_CHUNK`, and `STREAMING_MERGE_MESSAGE_OPTIONS`; `upsertMessage` writes through `UPSERT_MESSAGE` (`chat/store/actions.ts:80, :104-106`). So every streaming behavior exists twice. The defects found while graduating `upsertMessage` were all seams between the two.

**The renderer contract is written by one pipeline only.** `ui_state.streamingState` and `isIntermediateStreaming` are set by the chunk reducer and nothing else (`chat/store/reducers.ts:1510-1560`). Their readers include the markdown renderer, conversational search, and the auto-scroll controller (`chat/components/helpers/MarkdownWithErrorHandling/MarkdownWithErrorHandling.tsx:58-70`). A message delivered purely by `upsertMessage` never enters that contract. It does not stream-render. It does not drive auto-scroll. Search never treats it as in progress.

Mixed flows are worse than plainly broken. The upsert reducer reuses a prior item reference when the new one is deep-equal (`chat/store/reducerUtils.ts:529-538`). Take a message that was chunk-streamed and is then upserted unchanged. It keeps the streaming flags it inherited. The behavior depends on delivery history, not on the message.

**Cancellation is a single slot.** `InboundStreamingCoordinator` holds one `streamingMessageID` (`:27`), and only the chunk path ever writes it (`chat/services/ChatActionsImpl.ts:1177-1187`). One pointer cannot describe two live streams. The upsert path is invisible to it.

**The outbound queue advances on different rules.** A queue item marked `isStreaming` holds back `moveToNextQueueItem` until the terminal chunk arrives (`chat/services/MessageService.ts:306-316`). A turn that never sets it advances as soon as the send settles (`:308`). Only `isStreamPartialItem(chunk)` arms the flag (`ChatActionsImpl.ts:1175`), so this is not even a clean split by API. A chunk turn built entirely from `complete_item` chunks holds nothing and acts like an upsert turn. Which queue rules a host gets depends on the shape of its chunks.

**The stop button clobbers in one direction.** The chunk path's reset runs globally, with no message argument (`ChatActionsImpl.ts:1577-1584`, resetting at `:1582`, into `chat/utils/streamingUtils.ts:168`). So a chunk turn that finishes hides a button an upsert turn raised. The reverse cannot happen. The upsert pipeline has no reset of its own. The resets that could race a live chunk stream are guarded on `streamingMessageID` (`MessageService.ts:311`, `ChatActionsImpl.ts:1797`), so they return early while one is running. The rest go unguarded — restart, cancellation, and the error path (`ChatActionsImpl.ts:2228`, `MessageService.ts:796`, `OutboundMessageCoordinator.ts:107` and `:200`) — but the upsert delivery path cannot reach them. That is what keeps the asymmetry one-directional. The bug shows up in one ordering only, which is why it survived.

Each of these is repairable in place. Repairing them in place is what produced the current state. That state is two implementations that have to be taught the same lesson twice, plus a third one waiting for whichever seam is found next.

## Considered options

**A. One store pipeline, with the chunk API as a facade over it — chosen.**

`addMessageChunk` stops being a separate write path. It becomes a facade that accumulates deltas into whole-message snapshots and dispatches them through `UPSERT_MESSAGE`. Both public APIs remain, unchanged in signature and in observable behavior. Streaming state, cancellation, and queue advancement have one implementation, because there is one pipeline to build them on.

Chunk-path behavior is preserved end to end. The facade carries chunk fidelity, per-item done-ness, and the renderer contract across; it does not redefine them. The upsert path changes only where it joins that contract. That is what makes this a 1.x change: the differences are fixes, and For consumers lists all four. This record does not decide which turn owns a stream, or when a turn ends.

**B. Keep two pipelines and patch seams as they are found — rejected.** The status quo. Each seam is small on its own, and the repairs are local. Rejected because it is the option that produced the four seams above. The cost is not the repairs but the doubling. Every streaming feature after this gets built and tested twice, and the second build is the one that gets forgotten. The mixed-flow case is the warning. That defect belongs to neither pipeline. It belongs to the boundary between them, so patching either side never removes the class.

**C. Retire `addMessageChunk` and keep only `upsertMessage` — rejected.** One API and one pipeline, the smallest end state. Rejected because chunk delivery is what a streaming transport naturally produces. Push accumulation into every host, and every host writes the same buffer. It also removes a shipped, documented, widely-used API, which is breaking, so it lands in a major at the earliest — while the seams are costing correctness now.

**D. Unify by making `upsertMessage` write the chunk actions — rejected.** The other direction: keep the chunk pipeline as the single implementation and express upserts through it. Rejected because the chunk actions are shaped around deltas that arrive over time. A native upsert has no deltas. It would have to build a fake chunk sequence for a message it already holds whole. The upsert action can express a chunk, as a snapshot after each delta. The chunk actions cannot express an upsert without inventing one.

## Decision outcome

Both message-delivery APIs run on one store pipeline. `addMessageChunk` becomes a facade that accumulates chunk deltas into whole-message snapshots and dispatches them through `UPSERT_MESSAGE`.

The rest follows from having one pipeline, rather than from separate decisions:

- One write path writes streaming state. So a message delivered by either API enters the renderer contract that markdown, conversational search, and auto-scroll read.
- Cancellation and the stop button have one implementation, so neither API can reset the other's affordance.
- Queue advancement follows one rule: a turn advances when its send settles and no message it delivered is still `STREAMING`. What the message says decides, not how it arrived. A partial-item stream holds until its terminal chunk completes the message. A complete-item-only turn advances at settle, for the same reason.

Both public APIs keep their signatures. Chunk-path behavior is preserved outright. The facade carries chunk-array fidelity and per-item done-ness through; it does not re-derive them. A host that inspects streamed chunks sees what it saw before. Upsert-path behavior changes only where it joins the streaming contract, and the four changes in For consumers are the complete list. The existing chunk specs are the check on preservation: they pass unchanged, or the facade is wrong. The upsert specs change where the four changes land, and nowhere else.

**What this record does not decide.** These stay open: when a turn is over, what the stop button scopes to, and whether the `customSendMessage` promise is the turn boundary. They change observable behavior, so they belong to the 2.0.0 window and to their own record. This record unifies the implementation underneath them. That is what lets that record decide once instead of twice.

### Consequences

Streaming has one implementation. A fix lands once. A feature is built once. The mixed-flow class of defect stops existing, because it has no boundary left to live on.

The costs, taken knowingly:

**A facade is indirection, and it is not free to read.** `addMessageChunk` no longer maps to actions named after chunks. Someone debugging a chunk flow steps through an accumulation layer and lands in an upsert action. That is a worse first read than the direct path it replaces.

**Behavior preservation is asserted by tests, not by construction.** The claim that nothing moves outside the four listed changes rests on the existing specs. They have to be complete enough to catch a change if one happened. They are the best evidence available, and they are not proof. A behavior no spec pins can change silently in this refactor.

**Accumulating snapshots costs more than appending deltas.** Every chunk now produces a whole-message snapshot rather than a push onto an array. Reference reuse for unchanged items keeps that from reaching the renderer. But the work happens on every chunk of every stream, and that is the hottest path in the product.

**The one-pipeline argument gets weaker if the APIs diverge later.** This record is worth its cost because the two APIs mean the same thing. A future feature that only one of them can express would reintroduce the split, in a facade rather than in the store.

### For consumers

**Signatures are unchanged. Upserted messages behave differently.** Chunk delivery streams, renders, and scrolls exactly as it does today. Messages delivered by `upsertMessage` now do the same. That is a fix. It is still a visible change, and one of them moves the viewport.

```ts
// unchanged
await instance.messaging.addMessageChunk(chunk);
await instance.messaging.upsertMessage(id, MessageState.STREAMING, updater);
```

If you deliver messages with `upsertMessage`, four things start working that quietly did not:

- The message stream-renders, so markdown resolves as it arrives instead of appearing at the end.
- Auto-scroll follows it.
- Conversational search treats it as in progress.
- The outbound queue treats it as streaming: a message upserted as `STREAMING` holds the next queued message until you upsert it `COMPLETE`. If you never complete it, the queue waits — the same as a chunk stream that never sends its terminal chunk.

If you mix the two APIs on one message, the behavior stops depending on the order you used them in.

Nothing here changes when a turn ends or when the stop button appears — those stay open for the turn-boundary record. When your `send` promise settles is not open at all; it is decided in [ADR-0009](0009-conversation-verbs-on-instance-messaging.md), and this record does not move it.

## More information

- [ADR-0009](0009-conversation-verbs-on-instance-messaging.md) — the messaging namespace both APIs are reached through.
- Sibling record, forthcoming: the turn boundary and stop-button scope, which this unification lets a single record decide.
