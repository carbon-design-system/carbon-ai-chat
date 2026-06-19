# Markdown plugin (KaTeX)

`<cds-aichat-custom-element>` mounted directly in page light DOM and configured with `.markdown = { markdownItPlugins: [markdownItKatex] }` so `@vscode/markdown-it-katex` extends the renderer with LaTeX math tokens.

## What this example shows

- Setting `markdown` as a JS property (not an HTML attribute) to register a markdown-it plugin alongside the chat's built-ins.
- Mounting `<cds-aichat-custom-element>` directly in `index.html` (no wrapping custom element) so the chat container can append plugin-output slot hosts into page light DOM where the KaTeX stylesheet reaches them.
- Holding the `markdown` config at module scope so the reference is stable across renders and the markdown-it instance is not rebuilt.
- Replying with both inline (`$E = mc^2$`) and block (`$$ ... $$`) math so the new tokens are visible immediately.

## When to use this pattern

- You need to extend the chat's markdown with token types the built-in renderer does not understand (math, diagrams, custom embeds).
- You want plugin output to receive your page's global CSS rather than being trapped in shadow DOM.
- You are wrapping an existing markdown-it ecosystem plugin and want to surface it without forking the chat.

## APIs and props demonstrated

| Symbol                                        | Kind                          | Role in this example                                               |
| --------------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `<cds-aichat-custom-element>`                 | custom element                | Hosts the chat UI at the size of its CSS box.                      |
| `.markdown`                                   | property (`attribute: false`) | Carries the `markdownItPlugins` array to the chat's renderer.      |
| `markdown.markdownItPlugins`                  | config field                  | Registers `@vscode/markdown-it-katex` with the chat's renderer.    |
| `WCMarkdown`                                  | `@carbon/ai-chat` type        | Shape of the value bound to `.markdown`.                           |
| `.messaging`, `.layout`, `.openChatByDefault` | properties                    | Standard fullscreen baseline (`showFrame: false`, opens on mount). |
| `messaging.customSendMessage`                 | property                      | Mock backend that emits markdown with KaTeX math.                  |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-markdown-plugin
```

See [../README.md](../README.md) for the full setup walkthrough.
