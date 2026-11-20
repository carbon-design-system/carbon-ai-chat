---
status: proposed
date: 2026-11-19
feedback-by: 2026-12-15
discussion:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2967
supersedes:
superseded-by:
---

# ADR-0007: The host ends every turn, and the chat runs no turn timers

## Summary

**Problem.** The chat guesses how long your backend takes. If no reply arrives within 4 seconds, it shows its own loading indicator. If no reply starts within 150 seconds, it fails the message. Both guesses are wrong for some apps. Long tool calls hit the timeout, and apps with their own loading UI get a second spinner. The timeout also misses the case that hurts most: a reply that starts and then stalls. Separately, a turn ends at a different moment depending on which messaging API you use, so the send queue and the Stop button behave differently for the same conversation.

**Proposal.** In 2.0.0 the chat runs no timer on a turn. It removes `messageLoadingIndicatorTimeoutSecs`, `messageTimeoutSecs`, and `CancellationReason.TIMEOUT`. You time your own request, and you show loading when you want it. A turn ends by one rule on both messaging APIs: your `customSendMessage` promise has settled, and no message from that turn is still streaming. A message that streams outside any turn, such as a long agent task, is a background stream: it never holds the queue or makes the chat look busy. In 1.x nothing changes at runtime, and the three are deprecated.

**Feedback wanted.**

- Do you rely on the 150-second timeout, even without setting it? After this change, a backend that never answers leaves the turn waiting until your code or the user ends it.
- Do you stream a message with `upsertMessage` that outlives the request that started it? In 2.0.0 it holds the send queue until it completes, unless it started with no turn in flight.
- Do you show your own busy state or Stop button from `instance.state.status`? A background stream no longer makes it read `'streaming'`.

## Motivation

The chat doesn't own your transport, so it can't tell a slow backend from a dead one. Its timers guess, and each guess fails someone:

- **Long-running backends.** A request that runs tools for three minutes fails at 150 seconds unless you knew to raise the setting.
- **Apps with their own loading UI.** The built-in indicator appears after 4 seconds on its own clock, next to yours.
- **Streams that stall.** The timeout covers only the wait for the first reply. Once anything arrives, it's gone. A stream that stops halfway stays "streaming" whatever the setting says.
- **Apps that send while a reply streams.** One timer serves the whole chat. With `upsertMessage`, your next message can go out while the last reply still streams. That reply's next update then clears the new message's timer, so the new message is never timed.

The end of a turn is split by API today:

| Today | `addMessageChunk` | `upsertMessage` |
| --- | --- | --- |
| The next queued message goes out | After `final_response`, if a partial chunk arrived before your promise settled. Otherwise when it settles. | When your promise settles |
| The Stop button hides | At any `complete_item`, even while the rest of the reply streams | When the message completes and nothing else streams |
| A stream with no request in flight | Makes `status` read `'streaming'`. Stopping it aborts the previous request's signal. | Makes `status` read `'streaming'`. Stop ends it, cancellable or not. |

2.0.0 is the window for this. It's the release that can remove settings, and it types `customSendMessage` as returning a promise, as [#2006](https://github.com/carbon-design-system/carbon-ai-chat/issues/2006) decides. That promise is the one boundary both APIs share.

## Proposal

```ts
// Proposed for 2.0.0. `readMessages` stands in for your own stream parser.
const messaging: PublicConfigMessaging = {
  async customSendMessage(request, { signal }, instance) {
    // The chat no longer shows a loading indicator, or times out a request. Do both yourself.
    instance.updateIsMessageLoadingCounter('increase');
    const noReply = new AbortController();
    const timer = setTimeout(
      () => noReply.abort(new DOMException('No reply', 'TimeoutError')),
      150_000
    );
    let waiting = true;
    const replyStarted = () => {
      if (waiting) {
        waiting = false;
        clearTimeout(timer);
        instance.updateIsMessageLoadingCounter('decrease');
      }
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify(request),
        // Stop and restart abort through `signal`. Your 150-second limit aborts through `noReply`.
        signal: AbortSignal.any([signal, noReply.signal]),
      });
      for await (const { id, state, message } of readMessages(response)) {
        replyStarted();
        // `request_id` ties the message to this turn.
        await instance.messaging.upsertMessage(id, state, () => ({
          ...message,
          request_id: request.id,
        }));
      }
    } finally {
      replyStarted();
    }
    // Throwing fails the turn. Returning ends it once none of its messages is still STREAMING.
  },
};
```

