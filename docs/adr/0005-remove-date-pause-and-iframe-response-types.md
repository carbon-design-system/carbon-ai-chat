---
status: proposed
date: 2026-11-18
feedback-by: 2026-12-16
discussion:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2031
supersedes:
superseded-by:
---

# ADR-0005: Remove the date, pause, and iframe response types in 2.0.0

## Summary

Hosts that collect dates, pace replies, or embed web pages need a migration path before the next major release. Removing those built-in behaviors can leave a working backend with a missing control, an early reply, or hidden content.

Deprecate `date`, `pause`, and `iframe` in 1.x, then delete all three built-in implementations in 2.0.0. Each has little evidence of use, and porting it into the rebuilt 2.0.0 chat costs more than a host-built version that fits the app. Implementors who need these experiences write their own UI and behavior through `user_defined`. They can use `upsertMessage` to update custom content while their own code controls timing. Possible A2UI support, for interfaces described by agents, also includes date picker controls. The loading and reasoning proposal may offer another pause path. Future MCP Apps support may offer another way to embed interactive content. Keep `image`, `button`, `carousel`, and `option` through 2.0.0.

Feedback wanted

- Which date workflows or reply delays need built-in support?
- Which iframe integrations depend on preview cards, panel behavior, or the shipped sandbox and load feedback?
- Which platform-authored messages make these removals too costly, given that IBM documents all three response types?

## Motivation

A date control needs access to your form rules, locale, and backend format. The built-in picker ties those choices to the chat's message store and send service. Carrying it into the rebuilt 2.0.0 chat also means reworking how it hooks into the calendar library inside Carbon's date picker. A host-rendered control can use the same date picker as the rest of your app.

A pause currently delays later items in a response and can show the typing indicator. The chat skips it when it loads history. A host can pace delivery and show progress through the existing message-update API. Repository tests exercise pauses, but external usage remains an open question.

In the demos and examples, iframe emitters are limited to two items in one demo scenario, covering panel and inline display. That gives limited evidence of use, and external usage remains an open question. Hosts can embed the same pages through custom responses.

The original removal issue bases survival on parity with watsonx Orchestrate's authorable types. IBM documents all three proposed removals. This proposal makes three explicit exceptions to that criterion and revises the earlier iframe keep. Hosts must migrate platform output that uses these types. [IBM response types reference](https://www.ibm.com/docs/en/watsonx/watson-orchestrate/base?topic=reference-response-types), [Earlier response-type decision #1845](https://github.com/carbon-design-system/carbon-ai-chat/issues/1845)

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

A `user_defined` response carries application-defined data. The chat passes the item to your `renderUserDefinedResponse` handler and places the returned UI in a slot. You write the date picker and own its validation, locale, focus, and submission. The `user_defined_type` and `label` fields above are your application's contract. [Customizing responses](../../packages/ai-chat/docs/Responses.md)

For pacing, insert a custom indicator, then replace it with the answer after your host's delay or work completes. An update replaces the full message, so include any earlier content you want to keep.

```ts
import {
  CancellationReason,
  GenericItem,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
  TextItem,
} from '@carbon/ai-chat';

// Inside customSendMessage(request, requestOptions, instance).
// wait(ms, signal) is your helper. It returns true when the delay finishes.
// On abort, it clears its timer and returns false.
// Your renderer handles user_defined_type: 'typing_indicator'.
const messageID = crypto.randomUUID();
const intro: TextItem = {
  response_type: MessageResponseTypes.TEXT,
  streaming_metadata: { id: 'intro' },
  text: 'Checking availability.',
};
const snapshot = (items: GenericItem[]): MessageResponse => ({
  request_id: request.id,
  output: { generic: [intro, ...items] },
});

// First snapshot: the opening text and your indicator.
await instance.messaging.upsertMessage(messageID, MessageState.STREAMING, () =>
  snapshot([
    {
      response_type: MessageResponseTypes.USER_DEFINED,
      streaming_metadata: { id: 'indicator', cancellable: true },
      user_defined: { user_defined_type: 'typing_indicator' },
    },
  ])
);

if (!(await wait(1500, requestOptions.signal))) {
  // Stop leaves the last snapshot in place, so settle it without the indicator.
  // After a restart or clear, skip this. The chat ignores the old request ID.
  if (requestOptions.signal?.reason === CancellationReason.STOP_STREAMING) {
    await instance.messaging.upsertMessage(
      messageID,
      MessageState.COMPLETE,
      () => snapshot([])
    );
  }
  return;
}

// Second snapshot: the answer replaces the indicator.
await instance.messaging.upsertMessage(messageID, MessageState.COMPLETE, () =>
  snapshot([
    {
      response_type: MessageResponseTypes.TEXT,
      streaming_metadata: { id: 'answer' },
      text: 'Your answer is ready.',
    },
  ])
);
```

