# Workspace Sidebar

Workspace feature wrapped in a right-hand sliding sidebar with an external app header and launcher button, expanding wider when the workspace panel opens.

## What this example shows

- Hosting `cds-aichat-custom-element` inside a fixed right-side sidebar that slides in/out based on `VIEW_CHANGE` / `VIEW_PRE_CHANGE` events.
- Expanding the sidebar width when the workspace opens and contracting on close, coordinated with `WORKSPACE_PRE_OPEN` / `WORKSPACE_PRE_CLOSE` / `WORKSPACE_OPEN` / `WORKSPACE_CLOSE`.
- Toggling chat visibility from an external header button via `instance.changeView(ViewType.LAUNCHER | ViewType.MAIN_WINDOW)`.
- Handling `USER_DEFINED_RESPONSE` events to store per-slot data and render `<outstanding-orders-card>` slots with a maximize-to-workspace action.
- Rendering one of four workspace views (inventory report/status, outstanding orders, SQL editor) in the `workspacePanelElement` slot.

## When to use this pattern

- Apps that want the chat docked in a sidebar chrome (with their own header/launcher button) rather than the default float.
- UIs where the workspace panel should visually widen the sidebar while open.

## APIs and props demonstrated

| Symbol                               | Kind           | Role in this example                                           |
| ------------------------------------ | -------------- | -------------------------------------------------------------- |
| `<cds-aichat-custom-element>`        | custom element | Chat host inside the sidebar.                                  |
| `slot="workspacePanelElement"`       | slot           | Receives the rendered workspace view.                          |
| `messaging.customSendMessage`        | property       | Mock backend.                                                  |
| `layout.corners`                     | property       | Sets `CornersType.SQUARE`.                                     |
| `openChatByDefault`                  | property       | Opens the chat on load.                                        |
| `onBeforeRender`                     | property       | Captures the `ChatInstance` and subscribes to events.          |
| `instance.on`                        | method         | Subscribes to state, workspace, view, and user-defined events. |
| `instance.getState`                  | method         | Reads initial `activeResponseId`.                              |
| `instance.changeView`                | method         | Toggles between `LAUNCHER` and `MAIN_WINDOW`.                  |
| `instance.customPanels.getPanel`     | method         | Retrieves the workspace panel handle.                          |
| `panel.open`                         | method         | Opens the workspace from the card's maximize button.           |
| `BusEventType.STATE_CHANGE`          | enum           | Tracks `activeResponseId`.                                     |
| `BusEventType.USER_DEFINED_RESPONSE` | enum           | Captures per-slot user-defined data.                           |
| `BusEventType.WORKSPACE_PRE_OPEN`    | enum           | Starts sidebar expand animation.                               |
| `BusEventType.WORKSPACE_OPEN`        | enum           | Loads workspace data.                                          |
| `BusEventType.WORKSPACE_PRE_CLOSE`   | enum           | Starts sidebar contract animation.                             |
| `BusEventType.WORKSPACE_CLOSE`       | enum           | Clears workspace data.                                         |
| `BusEventType.VIEW_CHANGE`           | enum           | Syncs sidebar open/closed state.                               |
| `BusEventType.VIEW_PRE_CHANGE`       | enum           | Plays close animation before view transition.                  |
| `ViewType.LAUNCHER`                  | enum           | Launcher view target for `changeView`.                         |
| `ViewType.MAIN_WINDOW`               | enum           | Main-window view target for `changeView`.                      |
| `PanelType.WORKSPACE`                | enum           | Panel key for `customPanels.getPanel`.                         |
| `CornersType.SQUARE`                 | enum           | Layout corner style.                                           |
| `iconLoader`                         | function       | Renders the `AiLaunch20` Carbon icon on the header button.     |
| `MessageResponse`                    | type           | Typed message response for slot map.                           |
| `UserDefinedItem`                    | type           | Shape of user-defined message items.                           |
| `ChatInstance`                       | type           | Type of the instance handle.                                   |
| `PublicConfig`                       | type           | Types the chat configuration object.                           |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace-sidebar
```

See [../README.md](../README.md) for the full setup walkthrough.
