# CSP

Minimal `ChatContainer` integration bundled under the strictest practical Content Security Policy, demonstrating that `@carbon/ai-chat` runs without `unsafe-inline` or `unsafe-eval`.

## What this example shows

- Mounting `ChatContainer` with a `PublicConfig` declared outside the component.
- Wiring a mock backend through `customSendMessage`.
- Building with `csp-html-webpack-plugin` to emit a strict CSP `<meta>` tag into `index.html`.
- Confirming the library works without relaxed CSP directives.

## When to use this pattern

- You need to deploy Carbon AI Chat into an environment with strict CSP requirements.
- You want a reference webpack setup that emits CSP hashes for inline bootstrap scripts.
- You're validating that no dynamic code-eval paths are used at runtime.

## APIs and props demonstrated

| Symbol                        | Package / kind              | Role in this example     |
| ----------------------------- | --------------------------- | ------------------------ |
| `ChatContainer`               | `@carbon/ai-chat` component | Mounts the chat UI.      |
| `PublicConfig`                | `@carbon/ai-chat` type      | Types the config object. |
| `messaging.customSendMessage` | config prop                 | Mock backend.            |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-csp
```

See [../README.md](../README.md) for the full setup walkthrough.
