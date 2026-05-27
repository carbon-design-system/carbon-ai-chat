# Markdown plugin (KaTeX)

`ChatCustomElement` configured with `markdown.markdownItPlugins` so `@vscode/markdown-it-katex` extends the renderer with LaTeX math tokens.

## What this example shows

- Passing a `markdownItPlugins` array through the `markdown` prop to register a markdown-it plugin alongside the chat's built-ins.
- Memoizing the plugins array with `useMemo` so the markdown-it instance is not rebuilt every render.
- Rendering plugin output (KaTeX HTML) styled by a consumer-supplied stylesheet loaded from `index.html`.
- Replying with both inline (`$E = mc^2$`) and block (`$$ ... $$`) math so the new tokens are visible immediately.

## When to use this pattern

- You need to extend the chat's markdown with token types the built-in renderer does not understand (math, diagrams, custom embeds).
- You want plugin output to receive your page's global CSS rather than being trapped in shadow DOM.
- You are wrapping an existing markdown-it ecosystem plugin and want to surface it without forking the chat.

## APIs and props demonstrated

| Symbol                        | Package / kind              | Role in this example                                            |
| ----------------------------- | --------------------------- | --------------------------------------------------------------- |
| `ChatCustomElement`           | `@carbon/ai-chat` component | Mounts the chat into a fullscreen host element.                 |
| `PublicConfig`                | `@carbon/ai-chat` type      | Types the config object passed to `ChatCustomElement`.          |
| `MarkdownItPlugin`            | `@carbon/ai-chat` type      | Element shape of the `markdownItPlugins` array.                 |
| `markdown.markdownItPlugins`  | config prop                 | Registers `@vscode/markdown-it-katex` with the chat's renderer. |
| `messaging.customSendMessage` | config prop                 | Mock backend that emits markdown with KaTeX math.               |
| `layout.showFrame`            | config prop                 | Disables the built-in frame so the host owns the layout.        |
| `openChatByDefault`           | config prop                 | Mounts straight into the conversation, no launcher.             |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-markdown-plugin
```

See [../README.md](../README.md) for the full setup walkthrough.
