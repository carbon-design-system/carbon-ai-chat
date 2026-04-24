# watsonx.ai

Connects the chat to IBM watsonx.ai via a local Express proxy that streams tokens back with `@microsoft/fetch-event-source`.

## What this example shows

- Wiring `customSendMessage` to a watsonx.ai streaming endpoint fronted by a Node/Express proxy (`server.js`).
- Real-time SSE streaming with token buffering so markdown (tables, lists) renders cleanly.
- Running the dev server and proxy server together via `concurrently`.
- Configuring model/project via `.env` (WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_URL, WATSONX_MODEL_ID).

## When to use this pattern

- Production-style integrations with IBM watsonx.ai that need server-side credential handling.
- Any SSE-based LLM where browsers cannot hold the API key directly.

## APIs and props demonstrated

| Symbol                        | Kind           | Role in this example                      |
| ----------------------------- | -------------- | ----------------------------------------- |
| `<cds-aichat-container>`      | custom element | Mounts the chat UI.                       |
| `messaging.customSendMessage` | property       | Streams tokens from the watsonx.ai proxy. |
| `PublicConfig`                | type           | Types the chat configuration object.      |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

Copy `.env.example` to `.env` and fill in your `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`, and optional `WATSONX_MODEL_ID` before starting.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-watsonx
```

The `start` script launches the proxy server and the webpack dev server together via `concurrently`.

See [../README.md](../README.md) for the full setup walkthrough.
