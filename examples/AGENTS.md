# AGENTS.md — examples (shared)

Guidance that applies to both [react/](react/) and [web-components/](web-components/). Flavor-specific deltas live in each subdirectory's own `AGENTS.md`.

> **Prerequisite**: packages must be built first. See root [AGENTS.md](../AGENTS.md) — examples resolve deps through `dist/es/`.

## Adding a new example

1. **Pick a base and copy it.** Each flavor lists its canonical scaffolds in its own `AGENTS.md`. Both include webpack config, `tsconfig.json`, HTML entry, and `package.json`. Rename the folder to `<slug>` and update the workspace name to the flavor's naming pattern.
2. **Modify only what your example needs to demonstrate.** Keep the bundler, scripts, and file layout unless the example is specifically about a different toolchain (e.g., `vite/`, `next/`, `react-17/`, `jest-*/`). For a different toolchain, copy from the closest matching existing example.
3. **Write a `README.md`** from [README_TEMPLATE.md](README_TEMPLATE.md) — this is required.
4. **Add a row** to the flavor's `README.md` table linking the title to `./<slug>/README.md`.

## Smoke tests

Catches "the example stopped rendering" or "the demonstrated API disappeared" regressions.

- New examples ship with a smoke test.
- Editing an existing example without tests: add a minimal smoke test as part of your change.
- Must cover: rendering without error, plus one assertion per bullet in the README's "What this example shows".
- Expose as `npm test` so it runs via `npm run test --workspace=<example>`.

Flavor-specific smoke-test setup (jsdom vs happy-dom, mounting syntax, reference example to copy) is in the flavor `AGENTS.md`.

## Definition of done

- `npm run build --workspace=<example>` exits 0.
- `npm run test --workspace=<example>` passes (if the example has tests).
- Visual smoke via `npm run start --workspace=<example>` — open chat, send one message, confirm no console errors.
- README follows the Indexer contract below.

## Indexer Contract

Every example README must follow a specific structure so the repo indexer can parse and display examples correctly.

### Required Sections

Each README must include these three sections (in order):

#### 1. What this example shows

List the capabilities demonstrated, one bullet per capability:

```markdown
## What this example shows

- How to initialize the chat with custom configuration.
- How to handle user-defined response types.
- How to integrate with an external authentication system.
```

#### 2. When to use this pattern

List scenarios where this pattern applies, one bullet per scenario:

```markdown
## When to use this pattern

- You need to customize the chat appearance beyond theme variables.
- Your application requires SSO integration.
- You want to add custom message types.
```

#### 3. APIs and props demonstrated

Markdown table with three columns: Symbol name, Package/kind, Role in example

```markdown
## APIs and props demonstrated

| Symbol                        | Package / kind                      | Role in example              |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| `ChatContainer`               | `@carbon/ai-chat` / React component | Main chat UI container       |
| `messaging.customSendMessage` | `@carbon/ai-chat` / config prop     | Intercepts outbound messages |
| `renderUserDefinedResponse`   | `@carbon/ai-chat` / config prop     | Renders custom message types |
```

### Format Rules

1. **Section headers must match exactly** (case-sensitive, including "this" in first header)
2. **Bullets must start with capital letter** and end with period
3. **Table must have exactly 3 columns** with headers as shown
4. **If a section doesn't apply**, use:

   ```markdown
   ## When to use this pattern

   N/A - This is a minimal reference implementation.
   ```

### Validation

The indexer validates:

- All three sections present
- Section headers match exactly
- Table has correct structure
- No empty sections (unless marked N/A)

If validation fails, the example won't appear in the docs site.

### Reference Implementation

See [`examples/react/basic/README.md`](react/basic/README.md) for a complete, valid example.

### Template

Use [`examples/README_TEMPLATE.md`](README_TEMPLATE.md) when creating new examples.

## Related Guidance

- **Parent guidance**: [Root AGENTS.md](../AGENTS.md)
- **React examples**: [react/AGENTS.md](react/AGENTS.md)
- **Web Components examples**: [web-components/AGENTS.md](web-components/AGENTS.md)
