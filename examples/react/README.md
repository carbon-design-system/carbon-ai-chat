# React examples

This folder contains examples for specific functionality in React.

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

Then start any React example directly from the root:

```bash
npm run start --workspace=<workspace-name>
```

## Examples

<!-- verify:examples-index:start -->

### [Basic / Custom element fullscreen](./basic-custom-element-fullscreen/README.md)

Fullscreen `ChatCustomElement` integration that hosts the chat inside your own element with the frame disabled. This is the canonical baseline for non-float examples — other fullscreen examples derive from this shape.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-basic-custom-element-fullscreen`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                        | Package / kind              | Role in this example                            |
| ----------------------------- | --------------------------- | ----------------------------------------------- |
| `ChatCustomElement`           | `@carbon/ai-chat` component | Mounts the chat into a host element you style.  |
| `PublicConfig`                | `@carbon/ai-chat` type      | Types the config passed to `ChatCustomElement`. |
| `messaging.customSendMessage` | config prop                 | Mock backend.                                   |
| `layout.showFrame`            | config prop                 | Disables the built-in frame.                    |
| `openChatByDefault`           | config prop                 | Opens the chat on mount.                        |
| `className`                   | component prop              | Host class applied to the custom element.       |

</details>

### [Basic / Custom element sidebar](./basic-custom-element-sidebar/README.md)

Docked-sidebar `ChatCustomElement` integration that hosts the chat as a 360px side panel using the shipped `cds-aichat-sidebar` layout classes, with a host header bar and an open/close toggle.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-basic-custom-element-sidebar`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                        | Package / kind                      | Role in this example                                                 |
| --------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `ChatCustomElement`                           | `@carbon/ai-chat` / React component | Mounts the chat into a host element you style as a sidebar.          |
| `onViewChange`                                | `@carbon/ai-chat` / component prop  | Reports the resting open/closed view state to update the host class. |
| `onViewPreChange`                             | `@carbon/ai-chat` / component prop  | Delays the view change so the slide-out animation can finish first.  |
| `BusEventViewChange`                          | `@carbon/ai-chat` / event payload   | Carries `newViewState.mainWindow` for the resting-state handler.     |
| `BusEventViewPreChange`                       | `@carbon/ai-chat` / event payload   | Carries `newViewState.mainWindow` for the pre-change handler.        |
| `ChatInstance.changeView`                     | `@carbon/ai-chat` / instance method | Opens or closes the chat from the header toggle button.              |
| `ViewType`                                    | `@carbon/ai-chat` / enum            | Selects `MAIN_WINDOW` or `LAUNCHER` when toggling the view.          |
| `layout.corners`                              | `@carbon/ai-chat` / config prop     | Squares the chat corners to fit the sidebar chrome.                  |
| `openChatByDefault`                           | `@carbon/ai-chat` / config prop     | Opens the chat on mount.                                             |
| `messaging.customSendMessage`                 | `@carbon/ai-chat` / config prop     | Mock backend.                                                        |
| `@carbon/ai-chat/css/chat-sidebar-layout.css` | stylesheet                          | Provides the `cds-aichat-sidebar*` layout classes.                   |

</details>

### [Basic / Custom element sidebar (narrow)](./basic-custom-element-sidebar-narrow/README.md)

Docked-sidebar `ChatCustomElement` integration narrowed to a 320px side panel — below the 360px default — so the chat renders in its compact responsive layout.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-basic-custom-element-sidebar-narrow`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                        | Package / kind                      | Role in this example                                                 |
| --------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `ChatCustomElement`                           | `@carbon/ai-chat` / React component | Mounts the chat into a host element you style as a sidebar.          |
| `--cds-aichat-sidebar-width`                  | CSS custom property                 | Overridden to `320px` to narrow the panel below the `360px` default. |
| `onViewChange`                                | `@carbon/ai-chat` / component prop  | Reports the resting open/closed view state to update the host class. |
| `onViewPreChange`                             | `@carbon/ai-chat` / component prop  | Delays the view change so the slide-out animation can finish first.  |
| `BusEventViewChange`                          | `@carbon/ai-chat` / event payload   | Carries `newViewState.mainWindow` for the resting-state handler.     |
| `BusEventViewPreChange`                       | `@carbon/ai-chat` / event payload   | Carries `newViewState.mainWindow` for the pre-change handler.        |
| `ChatInstance.changeView`                     | `@carbon/ai-chat` / instance method | Opens or closes the chat from the header toggle button.              |
| `ViewType`                                    | `@carbon/ai-chat` / enum            | Selects `MAIN_WINDOW` or `LAUNCHER` when toggling the view.          |
| `layout.corners`                              | `@carbon/ai-chat` / config prop     | Squares the chat corners to fit the sidebar chrome.                  |
| `openChatByDefault`                           | `@carbon/ai-chat` / config prop     | Opens the chat on mount.                                             |
| `messaging.customSendMessage`                 | `@carbon/ai-chat` / config prop     | Mock backend.                                                        |
| `@carbon/ai-chat/css/chat-sidebar-layout.css` | stylesheet                          | Provides the `cds-aichat-sidebar*` layout classes.                   |

</details>

### [Basic / Float](./basic-float/README.md)

Minimal React example of the float / launcher layout: mounts `ChatContainer` with a mock streaming backend. This is the canonical reference for the float chat shape.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-basic-float`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                               | Package / kind              | Role in this example                                      |
| ------------------------------------ | --------------------------- | --------------------------------------------------------- |
| `ChatContainer`                      | `@carbon/ai-chat` component | Mounts the chat UI.                                       |
| `PublicConfig`                       | `@carbon/ai-chat` type      | Types the config object passed to `ChatContainer`.        |
| `messaging.customSendMessage`        | config prop                 | Mock backend that streams a response.                     |
| `instance.messaging.addMessage`      | instance method             | Emits non-streaming responses (the welcome message).      |
| `instance.messaging.addMessageChunk` | instance method             | Streams partial / complete / final chunks back to the UI. |

</details>

### [Chain of thought](./chain-of-thought/README.md)

Mocks a chain-of-thought tool trace: the assistant ships a complete `chain_of_thought` array on the final response, and the chat renders a drawer where each step's `request`, `response`, and `status` are inspectable.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-chain-of-thought`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                              | Package / kind              | Role in this example                           |
| --------------------------------------------------- | --------------------------- | ---------------------------------------------- |
| `ChatCustomElement`                                 | `@carbon/ai-chat` component | Mounts the chat UI.                            |
| `PublicConfig`                                      | `@carbon/ai-chat` type      | Config shape.                                  |
| `customSendMessage`                                 | `messaging` prop            | Runs the chain-of-thought scenario.            |
| `ChainOfThoughtStep` / `ChainOfThoughtStepStatus`   | `@carbon/ai-chat` types     | Tool-trace payloads + status badge values.     |
| `MessageResponseOptions`                            | `@carbon/ai-chat` type      | `message_options` carrying `chain_of_thought`. |
| `StreamChunk`                                       | `@carbon/ai-chat` type      | Chunk shape for streaming.                     |
| `instance.messaging.addMessage` / `addMessageChunk` | `ChatInstance` API          | Emit welcome + final response.                 |
| `CustomSendMessageOptions.signal`                   | `@carbon/ai-chat`           | Abort signal for cancellation.                 |

