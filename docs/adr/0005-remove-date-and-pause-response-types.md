---
status: proposed
date: 2026-11-18
feedback-by: 2026-12-16
discussion:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2031
supersedes:
superseded-by:
---

# ADR-0005: Remove the date and pause response types in 2.0.0

## Summary

Hosts that collect dates or pace a reply need a migration path before the next major release. Removing those built-in behaviors can leave a working backend with a missing control or a reply that arrives too soon.

Deprecate `date` and `pause` in 1.x, then remove them in 2.0.0. Render date picker controls through `user_defined`. Mock a pause with `upsertMessage` and a `user_defined` loading indicator, with timing owned by your host. The proposal to merge loading and reasoning steps may offer another pause alternative once its design is authored. Keep `iframe`, `image`, `button`, `carousel`, and `option` through 2.0.0.

Feedback wanted

- Which date workflows need behavior that a host-rendered date picker cannot supply?
- Which integrations depend on pauses inside one response or on the chat's typing indicator?
- Which platform-authored messages make these removals too costly, given that IBM documents both response types?

## Motivation

A date control needs access to your form rules, locale, and backend format. The built-in picker ties those choices to the chat's message store and send service. Its port also needs changes around Carbon's calendar internals. A host-rendered control can use the same date picker as the rest of your app.

A pause currently delays later items in a response and can show the typing indicator. The chat skips it when it loads history. A host can pace delivery and show progress through the existing message-update API. Repository tests exercise pauses, but external usage remains an open question.