Like the 1.x setting, this limit covers only the wait for the first reply. Once the reply starts streaming, the timer is gone.

Three rules carry the proposal:

1. **A turn ends when your promise has settled and none of its messages is streaming.** The rule is the same for `upsertMessage` and `addMessageChunk`. The next queued message goes out when the turn ends. `messaging.send()` still resolves when your promise settles, as it does today.
2. **A message belongs to the turn its `request_id` names.** Without one, a new message joins the turn that's in flight when you first call `upsertMessage` or `addMessageChunk` for it. A message that starts with no turn in flight, or keeps updating after its turn ended, is a background stream. A background stream belongs to no turn, holds no queue, and leaves `status` alone.
3. **The chat never ends a turn because time passed.** Your promise, your writes, the user's Stop, `failTurn`, a restart, or removing the chat ends it. Nothing else does.

A turn that never ends is the cost, and it's deliberate. If your backend hangs, or you leave a message `STREAMING`, the turn stays open and later messages wait. The chat can't know that your three-minute request is broken rather than busy. You can, so the record gives you the tools: a rejected promise, `failTurn`, and the abort signal.

### Reference: how a turn ends

| What happens | The turn ends | `status` then | `send()` | Signal aborts with | Messages of the turn still streaming | `onError` |
| --- | --- | --- | --- | --- | --- | --- |
| Your promise resolves, nothing streaming | At once | `'ready'` | Resolves | — | — | — |
| Your promise resolves, a message still streaming | When its last message is `COMPLETE` or `ERROR` | `'streaming'`, then `'ready'` | Resolves when the promise does | — | — | — |
| Your promise rejects | At once | `'error'` | Rejects | — | Ended. Each keeps its content and is marked incomplete (`FAILED_WHILE_STREAMING`). | `MESSAGE_COMMUNICATION` |
| The user presses Stop, or you call `messaging.stop()` | At once | `'ready'` | Resolves | `STOP_STREAMING` | Ended. Content kept, and not marked failed. | — |
| You call `messaging.failTurn()` | At once | `'error'` | Rejects, if it hadn't settled | `TURN_FAILED` | Ended. Each keeps its content and is marked incomplete (`FAILED_WHILE_STREAMING`). | — |
| The conversation restarts or clears | At once | Starts over | Resolves | `CONVERSATION_RESTARTED` | Removed with the conversation | — |
| The chat is removed from the page | At once | Unchanged, and saved for the next chat | Resolves | `CHAT_REMOVED` | Left as saved | — |

A rejection or `failTurn` marks the sent message failed only when no reply had started. Once a reply has started, the mark goes on the reply instead. A rejection that comes after every reply completed marks no message, and only sets `status: 'error'`.

An `ERROR` write ends a turn the way a `COMPLETE` write does: `status` returns to `'ready'`, not `'error'`. Only a rejection or `failTurn` fails a turn.

