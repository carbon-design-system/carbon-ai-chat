This file provides guidance to agents when working with code in this repository.

It is a **router**: find your package and your task below, then read the linked file. Detail lives in [references/](references/) and in each package's own `AGENTS.md` — this file points, it does not restate.

## Always-on rules

A few things hold everywhere, regardless of what you touch:

- **Tests and workspace deps read built output** (`dist/es/`, `es/`), not TS sources. A fresh checkout or worktree needs `npm install && npm run aiChat:build`. Before a test that reads built output, show the build is current; existing output or an earlier exit 0 is not proof → [build preflight](references/commands.md#build-preflight). Guidance-only edits need no build.
- **Ask before you start a build or watcher the user didn't request.** Most developers keep `npm run aiChat:start` running, and a parallel build races it.
- **Read [worktrees.md](references/worktrees.md) before you create, enter, move, or remove a worktree.** Create worktrees with git in `../<repo>.worktrees/<slug>`, never in `/tmp`, a scratchpad, or inside the checkout. Claude Code's own worktrees (`--worktree`, `EnterWorktree`, `isolation: "worktree"`) land inside the checkout, so this repo doesn't use them.
- **Edit source, not generated output**: `dist/`, `es/`, `es-custom/`, `storybook-static/`, `storybook-react-static/`, `node_modules/`, `packages/ai-chat-components/custom-elements.json`, `telemetry.yml`, and the release-owned `packages/ai-chat/docs/api/markdown/` and `packages/ai-chat/docs/api/symbol-index.json` → [docs guidance](packages/ai-chat/docs/AGENTS.md). Skip them in discovery and regenerate them with the documented commands. When a check needs them, inspect only a changed component's regenerated manifest entry or a changed symbol's locally rendered TypeDoc page.
- **Lint, format, and test through the npm scripts**, never the underlying binary. `npx prettier`, bare `eslint`, and `stylelint` drop the scripts' ignore globs and reformat generated output → [commands.md](references/commands.md).
- **UI changes meet WCAG 2.1 AA** → [accessibility.md](references/accessibility.md) (checklist, live-region patterns, announcer utilities). With browser automation available, also check the change visually.
- **Use sub-agents, when available, for independent reviews and parallel discovery.** A sub-agent sees none of this conversation, so its brief carries the goal, the constraints, and any approval it relies on, such as a build the user allowed. Do small lookups yourself.

## Repository layout

- `examples/react/*` and `examples/web-components/*` — Vite examples; default port 3000 (override with `PORT=`). Exceptions that are not Vite: `frameworks-next/` (Next.js), `tests-jest-*` (Jest only).
- `docs/` — developer handbook, peer-dep history, architecture decision records. Not the consumer-facing site (that lives in `packages/ai-chat/docs/`).

## Which package am I editing?

Read that package's `AGENTS.md` before your first edit. Each one routes onward to its own topic references (architecture, services, tests, types…) with "read when" triggers — so this table stops at the package boundary.

| Editing… | Read |
| --- | --- |
| `packages/ai-chat/` | [packages/ai-chat/AGENTS.md](packages/ai-chat/AGENTS.md) |
| `packages/ai-chat-components/` | [packages/ai-chat-components/AGENTS.md](packages/ai-chat-components/AGENTS.md) |
| `packages/typedoc-theme/` | [packages/typedoc-theme/AGENTS.md](packages/typedoc-theme/AGENTS.md) |
| `demo/` | [demo/AGENTS.md](demo/AGENTS.md) |
| `examples/**` | [examples/AGENTS.md](examples/AGENTS.md) (+ [react](examples/react/AGENTS.md) / [web-components](examples/web-components/AGENTS.md) deltas) |

## What am I doing?

| Topic | Read |
| --- | --- |
| Writing or changing code, including Carbon flavor | [code-patterns.md](references/code-patterns.md) |
| Understanding why a public-API decision went the way it did | [docs/adr/README.md](docs/adr/README.md) |
| Commits, branches, PR titles, license headers | [conventions.md](references/conventions.md) |
| Building, testing, linting, or using prettier | [commands.md](references/commands.md) |
| Adding a root-level Node script (`scripts/` vs `tools/`) | [commands.md](references/commands.md#scripts-vs-tools) |
| Choosing a gate before shipping, and reporting its result | [definition-of-done.md](references/definition-of-done.md) |
| Measuring a diff before review (PR size, complexity, coupling, smells, size vs precedent) | [measuring.md](references/measuring.md) |
| Writing copy of any kind — how the words sound | [tone.md](references/tone.md) |
| Sizing a change or splitting it into PRs or a stack | [pr-reviewability.md](references/pr-reviewability.md) |
| Editing an `AGENTS.md`, `references/`, or skill file | [authoring-agents-md.md](references/authoring-agents-md.md) |

Working drafts are git-ignored and never committed: plans in `.github/plan-drafts/{name}/`, PR descriptions in `.github/pr-drafts/`, issue bodies in `.github/issue-drafts/`, ADR drafts in `.github/adr-drafts/`. An ADR draft is the one that graduates — it moves into [docs/adr/](docs/adr/README.md) and is committed.