</details>

### [Custom element / As float](./custom-element-as-float/README.md)

`ChatCustomElement` styled with the float layout CSS and driven by a custom `ChatButton` launcher, replicating `ChatContainer`'s built-in float experience with full control over animations and launcher behavior.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-custom-element-as-float`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                         | Package / kind                             | Role in this example                                         |
| ---------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| `ChatCustomElement`                            | `@carbon/ai-chat` component                | Hosts the chat with float layout classes.                    |
| `PublicConfig`                                 | `@carbon/ai-chat` type                     | Types the config.                                            |
| `ChatInstance`                                 | `@carbon/ai-chat` type                     | Captured via `onAfterRender` and used to change views.       |
| `BusEventViewChange`                           | `@carbon/ai-chat` type                     | Event payload for `onViewChange`.                            |
| `ViewType`                                     | `@carbon/ai-chat` enum                     | `MAIN_WINDOW` passed to `changeView`.                        |
| `ChatButton`                                   | `@carbon/ai-chat-components` React wrapper | Custom launcher button.                                      |
| `AiLaunch`                                     | `@carbon/icons-react`                      | Launcher icon.                                               |
| `@carbon/ai-chat/css/chat-float-layout.css`    | stylesheet                                 | Provides `cds-aichat-float--*` classes.                      |
| `@carbon/ai-chat/css/chat-launcher-layout.css` | stylesheet                                 | Provides `cds-aichat-launcher` / `--hidden` classes.         |
| `messaging.customSendMessage`                  | config prop                                | Mock backend.                                                |
| `launcher.isOn`                                | config prop                                | Disabled so the custom launcher drives opening.              |
| `className`                                    | component prop                             | Applies float phase classes to the host.                     |
| `onAfterRender`                                | component prop                             | Captures the chat instance; gates launcher rendering.        |
| `onAnimationEnd`                               | component prop                             | Advances the phase when open/close animations finish.        |
| `onViewChange`                                 | component prop                             | Starts open/close animation based on main-window visibility. |
| `instance.changeView`                          | instance method                            | Programmatically opens the chat.                             |

</details>

### [Custom element / As float (lazy load)](./custom-element-as-float-lazy-load/README.md)

Code-split `ChatCustomElement` rendered as a floating widget with a custom launcher, a `ChatShell` overlay covering both bundle-download and initialization phases, and session-based auto-mount.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-custom-element-as-float-lazy-load`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                         | Package / kind                             | Role in this example                                     |
| ---------------------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| `ChatCustomElement`                            | `@carbon/ai-chat` component (lazy)         | Dynamically imported; hosts the float chat.              |
| `readCarbonChatSession`                        | `@carbon/ai-chat` function                 | Reads prior `viewState.mainWindow` to decide auto-mount. |
| `PublicConfig`                                 | `@carbon/ai-chat` type                     | Types the config.                                        |
| `ChatInstance`                                 | `@carbon/ai-chat` type                     | Captured via `onAfterRender`.                            |
| `BusEventViewChange`                           | `@carbon/ai-chat` type                     | Event payload for `onViewChange`.                        |
| `ViewType`                                     | `@carbon/ai-chat` enum                     | `MAIN_WINDOW` passed to `changeView`.                    |
| `ChatShell`                                    | `@carbon/ai-chat-components` React wrapper | Fixed overlay covering load + init phases.               |
| `ChatButton`                                   | `@carbon/ai-chat-components` React wrapper | Custom launcher button.                                  |
| `AiLaunch`                                     | `@carbon/icons-react`                      | Launcher icon.                                           |
| `@carbon/ai-chat/css/chat-float-layout.css`    | stylesheet                                 | Provides `cds-aichat-float--*` classes.                  |
| `@carbon/ai-chat/css/chat-launcher-layout.css` | stylesheet                                 | Provides `cds-aichat-launcher` classes.                  |
| `React.lazy` / `Suspense`                      | React                                      | Code-splits `ChatCustomElement`.                         |
| `messaging.customSendMessage`                  | config prop                                | Mock backend.                                            |
| `launcher.isOn`                                | config prop                                | Disabled so the custom button drives opening.            |
| `className`                                    | component prop                             | Applies float phase classes.                             |
| `onAfterRender`                                | component prop                             | Captures the instance; calls `changeView(MAIN_WINDOW)`.  |
| `onAnimationEnd`                               | component prop                             | Advances the phase.                                      |
| `onViewChange`                                 | component prop                             | Triggers opening/closing animations.                     |
| `showFrame` / `aiEnabled` / `cornerAll`        | `ChatShell` props                          | Configure the loading-state shell.                       |

</details>

### [Custom element / Lazy load](./custom-element-lazy-load/README.md)

Code-split `ChatCustomElement` with a `ChatShell` overlay that covers both bundle download and chat initialization, producing a seamless full-screen loading experience.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-custom-element-lazy-load`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                        | Package / kind                             | Role in this example                               |
| ----------------------------- | ------------------------------------------ | -------------------------------------------------- |
| `ChatCustomElement`           | `@carbon/ai-chat` component (lazy)         | Dynamically imported; hosts the chat.              |
| `PublicConfig`                | `@carbon/ai-chat` type                     | Types the config.                                  |
| `ChatShell`                   | `@carbon/ai-chat-components` React wrapper | Loading overlay covering both load phases.         |
| `React.lazy` / `Suspense`     | React                                      | Code-splits `ChatCustomElement`.                   |
| `messaging.customSendMessage` | config prop                                | Mock backend.                                      |
| `layout.showFrame`            | config prop                                | Disables the frame so the host fills the viewport. |
| `openChatByDefault`           | config prop                                | Opens the chat on mount.                           |
| `launcher.isOn`               | config prop                                | Disables the built-in launcher.                    |
| `header.hideMinimizeButton`   | config prop                                | Hides the minimize affordance for full-screen use. |
| `className`                   | component prop                             | Host class applied to the custom element.          |
| `onAfterRender`               | component prop                             | Flips `chatReady` to unmount the overlay.          |
| `aiEnabled`                   | `ChatShell` prop                           | Styles the shell for AI-enabled look.              |

</details>

### [Feedback](./feedback/README.md)