This record decides each outcome as data on the message. How the chat draws and announces each mark is decided separately, in [#2039](https://github.com/carbon-design-system/carbon-ai-chat/issues/2039). That includes the "not completed" line, the failed-message line, the "Response stopped" note, and whether Stop adds a "Request cancelled" message to the conversation.

On the chunk path, a message is streaming from its first `partial_item` until its `final_response`. A `complete_item` finishes one item, not the message. On the `upsertMessage` path, it's streaming while its last write was `MessageState.STREAMING`.

The rows above settle these cases:

- **A host that leaves a message streaming.** The turn stays open, `status` stays `'streaming'`, and later messages wait in the queue. A `COMPLETE` or `ERROR` write, `failTurn`, Stop, or a restart ends the turn.
- **A backend that never answers.** The turn stays `'submitted'`, and later messages wait. The user can end it with Stop when the button shows. See the Stop button rules below.
- **A host that never settles after Stop or `failTurn`.** Nothing waits for it. The turn ended at once and the queue moved on. A late resolve or reject is ignored, and late chunks are dropped. A late `upsertMessage` still writes, because it's your own write, but the chat ends its streaming at once.
- **A write after a turn ended normally.** It still writes, as a background stream. It doesn't open the turn again or hold the queue.
- **A `customSendMessage` that returns no promise.** #2006 makes it a type error, but the chat still accepts one from JavaScript. A return that isn't a promise counts as settled at once.

### Reference: which turn a message belongs to

| The message | It belongs to |
| --- | --- |
| Carries the `request_id` of the turn in flight | That turn |
| Carries the `request_id` of a turn that has ended | No turn. It's a background stream, unless that turn was stopped or failed. Then its chunks are dropped and its upserts end at once. |
| Carries the `request_id` of a request from a conversation that was restarted or cleared | Nothing. The chat ignores it, as today. |
| Is new, has no `request_id` or one the chat doesn't know, and a turn is in flight | The turn in flight |
| Is new, has no `request_id` or one the chat doesn't know, and no turn is in flight | No turn. It's a background stream. |
| Already exists, and you write it again without a `request_id` | Whatever its first write decided. An old message whose turn ended normally is a background stream when you update it. If its turn was stopped or failed, the write lands but doesn't stream. |

The chat decides a new message's turn when you call `upsertMessage` or `addMessageChunk` for it, not when the write finishes. Because the queue waits for each turn to end, at most one turn is in flight at a time.

An unknown `request_id` is a small change. Today the chat tracks such a message on its own, apart from any turn. Here it joins the turn in flight, like a message with no `request_id`.

### Reference: background streams and Stop

A background stream holds no queue, and `status` ignores it. While only background streams run, `status` reads `'ready'`, so an input gated on `status` stays enabled. `failTurn` never touches a background stream. End one with an `ERROR` write. Today an `ERROR` write draws no error mark, and #2039 decides what it shows.

|  | Turn | Background stream |
| --- | --- | --- |
| The Stop button shows | While a message of the turn streams with an item marked `cancellable`, or while the turn is in flight with `showStopButtonImmediately` | While it streams with an item marked `cancellable` |
| Stop ends it | Always | Only when an item is marked `cancellable` |
| What it ends as | As the Stop row in the turn table | Not streaming, content kept, and not marked failed. A later `STREAMING` write lands, but doesn't stream again. |
| How your code hears about Stop | `signal` aborts with `STOP_STREAMING`, and the `stopStreaming` event fires | The `stopStreaming` event fires. A background stream has no signal. |

The button hides when nothing in that table is left to stop. One item finishing doesn't hide it.

`messaging.stop()` does what the button does, even when only background streams are running. The `stopStreaming` event doesn't list what it ended. It always means the turn in flight, if any, and every cancellable background stream.

### Reference: types

```ts
/** The conversation half of the messaging config, shared by the SDK and the prebuilt chat. */
interface ChatSDKConfigMessaging<I extends ChatSDKInstance = ChatSDKInstance> {
  /**
   * Sends a message to your assistant, and returns a promise. The turn ends when the promise
   * settles and none of the turn's messages is still streaming. The next queued message goes
   * out then. Rejecting fails the turn.
   *
   * The chat never fails a turn because time passed. To limit how long a request may take,
   * time it yourself and reject.
   *
   * `options.signal` aborts when the user stops the turn (`STOP_STREAMING`), the
   * conversation restarts or clears (`CONVERSATION_RESTARTED`), the chat is removed from
   * the page (`CHAT_REMOVED`), or you call `failTurn` (`TURN_FAILED`).
   */
  customSendMessage?: (
    request: MessageRequest,
    options: CustomSendMessageOptions,
    instance: I
  ) => Promise<void>;

  // `messageTimeoutSecs` is removed. The chat runs no request timer.
}

/** The prebuilt chat's messaging config. */
interface PublicConfigMessaging extends ChatSDKConfigMessaging<ChatInstance> {
  // Restates `customSendMessage` with `I` bound to `ChatInstance`, with the same
  // `Promise<void>` return. It no longer restates `messageTimeoutSecs`.
  //
  // `messageLoadingIndicatorTimeoutSecs` is removed. The chat never shows the loading
  // indicator on its own. Drive it with `instance.updateIsMessageLoadingCounter`.
}

enum CancellationReason {
  STOP_STREAMING = 'Stop streaming',
  CONVERSATION_RESTARTED = 'Conversation restarted',
  CHAT_REMOVED = 'Chat removed',
  TURN_FAILED = 'Turn failed',
  // `TIMEOUT` is removed.
}
```

This changes two lines in [ADR-0002](0002-headless-sdk.md), the headless SDK record. There, `customSendMessage` returns `Promise<void> | void`, and `messageTimeoutSecs` works "as today". Both go. `messaging.send()` keeps the settlement ADR-0002 gives it, minus its timeout case. It rejects when your promise rejects, or when `failTurn` runs before your promise settles. The rest of ADR-0002 stands.

|  | 1.x | 2.0.0 |
| --- | --- | --- |
| `messageTimeoutSecs` | Works, 150 seconds by default. Deprecated. | Removed |
| `messageLoadingIndicatorTimeoutSecs` | Works, 4 seconds by default. Deprecated. | Removed |
| `CancellationReason.TIMEOUT` | Fires on a timeout. Deprecated. | Removed |
| A `customSendMessage` type that returns nothing | Allowed | A type error |
| When the next message goes out | Chunks: after `final_response` if a partial came before your promise settled. Upserts: when your promise settles. | When the turn ends, on both |
| `status` during a background stream | `'streaming'` | Whatever the turns say |
| What Stop ends | The turn, and every streaming upsert | The turn, and cancellable background streams |
| A rejection mid-stream | The sent message is marked failed. The reply ends unmarked. | Each reply still streaming is marked incomplete, as `failTurn` marks it. The sent message isn't marked. |
| A rejection after every reply completed | The sent message is marked failed | No message is marked. `status` is `'error'`. |
| `failTurn` with a stream that has no turn | Counts it as part of the last turn | Leaves it alone |
| A new message with an unknown `request_id` | Tracked on its own | Joins the turn in flight |

`stop()` still returns `status` to `'ready'` at once, as in 1.x. The Stop button's chunk-path bug, where it hides at the first `complete_item`, is fixed in 1.x by [#3039](https://github.com/carbon-design-system/carbon-ai-chat/issues/3039).

## Consumer impact

### A backend that never answers, or a stream you leave open, now waits for you

These breaks are silent. Your UI doesn't error. It just never stops waiting.

- **No reply at all.** In 1.x, the chat failed the message after 150 seconds. In 2.0.0, the turn stays `'submitted'`.
- **A reply that stalls.** 1.x never caught this either. But on the `upsertMessage` path, a stalled message no longer lets the next message go out. It holds the queue until you end it.

```ts
// 1.x: the chat fails the message when no reply starts within 150 seconds.
const messaging = { customSendMessage, messageTimeoutSecs: 150 };

// 2.0.0: the setting is gone. This helper gives the same limit on the wait for the first reply.
function firstReplyLimit(signal: AbortSignal, ms: number) {
  const noReply = new AbortController();
  const timer = setTimeout(
    () => noReply.abort(new DOMException('No reply', 'TimeoutError')),
    ms
  );
  return {
    signal: AbortSignal.any([signal, noReply.signal]), // pass this to fetch
    replyStarted: () => clearTimeout(timer), // call on the first chunk or upsert
  };
}
```

```ts
// 2.0.0, and 1.x once failTurn ships. Fails the turn when its reply goes quiet for 30 seconds.
function watchForStall(
  instance: ChatInstance,
  request: MessageRequest,
  signal: AbortSignal
) {
  let quiet: ReturnType<typeof setTimeout> | undefined;
  const done = () => clearTimeout(quiet);
  // After Stop or a restart the turn has already ended, so don't fail it later.
  signal.addEventListener('abort', done);
  const onUpdate = () => {
    done();
    quiet = setTimeout(() => {
      instance.messaging.failTurn({
        messageID: request.id,
        error: { message: 'The reply stalled.' },
      });
    }, 30_000);
  };
  return { onUpdate, done }; // onUpdate on each chunk or upsert, done when the reply completes
}
```

To let users stop a turn that hasn't answered yet, set `showStopButtonImmediately: true`. A host that set `messageTimeoutSecs: 0` already times its own requests, and has nothing to change.

### A config that still sets a removed setting loses it without an error

TypeScript flags `messageTimeoutSecs` or `messageLoadingIndicatorTimeoutSecs` only in an object literal written straight into the config. A config built up in a variable compiles, and the setting is ignored. In JavaScript it's always ignored. Search your code for both names before you upgrade.

### `status` reads `'ready'` during a background stream

```ts
// `input` is your text field.
const sync = (status: ChatSDKState['status']) =>
  (input.disabled = status !== 'ready');
sync(instance.state.get().status);
instance.state.select((s) => s.status, sync);
// 1.x: a background task makes status read 'streaming', so this disables your input.
// 2.0.0: the same code keeps the input enabled while a background task streams.
// To show background work, read the message's own state instead of `status`.
```

### Stop no longer ends a background stream unless it's cancellable

In 1.x, Stop ended every streaming upsert. In 2.0.0, a background stream with no `cancellable` item keeps running when the user presses Stop. Mark it `cancellable` if the user may stop it, and listen for `stopStreaming`, because a background stream has no abort signal. That applies to background chunk streams too. In 1.x they borrowed the previous request's signal.

### An `upsertMessage` stream that outlives its request now holds the queue

```ts
// Both releases: an agent task streams while the turn that started it is in flight.
await instance.messaging.upsertMessage(
  'task-42',
  MessageState.STREAMING,
  () => taskMessage
);
// 1.x: the user's next message goes out as soon as customSendMessage settles.
// 2.0.0: it waits until 'task-42' is COMPLETE or ERROR, because the task joined the turn.
```

A chunk reply whose first partial arrives after your promise settled holds the queue only while its turn is still open, for example because another of the turn's messages still streams. Once the turn has ended, a later reply is a background stream and holds nothing. So does a stream whose first write comes with no turn in flight.

### A `customSendMessage` that returns before the reply starts gives up the turn

```ts
// 1.x: returns at once. The reply arrives later on the socket.
customSendMessage(request) {
  socket.send(JSON.stringify(request));
}

// 2.0.0: return a promise that settles once the reply has started streaming, or is done.
async customSendMessage(request, { signal }) {
  socket.send(JSON.stringify(request));
  // Your own helper. Resolve it after you've called upsertMessage or addMessageChunk
  // for the reply's first message, so the message joins this turn before the turn ends.
  await waitForFirstReply(request.id, signal);
}
```

If the promise settles before any reply arrives, the turn ends then. The reply that follows is a background stream: it doesn't hold the queue or set `status`, Stop ends it only if it's cancellable, and `failTurn` can't reach it.

### A reply cut off by a rejection is now marked incomplete

When your promise rejects mid-stream, each reply still streaming keeps its content and gets `error_state: FAILED_WHILE_STREAMING`, the mark `failTurn` writes. The sent message is no longer marked failed, because it did go through. In 1.x it was the other way round: the sent message was marked failed, and the cut-off reply was left unmarked.

A rejection that comes after every reply completed now marks no message at all. It only sets `status: 'error'`. In 1.x it marked the sent message failed.

The prebuilt chat draws each mark the way #2039 decides. If you save history, save `error_state` so the mark survives a reload. If you read a failed sent message as "the turn failed", read the reply's mark too. If your UI already marks cut-off replies itself, check that it doesn't mark them twice.

### `failTurn` no longer reaches a stream with no turn

In 1.x, a stream with no `request_id` and no turn counts as part of the last turn. In 2.0.0 it's a background stream, and `failTurn` leaves it alone. End it with an `ERROR` write, or give it the `request_id` of the turn it belongs to.

### The loading indicator needs your code

```ts
// 1.x: the chat shows the indicator after 4 seconds.
const messaging = { customSendMessage, messageLoadingIndicatorTimeoutSecs: 4 };

// 2.0.0: show it when you send, and hide it on the first reply or an error.
instance.updateIsMessageLoadingCounter('increase');
// ...
instance.updateIsMessageLoadingCounter('decrease');
```

The headless SDK has no indicator. It shows `status: 'submitted'` while a turn waits for its first reply.

### Code that checks `CancellationReason.TIMEOUT`

```ts
// 1.x
if (signal.reason === CancellationReason.TIMEOUT) showRetry();

// 2.0.0, inside customSendMessage(request, { signal }). Your own timer names the reason:
// `firstReplyLimit`, above, aborts with a TimeoutError.
const limit = firstReplyLimit(signal, 150_000);
try {
  await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify(request),
    signal: limit.signal,
  });
} catch (error) {
  if (error instanceof DOMException && error.name === 'TimeoutError')
    showRetry();
  throw error;
}
```

## Drawbacks

- **Every host that wants a timeout writes one.** It's about ten lines, and every such host writes them. `AbortSignal.any` needs a 2024 browser or later. An app that supports older browsers races its own promise against a timer instead.
- **A stuck turn gives the user no way out by default.** With no reply and no `showStopButtonImmediately`, the Stop button never shows. The user's exit is a restart. Whether that setting's default changes is a separate question, outside this record.
- **The tie between a message and a turn is still partly a guess.** A new message with no `request_id` joins whatever turn is in flight. That can be the wrong turn when your app streams unrelated work during a send.

## Alternatives

### Keep `messageTimeoutSecs`, off by default

Hosts that set it would keep the same behavior from one line of config. It lost because it helps only hosts that set it on purpose, and turning it off by default already drops the timeout for everyone else. It also keeps a timer that times only the first reply. Making it correct for each turn needs per-turn tracking built just for this one field.

### Keep the 150-second default

No host notices anything. The chat keeps guessing about a transport it doesn't own, and a wrong default is worse than none: it fails long requests and still never catches a stalled one.

### Make the field time the whole turn, or the quiet gap between updates

Either would catch a stalled stream. Both give an old name new behavior, so hosts that set it today get a different timeout without a type error. Both still need per-turn tracking.

### Ship a timeout helper instead of a setting

The library could export a small function that returns the Proposal's `noReply` signal. It would save hosts the ten lines, and the chat would still run no timer of its own. It lost for now because it's a new public export for code a host can copy. It can be added later without breaking anything.

### Warn in the console when a config sets a removed field

It would catch JavaScript hosts, which get no type error. It lost because it adds a check that lives through 2.x for two fields. The 1.x deprecation and the migration guide carry the change instead.

### Deprecate the loading timer but never remove it

No host has to change. The timer keeps firing against transports the chat can't see, and it keeps a second spinner in apps with their own loading UI.

### End a turn by message state alone

Drop the promise boundary, and end a turn when its messages complete. A turn whose host never writes a message would never end, and a turn's end would stay a guess from state a host may never update.

### Scope Stop to one item, as the chunk path does

The `upsertMessage` path has no signal for one item finishing, so only one API could do it. Stop would keep meaning two things.

### Make every stream belong to a turn

There'd be no background streams. A stream with no turn in flight would join the last turn, as `failTurn` does in 1.x. It's the simplest contract, but it drops agent tasks that stream outside any request, which `upsertMessage` supports today.

### Tie a message to a turn only through `request_id`

It's explicit, and it never guesses. But every `upsertMessage` host that leaves out `request_id` today would stop holding its turn, and its replies would read as background streams.

### Let the host name a message's turn with a new `upsertMessage` argument

It's explicit too. It competes with `request_id`, which already exists on every message and chunk, and gives hosts two ways to say one thing.

### Let background streams keep `status` at `'streaming'`

No host would notice a change. But `status` would say the chat is busy when it would send at once, and an input gated on `status` would block the user during unrelated background work.

### Let Stop end every stream, as today

One button would mean "stop everything". But a user stopping a reply would also kill unrelated background work. `cancellable` is already how a host says the user may stop something.

### Make `stop()` wait for your promise

Then `'ready'` would also mean your code has finished. A host that never settles after an abort would leave the chat stuck, and with no timer nothing would ever unstick it.

## Open questions

- **Should a host be able to start a new background stream while a turn is in flight?** Under this proposal, a new message with no `request_id` that starts during a turn joins it. Updates to old messages are already background streams. One answer is an option on `upsertMessage`, but that brings back a second way to name a turn.
- **Should the `stopStreaming` event say which streams it ended?** Today it carries nothing, and this record defines it as "the turn and every cancellable background stream". A list of message IDs could be added later in 2.x without breaking anyone.
- **Should the chat say anything when a turn has waited a long time?** The proposal says nothing, and leaves that to your UI. A quiet notice would bring back a timer under another name.

## Decision

Not decided. Feedback by 2026-12-15 in the RFC discussion linked above.
