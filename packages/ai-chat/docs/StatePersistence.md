---
title: Session state persistence
---

## Overview

Carbon AI Chat keeps a small amount of session state, so a page reload restores where the user left off. This state covers which views are open, whether the user accepted the disclaimer, the in-progress human-agent connection, and similar UI flags. By default it lives in the browser's `sessionStorage`.

Set {@link PublicConfig.persistedState | persisted state} to take over that storage yourself. You boot the chat from state you supply, then receive every change so you can save it wherever you like: your own backend, `localStorage`, or cross-device sync. This saves only the session and UI state that {@link PersistableState} describes, not conversation messages, which load through [Conversation history](./CustomHistory.md) instead.

> **Note**: When you don't set {@link PublicConfig.persistedState | persisted state}, the chat keeps using `sessionStorage` as before. The override is opt-in, so it doesn't change the default behavior.

## What is persisted

{@link PersistableState} is the value passed to and from your storage. Treat it as an opaque blob: store the whole thing and hand it back unchanged. It carries session and UI state such as disclaimer acceptance, home-screen state, and the part of the human-agent connection needed to reconnect after a reload. It never contains conversation message text.

## Providing your own storage

Set {@link PersistedStateConfig.initialState | initialState} to boot from stored state, and {@link PersistedStateConfig.onStateChange | onStateChange} to receive changes to store.

```ts
import { PersistableState, PublicConfig } from "@carbon/ai-chat";

// readFromMyStore / writeToMyStore are stand-ins for your own storage.
const config: PublicConfig = {
  persistedState: {
    initialState: readFromMyStore(),
    onStateChange: (state: PersistableState) => {
      writeToMyStore(state);
    },
  },
};
```

- {@link PersistedStateConfig.initialState | initialState} replaces the `sessionStorage` read at startup. It's synchronous, so resolve any asynchronous load, such as a fetch from your backend, before you build the chat and pass the resolved value. Omit it to start a fresh session.
- {@link PersistedStateConfig.onStateChange | onStateChange} replaces the `sessionStorage` write. The chat calls it with the complete {@link PersistableState} whenever that state changes, but skips transient changes such as input text. Store the value verbatim.

Setting either field turns off the internal `sessionStorage` completely, so the chat no longer reads, writes, or clears it.

The chat treats a restored session as an existing one, so {@link PublicConfig.openChatByDefault | openChatByDefault} doesn't re-open the chat on reload.

## Do not drop fields

Round-trip the whole {@link PersistableState}. If you store only part of it, the reload regresses:

- Dropping `disclaimersAccepted` re-prompts the disclaimer on every reload and blocks messages until the user accepts again.
- Dropping `humanAgentState` stops an in-progress human-agent conversation from reconnecting.
- Dropping `hasSentNonWelcomeMessage` re-sends the welcome message.

Store the value verbatim to avoid all of these.

## Related

- [Conversation history](./CustomHistory.md) — save and restore the conversation messages, which are separate from session state.
- [Server communication](./CustomServer.md) — connect the chat to your own backend.
