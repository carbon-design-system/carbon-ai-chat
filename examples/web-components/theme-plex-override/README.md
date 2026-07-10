# Theme Plex override

Lit web-component integration of `@carbon/ai-chat` demonstrating how to replace Carbon's built-in Plex font with a custom web font by configuring `@carbon/styles` at compile time.

## What this example shows

- Disabling Carbon's automatic Plex `@font-face` generation via `$css--font-face: false` in the `@carbon/styles` SCSS entry point.
- Substituting a custom web font (Permanent Marker) for all three Carbon font-family keys (`sans`, `mono`, `serif`) using `$font-families`.
- Declaring a local `@font-face` rule that serves the replacement font from a bundled `.woff2` asset.
- Mounting `cds-aichat-container` with a `PublicConfig`-shaped messaging config defined outside the component to avoid re-mount churn.
- Implementing a mock backend via `customSendMessage` that sends and receives messages.
- Capturing the `ChatInstance` in `onBeforeRender` and subscribing to `STATE_CHANGE` and `FEEDBACK` bus events.
- Rendering custom response content with `renderUserDefinedResponse`, re-computed off `activeResponseId`.

## When to use this pattern

- You want to replace Carbon's default IBM Plex font with a brand or product font.
- Your application already bundles a custom web font and you need Carbon's CSS output to use it instead of Plex.
- You need a reference for overriding SCSS configuration variables before `@carbon/styles` generates its output.

## APIs and props demonstrated

| Symbol                        | Package / kind            | Role in this example                                             |
| ----------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `cds-aichat-container`        | `@carbon/ai-chat` element | Mounts the chat UI as a custom element.                          |
| `PublicConfig`                | `@carbon/ai-chat` type    | Types the messaging config passed to the element.                |
| `ChatInstance`                | `@carbon/ai-chat` type    | Typed reference captured in `onBeforeRender`.                    |
| `BusEventType`                | `@carbon/ai-chat` enum    | Subscribes to `STATE_CHANGE` and `FEEDBACK`.                     |
| `FeedbackInteractionType`     | `@carbon/ai-chat` enum    | Detects `SUBMITTED` feedback interactions.                       |
| `messaging.customSendMessage` | element property          | Mock backend that echoes user input.                             |
| `onBeforeRender`              | element property          | Captures the `ChatInstance` and attaches event listeners.        |
| `renderUserDefinedResponse`   | element property          | Renders custom response content for user-defined response types. |
| `instance.getState`           | instance method           | Reads the initial `activeResponseId`.                            |
| `instance.on`                 | instance method           | Attaches bus event handlers.                                     |
| `$css--font-face`             | `@carbon/styles` SCSS var | Set to `false` to suppress Plex `@font-face` generation.         |
| `$font-families`              | `@carbon/styles` SCSS var | Overrides the `sans`, `mono`, and `serif` font-family stacks.    |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-theme-plex-override
```

See [../README.md](../README.md) for the full setup walkthrough.