React example that subscribes to `BusEventType.FEEDBACK` and forwards `FeedbackInteractionType.SUBMITTED` events to the host page.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-feedback`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                | Package / kind              | Role in this example                                                |
| ------------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| `ChatCustomElement`                   | `@carbon/ai-chat` component | Mounts the chat as a fullscreen surface.                            |
| `PublicConfig.layout.showFrame`       | config prop                 | Disables the default frame so the host element fills its container. |
| `PublicConfig.openChatByDefault`      | config prop                 | Opens the chat on first paint.                                      |
| `messaging.customSendMessage`         | config prop                 | Mock backend that emits a response with `message_item_options`.     |
| `BusEventType.FEEDBACK`               | `@carbon/ai-chat` enum      | Bus event fired when the user interacts with the feedback widget.   |
| `FeedbackInteractionType.SUBMITTED`   | `@carbon/ai-chat` enum      | Discriminator for "user clicked submit on the feedback prompt."     |
| `instance.on`                         | instance method             | Subscribes the feedback handler.                                    |
| `message_item_options.feedback.is_on` | server response option      | Renders the thumbs-up/thumbs-down widget on a message.              |

</details>

### [Frameworks / Next.js (App Router)](./frameworks-next/README.md)

Embeds `ChatContainer` inside a Next.js 16 App Router page, loading the chat as a client-only dynamic import so server rendering is skipped for browser-only dependencies.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-frameworks-next`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol              | Package / kind              | Role in this example                   |
| ------------------- | --------------------------- | -------------------------------------- |
| `ChatContainer`     | `@carbon/ai-chat` component | Mounts the chat UI.                    |
| `PublicConfig`      | `@carbon/ai-chat` type      | Shape of the config.                   |
| `customSendMessage` | `messaging` prop            | Minimal mock backend.                  |
| `next/dynamic`      | `next`                      | Client-only import of the chat module. |

</details>

### [Frameworks / React 17](./frameworks-react-17/README.md)

Runs `ChatContainer` on React 17 using the legacy `ReactDOM.render` root, proving the library still works on the pre-concurrent API.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-17`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol              | Package / kind              | Role in this example       |
| ------------------- | --------------------------- | -------------------------- |
| `ChatContainer`     | `@carbon/ai-chat` component | Mounts the chat UI.        |
| `PublicConfig`      | `@carbon/ai-chat` type      | Config shape.              |
| `customSendMessage` | `messaging` prop            | Minimal echo mock backend. |
| `ReactDOM.render`   | `react-dom`                 | Legacy React 17 mount.     |

</details>

### [Frameworks / Vite](./frameworks-vite/README.md)

Vite-powered React example that mounts `ChatContainer` with a minimal mock backend and adds a Vitest + happy-dom test suite.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-frameworks-vite`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol              | Package / kind              | Role in this example       |
| ------------------- | --------------------------- | -------------------------- |
| `ChatContainer`     | `@carbon/ai-chat` component | Mounts the chat UI.        |
| `PublicConfig`      | `@carbon/ai-chat` type      | Config shape.              |
| `customSendMessage` | `messaging` prop            | Minimal echo mock backend. |

</details>

### [History / Float](./history-float/README.md)

`ChatContainer` with the history feature enabled, using the writeable `historyPanelElement` slot to render a custom conversation picker in the default float layout.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-history-float`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                        | Package / kind              | Role in this example                                         |
| --------------------------------------------- | --------------------------- | ------------------------------------------------------------ |
| `ChatContainer`                               | `@carbon/ai-chat` component | Mounts the chat UI in the default float layout.              |
| `PublicConfig`                                | `@carbon/ai-chat` type      | Types the config passed to `ChatContainer`.                  |
| `ChatInstance`                                | `@carbon/ai-chat` type      | Captured in `onBeforeRender` and used to swap conversations. |
| `history.isOn`                                | config prop                 | Enables the built-in history panel.                          |
| `messaging.customSendMessage`                 | config prop                 | Mock backend.                                                |
| `messaging.customLoadHistory`                 | config prop                 | Returns a mock history payload for a selected conversation.  |
| `onBeforeRender`                              | component prop              | Captures the `ChatInstance`.                                 |
| `renderWriteableElements.historyPanelElement` | component prop              | React node rendered into the history panel slot.             |
| `instance.messaging.clearConversation`        | instance method             | Clears the current conversation before inserting history.    |
| `instance.messaging.insertHistory`            | instance method             | Inserts the loaded history payload.                          |

</details>

### [History / Fullscreen](./history-fullscreen/README.md)

`ChatCustomElement` configured as a full-screen host with the history feature enabled and a custom `historyPanelElement` for browsing conversations.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-history-fullscreen`

<details>
<summary>APIs and props demonstrated</summary>

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
| `renderWriteableElements.historyPanelElement` | component prop              | React node rendered into the history panel slot.      |
| `instance.getState`                           | instance method             | Reads `customPanels.history.isMobile`.                |
| `instance.messaging.clearConversation`        | instance method             | Clears the conversation before insertion.             |
| `instance.messaging.insertHistory`            | instance method             | Inserts the loaded history.                           |

</details>

### [History / Host-driven](./history-host-driven/README.md)

