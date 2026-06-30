# Web component examples

This folder contains examples for specific functionality using web components with Lit.

## Run Examples from the Monorepo Root

Install dependencies once from the repository root:

```bash
npm install
```

Then build the required packages (needed once after install, and again after any local changes to `packages/`):

```bash
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat
```

Then start any web components example directly from the root:

```bash
npm run start --workspace=<workspace-name>
```

## Examples

<!-- verify:examples-index:start -->

### [Basic / Custom element fullscreen](./basic-custom-element-fullscreen/README.md)

Fullscreen chat driven by `<cds-aichat-custom-element>`, letting the host element control size and frame instead of the built-in floating container. This is the canonical baseline for non-float Lit examples.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-basic-custom-element-fullscreen`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                        | Kind           | Role in this example                                           |
| ----------------------------- | -------------- | -------------------------------------------------------------- |
| `<cds-aichat-custom-element>` | custom element | Hosts the chat UI at the size of its CSS box.                  |
| `messaging.customSendMessage` | property       | Mock backend that echoes user input.                           |
| `layout.showFrame`            | property       | Disables the built-in frame.                                   |
| `layout.customProperties`     | property       | Overrides internal CSS variables (e.g., `messages-max-width`). |
| `openChatByDefault`           | property       | Opens the main window on mount.                                |

</details>

### [Basic / Custom element sidebar](./basic-custom-element-sidebar/README.md)

Docked-sidebar chat driven by `<cds-aichat-custom-element>` that hosts the chat as a 360px side panel using the shipped `cds-aichat-sidebar` layout classes, with a host header bar and an open/close toggle.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-basic-custom-element-sidebar`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                        | Kind            | Role in this example                                                      |
| --------------------------------------------- | --------------- | ------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`                 | custom element  | Hosts the chat UI inside a host element styled as a sidebar.              |
| `onBeforeRender`                              | property        | Captures the `ChatInstance` and subscribes to the view-change bus events. |
| `BusEventType.VIEW_CHANGE`                    | bus event       | Reports the resting open/closed view state to update the host class.      |
| `BusEventType.VIEW_PRE_CHANGE`                | bus event       | Delays the view change so the slide-out animation can finish first.       |
| `ChatInstance.changeView`                     | instance method | Opens or closes the chat from the header toggle button.                   |
| `ViewType`                                    | enum            | Selects `MAIN_WINDOW` or `LAUNCHER` when toggling the view.               |
| `layout.corners`                              | property        | Squares the chat corners to fit the sidebar chrome.                       |
| `openChatByDefault`                           | property        | Opens the chat on mount.                                                  |
| `messaging.customSendMessage`                 | property        | Mock backend that echoes user input.                                      |
| `@carbon/ai-chat/css/chat-sidebar-layout.css` | stylesheet      | Provides the `cds-aichat-sidebar*` layout classes.                        |

</details>

### [Basic / Custom element sidebar (narrow)](./basic-custom-element-sidebar-narrow/README.md)

Docked-sidebar chat driven by `<cds-aichat-custom-element>` narrowed to a 320px side panel — below the 360px default — so the chat renders in its compact responsive layout.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-basic-custom-element-sidebar-narrow`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                        | Kind                | Role in this example                                                      |
| --------------------------------------------- | ------------------- | ------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`                 | custom element      | Hosts the chat UI inside a host element styled as a sidebar.              |
| `--cds-aichat-sidebar-width`                  | CSS custom property | Overridden to `320px` to narrow the panel below the `360px` default.      |
| `onBeforeRender`                              | property            | Captures the `ChatInstance` and subscribes to the view-change bus events. |
| `BusEventType.VIEW_CHANGE`                    | bus event           | Reports the resting open/closed view state to update the host class.      |
| `BusEventType.VIEW_PRE_CHANGE`                | bus event           | Delays the view change so the slide-out animation can finish first.       |
| `ChatInstance.changeView`                     | instance method     | Opens or closes the chat from the header toggle button.                   |
| `ViewType`                                    | enum                | Selects `MAIN_WINDOW` or `LAUNCHER` when toggling the view.               |
| `layout.corners`                              | property            | Squares the chat corners to fit the sidebar chrome.                       |
| `openChatByDefault`                           | property            | Opens the chat on mount.                                                  |
| `messaging.customSendMessage`                 | property            | Mock backend that echoes user input.                                      |
| `@carbon/ai-chat/css/chat-sidebar-layout.css` | stylesheet          | Provides the `cds-aichat-sidebar*` layout classes.                        |

</details>

### [Basic / Float](./basic-float/README.md)

Minimal Lit example of the float / launcher layout: mounts `<cds-aichat-container>` with a mock streaming `customSendMessage` backend. This is the canonical reference for the float chat shape.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-basic-float`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                               | Kind           | Role in this example                                      |
| ------------------------------------ | -------------- | --------------------------------------------------------- |
| `<cds-aichat-container>`             | custom element | Mounts the chat UI.                                       |
| `messaging.customSendMessage`        | property       | Mock backend that streams a response.                     |
| `instance.messaging.addMessage`      | method         | Emits non-streaming responses (the welcome message).      |
| `instance.messaging.addMessageChunk` | method         | Streams partial / complete / final chunks back to the UI. |

</details>

### [Chain of thought](./chain-of-thought/README.md)

Mocks a chain-of-thought tool trace: the assistant ships a complete `chain_of_thought` array on the final response, and the chat renders a drawer where each step's `request`, `response`, and `status` are inspectable.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-chain-of-thought`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                            | Kind           | Role in this example                           |
| ------------------------------------------------- | -------------- | ---------------------------------------------- |
| `<cds-aichat-custom-element>`                     | custom element | Mounts the chat UI.                            |
| `messaging.customSendMessage`                     | property       | Runs the chain-of-thought scenario.            |
| `onBeforeRender`                                  | property       | Captures the `ChatInstance`.                   |
| `ChainOfThoughtStep` / `ChainOfThoughtStepStatus` | types          | Tool-trace payloads + status badge values.     |
| `MessageResponseOptions`                          | type           | `message_options` carrying `chain_of_thought`. |
| `ChatInstance`                                    | type           | Type of the instance handle.                   |
| `PublicConfig`                                    | type           | Types the chat configuration object.           |

</details>

### [Custom element / As float](./custom-element-as-float/README.md)

