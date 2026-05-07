# Chat History (Fullscreen)

`ChatCustomElement` configured as a full-screen host with the history feature enabled and a custom `historyPanelElement` for browsing conversations.

## What this example shows

- Hosting the chat in a full-screen `ChatCustomElement` with `layout.showFrame: false` and a max-width custom property.
- Enabling the built-in history panel via `history.isOn: true`.
- Reacting to `STATE_CHANGE` events to track `customPanels.history.isMobile` for responsive history UI.
- Rendering a custom history list into the `historyPanelElement` writeable element.
- Swapping conversations using `instance.messaging.clearConversation()` and `instance.messaging.insertHistory()`.

## When to use this pattern

- You want a full-screen chat experience (not a floating widget) with history browsing.
- You need a reference for responsive custom history panel UI.
- You need to host the chat inside your own element while keeping built-in history.

## APIs and props demonstrated

| Symbol                                        | Package / kind              | Role in this example                                  |
| --------------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `ChatCustomElement`                           | `@carbon/ai-chat` component | Mounts the chat into a host element you style.        |
| `PublicConfig`                                | `@carbon/ai-chat` type      | Types the config passed to `ChatCustomElement`.       |
| `ChatInstance`                                | `@carbon/ai-chat` type      | Captured in `onBeforeRender`.                         |
| `BusEventType`                                | `@carbon/ai-chat` enum      | Subscribes to `STATE_CHANGE`.                         |
| `history.isOn`                                | config prop                 | Turns on the history panel.                           |
| `layout.showFrame`                            | config prop                 | Disables the chat frame so it fills the host.         |
| `layout.customProperties`                     | config prop                 | Sets `messages-max-width` for the full-screen layout. |
| `openChatByDefault`                           | config prop                 | Opens the chat automatically on mount.                |
| `messaging.customSendMessage`                 | config prop                 | Mock backend.                                         |
| `messaging.customLoadHistory`                 | config prop                 | Mock history loader.                                  |
| `className`                                   | component prop              | Host class name applied to the custom element.        |
| `onBeforeRender`                              | component prop              | Captures the instance and subscribes to state.        |
| `renderUserDefinedResponse`                   | component prop              | Renders user-defined response content.                |
| `renderWriteableElements.historyPanelElement` | component prop              | React node rendered into the history panel slot.      |
| `instance.getState`                           | instance method             | Reads `customPanels.history.isMobile`.                |
| `instance.messaging.clearConversation`        | instance method             | Clears the conversation before insertion.             |
| `instance.messaging.insertHistory`            | instance method             | Inserts the loaded history.                           |

## Chat history configuration

### Default setup

The simplest way to enable chat history is to set `history.isOn: true`:

```typescript
const config: PublicConfig = {
  history: {
    isOn: true,
  },
};
```

With this default configuration:

- **Desktop**: History panel starts open on the left side
- **Mobile**: History panel starts closed; users access it via the mobile menu in the header
- **Mobile menu**: "New chat" and "View chats" options appear in the header on small screens
- **State behavior**: Resizing between desktop and mobile resets to the default state for each mode

This is the recommended setup if you want the standard chat history experience without custom controls.

## Setting up chat history with external controls

### configuration

To enable chat history with an external control, configure these key properties:

```typescript
const config: PublicConfig = {
  history: {
    isOn: true, // Enables history feature and renders slots
    showMobileMenu: false, // Hide mobile menu if using external controls
    startClosed: true, // Optional: control initial state and preserve state across resizes
  },
};
```

### Understanding history configuration properties

#### `history.isOn`

- **Purpose**: Enables the history feature and renders the history panel slots
- **Does NOT control**: Panel visibility in mobile breakpoints
- **Use when**: You want to enable the history feature

#### `history.showMobileMenu`

- **Purpose**: Controls whether mobile menu options (New chat, View chats) appear in the header
- **Default**: `true`
- **Set to `false` when**: You're implementing external controls (like a custom button) to toggle history
- **Important**: If you're using external actions to control history visibility, set this to `false` to prevent duplicate controls

#### `history.startClosed`

- **Purpose**: Controls initial state and state preservation behavior
- **Default**: `false`
- **When `false` (default)**:
  - Desktop: history starts open
  - Mobile: history starts closed
  - Resizing between modes resets to default state
- **When `true`**:
  - Both desktop and mobile start closed
  - User's open/closed state is preserved when resizing between desktop and mobile
  - Enables reliable external control via instance methods

### Controlling history panel visibility

**❌ Incorrect approach** - Don't toggle `history.isOn`:

```typescript
// This will cause issues - don't do this!
config.history.isOn = !config.history.isOn;
```

**✅ Correct approach** - Use the panel instance methods:

```typescript
import { PanelType } from "@carbon/ai-chat";

// To close the history panel
instance.customPanels.getPanel(PanelType.HISTORY)?.close();

// To open the history panel
instance.customPanels.getPanel(PanelType.HISTORY)?.open();

// To toggle the history panel
const historyPanel = instance.customPanels.getPanel(PanelType.HISTORY);
if (historyPanel?.isOpen) {
  historyPanel.close();
} else {
  historyPanel?.open();
}
```

### Complete example with external control

See [`ChatHistoryExample.tsx`](../chat-history-fullscreen/src/ChatHistoryExample.tsx) for a full implementation. Key patterns:

````typescript
// 1. Configure history in PublicConfig
const config: PublicConfig = {
  history: {
    isOn: true,
    showMobileMenu: false,  // Hide built-in mobile menu
    startClosed: true,      // Start closed, preserve state
  },
};

// 2. Implement close handler in your custom history component
const handleHistoryClose = useCallback(() => {
  if (instance?.customPanels) {
    instance.customPanels.getPanel(PanelType.HISTORY)?.close();
  }
}, [instance]);

### When to use `startClosed: true`

Use `startClosed: true` when:

- You want consistent initial state across desktop and mobile
- You're implementing external controls (buttons, menu items) to open/close history
- You want the user's open/closed preference to persist when they resize their browser
- You need predictable behavior for programmatic control

Use the default (`false`) when:

- You want the standard behavior (open on desktop, closed on mobile)
- You don't need state preservation across viewport changes

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-chat-history-fullscreen
````

See [../README.md](../README.md) for the full setup walkthrough.