`ChatCustomElement` with a `customLoadHistory` implementation and a manual "insert history" button that swaps in a randomly-sized conversation via `ChatInstance.messaging`.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-history-host-driven`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                 | Package / kind              | Role in this example                                  |
| -------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `ChatCustomElement`                    | `@carbon/ai-chat` component | Mounts the chat UI.                                   |
| `PublicConfig`                         | `@carbon/ai-chat` type      | Types the config.                                     |
| `ChatInstance`                         | `@carbon/ai-chat` type      | Captured in `onBeforeRender`, used to manage history. |
| `Button`                               | `@carbon/react` component   | Triggers a history re-injection.                      |
| `messaging.customSendMessage`          | config prop                 | Mock backend.                                         |
| `messaging.customLoadHistory`          | config prop                 | Mock history loader returning N messages.             |
| `onBeforeRender`                       | component prop              | Captures the chat instance.                           |
| `instance.messaging.clearConversation` | instance method             | Clears the current conversation.                      |
| `instance.messaging.insertHistory`     | instance method             | Inserts loaded history into the chat.                 |

</details>

### [History / User-defined responses](./history-user-defined-responses/README.md)

React example that rehydrates a conversation containing multiple `user_defined` cards via `customLoadHistory` + `insertHistory`, then uses `instance.getState()` and `BusEventType.STATE_CHANGE` to highlight only the most-recent card as active.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-history-user-defined-responses`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                 | Package / kind              | Role in this example                                                                     |
| -------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| `ChatCustomElement`                    | `@carbon/ai-chat` component | Mounts the chat as a fullscreen surface.                                                 |
| `PublicConfig.layout.showFrame`        | config prop                 | Disables the default frame so the host element fills its container.                      |
| `PublicConfig.openChatByDefault`       | config prop                 | Opens the chat on first paint so the rehydrated cards are immediately visible.           |
| `messaging.customSendMessage`          | config prop                 | Mock backend that emits a new `user_defined` response on the `user_defined` keyword.     |
| `messaging.customLoadHistory`          | config prop                 | Mock history loader that returns three pre-built `user_defined` cards.                   |
| `instance.messaging.clearConversation` | instance method             | Clears the conversation before `insertHistory` so the transcript fully replaces.         |
| `instance.messaging.insertHistory`     | instance method             | Inserts the rehydrated `HistoryItem[]` produced by `customLoadHistory`.                  |
| `renderUserDefinedResponse`            | component prop              | Returns a React component for `user_defined` items.                                      |
| `RenderUserDefinedState`               | `@carbon/ai-chat` type      | Argument to the render function — exposes `messageItem` and `fullMessage`.               |
| `BusEventType.STATE_CHANGE`            | `@carbon/ai-chat` enum      | Notifies on `activeResponseId` changes, including the change emitted by `insertHistory`. |
| `instance.getState`                    | instance method             | Reads the initial `activeResponseId` before any `STATE_CHANGE` events fire.              |
| `instance.on`                          | instance method             | Subscribes the `STATE_CHANGE` handler.                                                   |
| `MessageResponseTypes.USER_DEFINED`    | `@carbon/ai-chat` enum      | Response-type discriminator that routes the message to the render handler.               |
| `MessageInputType.TEXT`                | `@carbon/ai-chat` enum      | Marks each fabricated user-request `HistoryItem` as a text input.                        |
| `HistoryItem`                          | `@carbon/ai-chat` type      | Wrapper produced by `customLoadHistory` for each rehydrated message.                     |

</details>

### [Human agent](./human-agent/README.md)

`ChatCustomElement` wired to a mock service desk via `serviceDeskFactory`, demonstrating how to hand off to a live agent while keeping the factory stable across re-renders.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-human-agent`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                                                  | Package / kind              | Role in this example                                        |
| ----------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------- |
| `ChatCustomElement`                                                     | `@carbon/ai-chat` component | Mounts the chat UI.                                         |
| `PublicConfig`                                                          | `@carbon/ai-chat` type      | Types the config.                                           |
| `ServiceDesk`                                                           | `@carbon/ai-chat` interface | Contract implemented by `MockServiceDesk`.                  |
| `ServiceDeskFactoryParameters`                                          | `@carbon/ai-chat` type      | Parameters passed to the factory.                           |
| `ServiceDeskCallback`                                                   | `@carbon/ai-chat` type      | Used by `MockServiceDesk` to send updates back to the chat. |
| `ChatInstance`                                                          | `@carbon/ai-chat` type      | Used by the mock service desk.                              |
| `MessageResponseTypes` / `UserType` / `ErrorType` / `AgentAvailability` | `@carbon/ai-chat` enums     | Used inside the mock service desk.                          |
| `messaging.customSendMessage`                                           | config prop                 | Mock backend.                                               |
| `serviceDeskFactory`                                                    | config prop                 | Returns a live-agent service desk instance.                 |

</details>

### [Input / Code snippet](./input-code-snippet/README.md)

A custom Tiptap input rule converts triple backticks (` ``` `) in the chat input into an editable `cds-aichat-code-snippet` block. The closing fence is implicit — it's added at send time, never typed. The block grows with content; the input shell's existing scrollbar takes over when it gets tall. Pressing `Escape` exits the block.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-input-code-snippet`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                           | Package / kind                       | Role in this example                                                            |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| `ChatCustomElement`              | `@carbon/ai-chat` component          | Mounts the chat UI as a fullscreen surface.                                     |
| `PublicConfig`                   | `@carbon/ai-chat` type               | Types the config object passed to `ChatCustomElement`.                          |
| `RenderUserDefinedInputNode`     | `@carbon/ai-chat` type               | Types the `renderUserDefinedInputNode` callback.                                |
| `Extension`                      | `@tiptap/core` type                  | Types the custom Tiptap node registered on the input.                           |
| `renderInLightDom`               | `@carbon/ai-chat` helper             | Bridges the snippet web component into the page's light DOM.                    |
| `renderUserDefinedInputNode`     | component prop                       | Renders the custom `codeSnippetBlock` node inside the sent user message bubble. |
| `input.tiptap.extensions`        | config prop                          | Registers the host-authored `codeSnippetBlock` Tiptap node on the input.        |
| `layout.showFrame`               | config prop                          | Hides the default frame so the chat fills the viewport.                         |
| `openChatByDefault`              | config prop                          | Mounts straight into the conversation, no launcher.                             |
| `messaging.customSendMessage`    | config prop                          | Mock backend; confirms whether the outgoing text contained a fenced block.      |
| `Node.create`                    | `@tiptap/core` API                   | Authors the `codeSnippetBlock` block atom node.                                 |
| `InputRule`                      | `@tiptap/core` API                   | Triggers the node swap when the user finishes typing three backticks.           |
| `addKeyboardShortcuts` / keydown | `@tiptap/core` / DOM                 | Escape exits the block to a new paragraph below.                                |
| `<cds-aichat-code-snippet>`      | `@carbon/ai-chat-components` element | Editable CodeMirror-backed snippet inside the input; read-only in the bubble.   |
| `CodeSnippet`                    | `@carbon/ai-chat-components/react`   | React wrapper for the snippet, used in the sent message bubble.                 |
| `Card`                           | `@carbon/ai-chat-components/react`   | React wrapper for the card that frames the editable snippet.                    |

</details>

### [Input / Custom render](./input-custom-render/README.md)

The chat sits in a docked sidebar while the page body holds a grid of clickable Carbon tiles. Clicking a tile clears the chat input, injects a copy of the tile as a custom Tiptap node, and attaches the tile to the message's structured data; on send the tile is rendered inside the message bubble.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-input-custom-render`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                | Package / kind              | Role in this example                                                          |
| ------------------------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `ChatCustomElement`                   | `@carbon/ai-chat` component | Mounts the chat UI inside the docked sidebar container.                       |
| `PublicConfig`                        | `@carbon/ai-chat` type      | Types the config object passed to `ChatCustomElement`.                        |
| `ChatInstance`                        | `@carbon/ai-chat` type      | Captured in `onBeforeRender` so the tile handler can drive the input.         |
| `RenderUserDefinedInputNode`          | `@carbon/ai-chat` type      | Types the `renderUserDefinedInputNode` callback.                              |
| `Extension`                           | `@carbon/ai-chat` type      | Types the custom Tiptap node registered on the input.                         |
| `renderInLightDom`                    | `@carbon/ai-chat` helper    | Bridges the node view's `Tile` into the page's light DOM.                     |
| `renderUserDefinedInputNode`          | component prop              | Renders the custom `tileChip` node inside the sent user message bubble.       |
| `input.tiptap.extensions`             | config prop                 | Registers the host-authored `tileChip` Tiptap node on the input.              |
| `instance.input.updateContent`        | instance method             | Clears the input and injects the clicked tile as a custom node.               |
| `instance.input.updateStructuredData` | instance method             | Replaces the pending structured data with metadata describing the tile.       |
| `onBeforeRender`                      | component prop              | Captures the `ChatInstance` used by the tile-click handler.                   |
| `layout.showFrame`                    | config prop                 | Hides the default frame so the chat fills the sidebar.                        |
| `openChatByDefault`                   | config prop                 | Mounts straight into the conversation, no launcher.                           |
| `messaging.customSendMessage`         | config prop                 | Reads `request.input.structured_data` and echoes the submitted tile.          |
| `Node.create`                         | `@tiptap/core` API          | Authors the custom `tileChip` inline atom node.                               |
| `Tile` / `ClickableTile`              | `@carbon/react` component   | The Carbon tile rendered in the page grid, the input, and the message bubble. |