Replicates the built-in float view by combining `<cds-aichat-custom-element>` with the shipped float/launcher CSS classes and a `<cds-aichat-button>` custom launcher.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-as-float`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                              | Kind           | Role in this example                                               |
| --------------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| `<cds-aichat-custom-element>`                       | custom element | Hosts the chat; animated through float-layout CSS classes.         |
| `<cds-aichat-button>`                               | custom element | Custom launcher button.                                            |
| `@carbon/ai-chat/css/chat-float-layout.css`         | stylesheet     | Supplies `cds-aichat-float--{open,opening,close,closing}` classes. |
| `@carbon/ai-chat/css/chat-launcher-layout.css`      | stylesheet     | Supplies `cds-aichat-launcher` / `--hidden` classes.               |
| `messaging.customSendMessage`                       | property       | Mock backend that echoes user input.                               |
| `launcher.isOn`                                     | property       | Disabled (`false`) so the custom button is the only launcher.      |
| `onAfterRender`                                     | property       | Captures `ChatInstance` and marks the chat ready.                  |
| `onViewChange`                                      | property       | Suppresses default hide behavior and drives phase transitions.     |
| `instance.changeView(ViewType.MAIN_WINDOW)`         | method         | Opens the chat on launcher click.                                  |
| `animationend`                                      | DOM event      | Advances the phase machine from opening→open / closing→closed.     |
| `has-icon-only`, `icon-description`, `kind`, `size` | attributes     | Configure the `<cds-aichat-button>`.                               |

</details>

### [Custom element / As float (lazy load)](./custom-element-as-float-lazy-load/README.md)

Floating-widget replica of `<cds-aichat-custom-element>` whose bundle is dynamically imported on first launcher click, with `<cds-aichat-shell>` acting as a crossfade fallback.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-as-float-lazy-load`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                              | Kind           | Role in this example                                           |
| --------------------------------------------------- | -------------- | -------------------------------------------------------------- |
| `<cds-aichat-custom-element>`                       | custom element | Lazy-loaded chat host, animated via float-layout classes.      |
| `<cds-aichat-button>`                               | custom element | Custom launcher button.                                        |
| `<cds-aichat-shell>`                                | custom element | Placeholder skeleton shown during bundle load.                 |
| `readCarbonChatSession()`                           | function       | Reads prior session state to decide whether to auto-open.      |
| `@carbon/ai-chat/css/chat-float-layout.css`         | stylesheet     | Supplies float-layout classes.                                 |
| `@carbon/ai-chat/css/chat-launcher-layout.css`      | stylesheet     | Supplies launcher classes.                                     |
| `messaging.customSendMessage`                       | property       | Mock backend.                                                  |
| `launcher.isOn`                                     | property       | Disabled so the custom button is the only launcher.            |
| `onAfterRender`                                     | property       | Fires when chat is fully initialized; drops the shell overlay. |
| `onViewChange`                                      | property       | Drives phase transitions on open/close.                        |
| `instance.changeView(ViewType.MAIN_WINDOW)`         | method         | Forces the chat into the main window after mount.              |
| `animationend`                                      | DOM event      | Advances the phase machine.                                    |
| `has-icon-only`, `icon-description`, `kind`, `size` | attributes     | Configure `<cds-aichat-button>`.                               |
| `show-frame`, `ai-enabled`, `corner-all`            | attributes     | Configure `<cds-aichat-shell>`.                                |

</details>

### [Custom element / Lazy load](./custom-element-lazy-load/README.md)

Dynamically imports the `cds-aichat-custom-element` bundle and uses `<cds-aichat-shell>` as a crossfade fallback until the chat is ready.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-lazy-load`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                        | Kind           | Role in this example                                    |
| ----------------------------- | -------------- | ------------------------------------------------------- |
| `<cds-aichat-custom-element>` | custom element | Lazy-loaded chat host.                                  |
| `<cds-aichat-shell>`          | custom element | Skeleton placeholder shown while the bundle loads.      |
| `messaging.customSendMessage` | property       | Mock backend.                                           |
| `layout.showFrame`            | property       | Disables the built-in frame.                            |
| `openChatByDefault`           | property       | Opens the main window on mount.                         |
| `launcher.isOn`               | property       | Disabled to keep the surface fullscreen.                |
| `header.hideMinimizeButton`   | property       | Hides the minimize control for the fullscreen surface.  |
| `onAfterRender`               | property       | Fires when chat is ready so the shell can be unmounted. |
| `ai-enabled`                  | attribute      | Enables AI styling on `<cds-aichat-shell>`.             |

</details>

### [Feedback](./feedback/README.md)

Lit example that subscribes to `BusEventType.FEEDBACK` and forwards `FeedbackInteractionType.SUBMITTED` events to the host page.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-feedback`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                | Kind                   | Role in this example                                                |
| ------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`         | custom element         | Mounts the chat as a fullscreen surface.                            |
| `PublicConfig.layout.showFrame`       | config prop            | Disables the default frame so the host element fills its container. |
| `PublicConfig.openChatByDefault`      | config prop            | Opens the chat on first paint.                                      |
| `messaging.customSendMessage`         | config prop            | Mock backend that emits a response with `message_item_options`.     |
| `onBeforeRender`                      | property               | Captures the `ChatInstance` and subscribes the feedback handler.    |
| `BusEventType.FEEDBACK`               | `@carbon/ai-chat` enum | Bus event fired when the user interacts with the feedback widget.   |
| `FeedbackInteractionType.SUBMITTED`   | `@carbon/ai-chat` enum | Discriminator for "user clicked submit on the feedback prompt."     |
| `instance.on`                         | instance method        | Subscribes the feedback handler.                                    |
| `message_item_options.feedback.is_on` | server response option | Renders the thumbs-up/thumbs-down widget on a message.              |

</details>

### [History / Float](./history-float/README.md)

Float-layout chat that exposes a custom history panel slot backed by `customLoadHistory`, letting users switch between saved conversations.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-history-float`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                 | Kind           | Role in this example                                             |
| -------------------------------------- | -------------- | ---------------------------------------------------------------- |
| `<cds-aichat-container>`               | custom element | Mounts the chat UI in float layout.                              |
| `config.history.isOn`                  | property       | Enables the built-in history panel.                              |
| `messaging.customSendMessage`          | property       | Mock backend for outbound messages.                              |
| `messaging.customLoadHistory`          | property       | Returns stored `HistoryItem[]` for a named conversation.         |
| `onBeforeRender`                       | property       | Captures the `ChatInstance`.                                     |
| `instance.messaging.clearConversation` | method         | Resets the current conversation before inserting history.        |
| `instance.messaging.insertHistory`     | method         | Rehydrates the chat with loaded history.                         |
| `historyPanelElement`                  | slot           | Slot hosting the custom history panel.                           |
| `history-panel-load-chat`              | custom event   | Dispatched by the slot element when a user picks a conversation. |

</details>

### [History / Fullscreen](./history-fullscreen/README.md)

