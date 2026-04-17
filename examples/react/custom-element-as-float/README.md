# Custom Element as Float

`ChatCustomElement` styled with the float layout CSS and driven by a custom `ChatButton` launcher, replicating `ChatContainer`'s built-in float experience with full control over animations and launcher behavior.

## What this example shows

- Importing `@carbon/ai-chat/css/chat-float-layout.css` and `chat-launcher-layout.css` to reuse the library's float classes (`cds-aichat-float--open`, `--opening`, `--closing`, `--close`, `cds-aichat-launcher`, `--hidden`).
- Suppressing the built-in launcher with `launcher.isOn: false` and providing a custom `ChatButton` from `@carbon/ai-chat-components`.
- Driving open/close state through a `phase` state machine and `onAnimationEnd` / `onViewChange` handlers.
- Calling `instance.changeView(ViewType.MAIN_WINDOW)` to open the chat.
- Handling `prefers-reduced-motion` by advancing the phase immediately when no animation will fire.

## When to use this pattern

- You want the float look-and-feel from `ChatContainer` but need custom launcher icon, position, or animation control.
- You need precise control over when the chat mounts and how its open/close animations behave.

## APIs and props demonstrated

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

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-custom-element-as-float
```

See [../README.md](../README.md) for the full setup walkthrough.
