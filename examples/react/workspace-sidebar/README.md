# Workspace Sidebar

Same workspace payloads as `workspace`, but the chat is mounted inside a collapsible app sidebar that expands when a workspace opens and contracts when it closes.

## What this example shows

- Subscribing to `WORKSPACE_PRE_OPEN` / `WORKSPACE_OPEN` / `WORKSPACE_PRE_CLOSE` / `WORKSPACE_CLOSE` to drive sidebar expand/contract animations.
- Subscribing to `BusEventViewPreChange` and `BusEventViewChange` (`ViewType.MAIN_WINDOW`) to animate the sidebar open/closed alongside the chat view.
- Opening the workspace via `instance.customPanels.getPanel(PanelType.WORKSPACE).open(...)`.
- `CornersType.SQUARE` layout and an `AiLaunch20` `@carbon/icons-react` launcher button.
- Same set of workspace bodies as `workspace` (inventory report, inventory status, outstanding orders, SQL editor).

## When to use this pattern

- You want the chat to live permanently in a side panel of your app and expand to include a workspace when relevant.
- You need explicit control over view transitions and sidebar animation timing.

## APIs and props demonstrated

| Symbol                                                                                           | Package / kind              | Role in this example                       |
| ------------------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------ |
| `ChatCustomElement`                                                                              | `@carbon/ai-chat` component | Mounts the chat in a host div.             |
| `PublicConfig`                                                                                   | `@carbon/ai-chat` type      | Config shape.                              |
| `ChatInstance`                                                                                   | `@carbon/ai-chat` type      | Provided in `onBeforeRender`.              |
| `CornersType.SQUARE`                                                                             | `@carbon/ai-chat` enum      | Square corners in `layout`.                |
| `ViewType`                                                                                       | `@carbon/ai-chat` enum      | Referenced in view-change handling.        |
| `BusEventType.WORKSPACE_PRE_OPEN` / `WORKSPACE_OPEN` / `WORKSPACE_PRE_CLOSE` / `WORKSPACE_CLOSE` | `@carbon/ai-chat`           | Workspace lifecycle events.                |
| `BusEventWorkspacePreOpen` / `BusEventWorkspaceOpen` / `BusEventWorkspaceClose`                  | `@carbon/ai-chat` types     | Typed event payloads.                      |
| `BusEventViewChange` / `BusEventViewPreChange`                                                   | `@carbon/ai-chat` types     | View transition payloads.                  |
| `PanelType.WORKSPACE`                                                                            | `@carbon/ai-chat` enum      | Selects the workspace panel.               |
| `instance.customPanels.getPanel(...).open(...)`                                                  | `ChatInstance` API          | Opens the workspace imperatively.          |
| `renderUserDefinedResponse` / `RenderUserDefinedState`                                           | prop / type                 | Renders the `outstanding_orders_card`.     |
| `MessageResponseTypes.PREVIEW_CARD` / `USER_DEFINED` / `OPTION` / `TEXT`                         | `@carbon/ai-chat`           | Outgoing response types from mock backend. |
| `OptionItemPreference.BUTTON`                                                                    | `@carbon/ai-chat` enum      | Inventory-type picker.                     |
| `openChatByDefault`                                                                              | prop                        | Opens chat on load.                        |
| `AiLaunch20`                                                                                     | `@carbon/icons-react`       | Sidebar launcher icon.                     |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-workspace-sidebar
```

(Replace `start` with `dev` or `test` if this example's package.json defines those instead.)

See [../README.md](../README.md) for the full setup walkthrough.
