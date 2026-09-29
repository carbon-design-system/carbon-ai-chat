---
title: Custom request footer
---

## Overview

Render your own content beneath a user message — a copy button, an edit action, a resend link — through a footer slot the chat creates for you.

## How it works

Pass a render function and the chat does the rest. It creates a slot under each user message, fires an event, and calls your function with the slot name and the message.

Nothing goes on the wire. Unlike the [assistant-side footer](./CustomMessageFooter.md), which your backend turns on per message with `custom_footer_slot`, this one needs no message field. Your `customSendMessage` stays as it is.

Passing the render function is the only opt-in. If you use `renderCustomMessageFooter` today and change nothing, user messages get no footer.

Your renderer receives:

- The slot name. Treat it as opaque: it keys your render function, and the chat mints a new one when it restores a message from history, so don't store anything against it.
- The {@link MessageRequest | message} as the user submitted it. That is what the bubble above the footer shows. A {@link BusEventType.PRE_SEND | pre:send} handler runs later and can rewrite the text the assistant receives, so this is not always what was sent.
- The {@link ChatInstance | chat instance}, so the footer can call its methods.

## Messages that get no footer

Three kinds of message render no footer, and fire no event:

- A silent message, which never renders.
- A message carrying only file attachments, which renders its chips without a bubble.
- A message typed to a human agent, which the chat sends on a separate path.

## Rendering a footer

Each framework exposes a managed renderer that tracks each slot and handles the element lifecycle for you:

- **React** — pass the {@link ChatContainerProps.renderCustomRequestFooter | renderCustomRequestFooter} render prop. See [React](./React.md#custom-request-footer).
- **Web component** — set the {@link CdsAiChatContainerAttributes.renderCustomRequestFooter | renderCustomRequestFooter} callback property. See [Web component](./WebComponent.md#custom-request-footer).

## Related

- [Custom message footer](./CustomMessageFooter.md) — the same idea for assistant messages, driven by your backend.
- [Customizing responses](./Responses.md) — render your own `user_defined` response content.
- [React](./React.md#custom-request-footer) / [Web component](./WebComponent.md#custom-request-footer) — wire up the renderer in your framework.