</details>

### [Input / File upload](./input-file-upload/README.md)

`ChatCustomElement` with file attachments enabled, using a mock `onFileUpload` handler that simulates a server upload and echoes back file metadata.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-input-file-upload`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                 | Package / kind              | Role in this example                                        |
| -------------------------------------- | --------------------------- | ----------------------------------------------------------- |
| `ChatCustomElement`                    | `@carbon/ai-chat` component | Mounts the chat UI.                                         |
| `PublicConfig`                         | `@carbon/ai-chat` type      | Types the config.                                           |
| `ExternalFileReference`                | `@carbon/ai-chat` type      | Server-assigned file reference returned by the mock upload. |
| `StructuredData`                       | `@carbon/ai-chat` type      | Wraps the file reference returned from `onFileUpload`.      |
| `StructuredField`                      | `@carbon/ai-chat` type      | Typed entry inside `StructuredData.fields`.                 |
| `MessageRequest`                       | `@carbon/ai-chat` type      | Inspected for `structured_data` to echo files.              |
| `ChatInstance`                         | `@carbon/ai-chat` type      | Used by the mock server response helper.                    |
| `MessageResponseTypes`                 | `@carbon/ai-chat` enum      | `TEXT` used to echo file metadata.                          |
| `upload.is_on`                         | config prop                 | Enables attachments.                                        |
| `upload.onFileUpload`                  | config prop                 | Mock upload handler returning `StructuredData`.             |
| `upload.accept` (documented)           | config prop                 | Optional MIME/extension allowlist.                          |
| `upload.maxFileSizeBytes` (documented) | config prop                 | Optional per-file size cap.                                 |
| `upload.maxFiles` (documented)         | config prop                 | Optional per-message file count cap.                        |
| `messaging.customSendMessage`          | config prop                 | Mock backend; forwards file messages to the echo helper.    |
| `instance.messaging.addMessage`        | instance method             | Injects the echoed text response.                           |

</details>

### [Input / Mentions & commands](./input-mentions-and-commands/README.md)

`ChatCustomElement` configured with `input.mention` for `@`-picking team members anywhere in the message and `input.command` for `/`-commands constrained to the start of the line.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-input-mentions-and-commands`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                  | Package / kind              | Role in this example                                                     |
| --------------------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| `ChatCustomElement`                     | `@carbon/ai-chat` component | Mounts the chat UI at the fullscreen baseline.                           |
| `PublicConfig`                          | `@carbon/ai-chat` type      | Types the config object passed to `ChatCustomElement`.                   |
| `ChatInstance`                          | `@carbon/ai-chat` type      | Captured in `onBeforeRender` so `onSelect` can update structured data.   |
| `SuggestionItem`                        | `@carbon/ai-chat` type      | Shape of each entry returned from `items`.                               |
| `input.mention`                         | config prop                 | Registers the `@`-mention trigger config on the input.                   |
| `input.command`                         | config prop                 | Registers the `/`-command trigger config on the input.                   |
| `mention.trigger` / `command.trigger`   | config prop                 | Character (`@` or `/`) that opens the suggestion list.                   |
| `command.triggerPosition`               | config prop                 | `"start"` constrains commands to the beginning of the line.              |
| `mention.items` / `command.items`       | config prop                 | Async filter (or static list) narrowing items as the user types.         |
| `mention.onSelect` / `command.onSelect` | config prop                 | Hook that runs when the user picks a suggestion.                         |
| `onBeforeRender`                        | component prop              | Captures the `ChatInstance` ref used in `onSelect`.                      |
| `instance.input.updateStructuredData`   | instance method             | Appends mention/command picks to the outgoing message's structured data. |
| `layout.showFrame`                      | config prop                 | Hides the default frame so the chat fills the host.                      |
| `openChatByDefault`                     | config prop                 | Mounts straight into the conversation, no launcher.                      |
| `messaging.customSendMessage`           | config prop                 | Reads `request.input.structured_data` and echoes the picks.              |

</details>

### [Input / Mentions & commands (custom render)](./input-mentions-and-commands-custom-render/README.md)

The Mentions & Commands example with a `renderCustomToken` supplied for mentions: each picked user appears in the input as a Carbon `Tag` wrapped in a `Tooltip` showing the user's description on hover. Commands keep the default chip rendering.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-input-mentions-and-commands-custom-render`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                  | Package / kind              | Role in this example                                                     |
| --------------------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| `ChatCustomElement`                     | `@carbon/ai-chat` component | Mounts the chat UI at the fullscreen baseline.                           |
| `PublicConfig`                          | `@carbon/ai-chat` type      | Types the config object passed to `ChatCustomElement`.                   |
| `ChatInstance`                          | `@carbon/ai-chat` type      | Captured in `onBeforeRender` so `onSelect` can update structured data.   |
| `SuggestionItem`                        | `@carbon/ai-chat` type      | Shape of each entry; passed to `renderCustomToken`.                      |
| `input.mention`                         | config prop                 | Registers the `@`-mention trigger config on the input.                   |
| `input.command`                         | config prop                 | Registers the `/`-command trigger config on the input.                   |
| `mention.renderCustomToken`             | config prop                 | Returns a React node rendered in place of the default mention chip.      |
| `mention.trigger` / `command.trigger`   | config prop                 | Character (`@` or `/`) that opens the suggestion list.                   |
| `command.triggerPosition`               | config prop                 | `"start"` constrains commands to the beginning of the line.              |
| `mention.items` / `command.items`       | config prop                 | Async filter (or static list) narrowing items as the user types.         |
| `mention.onSelect` / `command.onSelect` | config prop                 | Hook that runs when the user picks a suggestion.                         |
| `Tag`                                   | `@carbon/react` component   | Visual chip used inside the custom token renderer.                       |
| `Tooltip`                               | `@carbon/react` component   | Hover affordance wrapping the custom mention chip.                       |
| `onBeforeRender`                        | component prop              | Captures the `ChatInstance` ref used in `onSelect`.                      |
| `instance.input.updateStructuredData`   | instance method             | Appends mention/command picks to the outgoing message's structured data. |
| `layout.showFrame`                      | config prop                 | Hides the default frame so the chat fills the host.                      |
| `openChatByDefault`                     | config prop                 | Mounts straight into the conversation, no launcher.                      |
| `messaging.customSendMessage`           | config prop                 | Reads `request.input.structured_data` and echoes the picks.              |

