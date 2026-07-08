# Markdown overrides (code block, table, link, image, checklist)

`<cds-aichat-custom-element>` mounted directly in page light DOM and configured with `markdown.customRenderers` to demonstrate all five override hooks at once: replacing the fenced-code renderer (`codeBlock`), replacing the table renderer (`table`), rewriting link attributes (`link`), resolving and decorating images (`image`), and making task-list checkboxes actionable (`checklist`).

## What this example shows

- **`codeBlock`** (element replacement) — render fenced code through a `cds-aichat-code-snippet` with `detectLanguage = false`, returning an `HTMLElement`. The rendered `cds-aichat-card` host is cached by `slotName` so streaming re-renders update the same DOM nodes.
- **`table`** (element replacement) — render markdown tables through a Carbon `cds-table` from `@carbon/web-components`, rendered into a cached wrapper with Lit's `render` (also keyed by `slotName`).
- **`link`** (attribute transform) — append a `utm_source` query param to every anchor and keep navigation in the same tab (`target="_self"`). The callback returns attribute overrides; the framework still renders the `<a>` and its rich children.
- **`image`** (attribute transform) — resolve a custom `app-image:` reference to a real `src` and make the image clickable (inline `onclick` shows an alert). The pattern for swapping in an authenticated CDN URL and decorating the element.
- **`checklist`** (behavior hook) — make task-list checkboxes actionable. Toggles are logged to the console and persisted in a `Map`, fed back through `getChecked` so they survive re-renders/streaming.
- Setting `markdown` as a JS property on `<cds-aichat-custom-element>` directly in `index.html` (no wrapping custom element).

## When to use this pattern

- **Tables** — render through your own data table for sorting, density, or theming control.
- **Links** — rewrite targets, add tracking/context query params per page, or normalize external vs internal links.
- **Images** — swap markdown image references for authenticated or CDN-hosted URLs, add `loading="lazy"`, constrain dimensions, or attach click behavior.
- **Checklists** — persist checklist state to your backend so AI-generated task lists actually do something.
- **Code blocks** — control snippet chrome, add custom actions, or wrap the snippet for theming.

## APIs and props demonstrated

| Symbol                               | Kind                          | Role in this example                                                        |
| ------------------------------------ | ----------------------------- | --------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`        | custom element                | Hosts the chat UI at the size of its CSS box.                               |
| `.markdown`                          | property (`attribute: false`) | Carries the `customRenderers` object to the chat's renderer.                |
| `WCMarkdown`                         | `@carbon/ai-chat` type        | Shape of the value bound to `.markdown`.                                    |
| `WCCustomMarkdownRenderers`          | `@carbon/ai-chat` type        | Shape of `markdown.customRenderers`.                                        |
| `markdown.customRenderers.codeBlock` | config field                  | Replaces the default fenced-code renderer (returns an `HTMLElement`).       |
| `markdown.customRenderers.table`     | config field                  | Replaces the default table renderer with a Carbon `cds-table`.              |
| `markdown.customRenderers.link`      | config field                  | Returns attribute overrides (`href`, `target`, `rel`) for anchors.          |
| `markdown.customRenderers.image`     | config field                  | Returns attribute overrides (`src`, `style`, `onclick`) for images.         |
| `markdown.customRenderers.checklist` | config field                  | `onToggle` + `getChecked` to persist and react to task-list state.          |
| `MarkdownRendererCodeBlockArgs`      | `@carbon/ai-chat` type        | Argument shape for the codeBlock callback (`language`, `code`, `slotName`). |
| `MarkdownRendererTableArgs`          | `@carbon/ai-chat` type        | Argument shape for the table callback (`headers`, `rows`, `slotName`, …).   |
| `MarkdownRendererLinkArgs`           | `@carbon/ai-chat` type        | Argument shape for the link callback (`href`, `title`, `text`, …).          |
| `MarkdownRendererImageArgs`          | `@carbon/ai-chat` type        | Argument shape for the image callback (`src`, `alt`, `title`, …).           |
| `<cds-aichat-card>` (`is-flush`)     | custom element                | Wraps the snippet to match the default Carbon shell.                        |
| `<cds-aichat-code-snippet>`          | custom element                | Renders the code; receives `detectLanguage`, `language`, `highlight`.       |
| `<cds-table>` and friends            | `@carbon/web-components`      | The data table the `table` override renders with Lit.                       |
| `messaging.customSendMessage`        | property                      | Mock backend that emits a reply exercising every hook.                      |

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
