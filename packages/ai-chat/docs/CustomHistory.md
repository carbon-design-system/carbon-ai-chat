---
title: Conversation history
---

## Overview

Restore previous conversations by loading custom history when the chat opens. History is an array of {@link HistoryItem} objects, where each item contains either a {@link MessageRequest} or {@link MessageResponse} along with a timestamp.

> **Note**: The Carbon AI Chat handles only UI-level history (displaying previous messages); it has no recommended strategy for storing LLM-friendly conversation history.

This guide covers loading history data into the chat and showing the built-in history panel that lets users browse and switch between past conversations.

## History data structure

Each {@link HistoryItem} pairs a message ({@link MessageRequest} or {@link MessageResponse}) with an ISO 8601 {@link HistoryItem.time} (e.g. `2020-03-15T08:59:56.952Z`). See {@link HistoryItem} for the full shape.

Include the message's {@link MessageRequest.history} property ({@link MessageRequestHistory} or {@link MessageResponseHistory}); it stores metadata like timestamps, labels, error states, and feedback.

## Loading history on startup

To load history when the chat opens, define a {@link PublicConfigMessaging.customLoadHistory} function in your {@link PublicConfig}:

```typescript
import { ChatInstance, HistoryItem } from "@carbon/ai-chat";

const config = {
  messaging: {
    customLoadHistory: async (instance: ChatInstance) => {
      // Fetch history from your backend. fetchHistoryFromAPI is a stand-in.
      const history: HistoryItem[] = await fetchHistoryFromAPI();

      // Return array of HistoryItem objects
      return history;
    },
  },
};
```

This function:

- Receives the {@link ChatInstance} as a parameter
- Returns a `Promise<HistoryItem[]>`
- Is called once during the chat's hydration process
- Cannot be changed after initial load

The Carbon AI Chat automatically calls {@link ChatInstanceMessaging.insertHistory} with the returned items.

## Manually loading history

For advanced use cases (like switching between conversations), you can skip {@link PublicConfigMessaging.customLoadHistory} and directly call {@link ChatInstanceMessaging.insertHistory}:

```typescript
// Load history manually
await instance.messaging.insertHistory(historyItems);
```

This method:

- Fires {@link BusEventType.HISTORY_BEGIN} and {@link BusEventType.HISTORY_END} events
- Can be called multiple times
- Does not clear existing messages (use {@link ChatInstanceMessaging.clearConversation} first if needed)

## Switching between conversations

When users need to switch between different conversations:

```typescript
// Clear the current conversation
await instance.messaging.clearConversation();

// Load the new conversation's history
await instance.messaging.insertHistory(newConversationHistory);
```

{@link ChatInstanceMessaging.clearConversation}:

- Triggers a restart of the conversation
- Clears all current assistant messages from the view
- Cancels any outstanding messages
- Does not start a new hydration process

## History loading indicators

When using {@link PublicConfigMessaging.customLoadHistory}, the Carbon AI Chat automatically shows a fullscreen loading indicator during the hydration process. You do not need to manually control the loading state.

However, if you manually call {@link ChatInstanceMessaging.clearConversation} or {@link ChatInstanceMessaging.insertHistory} (for example, when switching conversations), you may want to show a loading indicator while fetching data:

```typescript
async function switchToConversation(conversationId: string) {
  // Show loading indicator
  instance.updateIsChatLoadingCounter("increase");

  try {
    // Fetch history from your backend
    const history = await fetchHistoryFromAPI(conversationId);

    // Clear current conversation and load new one
    await instance.messaging.clearConversation();
    await instance.messaging.insertHistory(history);
  } finally {
    // Hide loading indicator
    instance.updateIsChatLoadingCounter("decrease");
  }
}
```

{@link ChatInstance.updateIsChatLoadingCounter} controls the fullscreen hydration loading state. The indicator shows when the internal counter is greater than zero. Always pair "increase" with "decrease" so the counter resets.

## The history panel

The sections above load history into the current conversation. The history panel is the UI that lets users browse past conversations and switch between them. You enable it through configuration and render its contents yourself through a slot.

### Enabling the panel