</details>

### [Input / Typeahead](./input-typeahead/README.md)

`ChatCustomElement` configured with `input.autocomplete` so a curated list filters as the user types and renders the matches in a dropdown above the input.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-input-typeahead`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                        | Package / kind              | Role in this example                                   |
| ----------------------------- | --------------------------- | ------------------------------------------------------ |
| `ChatCustomElement`           | `@carbon/ai-chat` component | Mounts the chat UI at the fullscreen baseline.         |
| `PublicConfig`                | `@carbon/ai-chat` type      | Types the config object passed to `ChatCustomElement`. |
| `SuggestionItem`              | `@carbon/ai-chat` type      | Shape of each entry returned from `items`.             |
| `input.autocomplete`          | config prop                 | Registers the typeahead behavior on the input.         |
| `autocomplete.items`          | config prop                 | Async filter that returns matching `SuggestionItem`s.  |
| `autocomplete.debounceMs`     | config prop                 | Coalesces keystrokes before calling `items`.           |
| `layout.showFrame`            | config prop                 | Hides the default frame so the chat fills the host.    |
| `openChatByDefault`           | config prop                 | Mounts straight into the conversation, no launcher.    |
| `messaging.customSendMessage` | config prop                 | Mock backend echoing the user's message.               |

</details>

### [Input / Typeahead (custom list)](./input-typeahead-custom/README.md)

`ChatCustomElement` with `input.autocomplete` whose dropdown is replaced by a fully custom React component supplied through `renderCustomList`.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-input-typeahead-custom`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                          | Package / kind              | Role in this example                                                            |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------------------- |
| `ChatCustomElement`             | `@carbon/ai-chat` component | Mounts the chat UI at the fullscreen baseline.                                  |
| `PublicConfig`                  | `@carbon/ai-chat` type      | Types the config object passed to `ChatCustomElement`.                          |
| `SuggestionItem`                | `@carbon/ai-chat` type      | Shape of each entry returned from `items` and surfaced to `onSelect`.           |
| `CustomListProps`               | `@carbon/ai-chat` type      | Props (`items`, `query`, `onSelect`, `onDismiss`) given to the custom renderer. |
| `input.autocomplete`            | config prop                 | Registers the typeahead behavior on the input.                                  |
| `autocomplete.renderCustomList` | config prop                 | Returns a React node that replaces the default dropdown.                        |
| `autocomplete.items`            | config prop                 | Async filter providing entries to the custom list.                              |
| `autocomplete.debounceMs`       | config prop                 | Coalesces keystrokes before calling `items`.                                    |
| `layout.showFrame`              | config prop                 | Hides the default frame so the chat fills the host.                             |
| `openChatByDefault`             | config prop                 | Mounts straight into the conversation, no launcher.                             |
| `messaging.customSendMessage`   | config prop                 | Mock backend echoing the user's message.                                        |

</details>

### [Integrations / watsonx.ai](./integrations-watsonx/README.md)

Connects `ChatCustomElement` to IBM watsonx.ai for real streaming text generation, using a small Express proxy to handle IAM auth and CORS.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-integrations-watsonx`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                                      | Package / kind                  | Role in this example                   |
| ----------------------------------------------------------- | ------------------------------- | -------------------------------------- |
| `ChatCustomElement`                                         | `@carbon/ai-chat` component     | Mounts the chat UI.                    |
| `PublicConfig`                                              | `@carbon/ai-chat` type          | Config shape.                          |
| `customSendMessage`                                         | `messaging` prop                | Streams from watsonx.ai via SSE proxy. |
| `MessageRequest`, `MessageResponse`, `MessageResponseTypes` | `@carbon/ai-chat`               | Request/response shapes.               |
| `PartialItemChunkWithId`                                    | `@carbon/ai-chat` type          | Streaming chunk shape.                 |
| `instance.messaging.addMessage` / `addMessageChunk`         | `ChatInstance` API              | Welcome + streamed chunks.             |
| `fetchEventSource`                                          | `@microsoft/fetch-event-source` | SSE client.                            |

</details>

### [Reasoning steps](./reasoning-steps/README.md)

Mocks two reasoning-streaming patterns — discrete `ReasoningStep` items (the default behavior) and a single long-form `reasoning.content` trace — picked from a dropdown on the welcome message.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-reasoning-steps`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                              | Package / kind              | Role in this example                                    |
| --------------------------------------------------- | --------------------------- | ------------------------------------------------------- |
| `ChatCustomElement`                                 | `@carbon/ai-chat` component | Mounts the chat UI.                                     |
| `PublicConfig`                                      | `@carbon/ai-chat` type      | Config shape.                                           |
| `customSendMessage`                                 | `messaging` prop            | Dispatches to scenario runners.                         |
| `MessageResponseTypes.OPTION`                       | `@carbon/ai-chat`           | Welcome-message scenario picker.                        |
| `OptionItemPreference.DROPDOWN`                     | `@carbon/ai-chat` enum      | Renders scenario picker as a dropdown.                  |
| `ReasoningStep`                                     | `@carbon/ai-chat` type      | Individual reasoning step payload.                      |
| `MessageResponseOptions`                            | `@carbon/ai-chat` type      | `message_options` carrying `reasoning.{steps,content}`. |
| `StreamChunk`                                       | `@carbon/ai-chat` type      | Chunk shape for streaming.                              |
| `instance.messaging.addMessage` / `addMessageChunk` | `ChatInstance` API          | Emit welcome + streamed chunks.                         |
| `CustomSendMessageOptions.signal`                   | `@carbon/ai-chat`           | Abort signal for cancellation.                          |

</details>

### [Reasoning steps (controlled)](./reasoning-steps-controlled/README.md)

