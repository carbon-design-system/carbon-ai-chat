# indexer-contract.md — examples README format

Use this format for each README. The repo indexer reads it; `ci-check` checks it.

## Required sections (in order)

- `## What this example shows` — one bullet per capability.
- `## When to use this pattern` — one bullet per use case.
- `## APIs and props demonstrated` — a three-column table:

  ```markdown
  | Symbol | Package / kind | Role in example |
  | --- | --- | --- |
  | `ChatContainer` | `@carbon/ai-chat` / React component | Mounts the chat UI. |
  ```

## Format rules

1. Match the section headers exactly, including case and "this".
2. Start bullets with a capital letter and end them with a period.
3. Use exactly three table columns with the headers above.
4. For a section that does not apply, use `N/A - <reason>` instead of leaving it empty.

The indexer checks all sections, headers, and table columns. It rejects empty sections. A failed README does not appear on the docs site.

## Title naming

Match the `# H1` title to the slug family. This groups related examples in the list.

| Slug | Title format | Example |
| --- | --- | --- |
| Prefix shared by 3+ siblings | `<Prefix> / <Variant>`; capitalize prefix, sentence-case variant | `prompt-line-typeahead` → `Prompt line / Typeahead` |
| `basic-*` | `Basic / <Variant>` | `Basic / Float` |
| Variant of one base | `<Base name> (<variant>)` | `Workspace (sidebar)` |
| No shared family | Flat sentence case | `Feedback` |
| Variant of a slash-family entry | Append variant in parens; keep one slash | `Prompt line / Typeahead (custom list)` |

Capitalize a new family prefix even for a singleton when you expect siblings, such as `Integrations / watsonx.ai`.

## Templates

- [Reference implementation](../react/basic-custom-element-fullscreen/README.md)
- [New-example template](../README_TEMPLATE.md)

## Related guidance

- [examples/AGENTS.md](../AGENTS.md) — example authoring rules
