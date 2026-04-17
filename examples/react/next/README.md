# Next.js App Router

Embeds `ChatContainer` inside a Next.js 16 App Router page, loading the chat as a client-only dynamic import so server rendering is skipped for browser-only dependencies.

## What this example shows

- App Router `app/layout.tsx` + `app/page.tsx` structure.
- `next/dynamic` with `ssr: false` to defer `ChatContainer` to the client, with a `loading` placeholder.
- `"use client"` in the chat module because `ChatContainer` touches `window` and custom elements.
- Wiring a `FEEDBACK` bus event handler that alerts the serialized report payload.
- A mocked streaming backend (`customSendMessage`) with `stream text`, `text`, and `user_defined` responses.
- Custom response rendering via `renderUserDefinedResponse`.

## When to use this pattern

- Your app is Next.js App Router and you want chat integrated without touching SSR.
- You need a split between a thin Next page and a larger client component that owns the chat.

## APIs and props demonstrated

| Symbol                                 | Package / kind              | Role in this example                                   |
| -------------------------------------- | --------------------------- | ------------------------------------------------------ |
| `ChatContainer`                        | `@carbon/ai-chat` component | Mounts the chat UI.                                    |
| `PublicConfig`                         | `@carbon/ai-chat` type      | Shape of the config.                                   |
| `ChatInstance`                         | `@carbon/ai-chat` type      | Received in `onBeforeRender`.                          |
| `BusEventType.FEEDBACK`                | `@carbon/ai-chat` enum      | Subscribed via `instance.on`.                          |
| `FeedbackInteractionType.SUBMITTED`    | `@carbon/ai-chat` enum      | Branch used inside the handler.                        |
| `customSendMessage`                    | `messaging` prop            | Mocked streaming backend.                              |
| `MessageResponseTypes` / `StreamChunk` | `@carbon/ai-chat`           | Emitting streamed text and `user_defined` replies.     |
| `renderUserDefinedResponse`            | prop                        | Renders `my_unique_identifier` user-defined responses. |
| `onBeforeRender`                       | prop                        | Subscribes to feedback events.                         |
| `next/dynamic`                         | `next`                      | Client-only import of the chat module.                 |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run dev --workspace=@carbon/ai-chat-examples-react-next
```

(Replace `dev` with `build` or `start` as needed — this example also exposes `start` for the production server.)

See [../README.md](../README.md) for the full setup walkthrough.
