---
title: Custom message footer
---

## Overview

Render your own content beneath an assistant message — copy and share actions, ratings, or links — through a custom footer slot.

## How it works

A message renders a custom footer when your backend includes `custom_footer_slot` on it. Populate its `additional_data` object on the backend with whatever the footer needs to render — for example, a flag to allow copy or a share URL.

Give each message's `custom_footer_slot` a unique `slot_name`. The slot name identifies a single footer instance, so reusing the same value across messages collapses them onto one slot and only the first message's footer renders. Derive it from the message ID or a counter — for example, `copy_footer_${id}`.

Your renderer receives the accumulated {@link RenderCustomMessageFooterState | footer state} for the slot:

- The {@link GenericItem | message item} the footer attaches to, for reading message content.
- The full {@link MessageResponse | message response} the item belongs to.
- The {@link ChatInstance | chat instance}, so the footer can call its methods.
- The `additionalData` object your backend attached to the message.

## Rendering a footer

Each framework exposes a managed renderer that tracks each slot and handles the element lifecycle for you:

- **React** — pass the {@link ChatContainerProps.renderCustomMessageFooter | renderCustomMessageFooter} render prop. See [React](./React.md#custom-message-footer).
- **Web component** — set the {@link CdsAiChatContainerAttributes.renderCustomMessageFooter | renderCustomMessageFooter} callback property. See [Web component](./WebComponent.md#custom-message-footer).

## Related

- [Customizing responses](./Responses.md) — render your own `user_defined` response content.
- [Message format](./MessageFormat.md) — the shape of messages, including `custom_footer_slot`.
- [React](./React.md#custom-message-footer) / [Web component](./WebComponent.md#custom-message-footer) — wire up the renderer in your framework.