Use the outgoing request's ID on every update to guard against replies after restart or clear. Stop background work when `requestOptions.signal` aborts. Settle streaming on completion, failure, or cancellation. The working React and web component examples include an abort-aware timer and renderer wiring. [Adding messages](../../packages/ai-chat/docs/UpsertMessage.md), [React example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/upsert-message-user-defined), [Web component example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/upsert-message-user-defined)

The loading and reasoning proposal will likely offer another way to show progress during a wait. Its API and release are open until that ADR is authored. The existing custom-response path supplies a migration today. [Loading and reasoning proposal #2838](https://github.com/carbon-design-system/carbon-ai-chat/issues/2838)

### Reference

| Release | Contract |
| --- | --- |
| 1.x | Tag `MessageResponseTypes.DATE`, `DateItem`, and `MessageSendSource.DATE_PICKER` as deprecated, with removal in 2.0.0 and date-control migration guidance. |
| 1.x | Tag `MessageResponseTypes.PAUSE` and `PauseItem` as deprecated, with removal in 2.0.0 and host-driven pacing guidance. |
| 1.x | Deprecate `MessageResponseTypes.IFRAME`, `IFrameItem`, `IFrameItemDisplayOption`, and the experimental `PageObjectId.IFRAME_PANEL` test identifier. Name 2.0.0 as the removal release. |
| 2.0.0 | Remove the nine named symbols from the browser and server entry points, including the three generic-item union members. |
| 2.0.0 | Delete the date response render path, picker components, Carbon wrapper, helpers, guards, and styles. Remove the `datePicker_chooseDate` and `datePicker_confirmDate` locale keys. |
| 2.0.0 | Delete pause processing, its guards, timing and typing branches, and its history exclusion. |
| 2.0.0 | Delete inline iframe rendering, the iframe preview card (not the separate `preview_card` response type), and the dedicated iframe panel, including their state, helpers, and styles. |
| 2.0.0 | Remove the iframe-only language keys listed below from every locale and from `LanguagePack`. |
| 2.0.0 | Delete all remaining response-specific dispatch, schema, streaming, and history handling for the three types. Generic unknown-type handling supplies any fallback. |
| 2.0.0 | Remove `iframe` from the supported nested built-in types. Convert nested iframe payloads to `user_defined` before delivery or history loading. |

Convert live and saved payloads to explicit `user_defined` items. After deletion, top-level legacy items reach the generic unknown-type path with their original data. Nested items pass through a supported-type filter first, so convert nested iframe items too. Your application writes every replacement control, embed, or delay. The sender controls when later content reaches the chat.

| Payload source | Where to convert |
| --- | --- |
| Live responses | Your backend, where you produce the payload. A `pre:receive` handler sees only complete messages. With `upsertMessage`, it fires when a message reaches `COMPLETE`, after earlier streaming snapshots have drawn. |
| Saved history | Your `customLoadHistory` handler, your code before `insertHistory`, or a `history:begin` handler. History loading does not fire `pre:receive`. |

Remove overrides for these retired `LanguagePack` keys when upgrading.

| Iframe language key           | Purpose                  |
| ----------------------------- | ------------------------ |
| `errors_iframeSource`         | Load error               |
| `iframe_ariaSourceLoaded`     | Load announcement        |
| `iframe_ariaImageAltText`     | Preview image label      |
| `iframe_ariaClosePanel`       | Close label, unused      |
| `iframe_ariaOpenedPanel`      | Panel-open announcement  |
| `iframe_ariaClosedPanel`      | Panel-close announcement |
| `iframe_ariaClickPreviewCard` | Preview action label     |
| `aria_iframePanel`            | Panel label              |

The host writes any embedded content, preview action, and panel behavior it needs. It can use the generic custom panel container. The dedicated iframe panel and its response-driven state are deleted.

The built-in iframe made these choices. Use them as a reference when you choose your own.

| Behavior | Built-in iframe |
| --- | --- |
| Sandbox | `allow-scripts allow-downloads allow-forms allow-popups allow-same-origin` |
| Referrer policy | `origin` |
| Role and keyboard | `role="application"`, in the tab order |
| Loading | Spinner after 1.5 seconds |
| Timeout | Error message after 20 seconds without a load |
| Announcement | Announces when the page loads |
| Nested items | Always inline, never a preview card |
| Preview card | Image, title, and description, with hidden text that names the source |
| Panel title | The item's `title`, or its `source` |
| Panel announcements | Announces when the panel opens and when it closes |

The generic custom panel still supplies its header, back button, and focus handling. Your host supplies the preview card, the panel content, and the announcements.

Choose your own sandbox rather than copying this one. With both `allow-scripts` and `allow-same-origin`, a same-origin page can remove its own sandbox.

The deprecation follow-up covers the 1.x tags and migration guidance. The date and pause removal issues cover their 2.0.0 implementation. If this proposal is accepted, the earlier iframe port scope needs revision to carry its retirement. [Deprecation follow-up #3014](https://github.com/carbon-design-system/carbon-ai-chat/issues/3014), [Date removal #1851](https://github.com/carbon-design-system/carbon-ai-chat/issues/1851), [Pause removal #2032](https://github.com/carbon-design-system/carbon-ai-chat/issues/2032), [Earlier iframe port scope #1856](https://github.com/carbon-design-system/carbon-ai-chat/issues/1856)

| Retained type | 2.0.0 contract | Reason |
| --- | --- | --- |
| `image` | Supported, untagged | Platform authors can emit it. The built-in renderer owns alt-text fallback, loading errors, and interaction. Image buttons also need that renderer. |
| `button`, `carousel`, `option` | Supported, untagged | Keep platform-authored actions and choices available. |

The iframe preview card (`IFramePreviewCard`, not the `preview_card` response type) is the only path that opens the dedicated iframe panel. Retiring the whole response experience lets its renderer and panel leave together. The image renderer also serves image buttons, so its shared code continues to have consumers. Expand image usage guidance as follow-up.

## Consumer impact

An unchanged backend can lose visible behavior after the upgrade. An unhandled top-level custom slot is empty, with no unknown-type error. A date loses its picker. A pause loses its delay and typing cue. An iframe loses its inline page or preview-card panel. Nested legacy iframe items can disappear before custom rendering. Saved history needs the same migration as live responses. Legacy pauses loaded from history also reach custom rendering after removal.

### Replace the date item and its submission

Before, the chat supplies the picker and sends the selected date.

```json
{ "response_type": "date" }
```

After, send the `date_picker` item shown under Proposal. Your control sends the chosen date.

```ts
// Your date control's confirmation handler. This example uses an ISO date.
// Format history.label for the user's locale and your backend's input contract.
await instance.send({
  input: {
    text: '2026-12-18',
    structured_data: { user_defined: { date: '2026-12-18' } },
  },
  history: {
    label: 'December 18, 2026',
    // ID of the message that held your date picker.
    related_message_id: dateMessageID,
  },
});
```

You can also offer a fixed set of dates as an `option` response. Your control owns selected and disabled states, accessibility, and restoration from history. Programmatic sends use `MessageSendSource.INSTANCE_SEND`, which replaces date-picker-specific event handling.

Possible A2UI support also includes date picker controls. Its basic catalog defines `DateTimeInput` for date and time entry. The Carbon AI Chat integration and its release are still being explored. [A2UI integration #1526](https://github.com/carbon-design-system/carbon-ai-chat/issues/1526), [A2UI date and time input](https://a2ui.org/specification/v1.0-basic-catalog-implementation-guide/#datetimeinput)

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

After, the pacing sample under Proposal sends two snapshots with the same message ID. The first holds the opening text and your indicator. The second replaces the indicator with the answer.

Send the first snapshot as `STREAMING` and the second as `COMPLETE`, with the same `request_id` on both. On Stop, settle the message as `COMPLETE` without the indicator. Keep completed content in saved history. A custom placeholder has no automatic history exclusion, so your host must settle or normalize it.

### Replace the iframe item and its panel behavior

Before, the chat renders this page inline. With `display: "panel"`, or with `display` omitted, it shows a preview card that opens the dedicated iframe panel.

```json
{
  "response_type": "iframe",
  "source": "https://example.com/report",
  "title": "Report",
  "display": "inline"
}
```

After, your custom renderer handles the page and its presentation.

```json
{
  "response_type": "user_defined",
  "user_defined": {
    "user_defined_type": "embedded_page",
    "source": "https://example.com/report",
    "title": "Report",
    "presentation": "inline"
  }
}
```

The fields inside `user_defined` are data for code you write. Your renderer interprets `embedded_page`, creates the iframe, and applies your sandbox and referrer policies. You implement the rendering and behavior in your own application.

| Existing presentation | Host migration |
| --- | --- |
| `display: "inline"` | Render the iframe inside your custom response. |
| `display: "panel"`, or omitted | Replace the iframe preview card with your own preview action and panel content, optionally using a generic custom panel container. |
| Iframe inside a card, grid, or button panel | Convert that nested item to `user_defined`, including copies in saved history. |

Your host takes on sizing, labels, keyboard access, loading feedback, timeouts, and load or error announcements, starting from the built-in choices listed under Reference. Panel users also own the preview and panel controls. No element carries the retired `PageObjectId.IFRAME_PANEL` test identifier today, so selectors that use it already find nothing. Point them at your custom panel. Remove overrides for the retired language keys. [Custom panels](../../packages/ai-chat/docs/CustomPanels.md)

MCP Apps may offer another path for interactive content after Carbon AI Chat adopts the component another Carbon squad is building. MCP Apps use UI resources associated with MCP tools, so migration requires adapting content to that protocol. The integration's API and timing remain open. [MCP Apps adoption direction](https://github.com/carbon-design-system/carbon-ai-chat/issues/906#issuecomment-6989441469), [MCP Apps protocol](https://github.com/modelcontextprotocol/ext-apps/blob/main/README.md#how-it-works)

TypeScript hosts also need to remove imports and enum references for the nine retired symbols. Backends and saved transcripts need their own migration, since a host build cannot check their wire data.

## Alternatives

- **Keep and port all three types.** This preserves built-in date collection, pacing, and embedded pages. It carries the date picker dependencies and the iframe renderer, preview card, and dedicated panel into the new UI.
- **Deprecate now and remove in a later major.** This gives hosts longer to migrate. It also requires a 2.0 port and leaves the removal date open.
- **Ship a replacement date response first.** This offers a shared control and migration contract, but adds a new public API. A host can already render its own date picker.
- **Wait for the loading and reasoning ADR.** This could simplify the pause migration. Its design and release remain open, while host-driven updates work today.
- **Keep iframe while removing date and pause.** This preserves its sandbox, load feedback, and panel experience for hosts. It carries a dedicated response family despite limited use in repository examples.
- **Wait for MCP Apps before retiring iframe.** This could offer a shared home for interactive content. Adoption and integration timing are open, and URL-based pages need adaptation to the MCP tool and resource model.
- **Remove image too.** This breaks more platform-authored messages and shifts image behavior to each host. Its renderer still serves image buttons.

## Open questions

- Should 1.x warn at runtime when a retired type arrives live or from history? Today the 1.x deprecation reaches only TypeScript builds, so a backend that sends JSON learns nothing until 2.0.0. Options: warn once per type in 1.x; also warn in 2.0.0 when a known retired type reaches the unknown-type path; or send no runtime signal.
- Is handling the raw legacy `response_type` in `renderUserDefinedResponse` a supported migration? After deletion, top-level legacy items reach custom rendering with their original data, so a host could skip converting them. Options: document it as a shortcut for top-level items only; or keep conversion to `user_defined` as the contract, since the raw route may change.
- Should the removed renderers ship as copyable examples instead of built-ins? That would give hosts a starting point without a public API.
- Which embedded pages can migrate to MCP Apps once the shared component and Carbon AI Chat integration are ready?

## Decision

Not decided. Feedback by 2026-12-16. The RFC discussion opens after this proposal merges.
