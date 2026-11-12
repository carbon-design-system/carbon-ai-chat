---
title: Keeping a chat through a remount
---

## Overview

By default, removing the chat from the page shuts it down, and mounting it again starts a new chat. Turn on {@link LifecycleConfig.reuseInstance | lifecycle.reuseInstance} to keep the conversation running through a remount, such as a route change, a React `key` change, or a move to another part of the page. Set {@link LifecycleConfig.onUnmount | lifecycle.onUnmount} to `'destroy'` where a remount must start fresh, such as on logout.

## Keep the conversation through a remount

Give the chat a namespace and turn reuse on:

```tsx
import React from 'react';
import { ChatContainer } from '@carbon/ai-chat';

function SupportChat() {
  return (
    <ChatContainer
      namespace="support"
      lifecycle={{ reuseInstance: true }}
      // ... other config properties as individual props
    />
  );
}
```

A web component takes the same setting through its `lifecycle` property, or as a JSON attribute:

```html
<cds-aichat-container
  namespace="support"
  lifecycle='{"reuseInstance":true}'></cds-aichat-container>
```

When the chat is removed, it keeps running for a short grace window. A chat mounted on the same namespace inside that window picks up the running conversation: the transcript, a live human agent conversation, and an open confirmation, such as the prompt to end an agent chat.

Each mount gets its own {@link ChatInstance}. Handlers you added through the old mount's instance stop when it's removed, so add them again in {@link ChatContainerProps.onBeforeRender | onBeforeRender}, which runs for every mount. Nothing tells your code whether a mount got a new chat or a running one. To add a welcome message only once, check `instance.state.get().messages.length` rather than counting mounts.

## The grace window

A removed chat waits {@link ChatSDKLifecycleConfig.releaseGraceMs | lifecycle.releaseGraceMs} for the next mount, 3000 ms by default. Raise it when your app can take longer than that to mount the chat again, such as while a slow route loads.

During the window, requests, a streaming response, and a human agent conversation keep going. When the window runs out, the chat shuts down. It disconnects from a human agent without ending the conversation, and it keeps saved session state, so the next mount reconnects as it does after a page reload.

## One chat per namespace

With reuse on, the namespace identifies the conversation. Two chats on screen with the same namespace, or both with none, are an error. The second one doesn't render. It reports the error through {@link PublicConfig.onError | onError} as {@link OnErrorType.INTEGRATION_ERROR} and logs it to the console.

Give each chat its own namespace. Watch for a chat that stays mounted during an exit animation while its replacement mounts: those are two chats at once. Don't put a user ID in the namespace. It's part of the chat's accessible label, and screen readers read it aloud.

## Start fresh when the chat is removed

Set `onUnmount` to `'destroy'` when removing the chat means the conversation is over. Here, a new user gets a new chat:

```tsx
import React from 'react';
import { ChatContainer } from '@carbon/ai-chat';

function SupportChat({ user }: { user?: { id: string } }) {
  return user ? (
    <ChatContainer
      key={user.id}
      namespace="support"
      lifecycle={{ reuseInstance: true, onUnmount: 'destroy' }}
      // ... other config properties as individual props
    />
  ) : null;
}
```

Removing the chat then ends it for good:

- A live human agent conversation ends. Your handlers see the end-of-chat events, but they can't cancel them.
- Saved session state is cleared, so the next user doesn't get the last user's accepted disclaimers or agent connection.
- The next mount starts a new chat, even inside the grace window.

When you own that storage through {@link PublicConfig.persistedState | persistedState}, the chat can't clear your copy. Instead, your `onStateChange` gets the cleared value once. Save it, as you save any other value, so the old conversation doesn't come back on the next boot.

The chat reads `onUnmount` when it's removed, so you can change it until then. The default, `'release'`, keeps the grace window. To start over while the chat stays on the page, call {@link ChatInstanceMessaging.restartConversation | messaging.restartConversation} instead.

## With reuse off

With `reuseInstance` off, the default, every mount starts a new chat. Removing the chat shuts it down at once: requests are cancelled, a human agent is disconnected without ending the conversation, and saved session state stays for the next mount. `onUnmount` does nothing, and two chats can share a namespace, as before.

## Related

- [Session state persistence](./StatePersistence.md) — own where the chat stores its session state, which a destroyed chat clears.
- [React](./React.md) — render the chat with `ChatContainer` or `ChatCustomElement`.
- [Web component](./WebComponent.md) — render the chat with `cds-aichat-container` or `cds-aichat-custom-element`.
