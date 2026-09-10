---
status: proposed
comments-by: 2026-08-18
date: 2026-08-06
deciders: '@carbon-design-system/carbon-ai-chat-developers'
consulted:
informed:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2030
discussion: https://github.com/carbon-design-system/carbon-ai-chat/discussions/2211
supersedes:
superseded-by:
---

# ADR-0005: `ChatInstance` survives the split as the composition of both halves

## Context and problem statement

The chat hands a host one object carrying everything it can do. The split now under way needs that object to come apart along a clean line. Nobody has checked whether it does, and this record is that check.

[ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) splits the package into a conversation layer and a view layer. [ADR-0023](0023-sdk-prefixed-seam-types.md) names the two halves. Between them they record one assumption that neither can check. `ChatViewInstance` is a **sibling** of `ChatSDKInstance`, not a subtype, and `ChatInstance` composes the two.

That shape only works if the instance member set really partitions. If enough members belong to both halves, the sibling cut is decoration. The fallback is then `ChatViewInstance extends ChatSDKInstance`, with `ChatInstance` as a two-parent alias that decomposes nothing.

This record walks the member list and returns the verdict. The surface is 23 public members: three declared on `ChatInstance` itself, three inherited from `EventHandlers`, and seventeen from the local `ChatActions` interface (`instance/ChatInstance.ts:28` and `:60`). Two of them were flagged in advance as likely straddlers. `updateCatastrophicErrorPanel` writes error state, which is conversation work, and presents a panel, which is view work. `getState` bundles conversation and view fields in one return.

## Considered options

**A. `ChatInstance` survives as the composition of two sibling halves — chosen.**

`ChatInstance extends ChatSDKInstance, ChatViewInstance`, and keeps every member it has today. Shell hosts see no import-line change and no member-by-member change. The type is already a two-parent composition (`extends EventHandlers, ChatActions`). So it re-cuts parents the type already has, rather than adding an unfamiliar shape.

The partition walk below is what qualifies this option, rather than merely preferring it. It holds. One member group is assigned rather than split. One straddler is resolved by refinement. One member is left on the composition alone.

**B. Retire the bare `ChatInstance` name — rejected.** Deprecate it in 1.x, delete it in 2.0.0, and make every host name the half it wants. It is the most honest statement of the split: no type spans the seam, so nobody holds one by accident. Rejected because it charges every shell host an import-line edit for a type whose members do not change. And shell hosts are the majority. A rename with no behavior behind it is the least defensible break available.

**C. `ChatViewInstance extends ChatSDKInstance`, with `ChatInstance` as a redundant alias — rejected, and the standing fallback.** The view half becomes a subtype. `ChatInstance` is then a two-parent alias that adds nothing over `ChatViewInstance`. Same surviving name, far less work, and no partition needed — which is why it was the fallback if the walk failed. Rejected because the walk succeeded. A host holding `ChatViewInstance` would also get the whole conversation surface, so the seam would live only in the docs. It stays the answer if a future member truly cannot be assigned.

**D. Keep `ChatInstance` as the name of the lean conversation half — rejected.** Let the existing name narrow to the conversation surface and give the view half a new name. No new name for the common case, and the SDK gets the good name. Rejected because it is the one option that breaks silently at scale. Every shell host keeps compiling against `ChatInstance` until it touches a view member. Then the errors arrive member by member, with no import-line signal that anything moved. A break with no single edit site is the worst kind.

## Decision outcome

The instance member set partitions. `ChatInstance` survives as `extends ChatSDKInstance, ChatViewInstance` and keeps every member it has today.

**The classification.** Of 23 public members, 7 are conversation, 13 are view, 1 straddles and splits cleanly, 1 sits on the composition alone, and 1 is `@internal` and never reaches the published types:

| Half | Members |
| --- | --- |
| Conversation | `messaging`, `serviceDesk` |
| Conversation, root spelling removed at 2.0.0 | `send`, `restartConversation` — [ADR-0009](0009-conversation-verbs-on-instance-messaging.md) moves both under `messaging` |
| View | `requestFocus`, `changeView`, `writeableElements`, `input`, `customPanels`, `scrollToMessage`, `doAutoScroll`, `updateIsMessageLoadingCounter`, `updateIsChatLoadingCounter`, `updateInputFieldVisibility`, `updateInputIsDisabled`, `updateAssistantUnreadIndicatorVisibility`, `destroySession` |
| Conversation, split on the instance argument | the event bus `on` / `off` / `once` — declared over `ChatSDKInstance`, restated over the composed instance |
| Straddles, split by refinement | `updateCatastrophicErrorPanel` |
| On the composition only | `getState` — deprecated in 1.x, gone at 2.0.0 |
| `@internal`, not published | `serviceManager` |

