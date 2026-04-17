# Custom Element (Lazy Load)

Dynamically imports the `cds-aichat-custom-element` bundle and uses `<cds-aichat-shell>` as a crossfade fallback until the chat is ready.

## What this example shows

- Lazy-loading the `cds-aichat-custom-element` bundle via `await import(...)` on `connectedCallback`.
- Rendering `<cds-aichat-shell>` as a visual placeholder while the bundle loads and until `onAfterRender` fires.
- Mounting the chat fullscreen with `layout.showFrame: false`, `openChatByDefault: true`, `launcher.isOn: false`, and `header.hideMinimizeButton: true`.
- Disabling Shadow DOM on the outer Lit element so global CSS classes on the host apply.

## When to use this pattern

- You want a fullscreen, always-open custom-element chat but need to keep it out of the initial JS bundle.
- You need a shell/skeleton that is visually consistent with the chat while the main chunk streams in.

## APIs and props demonstrated

| Symbol                        | Kind           | Role in this example                                    |
| ----------------------------- | -------------- | ------------------------------------------------------- |
| `<cds-aichat-custom-element>` | custom element | Lazy-loaded chat host.                                  |
| `<cds-aichat-shell>`          | custom element | Skeleton placeholder shown while the bundle loads.      |
| `messaging.customSendMessage` | property       | Mock backend.                                           |
| `layout.showFrame`            | property       | Disables the built-in frame.                            |
| `openChatByDefault`           | property       | Opens the main window on mount.                         |
| `launcher.isOn`               | property       | Disabled to keep the surface fullscreen.                |
| `header.hideMinimizeButton`   | property       | Hides the minimize control for the fullscreen surface.  |
| `onAfterRender`               | property       | Fires when chat is ready so the shell can be unmounted. |
| `ai-enabled`                  | attribute      | Enables AI styling on `<cds-aichat-shell>`.             |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-lazy-load
```

See [../README.md](../README.md) for the full setup walkthrough.
