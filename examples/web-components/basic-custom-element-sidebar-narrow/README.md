# Basic / Custom element sidebar (narrow)

Docked-sidebar chat driven by `<cds-aichat-custom-element>` narrowed to a 320px side panel — below the 360px default — so the chat renders in its compact responsive layout.

## What this example shows

- Overriding the `--cds-aichat-sidebar-width` custom property to `320px` so the panel sits below the `360px` default and the chat switches to its compact responsive layout.
- Importing `@carbon/ai-chat/css/chat-sidebar-layout.css` to reuse the library's sidebar classes (`cds-aichat-sidebar`, `--closing`, `--closed`).
- Mounting `<cds-aichat-custom-element>` inside a host element positioned as a fixed sidebar by those classes.
- Toggling the chat open and closed from a host header button via `ChatInstance.changeView`.
- Driving the slide-in and slide-out animation with the `VIEW_CHANGE` and `VIEW_PRE_CHANGE` bus events so the chat only unmounts after the CSS transition completes.

## When to use this pattern

- You want the chat docked as a side panel but have less than 360px of horizontal space to give it.
- You want to check the chat's compact, narrow-viewport rendering.
- You need host UI (a header, a toggle button) to control when the chat is visible.

## APIs and props demonstrated

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

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-basic-custom-element-sidebar-narrow
```

See [../README.md](../README.md) for the full setup walkthrough.
