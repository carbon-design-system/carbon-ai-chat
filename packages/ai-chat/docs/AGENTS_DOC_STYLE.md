# AGENTS_DOC_STYLE.md — `@carbon/ai-chat` docs markdown style

Load this when authoring **net-new** docs in [packages/ai-chat/docs/](.). Routine edits don't need it.

## Heading hierarchy

| Level       | Use                         |
| ----------- | --------------------------- |
| `#` (H1)    | Page title — one per page   |
| `##` (H2)   | Major sections              |
| `###` (H3)  | Subsections                 |
| `####` (H4) | Sub-subsections — sparingly |

## API page outline

Every API page should include, in order:

1. **Overview** — one-paragraph summary of purpose.
2. **Installation** — import statement and basic setup.
3. **Props/Parameters** — detailed parameter documentation.
4. **Events** (if applicable) — custom events emitted.
5. **Methods** (if applicable) — public methods.
6. **Examples** — code examples for common use cases.
7. **Accessibility** — a11y considerations.
8. **Related** — links to related APIs.

## Code blocks

Always tag the language for syntax highlighting. Supported: `typescript`, `javascript`, `tsx`, `jsx`, `html`, `css`, `scss`, `bash`, `json`.

```typescript
const config: MessagingConfig = {
  apiKey: "your-key",
};
```

## Lists

- **Unordered** for non-sequential items.
- **Ordered** for sequential steps.
- **Definition** for term/definition pairs:

```markdown
**Term**: Definition of the term.
```

## Links

| Kind                   | Form                                                     |
| ---------------------- | -------------------------------------------------------- |
| Internal (within docs) | `[ChatContainer](./ChatContainer.md)`                    |
| External               | `[Carbon Design System](https://carbondesignsystem.com)` |
| Anchor (same page)     | `[Props](#props)`                                        |

Prefer TypeDoc `{@link SymbolName}` for API references — survives renames and is validated by `validation.invalidLink`.

## Tables

Use tables for structured data (props, parameters, return values):

```markdown
| Name     | Type                | Default   | Description                |
| -------- | ------------------- | --------- | -------------------------- |
| `apiKey` | `string`            | -         | API key for authentication |
| `theme`  | `'light' \| 'dark'` | `'light'` | Visual theme               |
```

Table guidelines:

- Cells ≤ 50 chars.
- Code-format values: `` `string` ``.
- Use `-` for required parameters (no default).
- Align columns for source readability.

## Admonitions

Use blockquotes for callouts:

```markdown
> **Note**: This feature requires version 2.0 or higher.

> **Warning**: This method is deprecated. Use `newMethod()` instead.

> **Tip**: You can customize this behavior with the `customHandler` prop.
```

## Related guidance

- [docs/AGENTS.md](AGENTS.md) — authoring rules and publishing flow
