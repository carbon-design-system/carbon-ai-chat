# Custom Element as Float (Lazy Load)

Code-split `ChatCustomElement` rendered as a floating widget with a custom launcher, a `ChatShell` overlay covering both bundle-download and initialization phases, and session-based auto-mount.

## What this example shows

- Code-splitting `ChatCustomElement` with `React.lazy` + dynamic `import("@carbon/ai-chat")`, deferred 3 s for demo purposes.
- Driving a float-phase state machine (`idle`, `opening`, `open`, `closing`, `closed`) via `onViewChange` and `onAnimationEnd`.
- Reading the prior session with `readCarbonChatSession()` to auto-mount when the user had the chat open before.
- Covering both loading phases with a `ChatShell` fixed overlay (Suspense fallback is `null`).
- Using `@carbon/ai-chat-components`' React `ChatButton` and `ChatShell` wrappers.
- Honoring `prefers-reduced-motion` by skipping intermediate animation phases.

## When to use this pattern

- You want a floating chat widget whose bundle is only downloaded on first user interaction (or on session resume).
- You need a seamless visual during both bundle download and chat boot.
- You need a custom launcher plus lazy loading.

## APIs and props demonstrated

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

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-custom-element-as-float-lazy-load
```

See [../README.md](../README.md) for the full setup walkthrough.
