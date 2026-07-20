---
title: Conversation history
---

## Overview

Restore past conversations by loading custom history when the chat opens. History is an array of {@link HistoryItem | history items}. Each item holds a {@link MessageRequest | request} or {@link MessageResponse | response}, plus a timestamp.

> **Note**: The Carbon AI Chat handles only UI-level history, which displays past messages. It has no recommended way to store LLM-friendly conversation history.

This guide covers loading history data into the chat. It also covers the built-in history panel that lets users browse and switch between past conversations.

## History data structure

Each {@link HistoryItem | history item} pairs a message with a timestamp. The message is a {@link MessageRequest | request} or {@link MessageResponse | response}. The timestamp is an ISO 8601 {@link HistoryItem.time | time} (e.g. `2020-03-15T08:59:56.952Z`). See {@link HistoryItem} for the full shape.

Include the message's {@link MessageRequest.history | history} property. Its type is {@link MessageRequestHistory | request history} or {@link MessageResponseHistory | response history}. It stores metadata like timestamps, labels, error states, and feedback.

## Loading history on startup

To load history when the chat opens, define a {@link PublicConfigMessaging.customLoadHistory | customLoadHistory} function in your {@link PublicConfig | config}:

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

- Receives the {@link ChatInstance | chat instance} as a parameter
- Returns a `Promise<HistoryItem[]>`
- Runs once while the chat hydrates
- Can't change after the initial load

The Carbon AI Chat calls {@link ChatInstanceMessaging.insertHistory | insertHistory} with the returned items for you.

## Manually loading history

For advanced cases like switching between conversations, skip {@link PublicConfigMessaging.customLoadHistory | customLoadHistory} and call {@link ChatInstanceMessaging.insertHistory | insertHistory} directly:

```typescript
// Load history manually
await instance.messaging.insertHistory(historyItems);
```

This method:

- Fires {@link BusEventType.HISTORY_BEGIN | HISTORY_BEGIN} and {@link BusEventType.HISTORY_END | HISTORY_END} events
- Can run multiple times
- Doesn't clear existing messages (call {@link ChatInstanceMessaging.clearConversation | clearConversation} first if needed)

## Switching between conversations

To switch between conversations:

```typescript
// Clear the current conversation
await instance.messaging.clearConversation();

// Load the new conversation's history
await instance.messaging.insertHistory(newConversationHistory);
```

{@link ChatInstanceMessaging.clearConversation | clearConversation}:

- Restarts the conversation
- Clears all current assistant messages from the view
- Cancels any outstanding messages
- Doesn't start a new hydration process

## History loading indicators

With {@link PublicConfigMessaging.customLoadHistory | customLoadHistory}, the Carbon AI Chat shows a fullscreen loading indicator during hydration. You don't need to control the loading state yourself.

But if you call {@link ChatInstanceMessaging.clearConversation | clearConversation} or {@link ChatInstanceMessaging.insertHistory | insertHistory} yourself, you may want to show a loading indicator while you fetch data. Switching conversations is one example:

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

{@link ChatInstance.updateIsChatLoadingCounter | updateIsChatLoadingCounter} controls the fullscreen hydration loading state. The indicator shows when the internal counter is above zero. Always pair "increase" with "decrease" so the counter resets.

## The history panel

The sections above load history into the current conversation. The history panel is the UI for browsing past conversations and switching between them. You enable it through configuration and render its contents yourself through a slot.

### Enabling the panel

Turn the panel on with {@link HistoryConfig | history config} in your {@link PublicConfig | config}:

```ts
const config = {
  history: {
    isOn: true, // Enables the history feature and renders the panel slot.
    showMobileMenu: true, // Show the "New chat" / "View chats" header menu on small screens. Default true.
    startClosed: false, // Start open on desktop, closed on mobile. Default false.
  },
};
```

- {@link HistoryConfig.isOn | isOn} enables the feature and renders the panel slot. On its own, it doesn't control panel visibility at the mobile breakpoint.
- {@link HistoryConfig.showMobileMenu | showMobileMenu} (default `true`) shows the built-in "New chat" and "View chats" options. They appear in the header on small screens. Set it to `false` when you provide your own controls.
- {@link HistoryConfig.startClosed | startClosed} (default `false`) starts the panel open on desktop and closed on mobile. It resets to that default when the viewport crosses the breakpoint. Set it to `true` to start closed in both modes. This also keeps the user's open or closed choice across breakpoint changes. That helps when you drive the panel from code.

### Rendering your panel content

The panel body is a slot. Render your own conversation list into the {@link WriteableElementName.HISTORY_PANEL_ELEMENT | historyPanelElement} slot (`"historyPanelElement"`). With a web component, slot your content into the host element:

```html
<cds-aichat-custom-element>
  <div slot="historyPanelElement">
    <!-- Your conversation list goes here. -->
  </div>
</cds-aichat-custom-element>
```

See [Slots](./WriteableElements.md) for how slots work across frameworks. The [chat-history-fullscreen example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/chat-history-fullscreen) builds a complete panel with pinning, search, rename, and delete. It uses the `cds-aichat-history-*` components from the separate `@carbon/ai-chat-components` package.

### Loading a conversation on selection

When a user picks a conversation in your panel, load it. Use the same steps as [Switching between conversations](#switching-between-conversations). Clear the current view, then insert the selected conversation's history.

```ts
async function selectConversation(historyItems) {
  await instance.messaging.clearConversation();
  await instance.messaging.insertHistory(historyItems);
}
```

Your slotted panel lives outside the chat. So it needs a way to reach your loader. The example bridges the two with an app-defined `CustomEvent` (`history-panel-load-chat`). The slotted component dispatches it, and the host handles it. This is one pattern, not a required API. Any mechanism that calls `clearConversation()` and `insertHistory()` works.

### Controlling the panel programmatically

Open and close the panel through {@link CustomPanels | custom panels}:

```ts
import { PanelType } from "@carbon/ai-chat";

instance.customPanels.getPanel(PanelType.HISTORY)?.open();
instance.customPanels.getPanel(PanelType.HISTORY)?.close();
```

Don't toggle {@link HistoryConfig.isOn | isOn} at runtime to show or hide the panel. Use `open()` and `close()` instead.

To read the panel's current state, use {@link ChatInstance.getState | getState}. This helps when you build a toggle or adapt to mobile. `customPanels.history` is a {@link PublicHistoryPanelState | history panel state} with `isOpen` and `isMobile`. The panel instance itself doesn't expose an `isOpen` property.

```ts
const { isOpen, isMobile } = instance.getState().customPanels.history;
```

To react to changes, subscribe to {@link BusEventType.STATE_CHANGE | STATE_CHANGE} and compare the previous and new state:

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

- [history example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/history) — a complete, runnable app.
- [chat-history-fullscreen example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/chat-history-fullscreen) — a fullscreen web-component layout with a custom history panel.
- [Slots](./WriteableElements.md) — render your own content into the history panel slot.
- [Message format](./MessageFormat.md) — the request/response shapes history items wrap.
- [Session state persistence](./StatePersistence.md) — own where the chat stores its session and UI state (views, disclaimer, human-agent connection), apart from conversation messages.
- [Adding messages (legacy)](./AddMessageChunk.md) — getting live responses onscreen.
- [Adding messages (experimental)](./UpsertMessage.md) — revising a message after it renders.
