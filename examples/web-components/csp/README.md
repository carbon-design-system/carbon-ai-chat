# CSP

Verifies `@carbon/ai-chat` works under the strictest Content Security Policy (no `unsafe-inline`, no `unsafe-eval`, nonce-based scripts only).

## What this example shows

- Bundling a Lit + `<cds-aichat-container>` app with `csp-html-webpack-plugin` to inject a strict CSP meta tag.
- The applied policy: `default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`.
- Confirming that the container, theme injection, and `customSendMessage` continue to work without relaxing the policy.

## When to use this pattern

- Your deployment enforces a strict CSP and you need a reference build configuration.
- You want to verify that no inline scripts, `eval`, or inline styles are required at runtime.

## APIs and props demonstrated

| Symbol                        | Kind           | Role in this example                                    |
| ----------------------------- | -------------- | ------------------------------------------------------- |
| `<cds-aichat-container>`      | custom element | Mounts the chat UI under a strict CSP.                  |
| `messaging.customSendMessage` | property       | Mock backend that echoes user input.                    |
| `onBeforeRender`              | property       | Provides the `ChatInstance` hook for downstream wiring. |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-csp
```

See [../README.md](../README.md) for the full setup walkthrough.
