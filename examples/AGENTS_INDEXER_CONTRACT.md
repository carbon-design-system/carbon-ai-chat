# AGENTS_INDEXER_CONTRACT.md — examples README format

Every example README must follow this structure so the repo indexer can parse and display it. Validation runs as part of `ci-check`.

## Required sections (in order)

### 1. `## What this example shows`

One bullet per capability demonstrated:

```markdown
## What this example shows

- How to initialize the chat with custom configuration.
- How to handle user-defined response types.
- How to integrate with an external authentication system.
```

### 2. `## When to use this pattern`

One bullet per scenario where this pattern applies:

```markdown
## When to use this pattern

- You need to customize the chat appearance beyond theme variables.
- Your application requires SSO integration.
- You want to add custom message types.
```

### 3. `## APIs and props demonstrated`

Three-column table — Symbol / Package / kind / Role in example:

```markdown
## APIs and props demonstrated

| Symbol                        | Package / kind                      | Role in example              |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| `ChatContainer`               | `@carbon/ai-chat` / React component | Main chat UI container       |
| `messaging.customSendMessage` | `@carbon/ai-chat` / config prop     | Intercepts outbound messages |
| `renderUserDefinedResponse`   | `@carbon/ai-chat` / config prop     | Renders custom message types |
```

## Format rules

1. **Section headers must match exactly** — case-sensitive, including "this" in the first header.
2. **Bullets** start with a capital letter and end with a period.
3. **Table** has exactly 3 columns with the headers shown above.
4. **If a section doesn't apply**, use `N/A - <reason>`:

   ```markdown
   ## When to use this pattern

   N/A - This is a minimal reference implementation.
   ```

## Validation

The indexer checks:

- All three sections present.
- Section headers match exactly.
- Table has correct structure.
- No empty sections (unless `N/A - <reason>`).

If validation fails, the example won't appear on the docs site.

## Templates

- **Reference implementation**: [examples/react/basic-custom-element-fullscreen/README.md](react/basic-custom-element-fullscreen/README.md)
- **New-example template**: [examples/README_TEMPLATE.md](README_TEMPLATE.md)

## Related guidance

- [examples/AGENTS.md](AGENTS.md) — example authoring rules
