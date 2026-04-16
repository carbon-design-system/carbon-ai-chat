# AGENTS.md — `@carbon/ai-chat` docs

Guidance for authoring inside [packages/ai-chat/docs/](.). The documents here ship to `chat.carbondesignsystem.com` via TypeDoc; treat them as public copy.

`docs/README.md` is a GitHub-only viewer heads-up; it's not in the published site.

## Document Structure

### Heading Hierarchy

Use semantic heading levels:

- **H1** (`#`): Page title only (one per page)
- **H2** (`##`): Major sections
- **H3** (`###`): Subsections
- **H4** (`####`): Sub-subsections (use sparingly)

**Example**:

```markdown
# ChatContainer Component

## Overview

Brief introduction to the component.

## Props

### Required Props

#### messaging

Configuration for message handling.

### Optional Props

#### theme

Visual theme configuration.
```

### Content Organization

**Every API page should include** (in order):

1. **Overview**: One-paragraph summary of purpose
2. **Installation**: Import statement and basic setup
3. **Props/Parameters**: Detailed parameter documentation
4. **Events** (if applicable): Custom events emitted
5. **Methods** (if applicable): Public methods
6. **Examples**: Code examples showing common use cases
7. **Accessibility**: A11y considerations
8. **Related**: Links to related APIs

### Code Blocks

Always specify language for syntax highlighting:

```markdown
\`\`\`typescript
const config: MessagingConfig = {
apiKey: 'your-key'
};
\`\`\`
```

**Supported languages**: `typescript`, `javascript`, `tsx`, `jsx`, `html`, `css`, `scss`, `bash`, `json`

### Lists

**Unordered lists** for non-sequential items:

```markdown
- First item
- Second item
- Third item
```

**Ordered lists** for sequential steps:

```markdown
1. First step
2. Second step
3. Third step
```

**Definition lists** for term/definition pairs:

```markdown
**Term**: Definition of the term.

**Another term**: Another definition.
```

### Links

**Internal links** (within docs):

```markdown
See [ChatContainer](./ChatContainer.md) for details.
```

**External links**:

```markdown
See [Carbon Design System](https://carbondesignsystem.com) for guidelines.
```

**Anchor links** (within same page):

```markdown
See [Props](#props) below.
```

### Tables

Use tables for structured data (props, parameters, return values):

```markdown
| Name     | Type                | Default   | Description                |
| -------- | ------------------- | --------- | -------------------------- |
| `apiKey` | `string`            | -         | API key for authentication |
| `theme`  | `'light' \| 'dark'` | `'light'` | Visual theme               |
```

**Table guidelines**:

- Keep cells concise (≤50 chars)
- Use code formatting for values: `` `string` ``
- Use `-` for required parameters (no default)
- Align columns for readability in source

### Admonitions

Use blockquotes for callouts:

```markdown
> **Note**: This feature requires version 2.0 or higher.

> **Warning**: This method is deprecated. Use `newMethod()` instead.

> **Tip**: You can customize this behavior with the `customHandler` prop.
```

## Code Example Testing

All code examples in documentation must be tested to ensure accuracy.

### Testing Strategy

**Inline examples** (small snippets):

- Copy into relevant example project (e.g., `examples/react/basic/`)
- Verify it compiles without errors
- Run and verify expected behavior
- If example shows error handling, verify error is caught correctly

**Full examples** (complete implementations):

- Create as standalone example in `examples/` directory
- Follow Indexer contract (see `examples/AGENTS.md`)
- Add to example README with link from docs

### Example Validation Checklist

Before publishing docs with code examples:

- [ ] All imports are correct and available in published package
- [ ] All types are exported and accessible
- [ ] Code compiles without TypeScript errors
- [ ] Code runs without runtime errors
- [ ] Example demonstrates the documented behavior
- [ ] Example follows current best practices (e.g., React hooks, memoization)

### Common Example Mistakes

**❌ Using internal imports**:

```typescript
// Don't document internal imports
import { InternalUtil } from "@carbon/ai-chat/src/internal/utils";
```

**✅ Using public API**:

```typescript
// Document public API only
import { ChatContainer } from "@carbon/ai-chat";
```

**❌ Incomplete examples**:

```typescript
// Missing imports and setup
<ChatContainer messaging={config} />
```

**✅ Complete examples**:

```typescript
import { ChatContainer } from '@carbon/ai-chat';
import type { MessagingConfig } from '@carbon/ai-chat';

const config: MessagingConfig = {
  apiKey: 'your-key'
};

function App() {
  return <ChatContainer messaging={config} />;
}
```

**❌ Outdated patterns**:

```typescript
// Old React class component pattern
class App extends React.Component {
  render() {
    return <ChatContainer />;
  }
}
```

**✅ Current patterns**:

```typescript
// Modern React function component with hooks
function App() {
  const config = useMemo(() => ({ apiKey: 'key' }), []);
  return <ChatContainer messaging={config} />;
}
```

### Maintaining Examples

When API changes:

1. Update all affected code examples in docs
2. Update corresponding example projects
3. Run example projects to verify they still work
4. Update TypeDoc comments if examples are in JSDoc

`typedoc/` holds `moduleNamePlugin.js` (a small TypeDoc hook) — only edit when changing TypeDoc behavior. The Carbon theme lives in [`packages/typedoc-theme/`](../../typedoc-theme/); see its [AGENTS.md](../../typedoc-theme/AGENTS.md) for the loading model and authoring rules.

## Authoring rules

- **Audience is external.** No internal code paths, no Slack/Jira references, no TODO notes.
- **Adding a new document**: create the `.md` and register it in `projectDocuments` ([../typedoc.json](../typedoc.json)) at your desired sidebar position. It will not appear otherwise.
- **Renaming or removing a document**: keep URLs stable where possible. If you must break a URL, flag it in the PR — external links depend on them.
- **Cross-links**:
  - Prefer TypeDoc `{@link SymbolName}` for API references — survives renames and is validated by `validation.invalidLink`.
  - Use relative Markdown links (`./React.md`) between project documents.
  - Do not link into `src/` — source paths are internal and the site can't resolve them.
- **API surface**: if a code example references a type/function, make sure it's actually exported from `aiChatEntry.tsx`. Match `categoryOrder` from `typedoc.json` (`React`, `Web component`, `Config`, `Instance`, `Events`, `Service desk`, `Messaging`, `Testing`) when grouping examples.
- **Code blocks**: tag language (` ```tsx `, ` ```ts `, ` ```html `, ` ```bash `) so the Carbon theme syntax-highlights. Keep examples copy-pasteable.
- **Migration docs are append-only** within a major. Don't rewrite history in `Migration-1.0.0.md`; add a new `Migration-<version>.md` for the next major and register it in `projectDocuments`.
- **No emoji** and no marketing language.

## Build + preview

Run `npm run build:docs` from the **monorepo root** (`/Users/ethanwinters/Documents/Git/carbon-ai-chat-fork`) to regenerate. This builds TypeDoc for all packages, not just `@carbon/ai-chat`.

To build docs for only this package:

```bash
cd packages/ai-chat
npm run build:docs
```

The generated docs appear in `packages/ai-chat/dist/docs/`.

From [../](../) (the package root): `npm run build` runs rollup + typedoc; `npm start` runs rollup (watch) + typedoc (watch) + serves `dist/docs/carbon-tsdocs` on `:5001`.

**Run `npm run build` before pushing.** TypeDoc's `validation.invalidLink` rejects broken `{@link ...}` references.

## Related Guidance

- **Parent guidance**: [packages/ai-chat/AGENTS.md](../AGENTS.md)
- **Type conventions**: [../src/types/AGENTS.md](../src/types/AGENTS.md) - JSDoc standards for API docs
- **TypeDoc theme**: [../../typedoc-theme/AGENTS.md](../../typedoc-theme/AGENTS.md) - Theme customization