Mocks a controlled reasoning-step flow: the parent reasoning panel stays collapsed via `reasoning.open_state: CLOSE`, every individual step is pre-expanded, and a custom "Thinking..." indicator driven by `instance.updateIsMessageLoadingCounter` replaces the default reasoning UI.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-reasoning-steps-controlled`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                              | Package / kind              | Role in this example                                       |
| --------------------------------------------------- | --------------------------- | ---------------------------------------------------------- |
| `ChatCustomElement`                                 | `@carbon/ai-chat` component | Mounts the chat UI.                                        |
| `PublicConfig`                                      | `@carbon/ai-chat` type      | Config shape.                                              |
| `customSendMessage`                                 | `messaging` prop            | Runs the controlled reasoning scenario.                    |
| `ReasoningStep` / `ReasoningStepOpenState`          | `@carbon/ai-chat` types     | Reasoning payloads + controlled open-state values.         |
| `MessageResponseOptions`                            | `@carbon/ai-chat` type      | `message_options` carrying `reasoning.{steps,open_state}`. |
| `StreamChunk`                                       | `@carbon/ai-chat` type      | Chunk shape for streaming.                                 |
| `instance.messaging.addMessage` / `addMessageChunk` | `ChatInstance` API          | Emit welcome + streamed chunks.                            |
| `instance.updateIsMessageLoadingCounter`            | `ChatInstance` API          | Custom loading label that replaces the default UI.         |
| `CustomSendMessageOptions.signal`                   | `@carbon/ai-chat`           | Abort signal for cancellation.                             |

</details>

### [Tests / Jest (happy-dom)](./tests-jest-happydom/README.md)

Jest + `@happy-dom/jest-environment` setup that exercises `ChatContainer` end-to-end, including shadow-DOM queries via `PageObjectId` selectors.

**Start command:** `npm run test --workspace=@carbon/ai-chat-examples-react-tests-jest-happydom`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                          | Package / kind              | Role in this example                                                |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| `ChatContainer`                 | `@carbon/ai-chat` component | Mounted under test.                                                 |
| `PageObjectId`                  | `@carbon/ai-chat`           | Stable selector IDs used to query shadow-DOM elements.              |
| `MessageResponseTypes`          | `@carbon/ai-chat` enum      | `TEXT` used when injecting deterministic replies.                   |
| `messaging.customSendMessage`   | config prop                 | Inline mock that injects `instance.messaging.addMessage` responses. |
| `instance.messaging.addMessage` | instance method             | Used inside the inline mock to stage assistant output.              |
| `@testing-library/react`        | test util                   | `waitFor` + a `renderChatContainer` helper.                         |
| `@testing-library/jest-dom`     | test util                   | DOM matchers.                                                       |
| `@happy-dom/jest-environment`   | jest env                    | Shadow-DOM-capable DOM environment.                                 |

</details>

### [Tests / Jest (jsdom)](./tests-jest-jsdom/README.md)

Baseline Jest + `jest-environment-jsdom` setup that verifies `ChatContainer` mounts its web-component wrapper. Kept intentionally simple because jsdom does not support shadow DOM.

**Start command:** `npm run test --workspace=@carbon/ai-chat-examples-react-tests-jest-jsdom`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                        | Package / kind              | Role in this example                                          |
| --------------------------------------------- | --------------------------- | ------------------------------------------------------------- |
| `ChatContainer`                               | `@carbon/ai-chat` component | Mounted under test.                                           |
| `messaging.customSendMessage`                 | config prop                 | Inline no-op mock.                                            |
| `renderWriteableElements.headerBottomElement` | component prop              | React node inserted into the header bottom writeable element. |
| `data-testid`                                 | component prop              | Passed through to the root element for querying.              |
| `@testing-library/react`                      | test util                   | `render`, `act`, `waitFor`.                                   |
| `@testing-library/jest-dom`                   | test util                   | DOM matchers.                                                 |
| `jest-environment-jsdom`                      | jest env                    | Default Jest DOM environment (no shadow-DOM support).         |

</details>

### [User-defined responses](./user-defined-responses/README.md)

React example that renders `user_defined` responses through the `renderUserDefinedResponse` prop and tracks the most recent message via `STATE_CHANGE` and `activeResponseId`.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-user-defined-responses`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                              | Package / kind              | Role in this example                                                       |
| ----------------------------------- | --------------------------- | -------------------------------------------------------------------------- |
| `ChatCustomElement`                 | `@carbon/ai-chat` component | Mounts the chat as a fullscreen surface.                                   |
| `PublicConfig.layout.showFrame`     | config prop                 | Disables the default frame so the host element fills its container.        |
| `PublicConfig.openChatByDefault`    | config prop                 | Opens the chat on first paint.                                             |
| `messaging.customSendMessage`       | config prop                 | Mock backend that emits a `user_defined` response.                         |
| `renderUserDefinedResponse`         | component prop              | Returns a React component for `user_defined` items.                        |
| `RenderUserDefinedState`            | `@carbon/ai-chat` type      | Argument to the render function — exposes the `messageItem` to render.     |
| `BusEventType.STATE_CHANGE`         | `@carbon/ai-chat` enum      | Notifies on `activeResponseId` changes.                                    |
| `instance.getState`                 | instance method             | Reads the initial `activeResponseId`.                                      |
| `instance.on`                       | instance method             | Subscribes the `STATE_CHANGE` handler.                                     |
| `MessageResponseTypes.USER_DEFINED` | `@carbon/ai-chat` enum      | Response-type discriminator that routes the message to the render handler. |

</details>

### [Watch state](./watch-state/README.md)

