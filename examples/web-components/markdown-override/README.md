# Markdown override (code snippet, hide detected language label)

`<cds-aichat-custom-element>` mounted directly in page light DOM and configured with `markdown.customRenderers.codeBlock` so every fenced code block renders through a `cds-aichat-code-snippet` whose `detectLanguage` property is explicitly set to `false` — overriding the markdown component's default of `true`. Bare fences no longer show the detected language label in the snippet header; explicit fence languages still display their label.

## What this example shows

- Setting `markdown` as a JS property on `<cds-aichat-custom-element>` and supplying a `customRenderers.codeBlock` callback that returns an `HTMLElement`.
- Caching the rendered `cds-aichat-card` host by `slotName` so streaming re-renders update the same DOM nodes instead of replacing them.
- Setting `detectLanguage = false` on `cds-aichat-code-snippet` to override the markdown component's default and hide the auto-detected language label.
- Mounting `<cds-aichat-custom-element>` directly in `index.html` (no wrapping custom element) for consistency with the rest of the markdown-extensibility examples.

## When to use this pattern

- You want bare code fences to render with highlighting but without a "language: …" label that may be a wrong guess.
- You are wrapping `cds-aichat-code-snippet` for any reason and want to control its header chrome explicitly.
- You need a starting point for a more elaborate code-block override (custom actions, theme picker, virtualization).

## APIs and props demonstrated

| Symbol                               | Kind                          | Role in this example                                                       |
| ------------------------------------ | ----------------------------- | -------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`        | custom element                | Hosts the chat UI at the size of its CSS box.                              |
| `.markdown`                          | property (`attribute: false`) | Carries the `customRenderers` object to the chat's renderer.               |
| `WCMarkdown`                         | `@carbon/ai-chat` type        | Shape of the value bound to `.markdown`.                                   |
| `WCCustomMarkdownRenderers`          | `@carbon/ai-chat` type        | Shape of `markdown.customRenderers`.                                       |
| `markdown.customRenderers.codeBlock` | config field                  | Replaces the default fenced-code renderer.                                 |
| `MarkdownRendererCodeBlockArgs`      | `@carbon/ai-chat` type        | Argument shape passed to the callback (`language`, `code`, `slotName`, …). |
| `<cds-aichat-card>` (`is-flush`)     | custom element                | Wraps the snippet to match the default Carbon shell.                       |
| `<cds-aichat-code-snippet>`          | custom element                | Renders the code; receives `detectLanguage`, `language`, `highlight`.      |
| `.detectLanguage`                    | property                      | Set to `false` here to hide the auto-detected language label.              |
| `messaging.customSendMessage`        | property                      | Mock backend that emits two contrasting fences in every reply.             |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-markdown-override
```

See [../README.md](../README.md) for the full setup walkthrough.
