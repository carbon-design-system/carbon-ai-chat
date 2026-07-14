---
title: Session state persistence
---

## Overview

Carbon AI Chat keeps a small amount of session state — which views are open, whether the disclaimer has been accepted, in-progress human-agent connection state, and similar UI flags — so a page reload restores where the user left off. By default this state lives in the browser's `sessionStorage`.

Set {@link PublicConfig.persistedState} to take over that storage yourself: boot the chat from state you supply and receive every change to persist wherever you like (your own backend, `localStorage`, cross-device sync). This does not persist conversation messages — those load through [Conversation history](./CustomHistory.md) — only the session and UI state described by {@link PersistableState}.

> **Note**: When you do not set {@link PublicConfig.persistedState}, the chat continues to use `sessionStorage` exactly as before. This is an opt-in override with no change to the default behavior.

## What is persisted

{@link PersistableState} is the value handed to and from your storage. Treat it as an opaque blob: store the whole thing and hand it back unchanged. It carries session and UI state such as disclaimer acceptance, home-screen state, and the human-agent connection subset needed to reconnect after a reload. It never contains conversation message text.

## Providing your own storage

Set {@link PersistedStateConfig.initialState} to boot from stored state, and {@link PersistedStateConfig.onStateChange} to receive changes to store.

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

- {@link PersistedStateConfig.initialState} replaces the `sessionStorage` read at startup. It is synchronous — resolve any asynchronous load (for example from your backend) before you construct the chat and pass the resolved value. Omit it to start a fresh session.
- {@link PersistedStateConfig.onStateChange} replaces the `sessionStorage` write. It is called with the complete {@link PersistableState} whenever that state changes — not on transient changes such as input text. Persist the value verbatim.

Providing either field disables the internal `sessionStorage` entirely: the chat no longer reads, writes, or clears it.

A restored session is treated as an existing session, so {@link PublicConfig.openChatByDefault} does not re-open the chat on reload.

## Do not drop fields

Round-trip the whole {@link PersistableState}. If you store only part of it, reload regresses:

- Dropping `disclaimersAccepted` re-prompts the disclaimer on every reload and blocks messages until it is accepted again.
- Dropping `humanAgentState` prevents an in-progress human-agent conversation from reconnecting.
- Dropping `hasSentNonWelcomeMessage` re-sends the welcome message.

Storing the value verbatim avoids all of these.

## Related

- [Conversation history](./CustomHistory.md) — persist and restore the conversation messages themselves, which are separate from session state.
- [Server communication](./CustomServer.md) — connect the chat to your own backend.
