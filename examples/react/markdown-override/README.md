# Markdown overrides (code block, table, link, image, checklist)

`ChatCustomElement` configured with `markdown.customRenderers` to demonstrate all five override hooks at once: replacing the fenced-code renderer (`codeBlock`), replacing the table renderer (`table`), rewriting link attributes (`link`), resolving and decorating images (`image`), and making task-list checkboxes actionable (`checklist`).

## What this example shows

- **`codeBlock`** (element replacement) — render fenced code through a `cds-aichat-code-snippet` with `detectLanguage={false}`, returning JSX wrapped in `<Card isFlush>`.
- **`table`** (element replacement) — render markdown tables through a Carbon `DataTable` (`Table`/`TableHead`/`TableRow`/…) from `@carbon/react` instead of the default `cds-aichat-table`. The returned element is hosted in page light DOM, so the page's global `@carbon/styles` CSS styles it.
- **`link`** (attribute transform) — append a `utm_source` query param to every anchor and keep navigation in the same tab (`target="_self"`). The callback returns attribute overrides; the framework still renders the `<a>` and its rich children.
- **`image`** (attribute transform) — resolve a custom `app-image:` reference to a real `src` and make the image clickable (inline `onclick` shows an alert). The pattern for swapping in an authenticated CDN URL and decorating the element.
- **`checklist`** (behavior hook) — make task-list checkboxes actionable. Toggles are logged to the console and persisted in a ref, fed back through `getChecked` so they survive re-renders/streaming.
- Memoizing the `markdown` config with `useMemo` (with checklist state in a `useRef`) so renderer identity stays stable across renders.

## When to use this pattern

- **Tables** — render through your own data table for sorting, density, or theming control.
- **Links** — rewrite targets, add tracking/context query params per page, or normalize external vs internal links.
- **Images** — swap markdown image references for authenticated or CDN-hosted URLs, add `loading="lazy"`, constrain dimensions, or attach click behavior.
- **Checklists** — persist checklist state to your backend so AI-generated task lists actually do something.
- **Code blocks** — control snippet chrome, add custom actions, or wrap the snippet for theming.

## APIs and props demonstrated

| Symbol                                    | Package / kind                     | Role in this example                                                             |
| ----------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| `ChatCustomElement`                       | `@carbon/ai-chat` component        | Mounts the chat into a fullscreen host element.                                  |
| `PublicConfig`                            | `@carbon/ai-chat` type             | Types the config object passed to `ChatCustomElement`.                           |
| `ChatContainerPropsMarkdown`              | `@carbon/ai-chat` type             | Shape of the `markdown` prop, including `customRenderers`.                       |
| `markdown.customRenderers.codeBlock`      | config field                       | Replaces the default fenced-code renderer with a JSX wrapper.                    |
| `markdown.customRenderers.table`          | config field                       | Replaces the default table renderer with a Carbon `DataTable`.                   |
| `markdown.customRenderers.link`           | config field                       | Returns attribute overrides (`href`, `target`, `rel`) for anchors.               |
| `markdown.customRenderers.image`          | config field                       | Returns attribute overrides (`src`, `style`, `onclick`) for images.              |
| `markdown.customRenderers.checklist`      | config field                       | `onToggle` + `getChecked` to persist and react to task-list state.               |
| `MarkdownRendererCodeBlockArgs`           | `@carbon/ai-chat` type             | Argument shape for the codeBlock renderer (`language`, `code`, …).               |
| `MarkdownRendererTableArgs`               | `@carbon/ai-chat` type             | Argument shape for the table renderer (`headers`, `rows`, …).                    |
| `MarkdownRendererLinkArgs`                | `@carbon/ai-chat` type             | Argument shape for the link renderer (`href`, `title`, `text`, `attributes`, …). |
| `MarkdownRendererImageArgs`               | `@carbon/ai-chat` type             | Argument shape for the image renderer (`src`, `alt`, `title`, `attributes`, …).  |
| `Card` (`cds-aichat-card`)                | `@carbon/ai-chat-components` React | Wraps the snippet to match the default Carbon shell.                             |
| `CodeSnippet` (`cds-aichat-code-snippet`) | `@carbon/ai-chat-components` React | Renders the code; receives `detectLanguage={false}`.                             |
| `Table` and friends                       | `@carbon/react`                    | The data table the `table` override renders.                                     |
| `messaging.customSendMessage`             | config prop                        | Mock backend that emits a reply exercising every hook.                           |
| `layout.showFrame`                        | config prop                        | Disables the built-in frame so the host owns the layout.                         |
| `openChatByDefault`                       | config prop                        | Mounts straight into the conversation, no launcher.                              |

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
