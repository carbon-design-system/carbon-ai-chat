# Carbon Builder Skill

A portable AI skill that turns any AI agent into an expert Carbon Design System engineer.
It retrieves live component examples, variants, props, and documentation from the
**carbon-mcp** MCP server, generates production-quality Carbon React and Web Components
UI code, and builds Carbon Charts across all supported frameworks.

```text
      +-------------------+        +----------------------+        +----------------------+
      |   AI Agent/User   | -----> | skill: carbon-builder | -----> |   MCP: carbon-mcp    |
      +-------------------+        +----------------------+        +----------------------+
                                             |                           |
                                             v                           v
                                   +------------------+        +----------------------+
                                   | protocol/rules   |        | code_search          |
                                   | + guardrails     |        | docs_search          |
                                   +------------------+        | get_charts           |
                                                               +----------------------+
```

---

## Distribution

The skill is distributed as a single zip archive:

```
carbon-builder-skill-v1.0.0.zip
└── carbon-builder/
    ├── SKILL.md
    ├── README.md
    └── references/
        └── *.md
```

**To install:** download the zip, unzip it, and copy or move the `carbon-builder/` directory
to the appropriate path for your client (see [Installation](#installation) below).

When a new version is released, download the updated zip and replace the `carbon-builder/`
directory in all locations where you installed it. Start a new agent session to pick up
the changes.

---

## Contents

```
carbon-builder/
├── SKILL.md                         ← Skill entry point (shared across all clients)
├── README.md                        ← This file
└── references/
    ├── data-model.md                ← Full schema for code_search, docs_search & get_charts
    ├── framework-rules.md           ← React vs Web Components enforcement + IBM Plex rules
    ├── implementation-guardrails.md ← Stability, SSR, package, styling, and layout guardrails
    ├── query-protocols.md           ← Query optimization strategy + special cases
    ├── ai-chat-protocols.md         ← AI Chat file completeness rule + query patterns
    ├── charts-protocols.md          ← Carbon Charts 2-call convention, assembly hints
    ├── result-validation.md         ← Result reconciliation, complex queries, a11y protocol
    └── error-recovery.md            ← Error recovery, fallbacks, performance + QA checklist
```

---

## Prerequisites

Before using this skill, configure the **carbon-mcp MCP server** in your agent. The skill
relies on three tools the server exposes:

| Tool          | Purpose                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| `code_search` | Fetch component examples, variants, props, and AI Chat code               |
| `docs_search` | Fetch design/accessibility documentation and AI Chat API docs             |
| `get_charts`  | Fetch Carbon Charts source code, data/options schemas, and assembly hints |

See the carbon-mcp server documentation for installation and configuration.

**Carbon v11 note for generated React apps:**

- Use `@carbon/react/scss/` SCSS imports — never `@carbon/styles/css/styles.css` (see `references/framework-rules.md` Rule 5)
- `@carbon/styles` is a transitive dependency of `@carbon/react`; no separate install is required
- Add `sass` to devDependencies if SCSS compilation is not already configured

---

## Single SKILL.md — Cross-client compatibility

This skill uses a single `SKILL.md` file across all clients. Different clients parse the
YAML frontmatter differently:

| Frontmatter field           | Claude Code             | IBM Bob                                   | Other clients        |
| --------------------------- | ----------------------- | ----------------------------------------- | -------------------- |
| `name`                      | ✅ skill identifier     | ✅ skill identifier                       | rendered as raw text |
| `title`                     | ignored (uses `name`)   | ignored (uses `name`)                     | rendered as raw text |
| `description`               | ✅ activation trigger   | ✅ activation trigger                     | rendered as raw text |
| `version`                   | ignored (informational) | ignored (informational)                   | rendered as raw text |
| `allowed-tools`             | ✅ enforced             | not enforced — Bob uses MCP server config | ignored              |
| `license`, `author`, `tags` | ignored                 | ignored                                   | rendered as raw text |

**Bob note:** `allowed-tools` has no effect in Bob. Tool access is governed by which tools
are registered in the MCP server configuration. The skill instructions constrain which
tools the agent calls.

**Other clients:** Clients that do not parse YAML frontmatter render the frontmatter block
as raw text. This is cosmetic only — all actionable instructions live below the delimiter.

**Reference files:** Claude Code and IBM Bob auto-load the `references/` directory on
demand. All other clients require the reference content to be manually inlined.

---

## Installation

### IBM Bob

IBM Bob supports skills natively. Place the skill in `.bob/skills/` at your project root
(project-scoped) or in `~/.bob/skills/` (global).

> **Requires Advanced mode.** By default Bob requests approval before activating a skill.
> Configure Auto-Approve in Bob's settings to suppress the confirmation prompt.

**Project-scoped:**

```bash
mkdir -p /path/to/your-project/.bob/skills
cp -r carbon-builder /path/to/your-project/.bob/skills/
```

Commit `.bob/skills/carbon-builder/` to your repository so the skill is shared across the
team without each developer needing to install it separately.

**Global:**

```bash
mkdir -p ~/.bob/skills
cp -r carbon-builder ~/.bob/skills/
```

Bob reads `name` and `description` from `SKILL.md` to determine when to activate the skill.
The `references/` files are automatically available to Bob once the skill is active.

Verify the skill is visible by running `/list-skills` inside Bob.

---

### Claude Code

Claude Code discovers skills automatically from `.claude/skills/` at your project root.
No additional configuration is needed beyond having carbon-mcp configured as an MCP server.

**Project-scoped (recommended for teams):**

```bash
# From the directory where you unzipped the download
mkdir -p /path/to/your-project/.claude/skills
cp -r carbon-builder /path/to/your-project/.claude/skills/
```

Commit `.claude/skills/carbon-builder/` to your repository so the skill is version-tracked
alongside the project and available to every developer on the team without a separate install.

**Global (available in all projects on this machine):**

```bash
mkdir -p ~/.claude/skills
cp -r carbon-builder ~/.claude/skills/
```

---

### Cursor

Cursor uses MDC-format rule files in `.cursor/rules/`. Create a rule file with the skill
content:

```bash
mkdir -p .cursor/rules
```

Create `.cursor/rules/carbon-builder.mdc`:

```
---
description: Carbon Design System expert — activate for Carbon components, Charts, IBM Products, AI Chat, and icons
alwaysApply: false
---

[paste the body of SKILL.md here — everything below the closing --- of the frontmatter]

[paste any reference file content from the references/ directory you want included]
```

> Cursor does not auto-load the `references/` directory. Inline the content of any
> reference files you need directly into the MDC file, or create additional
> `.mdc` rule files with `alwaysApply: false`.

Ensure carbon-mcp is configured as an MCP server in Cursor's settings.

---

### Windsurf (Codeium)

Windsurf supports custom rules in `.windsurf/rules/`. Create a Markdown rule file:

```bash
mkdir -p .windsurf/rules
```

Create `.windsurf/rules/carbon-builder.md`:

```markdown
# Carbon Builder

[paste the body of SKILL.md here — everything below the closing --- of the frontmatter]
```

Windsurf activates rules based on description match and workspace context. Inline
reference file content as needed for full protocol coverage.

Ensure carbon-mcp is configured as an MCP server in Windsurf's settings.

---

### GitHub Copilot

Copilot uses a single `.github/copilot-instructions.md` for custom instructions. Append
the skill content to that file (run from the directory where you unzipped the download):

```bash
mkdir -p .github
# Strip YAML frontmatter (between the two --- delimiters) then append
awk '/^---/{f++} f==2{print}' carbon-builder/SKILL.md >> .github/copilot-instructions.md
```

> Copilot does not support multi-file skill structures. For full coverage, also append
> the content of each file in `carbon-builder/references/` to `copilot-instructions.md`.

---

### Cline (VS Code)

Cline reads project rules from `.clinerules` at the project root (run from the directory
where you unzipped the download):

```bash
awk '/^---/{f++} f==2{print}' carbon-builder/SKILL.md > .clinerules
```

Cline supports MCP servers natively. Ensure carbon-mcp is configured in Cline's MCP
settings. Append reference file content to `.clinerules` for complete protocol coverage.

---

### Continue.dev

Add the skill instructions as a custom system prompt in `.continue/config.json`:

```json
{
  "systemMessage": "[paste the body of SKILL.md here — everything below the closing --- of the frontmatter]"
}
```

Configure carbon-mcp as an MCP server in the same config file. Inline reference file
content directly into the system message for full coverage.

---

### Aider

Aider reads `CONVENTIONS.md` from the project root as a system-level instruction file
(run from the directory where you unzipped the download):

```bash
awk '/^---/{f++} f==2{print}' carbon-builder/SKILL.md > CONVENTIONS.md
```

Aider supports MCP servers via `--mcp-server` (recent versions). Confirm your Aider
version supports MCP before configuring carbon-mcp. Without MCP, the three tools are
unavailable and the skill degrades to static guidance only.

---

## Compatibility

| Agent              | Skill support                | Install path                        | Reference files    | Tool restriction                 |
| ------------------ | ---------------------------- | ----------------------------------- | ------------------ | -------------------------------- |
| **Claude Code**    | ✅ Native SKILL.md           | `.claude/skills/carbon-builder/`    | ✅ Auto-loaded     | ✅ `allowed-tools` enforced      |
| **IBM Bob**        | ✅ Native SKILL.md           | `.bob/skills/carbon-builder/`       | ✅ Auto-loaded     | ⚠️ MCP server config governs     |
| **Cursor**         | ⚠️ MDC rules (manual adapt)  | `.cursor/rules/carbon-builder.mdc`  | ⚠️ Inline manually | —                                |
| **Windsurf**       | ⚠️ Rules (manual adapt)      | `.windsurf/rules/carbon-builder.md` | ⚠️ Inline manually | —                                |
| **GitHub Copilot** | ⚠️ `copilot-instructions.md` | `.github/copilot-instructions.md`   | ⚠️ Inline manually | —                                |
| **Cline**          | ⚠️ `.clinerules`             | `.clinerules`                       | ⚠️ Inline manually | —                                |
| **Continue.dev**   | ⚠️ System prompt             | `.continue/config.json`             | ⚠️ Inline manually | —                                |
| **Aider**          | ⚠️ `CONVENTIONS.md`          | `CONVENTIONS.md`                    | ⚠️ Inline manually | ⚠️ MCP support varies by version |

---

## Capabilities

| Capability                | Description                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Component code generation | Production-quality React JSX or Web Components (Lit) with correct imports              |
| Variant selection         | Picks the right variant by `variant_is_default` or user intent                         |
| Props validation          | Cross-validates against `props_schema` before emitting code                            |
| IBM Products support      | Handles both Carbon Core (`@carbon/react`) and IBM Products (`@carbon/ibm-products`)   |
| Icons & Pictograms        | Finds icons/pictograms by name, slug, or keyword                                       |
| Accessibility guidance    | Retrieves targeted a11y documentation per component                                    |
| AI Chat examples          | Fetches complete AI Chat example file sets (React or Web Components)                   |
| AI Chat API docs          | Retrieves `PublicChatState`, `ChatInstance`, `PublicConfig`, migration docs            |
| IBM Plex font             | Enforces correct IBM Plex font application via SCSS tokens                             |
| Multi-component           | Handles requests spanning multiple Carbon components                                   |
| Carbon Charts             | Retrieves chart source code, data/options schemas, and assembly hints via `get_charts` |
| Error recovery            | Retries with alias normalization, `ibm_products` toggle, UIShell phrasing              |

---

## Activation Triggers

The skill activates when the user asks about:

- Carbon components by name (Button, Modal, DataTable, Accordion, etc.)
- IBM Products components (AboutModal, CreateTearsheet, etc.)
- Carbon icons or pictograms
- Carbon React or Web Components code generation
- IBM Plex font, Carbon spacing tokens, Carbon typography
- AI Chat (Watson/watsonx) integration or example code
- Carbon Design System documentation (usage, style, accessibility, content)
- Carbon Charts — bar, line, pie, donut, area, scatter, bubble, combo, radar, treemap,
  heatmap, gauge, or meter in React, Angular, Vue, Svelte, vanilla JS, or HTML

---

## Example Prompts

```
Build a DataTable with pagination using Carbon React

Show me the Carbon Button variants with all props

What are the accessibility requirements for the Modal component?

Give me the Carbon for IBM Products CreateTearsheet example

Find the carbon icon for "ai governance"

Build an AI Chat basic example in React using the carbon-builder AI Chat patterns

What are the breaking changes in AI Chat migration-1.0.0?

Show me the watsonx AI Chat example — React, all files

Build a bar chart using Carbon Charts in React

Show me all available variants for the Carbon Charts line chart in Angular

Build a donut chart with custom data using Carbon Charts
```

---

## Reference Files

The `references/` directory contains detailed protocols. Claude Code and IBM Bob load
these automatically. For all other clients, inline the relevant content into the client's
instruction file.

| File                           | Contents                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `data-model.md`                | Full schema for `code_search`, `docs_search`, and `get_charts` results                  |
| `framework-rules.md`           | React/Web Components enforcement + IBM Plex font rules                                  |
| `implementation-guardrails.md` | Stability policy, AI Chat SSR safety, package/style requirements, API/layout guardrails |
| `query-protocols.md`           | Full Discover→Canonicalize→Target strategy + special cases                              |
| `ai-chat-protocols.md`         | AI Chat file completeness rule + query patterns                                         |
| `charts-protocols.md`          | Carbon Charts 2-call convention, assembly hints, buildability, error recovery           |
| `result-validation.md`         | Result reconciliation, complex queries, a11y retrieval protocol                         |
| `error-recovery.md`            | Error recovery, fallbacks, performance, QA checklist                                    |

---

## Updating

When a new version of the skill is released:

1. Download the updated zip archive
2. Unzip and replace the `carbon-builder/` directory at each installed location
3. For project-scoped git installs: commit the updated directory
4. For adapted clients (Cursor, Copilot, Cline, etc.): re-run the inline steps
5. Start a new agent session — skills are loaded fresh each session

---

## License

Apache-2.0