The original removal issue bases survival on parity with watsonx Orchestrate's authorable types. IBM's current reference includes `date` and `pause`, as well as `iframe` and `image`. This proposal makes two explicit exceptions to that criterion. Hosts must migrate platform output that uses either removed type. [IBM response types reference](https://www.ibm.com/docs/en/watsonx/watson-orchestrate/base?topic=reference-response-types), [ADR authoring issue #2043](https://github.com/carbon-design-system/carbon-ai-chat/issues/2043)

## Proposal

```json
{
  "output": {
    "generic": [
      {
        "response_type": "user_defined",
        "user_defined": {
          "user_defined_type": "date_picker",
          "label": "Choose a date"
        }
      }
    ]
  }
}
```

Your `renderUserDefinedResponse` handler mounts a native or Carbon date picker for this item. You own its validation, locale, focus, and submission. The `user_defined_type` and `label` fields above are your payload contract. The chat passes them to your renderer. [Customizing responses](../../packages/ai-chat/docs/Responses.md)

For pacing, insert a custom indicator, then replace it with the answer after your host's delay or work completes. An update replaces the full message, so include any earlier content you want to keep.

```ts
import { MessageResponseTypes, MessageState } from '@carbon/ai-chat';

// Inside customSendMessage(request, requestOptions, instance).
// wait(ms, signal) is your helper. It returns true when the delay finishes.
// On abort, it clears its timer and returns false.
// Your renderer handles user_defined_type: 'typing_indicator'.
const messageID = crypto.randomUUID();
await instance.messaging.upsertMessage(
  messageID,
  MessageState.STREAMING,
  () => ({
    request_id: request.id,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          streaming_metadata: { id: 'reply', cancellable: true },
          user_defined: { user_defined_type: 'typing_indicator' },
        },
      ],
    },
  })
);

// The chat settles registered streams on Stop or restart.
if (!(await wait(1500, requestOptions.signal))) return;
if (requestOptions.signal?.aborted) return;

await instance.messaging.upsertMessage(
  messageID,
  MessageState.COMPLETE,
  () => ({
    request_id: request.id,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          streaming_metadata: { id: 'reply' },
          text: 'Your answer is ready.',
        },
      ],
    },
  })
);
```

Use the outgoing request's ID on every update to guard against replies after restart or clear. Stop background work when `requestOptions.signal` aborts. Settle streaming on completion, failure, or cancellation. The working React and web component examples include an abort-aware timer and renderer wiring. [Adding messages](../../packages/ai-chat/docs/UpsertMessage.md), [React example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/upsert-message-user-defined), [Web component example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/upsert-message-user-defined)

The loading and reasoning proposal will likely offer another way to show progress during a wait. Its API and release are open until that ADR is authored. The existing custom-response path supplies a migration today. [Loading and reasoning proposal #2838](https://github.com/carbon-design-system/carbon-ai-chat/issues/2838)

### Reference

| Release | Contract |
| --- | --- |
| 1.x | Tag `MessageResponseTypes.DATE`, `DateItem`, and `MessageSendSource.DATE_PICKER` as deprecated, with removal in 2.0.0 and date-control migration guidance. |
| 1.x | Tag `MessageResponseTypes.PAUSE` and `PauseItem` as deprecated, with removal in 2.0.0 and host-driven pacing guidance. |
| 2.0.0 | Remove those five symbols from the browser and server entry points, including the generic-item union members. |
| 2.0.0 | Remove the built-in date picker, its Carbon wrapper, and date-only send helpers. Remove the `datePicker_chooseDate` and `datePicker_confirmDate` locale keys. |
| 2.0.0 | Remove pause processing, its timing and typing behavior, and its special history exclusion. |
| 2.0.0 | Route legacy `date` and `pause` wire items through the existing unknown-type custom-rendering path, during delivery and history loading. |

Unknown-type routing passes the original item to your renderer. It preserves `response_type: "date"` or `"pause"`. A host can handle those strings or convert its backend payloads to explicit `user_defined` items. A custom item alone supplies no delay. Your sender controls when later content reaches the chat.

The deprecation follow-up covers the 1.x tags and migration guidance. The existing date and pause removal issues cover the 2.0.0 implementation. [Deprecation follow-up #3014](https://github.com/carbon-design-system/carbon-ai-chat/issues/3014), [Date removal #1851](https://github.com/carbon-design-system/carbon-ai-chat/issues/1851), [Pause removal #2032](https://github.com/carbon-design-system/carbon-ai-chat/issues/2032)

| Retained type | 2.0.0 contract | Reason |
| --- | --- | --- |
| `iframe` | Supported, untagged | Platform authors can emit it. The built-in renderer owns sandbox policy, timeouts, load announcements, and focus. The iframe panel also needs that renderer. |
| `image` | Supported, untagged | Platform authors can emit it. The built-in renderer owns alt-text fallback, loading errors, and interaction. Image buttons also need that renderer. |
| `button`, `carousel`, `option` | Supported, untagged | Keep platform-authored actions and choices available. |

The earlier estimates of about 473 iframe lines and 352 image lines measure conversion work. Shared renderers survive removal of either response type. The current image renderer is named `Image`, and the earlier decision calls it `ClickableImage`. Expand usage guidance for both retained types as follow-up. The shared sandbox primitive question belongs to the MCP Apps work. [Earlier response-type decision #1845](https://github.com/carbon-design-system/carbon-ai-chat/issues/1845), [MCP Apps work #906](https://github.com/carbon-design-system/carbon-ai-chat/issues/906)

## Consumer impact

An unchanged backend can lose visible behavior after the upgrade. An unhandled custom slot is empty, with no unknown-type error. A date loses its picker. A pause loses its delay and typing cue. Legacy pauses loaded from history also reach custom rendering after removal.

### Replace the date item and its submission

Before, the chat supplies the picker and sends the selected date.

```json
{ "response_type": "date" }
```

After, your host renders the date picker for this wire item.

```json
{
  "response_type": "user_defined",
  "user_defined": {
    "user_defined_type": "date_picker",
    "label": "Choose a date"
  }
}
```

```ts
// Your date control's confirmation handler. This example uses an ISO date.
// Format history.label for the user's locale and your backend's input contract.
await instance.send({
  input: {
    text: '2026-12-18',
    structured_data: { user_defined: { date: '2026-12-18' } },
  },
  history: { label: 'December 18, 2026' },
});
```

You can also offer a fixed set of dates as an `option` response. Your control owns selected and disabled states, accessibility, and restoration from history. Programmatic sends use `MessageSendSource.INSTANCE_SEND`, which replaces date-picker-specific event handling.

### Replace the pause item with host-driven updates

Before, the chat waits between two items and shows its typing indicator.

```json
{
  "output": {
    "generic": [
      { "response_type": "text", "text": "Checking availability." },
      { "response_type": "pause", "time": 1500, "typing": true },
      { "response_type": "text", "text": "Your answer is ready." }
    ]
  }
}
```

After, the first snapshot contains the first text and your custom indicator.

```json
{
  "output": {
    "generic": [
      { "response_type": "text", "text": "Checking availability." },
      {
        "response_type": "user_defined",
        "user_defined": { "user_defined_type": "typing_indicator" }
      }
    ]
  }
}
```

After the host's wait, a second `upsertMessage` with the same message ID replaces it with this snapshot.

```json
{
  "output": {
    "generic": [
      { "response_type": "text", "text": "Checking availability." },
      { "response_type": "text", "text": "Your answer is ready." }
    ]
  }
}
```

Send the first snapshot as `STREAMING` and the second as `COMPLETE`, with the same `request_id` on both. Keep completed content in saved history. A custom placeholder has no automatic history exclusion, so your host must settle or normalize it.

TypeScript hosts also need to remove imports and enum references for the five retired symbols. Backends and saved transcripts need their own migration, since a host build cannot check their wire data.

## Alternatives

- **Keep and port both types.** This preserves platform output with built-in date collection and pacing. It carries the date picker's message-store, send-service, and calendar dependencies into the new UI.
- **Deprecate now and remove in a later major.** This gives hosts longer to migrate. It also requires a 2.0 port and leaves the removal date open.
- **Ship a replacement date response first.** This offers a shared control and migration contract, but adds a new public API. A host can already render its own date picker.
- **Wait for the loading and reasoning ADR.** This could simplify the pause migration. Its design and release remain open, while host-driven updates work today.
- **Remove iframe and image too.** This breaks more platform-authored messages and shifts their renderer behavior to every host. Their shared components still serve panels and buttons.
- **Deprecate iframe and image while retaining them.** This sends hosts toward custom renderers despite their platform support and shared implementation costs.

## Open questions

- Should documented platform support keep `date`, `pause`, or both through 2.0.0, despite the host-owned alternatives?
- Which date-control and pause workflows need a shared migration example before removal?
- Once the loading and reasoning ADR is authored, which pause use cases does its proposed behavior cover?

## Decision

Not decided. Feedback by 2026-12-16. The RFC discussion opens after this proposal merges.
