# Basic / Custom element sidebar

Docked-sidebar `ChatCustomElement` integration that hosts the chat as a 360px side panel using the shipped `cds-aichat-sidebar` layout classes, with a host header bar and an open/close toggle.

## What this example shows

- Importing `@carbon/ai-chat/css/chat-sidebar-layout.css` to reuse the library's sidebar classes (`cds-aichat-sidebar`, `--closing`, `--closed`).
- Mounting `ChatCustomElement` inside a host element positioned as a fixed 360px sidebar by those classes.
- Toggling the chat open and closed from a host header button via `ChatInstance.changeView`.
- Driving the slide-in and slide-out animation with the `onViewChange` and `onViewPreChange` lifecycle hooks so the chat only unmounts after the CSS transition completes.
- Using `layout.corners: CornersType.SQUARE` so the chat sits flush inside the sidebar chrome.
- Wiring a mock backend through `customSendMessage`.

## When to use this pattern

- You want the chat docked to the edge of your page as a persistent side panel rather than a floating widget or a fullscreen surface.
- You need host UI (a header, a toggle button) to control when the chat is visible.
- You want the panel's show/hide to animate in sync with the chat's view changes.

## APIs and props demonstrated

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

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-basic-custom-element-sidebar
```

See [../README.md](../README.md) for the full setup walkthrough.
