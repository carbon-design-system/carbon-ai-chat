# Markdown override (code snippet, hide detected language label)

`ChatCustomElement` configured with `markdown.customRenderers.codeBlock` so every fenced code block renders through a `cds-aichat-code-snippet` whose `detectLanguage` property is explicitly set to `false` — overriding the markdown component's default of `true`. Bare fences no longer show the detected language label in the snippet header; explicit fence languages still display their label.

## What this example shows

- Replacing the default code-block renderer with a `customRenderers.codeBlock` callback that returns JSX.
- Setting `detectLanguage={false}` on `cds-aichat-code-snippet` to override the markdown component's default and hide the auto-detected language label.
- Wrapping the snippet in `<Card isFlush>` to match the default Carbon shell.
- Memoizing the `markdown` config with `useMemo` so renderer identity is stable across renders.

## When to use this pattern

- You want bare code fences to render with highlighting but without a "language: …" label that may be a wrong guess.
- You are wrapping `cds-aichat-code-snippet` for any reason and want to control its header chrome explicitly.
- You need a starting point for a more elaborate code-block override (custom actions, theme picker, virtualization).

## APIs and props demonstrated

| Symbol                                    | Package / kind                     | Role in this example                                                                     |
| ----------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `ChatCustomElement`                       | `@carbon/ai-chat` component        | Mounts the chat into a fullscreen host element.                                          |
| `PublicConfig`                            | `@carbon/ai-chat` type             | Types the config object passed to `ChatCustomElement`.                                   |
| `ChatContainerPropsMarkdown`              | `@carbon/ai-chat` type             | Shape of the `markdown` prop.                                                            |
| `MarkdownRendererCodeBlockArgs`           | `@carbon/ai-chat` type             | Argument shape for the codeBlock renderer (`language`, `code`, …).                       |
| `markdown.customRenderers.codeBlock`      | config prop                        | Replaces the default fenced-code renderer with a JSX wrapper.                            |
| `Card` (`cds-aichat-card`)                | `@carbon/ai-chat-components` React | Wraps the snippet to match the default Carbon shell.                                     |
| `CodeSnippet` (`cds-aichat-code-snippet`) | `@carbon/ai-chat-components` React | Renders the code; receives `detectLanguage={false}` to hide the detected language label. |
| `messaging.customSendMessage`             | config prop                        | Mock backend that emits two contrasting fences in every reply.                           |
| `layout.showFrame`                        | config prop                        | Disables the built-in frame so the host owns the layout.                                 |
| `openChatByDefault`                       | config prop                        | Mounts straight into the conversation, no launcher.                                      |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-markdown-override
```

See [../README.md](../README.md) for the full setup walkthrough.