Four members in that table already carry `@deprecated` tags today — `updateInputFieldVisibility`, `updateInputIsDisabled`, `updateAssistantUnreadIndicatorVisibility`, and the root `restartConversation`. The classification describes where they sit, not whether they survive.

**`destroySession` is view, and the trace is what says so.** It reads as conversation work: the name says session, and it cancels in-flight requests on the way through. But what it resets is persisted view state. `PersistedState` carries the launcher and main-window pair, the unread indicator, launcher expansion, the accepted disclaimers, and the home screen (`types/state/PersistedState.ts:20-79`). It carries no thread identity, no session identity, and no message text. Its only parameter is view too. `keepOpenState` preserves exactly `{launcher, mainWindow}` and nothing else (`chat/services/ChatActionsImpl.ts:2277-2283`). Pass `false` and an open main window closes, through a store write the app shell renders straight off (`chat/AppShell.tsx:249-250`). That is a view transition with no `view:pre:change` or `view:change` behind it.

The conversation-side work it does is copied, not owned. `cancelAllMessageRequests` and the upsert-coordinator clear both come from `restartConversation` (`chat/services/ChatActionsImpl.ts:2225` and `:2232`). Here they are unawaited, where there they are awaited. They also leave every message on screen, which is why the one in-repo product caller pairs the two calls. Each effect a headless host would want has a better-owned verb already. `messaging.restartConversation` handles the in-flight teardown. `serviceDesk.endConversation` handles the agent connection, which this member forgets rather than ends. The persisted human-agent fields it drops are the exception that proves the rule. They exist to answer reconnect-or-end after a page reload. That is a restore concern, and it belongs to the view's own lifetime, not to a conversation the host is holding.

**One member straddles, and it splits.** `updateCatastrophicErrorPanel` writes an error state, which is conversation work. It also presents a panel, which is view work. So each half declares its own version, and the parameter widens contravariantly. `ChatInstance` then restates the combined one. It composes under `tsc --strict`. The restatement is mandatory, not stylistic. Two parents that declare the same member with different types cannot be extended together at all. So every straddling member must be restated on the composed type.

**`getState` needs no half.** Today it is declared directly on `ChatInstance`, on neither parent, and the split can leave it there. Nothing is lost that way. In 1.x, no code path hands out a bare `ChatSDKInstance`: the shells hand out the composition, and the config binds every callback to it. By 2.0.0 the member is gone ([ADR-0004](0004-per-field-scoped-stores.md)). To split it, you would have to mint two public state half-types whose intersection is `PublicChatState`. That serves a member that is deprecated on arrival and never reaches either half's own surface.

**The event bus splits on its instance argument, and its enum can split too.** The handler is typed over the base `BusEvent`, not over a per-family union. So the event family shows up only in the descriptor's `type` property. Narrow that property per half, with a defaulted type parameter on `TypeAndHandler`. The conversation half then accepts only conversation event types, statically, while `ChatInstance` restates the full enum. Verified under `tsc --strict` at the real signature, array form and chaining included. The change is additive: the halves are new types, and today's hosts see no change.

This record does not do that walk. Which events belong to which half is its own membership question. A sibling record does for the event enum what this record does for the 23 members, and nothing in the mechanism forces it to wait for 2.0.0. Until that record lands, the conversation half carries the full enum, restated on the composition. So a headless consumer may subscribe to a view event and never receive one.

What does split is what the handler is handed. Give the handler an instance type parameter. The conversation half can then declare `on` over `ChatSDKInstance`, while the composition restates it over `ChatInstance`. A handler in a full-package host still receives every member it has today. Verified under `tsc --strict`. Without that refinement, the bus would quietly narrow every event handler in the product — the same break option D would have caused.

