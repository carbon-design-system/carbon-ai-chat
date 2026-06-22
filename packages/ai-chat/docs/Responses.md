---
title: Customizing responses
---

### Overview

Customize what the chat renders for each response type. The chat supports many response types — rich text, buttons, carousels, cards, media, and your own components, among others. See the base {@link GenericItem} type for the full set and the properties of each.

### Rich text responses

Style `text` responses to match your theme, using Markdown or HTML returned from your assistant. For supported Markdown syntax and HTML content handling, see {@link TextItem}.

You can extend how Markdown is parsed and rendered through the {@link PublicConfigMarkdown `markdown`} config. Use {@link PublicConfigMarkdown.markdownItPlugins `markdownItPlugins`} to register [markdown-it](https://github.com/markdown-it/markdown-it) plugins after the built-ins, adding token types the renderer does not understand out of the box — math, diagrams, custom embeds. Use {@link CustomMarkdownRenderers `customRenderers`} to replace how specific elements draw — for example, render every fenced code block or table through your own component instead of the default Carbon one. Renderers return your own React node (or `HTMLElement` for web components), or `null` to fall back to the default.

For working setups, see the `markdown-plugin`, `markdown-override`, and `workspace-table-markdown-override` projects under [examples](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples).

### User-defined responses

Render content from your own HTML, CSS, or JavaScript through a `user_defined` {@link UserDefinedItem}, so you can change responses without editing your assistant. In React, you can use portals to render content from your main application.

User-defined content renders into a slot on the {@link ChatInstance}; see [React](./React.md) and [web components](./WebComponent.md) for how to reach the instance and wire up the handler.

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

Your framework renderer receives the accumulated {@link RenderUserDefinedState} for each `user_defined` response: `messageItem` holds the complete {@link UserDefinedItem}, and `partialItems` holds streaming chunks. See [React](./React.md#user-defined-responses) and [web components](./WebComponent.md#user-defined-responses) for the wiring.

#### Streaming and updates

Prefer {@link ChatInstanceMessaging.upsertMessage} to insert, stream, correct, and regenerate `user_defined` responses — one method covers all four, drives a streaming UI from any source (SSE, WebSocket, polling, or whole-message snapshots), and preserves component identity across updates. You accumulate state in your app and apply it with one call per update, skipping the chunk-shape contract below. It is the recommended direction for new code, but experimental — its semantics and updater signature may still evolve. See [Adding messages (experimental)](./UpsertMessage.md). Nested `user_defined` items inside {@link MessageResponseTypes.CARD}, {@link MessageResponseTypes.CAROUSEL}, and {@link MessageResponseTypes.GRID} containers are supported.

{@link ChatInstanceMessaging.addMessageChunk} is the stable streaming path — fully supported with no deprecation, and the right choice if you prefer a settled API. If you stream with it, read [Adding messages (legacy)](./AddMessageChunk.md) first; the model is the same in every framework:

- {@link RenderUserDefinedState.partialItems} is an array of every chunk received — **not** concatenated for you. The streaming API sends string chunks, not partial JSON, so stringify your JSON, then concatenate and parse the chunks in your renderer with `try`/`catch` or an optimistic parser.
- Include `streaming_metadata.response_id` for the message and {@link ItemStreamingMetadata.id} for each item so chunks correlate correctly.

### Related

- [Using with React](./React.md#user-defined-responses) — render user-defined responses in React.
- [Using as a Web component](./WebComponent.md#user-defined-responses) — render user-defined responses with web components.
- [Adding messages (experimental)](./UpsertMessage.md) — insert, stream, and regenerate responses while preserving component identity.
- [Adding messages (legacy)](./AddMessageChunk.md) — stream message chunks with {@link ChatInstanceMessaging.addMessageChunk}.