Fullscreen chat driven by `<cds-aichat-custom-element>` that exposes a custom history panel slot backed by `customLoadHistory`.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-history-fullscreen`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                 | Kind           | Role in this example                                      |
| -------------------------------------- | -------------- | --------------------------------------------------------- |
| `<cds-aichat-custom-element>`          | custom element | Hosts the chat UI at the size of its host container.      |
| `config.history.isOn`                  | property       | Enables the built-in history panel.                       |
| `config.layout.showFrame`              | property       | Removes the default frame for fullscreen presentation.    |
| `config.openChatByDefault`             | property       | Opens the main window on mount.                           |
| `messaging.customSendMessage`          | property       | Mock backend for outbound messages.                       |
| `messaging.customLoadHistory`          | property       | Returns stored `HistoryItem[]` for a named conversation.  |
| `onBeforeRender`                       | property       | Captures the `ChatInstance` and subscribes to bus events. |
| `BusEventType.STATE_CHANGE`            | event          | Tracks `customPanels.history.isMobile`.                   |
| `instance.messaging.clearConversation` | method         | Resets the current conversation before inserting history. |
| `instance.messaging.insertHistory`     | method         | Rehydrates the chat with loaded history.                  |
| `historyPanelElement`                  | slot           | Slot hosting the custom history panel.                    |
| `history-panel-load-chat`              | custom event   | Listened for on the host element to drive the loader.     |

</details>

### [History / Host-driven](./history-host-driven/README.md)

Demonstrates one-shot conversation rehydration: a button clears the active conversation and re-seeds it with a random-length history returned by `customLoadHistory`.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-history-host-driven`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                 | Kind           | Role in this example                                        |
| -------------------------------------- | -------------- | ----------------------------------------------------------- |
| `<cds-aichat-custom-element>`          | custom element | Mounts the chat UI.                                         |
| `messaging.customSendMessage`          | property       | Mock backend for outbound messages.                         |
| `messaging.customLoadHistory`          | property       | Returns a synthetic `HistoryItem[]` of random length.       |
| `onBeforeRender`                       | property       | Captures the `ChatInstance`.                                |
| `instance.messaging.clearConversation` | method         | Resets the current conversation before reinserting history. |
| `instance.messaging.insertHistory`     | method         | Rehydrates the chat with the loaded items.                  |

</details>

### [History / User-defined responses](./history-user-defined-responses/README.md)

Lit example that rehydrates a conversation containing multiple `user_defined` cards via `customLoadHistory` + `insertHistory`, then uses `instance.getState()` and `BusEventType.STATE_CHANGE` to highlight only the most-recent card as active.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-history-user-defined-responses`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                 | Kind                   | Role in this example                                                                     |
| -------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`          | custom element         | Mounts the chat as a fullscreen surface.                                                 |
| `PublicConfig.layout.showFrame`        | config prop            | Disables the default frame so the host element fills its container.                      |
| `PublicConfig.openChatByDefault`       | config prop            | Opens the chat on first paint so the rehydrated cards are immediately visible.           |
| `messaging.customSendMessage`          | property               | Mock backend that emits a new `user_defined` response on the `user_defined` keyword.     |
| `messaging.customLoadHistory`          | property               | Mock history loader that returns three pre-built `user_defined` cards.                   |
| `instance.messaging.clearConversation` | instance method        | Clears the conversation before `insertHistory` so the transcript fully replaces.         |
| `instance.messaging.insertHistory`     | instance method        | Inserts the rehydrated `HistoryItem[]` produced by `customLoadHistory`.                  |
| `renderUserDefinedResponse`            | property               | Callback returning an `HTMLElement` for `user_defined` items.                            |
| `RenderUserDefinedState`               | `@carbon/ai-chat` type | Argument to the render callback — exposes `messageItem` and `fullMessage`.               |
| `BusEventType.STATE_CHANGE`            | `@carbon/ai-chat` enum | Notifies on `activeResponseId` changes, including the change emitted by `insertHistory`. |
| `instance.getState`                    | instance method        | Reads the initial `activeResponseId` before any `STATE_CHANGE` events fire.              |
| `instance.on`                          | instance method        | Subscribes the `STATE_CHANGE` handler.                                                   |
| `MessageResponseTypes.USER_DEFINED`    | `@carbon/ai-chat` enum | Response-type discriminator that routes the message to the render handler.               |
| `MessageInputType.TEXT`                | `@carbon/ai-chat` enum | Marks each fabricated user-request `HistoryItem` as a text input.                        |
| `HistoryItem`                          | `@carbon/ai-chat` type | Wrapper produced by `customLoadHistory` for each rehydrated message.                     |

</details>

### [Human agent](./human-agent/README.md)

Wires a mock service desk into `<cds-aichat-custom-element>` via `serviceDeskFactory`, showing how to hand off from bot to human and how to swap the factory reference when user data changes.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-human-agent`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                         | Kind           | Role in this example                                                         |
| ------------------------------ | -------------- | ---------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`  | custom element | Mounts the chat UI.                                                          |
| `messaging.customSendMessage`  | property       | Mock backend that routes between bot replies and desk handoff.               |
| `serviceDeskFactory`           | property       | Async factory returning a `MockServiceDesk`; rebuilt when user data changes. |
| `ServiceDeskFactoryParameters` | type           | Parameters passed to each factory call.                                      |

</details>

### [Input / Code snippet](./input-code-snippet/README.md)

