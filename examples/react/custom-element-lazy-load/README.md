# Custom Element (Lazy Load)

Code-split `ChatCustomElement` with a `ChatShell` overlay that covers both bundle download and chat initialization, producing a seamless full-screen loading experience.

## What this example shows

- Code-splitting `ChatCustomElement` with `React.lazy` + dynamic `import("@carbon/ai-chat")`, deferred 3 s for demo purposes.
- Using a fixed `ChatShell` overlay (from `@carbon/ai-chat-components`) during both loading phases:
  1. while the bundle downloads (`Suspense` fallback is `null` because the overlay handles it),
  2. while `ChatCustomElement` initializes (until `onAfterRender` fires).
- Suppressing the built-in launcher and minimize button for a pure full-screen layout.
- Wiring a mock backend through `customSendMessage`.

## When to use this pattern

- You want a full-screen chat that is not part of the initial bundle.
- You need the loading state to visually match the chat's final appearance.

## APIs and props demonstrated

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

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-custom-element-lazy-load
```

See [../README.md](../README.md) for the full setup walkthrough.
