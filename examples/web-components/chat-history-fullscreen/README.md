# Chat History (Fullscreen Layout)

Fullscreen chat driven by `<cds-aichat-custom-element>` that exposes a custom history panel slot backed by `customLoadHistory`.

## What this example shows

- Mounting `<cds-aichat-custom-element>` at 100vw/100vh as a fullscreen shell with `layout.showFrame: false` and `openChatByDefault: true`.
- Enabling the built-in history feature with `history.isOn: true`.
- Supplying `customLoadHistory` alongside `customSendMessage` in `messaging`.
- Rendering a custom history panel into the `historyPanelElement` writeable-element slot via `<history-writeable-element-example>`.
- Reacting to `history-panel-load-chat` events on the host element to `clearConversation()` and `insertHistory()`.
- Tracking `customPanels.history.isMobile` through the `STATE_CHANGE` bus event to adapt the slot UI.

## When to use this pattern

- You want a fullscreen chat surface (not a floating widget) with app-owned history navigation.
- You need to control the outer frame/layout yourself via the `<cds-aichat-custom-element>` host.

## APIs and props demonstrated

| Symbol                                 | Kind           | Role in this example                                      |
| -------------------------------------- | -------------- | --------------------------------------------------------- |
| `<cds-aichat-custom-element>`          | custom element | Hosts the chat UI at the size of its host container.      |
| `config.history.isOn`                  | property       | Enables the built-in history panel.                       |
| `config.layout.showFrame`              | property       | Removes the default frame for fullscreen presentation.    |
| `config.openChatByDefault`             | property       | Opens the main window on mount.                           |
| `messaging.customSendMessage`          | property       | Mock backend for outbound messages.                       |
| `messaging.customLoadHistory`          | property       | Returns stored `HistoryItem[]` for a named conversation.  |
| `onBeforeRender`                       | property       | Captures the `ChatInstance` and subscribes to bus events. |
| `BusEventType.USER_DEFINED_RESPONSE`   | event          | Populates a slot map for dynamic Lit rendering.           |
| `BusEventType.STATE_CHANGE`            | event          | Tracks `customPanels.history.isMobile`.                   |
| `instance.messaging.clearConversation` | method         | Resets the current conversation before inserting history. |
| `instance.messaging.insertHistory`     | method         | Rehydrates the chat with loaded history.                  |
| `historyPanelElement`                  | slot           | Writeable-element slot hosting the custom history panel.  |
| `history-panel-load-chat`              | custom event   | Listened for on the host element to drive the loader.     |

## Chat history configuration

### Default setup

The simplest way to enable chat history is to set `history.isOn: true`:

```javascript
const config = {
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

### Setting up chat history with external controls

#### Basic configuration

To enable chat history with external controls, configure these key properties:

```javascript
const config = {
  history: {
    isOn: true, // Enables history feature and renders slots
    showMobileMenu: false, // Hide mobile menu if using external controls
    startClosed: true, // Optional: control initial state and preserve state across resizes
  },
};
```

#### Understanding history configuration properties

##### `history.isOn`

- **Purpose**: Enables the history feature and renders the history panel slots
- **Does NOT control**: Panel visibility in mobile breakpoints
- **Use when**: You want to enable the history feature

##### `history.showMobileMenu`

- **Purpose**: Controls whether mobile menu options (New chat, View chats) appear in the header
- **Default**: `true`
- **Set to `false` when**: You're implementing external controls (like a custom button) to toggle history
- **Important**: If you're using external actions to control history visibility, set this to `false` to prevent duplicate controls

##### `history.startClosed`

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

#### Controlling history panel visibility

**❌ Incorrect approach** - Don't toggle `history.isOn`:

```javascript
// This will cause issues - don't do this!
config.history.isOn = !config.history.isOn;
```

**✅ Correct approach** - Use the panel instance methods:

```javascript
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

#### Complete example with external control

See [`history-writeable-element-example.ts`](../../../demo/src/web-components/history-writeable-element-example.ts) for a full implementation. Key patterns:

```javascript
// 1. Configure history in config object
const config = {
  history: {
    isOn: true,
    showMobileMenu: false, // Hide built-in mobile menu
    startClosed: true, // Start closed, preserve state
  },
};

// 2. Implement close handler in your custom history component
_handleHistoryClose = () => {
  if (this.instance?.customPanels) {
    this.instance.customPanels.getPanel(PanelType.HISTORY)?.close();
  }
};
```

#### When to use `startClosed: true`

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

npm run start --workspace=@carbon/ai-chat-examples-web-components-chat-history-fullscreen
```

See [../README.md](../README.md) for the full setup walkthrough.
