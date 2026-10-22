This file provides guidance to agents when working with code in this repository.

It is a **router**: find your package and your task below, then read the linked file. Detail lives in [references/](references/) and in each package's own `AGENTS.md` — this file points, it does not restate.

## Always-on rules

A few things hold everywhere, regardless of what you touch:

- **Set up before running package code**: `npm install && npm run aiChat:build`. Workspace deps resolve through built artifacts (`dist/es/`, `es/`), not TS sources. Guidance-only edits do not need a package build.
- **Establish build freshness before a test that reads built output.** Existing output and a build that exited 0 earlier are not proof. With no evidence, freshness is unknown → [build preflight](references/commands.md#build-preflight).
- **Ask before starting any build/watch yourself.** Most developers keep `npm run aiChat:start` running; a parallel `npm run build` races the watcher.
- **Work from source; never hand-edit generated output**: `dist/`, `es/`, `es-custom/`, `storybook-static/`, `storybook-react-static/`, `node_modules/`, `packages/ai-chat-components/custom-elements.json`, and `telemetry.yml`. Skip these in routine discovery. Regenerate via the documented commands. For required verification, inspect only changed components' freshly regenerated manifest entries or changed symbols' locally rendered TypeDoc pages. Release-owned API paths: `packages/ai-chat/docs/api/markdown/`, `packages/ai-chat/docs/api/symbol-index.json` → [docs guidance](packages/ai-chat/docs/AGENTS.md).
- **Lint, format, and test through the npm scripts**, never the underlying binary — `npx prettier`, bare `eslint`, and `stylelint` drop the ignore globs the scripts carry and reformat generated output → [commands.md](references/commands.md).
- Every UI change holds **WCAG 2.1 AA** → [accessibility.md](references/accessibility.md) (checklist, live-region patterns, announcer utilities).
- Use **sub-agents** (when available) for code/plan reviews, complex analysis, or parallel work — a fresh perspective without the main conversation's bias keeps the primary thread focused. Be aggressive with tasking additional sub-agents to review work or do discovery in parallel.
- If you support **browser automation or visual inspection**, use it for component development, styling, and integration testing — visual verification catches issues code review alone misses.

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
| Measuring a diff before review (complexity, coupling, smells, size vs precedent) | [measuring.md](references/measuring.md) |
| Writing copy of any kind — how the words sound | [tone.md](references/tone.md) |
| Editing an `AGENTS.md`, `references/`, or skill file | [authoring-agents-md.md](references/authoring-agents-md.md) |

Working drafts are git-ignored and never committed: plans in `.github/plan-drafts/{name}/`, PR descriptions in `.github/pr-drafts/`, issue bodies in `.github/issue-drafts/`, ADR drafts in `.github/adr-drafts/`. An ADR draft is the one that graduates — it moves into [docs/adr/](docs/adr/README.md) and is committed.
