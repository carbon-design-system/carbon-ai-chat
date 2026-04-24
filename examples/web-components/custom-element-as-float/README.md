# Custom Element as Float

Replicates the built-in float view by combining `<cds-aichat-custom-element>` with the shipped float/launcher CSS classes and a `<cds-aichat-button>` custom launcher.

## What this example shows

- Importing `chat-float-layout.css` and `chat-launcher-layout.css` from `@carbon/ai-chat` to drive positioning and entrance/exit animations.
- Suppressing the built-in launcher with `launcher: { isOn: false }` and rendering a `<cds-aichat-button>` with an `AiLaunch16` icon instead.
- Driving open/close state through a local `FloatPhase` machine and `animationend` events so the host element is never collapsed to 0×0.
- Calling `instance.changeView(ViewType.MAIN_WINDOW)` on launcher click.
- Using the `onViewChange` prop to intercept the chat's default hide behavior and trigger the closing animation.
- Disabling Shadow DOM on the outer Lit element so imported global layout classes apply to the host.

## When to use this pattern

- You want the built-in floating widget look but need to host it via `<cds-aichat-custom-element>` (for example, to control mount order, lazy loading, or surrounding layout).
- You want to ship a fully custom launcher while reusing Carbon float-layout animations.

## APIs and props demonstrated

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

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-as-float
```

See [../README.md](../README.md) for the full setup walkthrough.