Turn the panel on with {@link HistoryConfig} in your {@link PublicConfig}:

```ts
const config = {
  history: {
    isOn: true, // Enables the history feature and renders the panel slot.
    showMobileMenu: true, // Show the "New chat" / "View chats" header menu on small screens. Default true.
    startClosed: false, // Start open on desktop, closed on mobile. Default false.
  },
};
```

- {@link HistoryConfig.isOn} enables the feature and renders the panel slot. It does not, by itself, control panel visibility at the mobile breakpoint.
- {@link HistoryConfig.showMobileMenu} (default `true`) shows the built-in "New chat" and "View chats" options in the header on small screens. Set it to `false` when you provide your own controls.
- {@link HistoryConfig.startClosed} (default `false`) starts the panel open on desktop and closed on mobile, resetting to that default when the viewport crosses the breakpoint. Set it to `true` to start closed in both modes and preserve the user's open/closed choice across breakpoint changes — useful when you drive the panel programmatically.

### Rendering your panel content

The panel body is a slot. Render your own conversation list into the {@link WriteableElementName.HISTORY_PANEL_ELEMENT} slot (`"historyPanelElement"`). With a web component, slot your content into the host element:

```html
<cds-aichat-custom-element>
  <div slot="historyPanelElement">
    <!-- Your conversation list goes here. -->
  </div>
</cds-aichat-custom-element>
```

See [Slots](./WriteableElements.md) for how slots work across frameworks. The [chat-history-fullscreen example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/chat-history-fullscreen) builds a complete panel — pinning, search, rename, and delete — from the `cds-aichat-history-*` components in the separate `@carbon/ai-chat-components` package.

### Loading a conversation on selection

When a user picks a conversation in your panel, load it the same way as [Switching between conversations](#switching-between-conversations): clear the current view, then insert the selected conversation's history.

```ts
async function selectConversation(historyItems) {
  await instance.messaging.clearConversation();
  await instance.messaging.insertHistory(historyItems);
}
```

Your slotted panel lives outside the chat, so it needs a way to reach your loader. The example bridges the two with an app-defined `CustomEvent` (`history-panel-load-chat`) dispatched from the slotted component and handled on the host. That is one pattern, not a required API — any mechanism that calls `clearConversation()` and `insertHistory()` works.

### Controlling the panel programmatically

Open and close the panel through {@link CustomPanels}:

```ts
import { PanelType } from "@carbon/ai-chat";

instance.customPanels.getPanel(PanelType.HISTORY)?.open();
instance.customPanels.getPanel(PanelType.HISTORY)?.close();
```

Do not toggle {@link HistoryConfig.isOn} at runtime to show or hide the panel — use `open()` and `close()` instead.

To read the panel's current state — for example, to build a toggle or adapt to mobile — use {@link ChatInstance.getState}; `customPanels.history` is a {@link PublicHistoryPanelState} with `isOpen` and `isMobile`. The panel instance itself does not expose an `isOpen` property.

```ts
const { isOpen, isMobile } = instance.getState().customPanels.history;
```

To react to changes, subscribe to {@link BusEventType.STATE_CHANGE} and compare the previous and new state:

```ts
instance.on({
  type: BusEventType.STATE_CHANGE,
  handler: (event) => {
    const wasMobile = event.previousState.customPanels.history.isMobile;
    const isMobile = event.newState.customPanels.history.isMobile;
    if (wasMobile !== isMobile) {
      // Adapt your panel UI to the new breakpoint.
    }
  },
});
```

## Related

- [history example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/history) — a complete, runnable implementation.
- [chat-history-fullscreen example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/chat-history-fullscreen) — a fullscreen web-component layout with a custom history panel.
- [Slots](./WriteableElements.md) — render your own content into the history panel slot.
- [Message format](./MessageFormat.md) — the request/response shapes history items wrap.
- [Session state persistence](./StatePersistence.md) — own where the chat's session and UI state (views, disclaimer, human-agent connection) is stored, separately from conversation messages.
- [Adding messages (legacy)](./AddMessageChunk.md) — getting live responses onscreen.
- [Adding messages (experimental)](./UpsertMessage.md) — revising a message after it renders.