Shows how to observe `ChatInstance` state externally by reading `instance.getState()` once and then subscribing to `BusEventType.STATE_CHANGE` to keep a parent React component in sync.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-watch-state`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                                            | Package / kind              | Role in this example                            |
| ----------------------------------------------------------------- | --------------------------- | ----------------------------------------------- |
| `ChatContainer`                                                   | `@carbon/ai-chat` component | Mounts the chat UI as a float launcher.         |
| `PublicConfig`                                                    | `@carbon/ai-chat` type      | Config shape (includes `homescreen`).           |
| `ChatInstance`                                                    | `@carbon/ai-chat` type      | Provided in `onBeforeRender`.                   |
| `BusEventType.STATE_CHANGE`                                       | `@carbon/ai-chat` enum      | Event subscribed to.                            |
| `instance.getState()` / `instance.on`                             | `ChatInstance` API          | Snapshot + subscription.                        |
| `homescreen.isOn` / `homescreen.greeting` / `homescreen.starters` | config                      | Starter buttons that trigger state transitions. |
| `customSendMessage`                                               | `messaging` prop            | Echoes a generic response back to the chat.     |

</details>

### [Watch state (Redux Toolkit)](./watch-state-redux/README.md)

Mirrors `ChatInstance` state into a Redux Toolkit store via the `STATE_CHANGE` bus event so any component can read chat state through `useSelector`.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-watch-state-redux`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                        | Package / kind              | Role in this example                                                  |
| ----------------------------- | --------------------------- | --------------------------------------------------------------------- |
| `ChatContainer`               | `@carbon/ai-chat` component | Mounts the chat UI as a float launcher.                               |
| `messaging.customSendMessage` | config prop                 | Mock backend.                                                         |
| `homescreen.isOn`             | config prop                 | Enables the homescreen so toggling it produces `STATE_CHANGE` events. |
| `homescreen.greeting`         | config prop                 | Greeting text on the homescreen.                                      |
| `homescreen.starters`         | config prop                 | Starter buttons.                                                      |
| `onBeforeRender`              | component prop              | Captures the `ChatInstance` and wires the bus → Redux bridge.         |
| `instance.getState`           | `@carbon/ai-chat` method    | Seeds the Redux store on first render.                                |
| `instance.on`                 | `@carbon/ai-chat` method    | Subscribes to `STATE_CHANGE`.                                         |
| `BusEventType.STATE_CHANGE`   | `@carbon/ai-chat` enum      | Event the bridge listens to.                                          |
| `PublicChatState`             | `@carbon/ai-chat` type      | Type of the snapshot stored in Redux.                                 |
| `configureStore`              | `@reduxjs/toolkit` function | Creates the Redux store.                                              |
| `createSlice`                 | `@reduxjs/toolkit` function | Defines the chat-state slice with the `chatStateSync` reducer.        |
| `Provider`                    | `react-redux` component     | Provides the store to the React tree.                                 |
| `useSelector` (typed)         | `react-redux` hook          | Reads `homeScreenState.isHomeScreenOpen` from the store.              |

</details>

### [Workspace](./workspace/README.md)

Renders custom content inside the built-in workspace panel of `ChatCustomElement`, driven by chat messages that include `PREVIEW_CARD` responses or user-defined cards with a "maximize" action.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-workspace`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                                                          | Package / kind              | Role in this example                           |
| ------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------- |
| `ChatCustomElement`                                                             | `@carbon/ai-chat` component | Mounts the chat with custom host DOM.          |
| `PublicConfig`                                                                  | `@carbon/ai-chat` type      | Config shape.                                  |
| `ChatInstance`                                                                  | `@carbon/ai-chat` type      | Provided in `onBeforeRender`.                  |
| `BusEventType.WORKSPACE_PRE_OPEN` / `WORKSPACE_OPEN` / `WORKSPACE_CLOSE`        | `@carbon/ai-chat` enum      | Workspace lifecycle events.                    |
| `BusEventWorkspacePreOpen` / `BusEventWorkspaceOpen` / `BusEventWorkspaceClose` | `@carbon/ai-chat` types     | Typed event payloads.                          |
| `PanelType.WORKSPACE`                                                           | `@carbon/ai-chat` enum      | Selects the workspace panel.                   |
| `instance.customPanels.getPanel(...).open(...)`                                 | `ChatInstance` API          | Opens the workspace imperatively.              |
| `renderUserDefinedResponse`                                                     | prop                        | Renders the outstanding-orders preview card.   |
| `RenderUserDefinedState`                                                        | `@carbon/ai-chat` type      | Argument to the render callback.               |
| `writeableElements.workspacePanelElement`                                       | render slot                 | Where the workspace body is rendered.          |
| `MessageResponseTypes.PREVIEW_CARD` / `USER_DEFINED` / `OPTION` / `TEXT`        | `@carbon/ai-chat`           | Outgoing response types from the mock backend. |
| `OptionItemPreference.BUTTON`                                                   | `@carbon/ai-chat` enum      | Inventory-type picker.                         |
| `layout.showFrame` / `layout.customProperties`                                  | prop                        | Flush custom-element layout.                   |
| `openChatByDefault`                                                             | prop                        | Opens chat on load.                            |

</details>

### [Workspace (sidebar)](./workspace-sidebar/README.md)

Same workspace payloads as `workspace`, but the chat is mounted inside a collapsible app sidebar — built on the shipped `cds-aichat-sidebar` layout classes — that expands when a workspace opens and contracts when it closes.

**Start command:** `npm run start --workspace=@carbon/ai-chat-examples-react-workspace-sidebar`

<details>
<summary>APIs and props demonstrated</summary>

| Symbol                                                                                           | Package / kind              | Role in this example                        |
| ------------------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------- |
| `ChatCustomElement`                                                                              | `@carbon/ai-chat` component | Mounts the chat in a host div.              |
| `PublicConfig`                                                                                   | `@carbon/ai-chat` type      | Config shape.                               |
| `ChatInstance`                                                                                   | `@carbon/ai-chat` type      | Provided in `onBeforeRender`.               |
| `CornersType.SQUARE`                                                                             | `@carbon/ai-chat` enum      | Square corners in `layout`.                 |
| `ViewType`                                                                                       | `@carbon/ai-chat` enum      | Referenced in view-change handling.         |
| `BusEventType.WORKSPACE_PRE_OPEN` / `WORKSPACE_OPEN` / `WORKSPACE_PRE_CLOSE` / `WORKSPACE_CLOSE` | `@carbon/ai-chat`           | Workspace lifecycle events.                 |
| `BusEventWorkspacePreOpen` / `BusEventWorkspaceOpen` / `BusEventWorkspaceClose`                  | `@carbon/ai-chat` types     | Typed event payloads.                       |
| `BusEventViewChange` / `BusEventViewPreChange`                                                   | `@carbon/ai-chat` types     | View transition payloads.                   |
| `PanelType.WORKSPACE`                                                                            | `@carbon/ai-chat` enum      | Selects the workspace panel.                |
| `instance.customPanels.getPanel(...).open(...)`                                                  | `ChatInstance` API          | Opens the workspace imperatively.           |
| `renderUserDefinedResponse` / `RenderUserDefinedState`                                           | prop / type                 | Renders the `outstanding_orders_card`.      |
| `MessageResponseTypes.PREVIEW_CARD` / `USER_DEFINED` / `OPTION` / `TEXT`                         | `@carbon/ai-chat`           | Outgoing response types from mock backend.  |
| `OptionItemPreference.BUTTON`                                                                    | `@carbon/ai-chat` enum      | Inventory-type picker.                      |
| `openChatByDefault`                                                                              | prop                        | Opens chat on load.                         |
| `AiLaunch20`                                                                                     | `@carbon/icons-react`       | Sidebar launcher icon.                      |
| `@carbon/ai-chat/css/chat-sidebar-layout.css`                                                    | stylesheet                  | Provides the `cds-aichat-sidebar*` classes. |

</details>

<!-- verify:examples-index:end -->