A custom Tiptap input rule converts triple backticks (` ``` `) in the chat input into an editable `cds-aichat-code-snippet` block. The closing fence is implicit — it's added at send time, never typed. The block grows with content; the input shell's existing scrollbar takes over when it gets tall. Pressing `Escape` exits the block.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-input-code-snippet`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                               | Kind                                 | Role in this example                                                            |
| ------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`        | custom element                       | Mounts the chat UI as a fullscreen surface.                                     |
| `<cds-aichat-code-snippet>`          | `@carbon/ai-chat-components` element | Editable CodeMirror-backed snippet inside the input; read-only in the bubble.   |
| `<cds-aichat-card>`                  | `@carbon/ai-chat-components` element | Frames the editable snippet; the exit hint sits in its `footer` slot.           |
| `PublicConfig`                       | type                                 | Types the config bound to the element's properties.                             |
| `WCRenderUserDefinedInputNode`       | type                                 | Types the `renderUserDefinedInputNode` callback.                                |
| `Extension`                          | `@tiptap/core` type                  | Types the custom Tiptap node registered on the input.                           |
| `renderInLightDom`                   | helper                               | Bridges the snippet web component into the page's light DOM.                    |
| `.renderUserDefinedInputNode`        | property                             | Renders the custom `codeSnippetBlock` node inside the sent user message bubble. |
| `.input` (`input.tiptap.extensions`) | property                             | Registers the host-authored `codeSnippetBlock` Tiptap node on the input.        |
| `.layout` (`layout.showFrame`)       | property                             | Hides the default frame so the chat fills the viewport.                         |
| `.openChatByDefault`                 | property                             | Mounts straight into the conversation, no launcher.                             |
| `.messaging.customSendMessage`       | property                             | Mock backend; confirms whether the outgoing text contained a fenced block.      |
| `Node.create`                        | `@tiptap/core` API                   | Authors the `codeSnippetBlock` block atom node.                                 |
| `InputRule`                          | `@tiptap/core` API                   | Triggers the node swap when the user finishes typing three backticks.           |
| `addKeyboardShortcuts` / keydown     | `@tiptap/core` / DOM                 | Escape exits the block to a new paragraph below.                                |

</details>

### [Input / Custom render](./input-custom-render/README.md)

The chat sits in a docked sidebar while the page body holds a grid of clickable Carbon tiles. Clicking a tile clears the chat input, injects a copy of the tile as a custom Tiptap node, and attaches the tile to the message's structured data; on send the tile is rendered inside the message bubble.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-input-custom-render`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                | Kind                | Role in this example                                                         |
| ------------------------------------- | ------------------- | ---------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`         | custom element      | Mounts the chat UI inside the docked sidebar container.                      |
| `<cds-clickable-tile>` / `<cds-tile>` | custom element      | Carbon tiles — the page grid, and the tile injected into the input / bubble. |
| `PublicConfig`                        | type                | Types the config bound to the element's properties.                          |
| `ChatInstance`                        | type                | Captured in `.onBeforeRender` so the tile handler can drive the input.       |
| `WCRenderUserDefinedInputNode`        | type                | Types the `renderUserDefinedInputNode` callback.                             |
| `Extension`                           | `@tiptap/core` type | Types the custom Tiptap node registered on the input.                        |
| `renderInLightDom`                    | helper              | Bridges the node view's `<cds-tile>` into the page's light DOM.              |
| `.renderUserDefinedInputNode`         | property            | Renders the custom `tileChip` node inside the sent user message bubble.      |
| `.input` (`input.tiptap.extensions`)  | property            | Registers the host-authored `tileChip` Tiptap node on the input.             |
| `instance.input.updateContent`        | method              | Clears the input and injects the clicked tile as a custom node.              |
| `instance.input.updateStructuredData` | method              | Replaces the pending structured data with metadata describing the tile.      |
| `.onBeforeRender`                     | property            | Captures the `ChatInstance` used by the tile-click handler.                  |
| `.layout` (`layout.showFrame`)        | property            | Hides the default frame so the chat fills the sidebar.                       |
| `.openChatByDefault`                  | property            | Mounts straight into the conversation, no launcher.                          |
| `.messaging.customSendMessage`        | property            | Reads `request.input.structured_data` and echoes the submitted tile.         |
| `Node.create`                         | `@tiptap/core` API  | Authors the custom `tileChip` inline atom node.                              |

</details>

### [Input / File upload](./input-file-upload/README.md)

Enables file attachments on `<cds-aichat-custom-element>` with a mock `onFileUpload` handler that simulates a server round-trip and echoes the file metadata back in the assistant response.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-input-file-upload`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                        | Kind           | Role in this example                                                            |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>` | custom element | Mounts the chat UI.                                                             |
| `messaging.customSendMessage` | property       | Mock backend that echoes uploaded-file metadata.                                |
| `upload.is_on`                | property       | Enables the attachment button.                                                  |
| `upload.onFileUpload`         | property       | Mock upload handler returning `StructuredData` with an `ExternalFileReference`. |
| `AbortSignal`                 | API            | Cancels in-flight uploads when a pending file is removed.                       |

</details>

### [Input / Mentions & commands](./input-mentions-and-commands/README.md)

`<cds-aichat-custom-element>` configured with `input.mention` for `@`-picking team members anywhere in the message and `input.command` for `/`-commands constrained to the start of the line.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-input-mentions-and-commands`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                  | Kind           | Role in this example                                                     |
| --------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `<cds-aichat-custom-element>`           | custom element | Mounts the chat UI at the fullscreen baseline.                           |
| `PublicConfig`                          | type           | Types the config bound to the element's properties.                      |
| `ChatInstance`                          | type           | Captured in `onBeforeRender` so `onSelect` can update structured data.   |
| `SuggestionItem`                        | type           | Shape of each entry returned from `items`.                               |
| `.input` (`input.mention`)              | property       | Registers the `@`-mention trigger config on the input.                   |
| `.input` (`input.command`)              | property       | Registers the `/`-command trigger config on the input.                   |
| `mention.trigger` / `command.trigger`   | property       | Character (`@` or `/`) that opens the suggestion list.                   |
| `command.triggerPosition`               | property       | `"start"` constrains commands to the beginning of the line.              |
| `mention.items` / `command.items`       | property       | Async filter (or static list) narrowing items as the user types.         |
| `mention.onSelect` / `command.onSelect` | property       | Hook that runs when the user picks a suggestion.                         |
| `mention.onRemove` / `command.onRemove` | property       | Mirror of `onSelect`, fired when a user deletes a chip from the input.   |
| `.onBeforeRender`                       | property       | Captures the `ChatInstance` ref used in `onSelect` / `onRemove`.         |
| `instance.input.updateStructuredData`   | method         | Adds and removes mention/command picks on the message's structured data. |
| `.layout` (`layout.showFrame`)          | property       | Hides the default frame so the chat fills the host.                      |
| `.openChatByDefault`                    | property       | Mounts straight into the conversation, no launcher.                      |
| `.messaging.customSendMessage`          | property       | Reads `request.input.structured_data` and echoes the picks.              |

</details>

### [Input / Mentions & commands (custom render)](./input-mentions-and-commands-custom-render/README.md)

The Mentions & Commands example with a `renderCustomToken` supplied for mentions: each picked user appears in the input as a `<cds-tag>` wrapped in a `<cds-tooltip>` showing the user's description on hover. Commands keep the default chip rendering.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-input-mentions-and-commands-custom-render`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                  | Kind           | Role in this example                                                     |
| --------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `<cds-aichat-custom-element>`           | custom element | Mounts the chat UI at the fullscreen baseline.                           |
| `<cds-tag>`                             | custom element | Visual chip used inside the custom token renderer.                       |
| `<cds-tooltip>`                         | custom element | Hover affordance wrapping the custom mention chip.                       |
| `PublicConfig`                          | type           | Types the config bound to the element's properties.                      |
| `ChatInstance`                          | type           | Captured in `onBeforeRender` so `onSelect` can update structured data.   |
| `SuggestionItem`                        | type           | Shape of each entry; passed to `renderCustomToken`.                      |
| `.input` (`input.mention`)              | property       | Registers the `@`-mention trigger config on the input.                   |
| `.input` (`input.command`)              | property       | Registers the `/`-command trigger config on the input.                   |
| `mention.renderCustomToken`             | property       | Returns an `HTMLElement` rendered in place of the default mention chip.  |
| `mention.trigger` / `command.trigger`   | property       | Character (`@` or `/`) that opens the suggestion list.                   |
| `command.triggerPosition`               | property       | `"start"` constrains commands to the beginning of the line.              |
| `mention.items` / `command.items`       | property       | Async filter (or static list) narrowing items as the user types.         |
| `mention.onSelect` / `command.onSelect` | property       | Hook that runs when the user picks a suggestion.                         |
| `mention.onRemove` / `command.onRemove` | property       | Mirror of `onSelect`, fired when a user deletes a chip from the input.   |
| `.onBeforeRender`                       | property       | Captures the `ChatInstance` ref used in `onSelect` / `onRemove`.         |
| `instance.input.updateStructuredData`   | method         | Adds and removes mention/command picks on the message's structured data. |
| `.layout` (`layout.showFrame`)          | property       | Hides the default frame so the chat fills the host.                      |
| `.openChatByDefault`                    | property       | Mounts straight into the conversation, no launcher.                      |
| `.messaging.customSendMessage`          | property       | Reads `request.input.structured_data` and echoes the picks.              |

</details>

### [Input / Typeahead](./input-typeahead/README.md)

`<cds-aichat-custom-element>` configured with `input.autocomplete` so a curated list filters as the user types and renders the matches in a dropdown above the input.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-input-typeahead`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                          | Kind           | Role in this example                                  |
| ------------------------------- | -------------- | ----------------------------------------------------- |
| `<cds-aichat-custom-element>`   | custom element | Mounts the chat UI at the fullscreen baseline.        |
| `PublicConfig`                  | type           | Types the config bound to the element's properties.   |
| `SuggestionItem`                | type           | Shape of each entry returned from `items`.            |
| `.input` (`input.autocomplete`) | property       | Registers the typeahead behavior on the input.        |
| `autocomplete.items`            | property       | Async filter that returns matching `SuggestionItem`s. |
| `autocomplete.debounceMs`       | property       | Coalesces keystrokes before calling `items`.          |
| `.layout` (`layout.showFrame`)  | property       | Hides the default frame so the chat fills the host.   |
| `.openChatByDefault`            | property       | Mounts straight into the conversation, no launcher.   |
| `.messaging.customSendMessage`  | property       | Mock backend echoing the user's message.              |

</details>

### [Input / Typeahead (custom list)](./input-typeahead-custom/README.md)

`<cds-aichat-custom-element>` with `input.autocomplete` whose dropdown is replaced by a fully custom Lit element supplied through `renderCustomList`.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-input-typeahead-custom`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                          | Kind           | Role in this example                                                            |
| ------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`   | custom element | Mounts the chat UI at the fullscreen baseline.                                  |
| `<custom-suggestion-list>`      | custom element | Lit element returned from `renderCustomList`.                                   |
| `PublicConfig`                  | type           | Types the config bound to the element's properties.                             |
| `SuggestionItem`                | type           | Shape of each entry returned from `items` and surfaced to `onSelect`.           |
| `CustomListProps`               | type           | Props (`items`, `query`, `onSelect`, `onDismiss`) given to the custom renderer. |
| `.input` (`input.autocomplete`) | property       | Registers the typeahead behavior on the input.                                  |
| `autocomplete.renderCustomList` | property       | Returns an `HTMLElement` that replaces the default dropdown.                    |
| `autocomplete.items`            | property       | Async filter providing entries to the custom list.                              |
| `autocomplete.debounceMs`       | property       | Coalesces keystrokes before calling `items`.                                    |
| `.layout` (`layout.showFrame`)  | property       | Hides the default frame so the chat fills the host.                             |
| `.openChatByDefault`            | property       | Mounts straight into the conversation, no launcher.                             |
| `.messaging.customSendMessage`  | property       | Mock backend echoing the user's message.                                        |

</details>

### [Integrations / watsonx.ai](./integrations-watsonx/README.md)

Connects the chat to IBM watsonx.ai via a local Express proxy that streams tokens back with `@microsoft/fetch-event-source`.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-integrations-watsonx`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                        | Kind           | Role in this example                      |
| ----------------------------- | -------------- | ----------------------------------------- |
| `<cds-aichat-custom-element>` | custom element | Mounts the chat UI.                       |
| `messaging.customSendMessage` | property       | Streams tokens from the watsonx.ai proxy. |
| `PublicConfig`                | type           | Types the chat configuration object.      |

</details>

### [Markdown override (code snippet + table)](./markdown-override/README.md)

`<cds-aichat-custom-element>` mounted directly in page light DOM and configured with `markdown.customRenderers` to replace two element renderers: `codeBlock` (every fenced code block renders through a `cds-aichat-code-snippet` with `detectLanguage` set to `false`) and `table` (every markdown table renders through a Carbon `cds-table` from `@carbon/web-components`).

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-markdown-override`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                               | Kind                          | Role in this example                                                       |
| ------------------------------------ | ----------------------------- | -------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`        | custom element                | Hosts the chat UI at the size of its CSS box.                              |
| `.markdown`                          | property (`attribute: false`) | Carries the `customRenderers` object to the chat's renderer.               |
| `WCMarkdown`                         | `@carbon/ai-chat` type        | Shape of the value bound to `.markdown`.                                   |
| `WCCustomMarkdownRenderers`          | `@carbon/ai-chat` type        | Shape of `markdown.customRenderers`.                                       |
| `markdown.customRenderers.codeBlock` | config field                  | Replaces the default fenced-code renderer.                                 |
| `markdown.customRenderers.table`     | config field                  | Replaces the default table renderer with a Carbon `cds-table`.             |
| `MarkdownRendererCodeBlockArgs`      | `@carbon/ai-chat` type        | Argument shape passed to the callback (`language`, `code`, `slotName`, …). |
| `MarkdownRendererTableArgs`          | `@carbon/ai-chat` type        | Argument shape for the table callback (`headers`, `rows`, `slotName`, …).  |
| `<cds-aichat-card>` (`is-flush`)     | custom element                | Wraps the snippet to match the default Carbon shell.                       |
| `<cds-aichat-code-snippet>`          | custom element                | Renders the code; receives `detectLanguage`, `language`, `highlight`.      |
| `<cds-table>` and friends            | `@carbon/web-components`      | The data table the `table` override renders with Lit.                      |
| `messaging.customSendMessage`        | property                      | Mock backend that emits two contrasting fences and a table in every reply. |

</details>

### [Markdown plugin (KaTeX)](./markdown-plugin/README.md)

`<cds-aichat-custom-element>` mounted directly in page light DOM and configured with `.markdown = { markdownItPlugins: [markdownItKatex] }` so `@vscode/markdown-it-katex` extends the renderer with LaTeX math tokens.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-markdown-plugin`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                        | Kind                          | Role in this example                                               |
| --------------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `<cds-aichat-custom-element>`                 | custom element                | Hosts the chat UI at the size of its CSS box.                      |
| `.markdown`                                   | property (`attribute: false`) | Carries the `markdownItPlugins` array to the chat's renderer.      |
| `markdown.markdownItPlugins`                  | config field                  | Registers `@vscode/markdown-it-katex` with the chat's renderer.    |
| `WCMarkdown`                                  | `@carbon/ai-chat` type        | Shape of the value bound to `.markdown`.                           |
| `.messaging`, `.layout`, `.openChatByDefault` | properties                    | Standard fullscreen baseline (`showFrame: false`, opens on mount). |
| `messaging.customSendMessage`                 | property                      | Mock backend that emits markdown with KaTeX math.                  |

</details>

### [Custom message footer](./messages-custom-footer/README.md)

Render your own content beneath an assistant message — here a copy button — with the `renderCustomMessageFooter` callback.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-messages-custom-footer`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                    | Kind           | Role in this example                              |
| ----------------------------------------- | -------------- | ------------------------------------------------- |
| `<cds-aichat-custom-element>`             | custom element | Mounts the chat into a host element you style.    |
| `renderCustomMessageFooter`               | property       | Returns the footer element for each footer slot.  |
| `RenderCustomMessageFooterState`          | type           | Shape passed to the footer callback.              |
| `messaging.customSendMessage`             | config prop    | Mock backend that attaches the footer slot.       |
| `message_item_options.custom_footer_slot` | message field  | Enables the footer and carries `additional_data`. |
| `<custom-footer-example>`                 | custom element | Footer UI rendered into the slot.                 |
| `layout.showFrame` / `openChatByDefault`  | config props   | Full-screen baseline.                             |

</details>

### [Reasoning steps](./reasoning-steps/README.md)

Mocks two reasoning-streaming patterns — discrete `ReasoningStep` items (the default behavior) and a single long-form `reasoning.content` trace — picked from a dropdown on the welcome message.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-reasoning-steps`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                          | Kind           | Role in this example                                    |
| ------------------------------- | -------------- | ------------------------------------------------------- |
| `<cds-aichat-custom-element>`   | custom element | Mounts the chat UI.                                     |
| `messaging.customSendMessage`   | property       | Dispatches to the two reasoning scenario runners.       |
| `onBeforeRender`                | property       | Captures the `ChatInstance`.                            |
| `MessageResponseTypes.OPTION`   | enum value     | Welcome-message scenario picker.                        |
| `OptionItemPreference.DROPDOWN` | enum value     | Renders scenario picker as a dropdown.                  |
| `ReasoningStep`                 | type           | Individual reasoning step payload.                      |
| `MessageResponseOptions`        | type           | `message_options` carrying `reasoning.{steps,content}`. |
| `ChatInstance`                  | type           | Type of the instance handle.                            |
| `PublicConfig`                  | type           | Types the chat configuration object.                    |

</details>

### [Reasoning steps (controlled)](./reasoning-steps-controlled/README.md)

Mocks a controlled reasoning-step flow: the parent reasoning panel stays collapsed via `reasoning.open_state: CLOSE`, every individual step is pre-expanded, and a custom "Thinking..." indicator driven by `instance.updateIsMessageLoadingCounter` replaces the default reasoning UI.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-reasoning-steps-controlled`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                     | Kind           | Role in this example                                       |
| ------------------------------------------ | -------------- | ---------------------------------------------------------- |
| `<cds-aichat-custom-element>`              | custom element | Mounts the chat UI.                                        |
| `messaging.customSendMessage`              | property       | Runs the controlled reasoning scenario.                    |
| `onBeforeRender`                           | property       | Captures the `ChatInstance`.                               |
| `ReasoningStep` / `ReasoningStepOpenState` | types          | Reasoning payloads + controlled open-state values.         |
| `MessageResponseOptions`                   | type           | `message_options` carrying `reasoning.{steps,open_state}`. |
| `instance.updateIsMessageLoadingCounter`   | API            | Custom loading label that replaces the default UI.         |
| `ChatInstance`                             | type           | Type of the instance handle.                               |
| `PublicConfig`                             | type           | Types the chat configuration object.                       |

</details>

### [Reasoning with Streaming Generic Items (web components)](./reasoning-with-streaming-generic-items/README.md)

Each reasoning step's `content` is a `GenericItem[]` — a `TextItem` whose `text` field is streamed token by token, followed by a `user_defined` summary card appended when the step finishes. The host app slots the summary card into the `cds-aichat-container` via the `USER_DEFINED_RESPONSE` bus event.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-reasoning-with-streaming-generic-items`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                                               | Package / kind            | Role in this example                                             |
| -------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `cds-aichat-container`                                               | `@carbon/ai-chat` element | Mounts the chat UI.                                              |
| `PublicConfig`                                                       | `@carbon/ai-chat` type    | Config shape.                                                    |
| `BusEventType.USER_DEFINED_RESPONSE` / `BusEventUserDefinedResponse` | `@carbon/ai-chat`         | Event the chat fires when a `user_defined` item needs a slot.    |
| `ReasoningStep` with `content: GenericItem[]`                        | `@carbon/ai-chat` type    | Per-step array of inline response items.                         |
| `MessageResponseTypes.TEXT` / `MessageResponseTypes.USER_DEFINED`    | `@carbon/ai-chat` enum    | Item kinds composed into the step's content array.               |
| `UserDefinedItem`                                                    | `@carbon/ai-chat` type    | The appended summary card payload.                               |
| `MessageResponseOptions` / `StreamChunk`                             | `@carbon/ai-chat` types   | Chunk shape used to re-push updated `reasoning.steps` per token. |
| `instance.messaging.addMessage` / `addMessageChunk` / `instance.on`  | `ChatInstance` API        | Emit welcome + streamed chunks; subscribe to slot events.        |
| `CustomSendMessageOptions.signal`                                    | `@carbon/ai-chat`         | Abort signal for cancellation.                                   |

</details>

### [Upsert message user defined](./upsert-message-user-defined/README.md)

Progressively updates a `user_defined` steps-card widget inside a single assistant message using `ChatInstance.messaging.upsertMessage`, and pops a Carbon toast (with a "View message" action wired to `instance.scrollToMessage`) when the run completes.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-upsert-message-user-defined`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                                                       | Kind                    | Role in this example                                                              |
| ---------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`                                                | custom element          | Mounts the chat into a host element you style.                                    |
| `.messaging` / `.layout` / `.openChatByDefault`                              | properties              | Top-level `PublicConfig` fields applied to the custom element.                    |
| `.onBeforeRender`                                                            | property (callback)     | Captures the `ChatInstance` for the toast action.                                 |
| `.renderUserDefinedResponse`                                                 | property (callback)     | Returns the steps-card `HTMLElement` on every upsert; same ref ⇒ in-place update. |
| `messaging.customSendMessage`                                                | config prop             | Mock back end: branches on the post-back trigger string and runs the long task.   |
| `messaging.upsertMessage`                                                    | `ChatInstance` method   | Inserts and progressively updates the steps-card message.                         |
| `MessageState.COMPLETE`                                                      | `@carbon/ai-chat` enum  | Marks the message complete on the very first upsert so input stays usable.        |
| `MessageResponseTypes.BUTTON` / `ButtonItemType.POST_BACK`                   | `@carbon/ai-chat` enums | Welcome-message button that posts the trigger string back to start a run.         |
| `MessageResponseTypes.USER_DEFINED`                                          | `@carbon/ai-chat` enum  | Payload carrying the steps-card data updated each upsert.                         |
| `instance.scrollToMessage`                                                   | `ChatInstance` method   | Toast action target — scrolls the chat back to the finished message.              |
| `layout.showFrame`                                                           | config prop             | Disables the built-in frame for the fullscreen baseline.                          |
| `<cds-aichat-card>` / `<cds-aichat-card-steps>` / `<cds-aichat-card-footer>` | custom elements         | Carbon storybook `WithSteps` composition rendered as the user_defined widget.     |
| `<cds-actionable-notification>` / `<cds-actionable-notification-button>`     | custom elements         | Out-of-chat completion toast with a built-in action button.                       |

</details>

### [User-defined responses](./user-defined-responses/README.md)

Lit example that renders `user_defined` responses through the `renderUserDefinedResponse` callback and tracks the most recent message via `STATE_CHANGE` and `activeResponseId`.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-user-defined-responses`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                              | Kind                   | Role in this example                                                       |
| ----------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`       | custom element         | Mounts the chat as a fullscreen surface.                                   |
| `PublicConfig.layout.showFrame`     | config prop            | Disables the default frame so the host element fills its container.        |
| `PublicConfig.openChatByDefault`    | config prop            | Opens the chat on first paint.                                             |
| `messaging.customSendMessage`       | property               | Mock backend that emits a `user_defined` response.                         |
| `renderUserDefinedResponse`         | property               | Callback returning an `HTMLElement` for `user_defined` items.              |
| `RenderUserDefinedState`            | `@carbon/ai-chat` type | Argument to the render callback — exposes the `messageItem` to render.     |
| `BusEventType.STATE_CHANGE`         | `@carbon/ai-chat` enum | Notifies on `activeResponseId` changes.                                    |
| `instance.getState`                 | instance method        | Reads the initial `activeResponseId`.                                      |
| `instance.on`                       | instance method        | Subscribes the `STATE_CHANGE` handler.                                     |
| `MessageResponseTypes.USER_DEFINED` | `@carbon/ai-chat` enum | Response-type discriminator that routes the message to the render handler. |

</details>

### [Watch state](./watch-state/README.md)

Subscribes to the chat's `STATE_CHANGE` bus event to mirror homescreen visibility into the host UI.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-watch-state`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                        | Kind           | Role in this example                                  |
| ----------------------------- | -------------- | ----------------------------------------------------- |
| `<cds-aichat-container>`      | custom element | Mounts the chat UI as a float launcher.               |
| `messaging.customSendMessage` | property       | Mock backend.                                         |
| `homescreen.isOn`             | property       | Enables the homescreen.                               |
| `homescreen.greeting`         | property       | Greeting text on the homescreen.                      |
| `homescreen.starters`         | property       | Starter buttons.                                      |
| `onBeforeRender`              | property       | Captures the `ChatInstance` and subscribes to events. |
| `instance.getState`           | method         | Reads initial homescreen state.                       |
| `instance.on`                 | method         | Subscribes to `STATE_CHANGE`.                         |
| `BusEventType.STATE_CHANGE`   | enum           | Event type observed for state diffs.                  |
| `ChatInstance`                | type           | Type of the instance handle.                          |
| `PublicConfig`                | type           | Types the chat configuration object.                  |

</details>

### [Workspace](./workspace/README.md)

Demonstrates the workspace panel feature: chat messages can open rich side-by-side content (inventory report, inventory status, outstanding orders, SQL editor) in a dedicated `workspacePanelElement` slot.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                            | Kind           | Role in this example                                       |
| --------------------------------- | -------------- | ---------------------------------------------------------- |
| `<cds-aichat-custom-element>`     | custom element | Full-screen chat host.                                     |
| `slot="workspacePanelElement"`    | slot           | Receives the rendered workspace view.                      |
| `messaging.customSendMessage`     | property       | Mock backend.                                              |
| `layout.showFrame`                | property       | Disables the frame chrome.                                 |
| `layout.customProperties`         | property       | Passes `messages-max-width`.                               |
| `openChatByDefault`               | property       | Opens the chat on load.                                    |
| `onBeforeRender`                  | property       | Captures the `ChatInstance` and subscribes to events.      |
| `renderUserDefinedResponse`       | property       | Renders the `outstanding_orders_card`.                     |
| `instance.on`                     | method         | Subscribes to workspace events.                            |
| `instance.customPanels.getPanel`  | method         | Retrieves the workspace panel handle.                      |
| `panel.open`                      | method         | Opens the workspace with `workspaceId`/`additionalData`.   |
| `BusEventType.WORKSPACE_PRE_OPEN` | enum           | Pre-open lifecycle hook.                                   |
| `BusEventType.WORKSPACE_OPEN`     | enum           | Workspace opened; extracts `workspaceId`/`additionalData`. |
| `BusEventType.WORKSPACE_CLOSE`    | enum           | Workspace closed; clears state.                            |
| `PanelType.WORKSPACE`             | enum           | Panel key for `customPanels.getPanel`.                     |
| `RenderUserDefinedState`          | type           | Argument to the render callback.                           |
| `UserDefinedItem`                 | type           | Shape of user-defined message items.                       |
| `ChatInstance`                    | type           | Type of the instance handle.                               |
| `PublicConfig`                    | type           | Types the chat configuration object.                       |

</details>

### [Workspace (sidebar)](./workspace-sidebar/README.md)

Workspace feature wrapped in a right-hand sliding sidebar — built on the shipped `cds-aichat-sidebar` layout classes — with an external app header and launcher button, expanding wider when the workspace panel opens.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace-sidebar`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                        | Kind           | Role in this example                                       |
| --------------------------------------------- | -------------- | ---------------------------------------------------------- |
| `<cds-aichat-custom-element>`                 | custom element | Chat host inside the sidebar.                              |
| `slot="workspacePanelElement"`                | slot           | Receives the rendered workspace view.                      |
| `messaging.customSendMessage`                 | property       | Mock backend.                                              |
| `layout.corners`                              | property       | Sets `CornersType.SQUARE`.                                 |
| `openChatByDefault`                           | property       | Opens the chat on load.                                    |
| `onBeforeRender`                              | property       | Captures the `ChatInstance` and subscribes to events.      |
| `instance.on`                                 | method         | Subscribes to state, workspace, and view events.           |
| `renderUserDefinedResponse`                   | property       | Renders the outstanding-orders card via a host callback.   |
| `instance.getState`                           | method         | Reads initial `activeResponseId`.                          |
| `instance.changeView`                         | method         | Toggles between `LAUNCHER` and `MAIN_WINDOW`.              |
| `instance.customPanels.getPanel`              | method         | Retrieves the workspace panel handle.                      |
| `panel.open`                                  | method         | Opens the workspace from the card's maximize button.       |
| `BusEventType.STATE_CHANGE`                   | enum           | Tracks `activeResponseId`.                                 |
| `BusEventType.WORKSPACE_PRE_OPEN`             | enum           | Starts sidebar expand animation.                           |
| `BusEventType.WORKSPACE_OPEN`                 | enum           | Loads workspace data.                                      |
| `BusEventType.WORKSPACE_PRE_CLOSE`            | enum           | Starts sidebar contract animation.                         |
| `BusEventType.WORKSPACE_CLOSE`                | enum           | Clears workspace data.                                     |
| `BusEventType.VIEW_CHANGE`                    | enum           | Syncs sidebar open/closed state.                           |
| `BusEventType.VIEW_PRE_CHANGE`                | enum           | Plays close animation before view transition.              |
| `ViewType.LAUNCHER`                           | enum           | Launcher view target for `changeView`.                     |
| `ViewType.MAIN_WINDOW`                        | enum           | Main-window view target for `changeView`.                  |
| `PanelType.WORKSPACE`                         | enum           | Panel key for `customPanels.getPanel`.                     |
| `CornersType.SQUARE`                          | enum           | Layout corner style.                                       |
| `iconLoader`                                  | function       | Renders the `AiLaunch20` Carbon icon on the header button. |
| `RenderUserDefinedState`                      | type           | State passed to the `renderUserDefinedResponse` callback.  |
| `UserDefinedItem`                             | type           | Shape of user-defined message items.                       |
| `ChatInstance`                                | type           | Type of the instance handle.                               |
| `PublicConfig`                                | type           | Types the chat configuration object.                       |
| `@carbon/ai-chat/css/chat-sidebar-layout.css` | stylesheet     | Provides the `cds-aichat-sidebar*` layout classes.         |

</details>

### [Workspace table markdown override](./workspace-table-markdown-override/README.md)

`<cds-aichat-custom-element>` mounted directly in page light DOM and configured with `markdown.customRenderers.table` so every markdown table renders inside a `cds-aichat-card` with a `cds-aichat-toolbar` header. The toolbar carries a Carbon Maximize icon button that opens the workspace panel and renders the same data inside a full-size `<cds-aichat-table>` — the same component the chat uses by default for inline markdown tables, so the workspace view matches the inline preview.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace-table-markdown-override`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                | Kind                          | Role in this example                                                            |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`         | custom element                | Hosts the chat UI at the size of its CSS box.                                   |
| `.markdown`                           | property (`attribute: false`) | Carries the `customRenderers` object to the chat's renderer.                    |
| `WCMarkdown`                          | `@carbon/ai-chat` type        | Shape of the value bound to `.markdown`.                                        |
| `WCCustomMarkdownRenderers`           | `@carbon/ai-chat` type        | Shape of `markdown.customRenderers`.                                            |
| `markdown.customRenderers.table`      | config field                  | Replaces the default markdown table renderer with a card+toolbar HTMLElement.   |
| `MarkdownRendererTableArgs`           | `@carbon/ai-chat` type        | Argument shape for the table renderer (`headers`, `rows`, `slotName`, …).       |
| `ChatInstance.customPanels`           | `@carbon/ai-chat` API         | Access to the chat's panel manager.                                             |
| `CustomPanels.getPanel`               | `@carbon/ai-chat` API         | Returns a `CustomPanelInstance` for the requested panel type.                   |
| `PanelType.WORKSPACE`                 | `@carbon/ai-chat` enum        | Selects the workspace panel.                                                    |
| `CustomPanelInstance.open` / `.close` | `@carbon/ai-chat` API         | Opens / closes the workspace; `open` takes `WorkspaceCustomPanelConfigOptions`. |
| `ChatInstance.writeableElements`      | `@carbon/ai-chat` API         | Slot for assigning the workspace-panel HTMLElement content.                     |
| `BusEventType.WORKSPACE_CLOSE`        | `@carbon/ai-chat` event       | Fires when the panel closes — used to clear workspace state.                    |
| `<cds-aichat-card>` (`is-flush`)      | custom element                | Wraps the inline table; `is-flush` removes default padding.                     |
| `<cds-aichat-toolbar>`                | custom element                | Renders the card header with title + right-aligned actions.                     |
| `<cds-aichat-workspace-shell>` family | custom elements               | Standard workspace-panel chrome around the full-size table.                     |
| `Maximize16`                          | `@carbon/icons`               | Icon for the toolbar's "Open in workspace" action.                              |
| `<cds-aichat-table>`                  | `@carbon/ai-chat-components`  | Renders the full-size table inside the workspace.                               |
| `default-page-size`                   | `<cds-aichat-table>` property | Set to the row count so the pagination bar is suppressed and all rows render.   |
| `messaging.customSendMessage`         | property                      | Mock backend that emits a 24-row order table.                                   |

</details>

<!-- verify:examples-index:end -->
