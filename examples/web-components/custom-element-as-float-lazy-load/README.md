# Custom Element as Float (Lazy Load)

Floating-widget replica of `<cds-aichat-custom-element>` whose bundle is dynamically imported on first launcher click, with `<cds-aichat-shell>` acting as a crossfade fallback.

## What this example shows

- Lazy-loading the `cds-aichat-custom-element` bundle via `await import(...)` the first time the user opens the chat.
- Pre-registering `<cds-aichat-button>` and `<cds-aichat-shell>` from `@carbon/ai-chat-components` so the launcher and loading shell are available before the heavy bundle arrives.
- Checking `readCarbonChatSession()` on page load to auto-mount the chat if it was open in the previous session.
- Driving open/close state with a `FloatPhase` machine plus `animationend` for entrance/exit animations.
- Overlaying `<cds-aichat-shell>` during load, then unmounting it once `onAfterRender` resolves and `changeView(ViewType.MAIN_WINDOW)` completes.
- Suppressing the built-in launcher with `launcher: { isOn: false }` so the `<cds-aichat-button>` is the only launcher.
- Disabling Shadow DOM on the outer Lit element so float-layout global CSS applies.

## When to use this pattern

- You want the built-in float look and feel but need to defer the main bundle until the user first engages.
- You need a visible skeleton/shell while the lazy chunk streams in.
- You want session resumption that auto-reopens the chat on reload.

## APIs and props demonstrated

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

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-as-float-lazy-load
```

See [../README.md](../README.md) for the full setup walkthrough.