**No member moves because of the partition.** The split relocates nothing and deprecates nothing. Three members do leave `ChatInstance` at 2.0.0, each by a sibling record rather than by this one: `getState` ([ADR-0004](0004-per-field-scoped-stores.md)), and the root spellings of `send` and `restartConversation` ([ADR-0009](0009-conversation-verbs-on-instance-messaging.md)). Through 1.x the composed type is a superset of today's surface.

`ChatViewInstance` stays exported. Nothing is declared as one: the shells hand out `ChatInstance`, and the SDK hands out `ChatSDKInstance`. But it is the documented name for the view half, and an unexported half makes the composition unreadable in the API reference.

### Consequences

The seam is real rather than nominal. A new member on either half has to declare which one it belongs to. And the composed type is what shells keep handing out.

The costs, taken knowingly:

**A straddling member is declared three times.** Once per half, once on the composition. The compiler enforces the restatement, and a missing one fails the build. But it does not enforce that the composed version is the _right_ combination, so a widened parameter can drift from what either half meant. One member pays this today; every future straddler pays it too.

**View events stay subscribable from the conversation half for now — by choice, not necessity.** A headless consumer can call `on('view:change')` and never receive one. That lasts until the event-enum walk narrows the accepted types. A note in the docs carries this interim state, and the sibling record that classifies the events is what removes it.

**The conversation half is not free of view flavor, and no rule reads it off a signature.** `send(message, { silent })` describes its option in terms of what the UI shows, and it stays conversation, because the action is conversation work. `destroySession` reads the same way and goes the other way, because what it touches is view state. Two members that look alike land on opposite halves. So trace every future member to what it reads and writes, rather than classify it from its name and parameters. A future record may still want to revisit the spelling of the `silent` option.

**A future member may not partition.** The walk succeeded on today's surface, not on all possible surfaces. If a member arrives that truly cannot be assigned or split, option C is the fallback, and the surviving names do not change.

### For consumers

**The split changes nothing.** No import updates and no member moves because of the partition, in 1.x or in 2.0.0.

Three members do leave `ChatInstance` at 2.0.0. A sibling record decides each one, not this record. [ADR-0004](0004-per-field-scoped-stores.md) replaces `getState()` with per-field stores. [ADR-0009](0009-conversation-verbs-on-instance-messaging.md) moves `send` and `restartConversation` under `messaging` and removes the root spellings. All three are deprecated in 1.x first, so your editor flags them before anything disappears. None of it follows from the split. The classification above describes where those members sit while they exist.

```ts
import { MessageState, ViewType, type ChatInstance } from '@carbon/ai-chat';

// unchanged across the split
async function useChat(instance: ChatInstance) {
  const answer = await callYourBackend();
  // conversation half
  await instance.messaging.upsertMessage(
    answer.id,
    MessageState.COMPLETE,
    () => answer
  );
  instance.changeView(ViewType.MAIN_WINDOW); // view half
  const { activeResponseId, input } = instance.getState(); // both halves
}
```

Callbacks keep receiving the composed instance too. The full-package config binds the callback instance type to `ChatInstance` — see [ADR-0023](0023-sdk-prefixed-seam-types.md). So a callback that reaches for a view member keeps working:

```ts
async function customSendMessage(request, options, instance: ChatInstance) {
  instance.updateIsMessageLoadingCounter('increase'); // view member, still reachable
  const answer = await callYourBackend(request);
  await instance.messaging.upsertMessage(
    answer.id,
    MessageState.COMPLETE,
    () => answer
  );
}
```

The narrower half appears only if you adopt the headless SDK, which is new surface. There the view members are absent. The event bus is present, with view events that never fire. `getState()` does not appear at all. The SDK ships no earlier than 2.0.0, and `getState()` is gone by then. You read state through the per-field stores instead ([ADR-0004](0004-per-field-scoped-stores.md)). That is why it sits on the composition alone above, and never on a half.

## More information

- [ADR-0023](0023-sdk-prefixed-seam-types.md) — the seam vocabulary and the curried callback types this record's consumer story depends on.
- [ADR-0002](0002-core-react-wrapper-headless-sdk-split.md) — the package split these halves belong to.
- [ADR-0004](0004-per-field-scoped-stores.md) — the per-field read model, which deprecates `getState()` independently of this split.
- Sibling record, forthcoming: the event-enum walk — which events belong to which half, over the descriptor signature verified here.
