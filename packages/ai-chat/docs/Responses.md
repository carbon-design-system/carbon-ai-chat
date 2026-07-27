---
title: Customizing responses
---

## Overview

Customize what the chat renders for each response type. The chat supports many types: rich text, buttons, carousels, cards, media, your own components, and more. See {@link GenericItem | the base response type} for the full set and each type's properties.

## Rich text responses

Style `text` responses to match your theme. Use Markdown or HTML returned from your assistant. For supported Markdown syntax and HTML handling, see {@link TextItem | the text item type}.

Extend how the chat parses and renders Markdown through the {@link PublicConfigMarkdown `markdown`} config. Use {@link PublicConfigMarkdown.markdownItPlugins `markdownItPlugins`} to register [markdown-it](https://github.com/markdown-it/markdown-it) plugins after the built-ins. These plugins add token types the renderer does not understand out of the box. Examples include math, diagrams, and custom embeds. Use {@link CustomMarkdownRenderers `customRenderers`} to change how specific elements draw. Overrides come in three kinds:

- **Element replacements** — render `table` and `codeBlock` through your own component instead of the default Carbon one. Return a React node (or an `HTMLElement` for web components), or `null` to fall back to the default.
- **Attribute transforms** — `link` and `image` keep the framework rendering the element and its children (the link `target="_blank"` safety default is also preserved) while you rewrite attributes. Edit a link's `href`, `target`, or `rel`, add context-aware query params, or resolve an image `src` to an authenticated CDN URL. Return the overrides, or `null` to keep the defaults.
- **Behavior hook** — `checklist` makes task-list checkboxes actionable. Provide an `onToggle` callback to persist and react to toggles. Add an optional `getChecked` source of truth so a persisted state survives streaming re-renders.

For working setups, see the `markdown-plugin`, `markdown-override`, and `workspace-table-markdown-override` projects under [examples](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples).

## User-defined responses

Render content from your own HTML, CSS, or JavaScript through a `user_defined` {@link UserDefinedItem | response}. This lets you change responses without editing your assistant. In React, use portals to render content from your main app.

User-defined content renders into a slot on the {@link ChatInstance | chat instance}. See [React](./React.md) and [web components](./WebComponent.md) for how to reach the instance and wire up the handler.

To show custom content, return this from your server (a user-defined card):

```json
{
  "response_type": "user_defined",
  "user_defined": {
    "type": "promo-card",
    "title": "Upgrade to Pro",
    "description": "Unlock higher limits and priority support.",
    "primaryLabel": "Upgrade"
  }
}
```

The `user_defined_type` field is a unique name for each UI component. Your renderer switches on it to decide what to draw. The `user_defined` response injects into a slot within the chat's shadow DOM. You can style it from global CSS, and it inherits some styling from the chat, such as fonts. You can use Carbon components alongside your own custom components.

Example render for the `promo-card` response:

```html
<cds-aichat-card>
  <div slot="card-body">
    <h4>Upgrade to Pro</h4>
    <p>Unlock higher limits and priority support.</p>
  </div>
  <cds-aichat-card-footer slot="card-footer">
    <cds-aichat-button>Upgrade</cds-aichat-button>
  </cds-aichat-card-footer>
</cds-aichat-card>
```

For each `user_defined` response, your framework renderer receives the accumulated {@link RenderUserDefinedState | render state}. `messageItem` holds the complete {@link UserDefinedItem | item}, and `partialItems` holds streaming chunks. See [React](./React.md#user-defined-responses) and [web components](./WebComponent.md#user-defined-responses) for the wiring.

### Streaming and updates

Prefer {@link ChatInstanceMessaging.upsertMessage | upsertMessage} to insert, stream, correct, and regenerate `user_defined` responses. One method covers all four. It drives a streaming UI from any source: SSE, WebSocket, polling, or whole-message snapshots. It also preserves component identity across updates. You accumulate state in your app and apply it with one call per update. This skips the chunk-shape contract below. It is the recommended direction for new code, but experimental. Its semantics and updater signature may still evolve. See [Adding messages (experimental)](./UpsertMessage.md). The chat supports nested `user_defined` items inside {@link MessageResponseTypes.CARD | card}, {@link MessageResponseTypes.CAROUSEL | carousel}, and {@link MessageResponseTypes.GRID | grid} containers.

{@link ChatInstanceMessaging.addMessageChunk | addMessageChunk} is the stable streaming path. It is fully supported with no deprecation, and the right choice if you prefer a settled API. If you stream with it, read [Adding messages (legacy)](./AddMessageChunk.md) first. The model is the same in every framework:

- {@link RenderUserDefinedState.partialItems | `partialItems`} is an array of every chunk received, **not** concatenated for you. The streaming API sends string chunks, not partial JSON. So stringify your JSON, then concatenate and parse the chunks in your renderer with `try`/`catch` or an optimistic parser.
- Include `streaming_metadata.response_id` for the message and {@link ItemStreamingMetadata.id | `id`} for each item so chunks correlate correctly.

## Related

- [Using with React](./React.md#user-defined-responses) — render user-defined responses in React.
- [Using as a Web component](./WebComponent.md#user-defined-responses) — render user-defined responses with web components.
- [Adding messages (experimental)](./UpsertMessage.md) — insert, stream, and regenerate responses while preserving component identity.
- [Adding messages (legacy)](./AddMessageChunk.md) — stream message chunks with {@link ChatInstanceMessaging.addMessageChunk}.
