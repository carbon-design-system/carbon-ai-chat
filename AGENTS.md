This file provides guidance to agents when working with code in this repository.

It is a **router**: find your package and your task below, then read the linked file. Detail lives in [references/](references/) and in each package's own `AGENTS.md` — this file points, it does not restate.

## Always-on rules

A few things hold everywhere, regardless of what you touch:

- **First-time setup**: `npm install && npm run aiChat:build`. Workspace deps resolve through built artifacts (`dist/es/`, `es/`), not TS sources — nothing works until this completes, and a changed package is invisible to its consumers until rebuilt.
- **Ask before starting any build/watch yourself.** Most developers keep `npm run aiChat:start` running; a parallel `npm run build` races the watcher.
- Node ≥ 22, npm ≥ 10.
- **Never read or edit generated output**: `dist/`, `es/`, `es-custom/`, `storybook-static/`, `storybook-react-static/`, `node_modules/`, `packages/ai-chat-components/src/react/`, `packages/ai-chat-components/custom-elements.json`, `packages/ai-chat/dist/docs/`, `telemetry.yml`. Regenerate via the documented commands (`npm run custom-elements`, `npm run telemetry:config`).
- **Lint, format, and test through the npm scripts**, never the underlying binary — `npx prettier`, bare `eslint`, and `stylelint` drop the ignore globs the scripts carry and reformat generated output → [commands.md](references/commands.md).
- Every UI change holds **WCAG 2.1 AA** → [accessibility.md](references/accessibility.md) (checklist, live-region patterns, announcer utilities).
- Use **sub-agents** (when available) for code/plan reviews, complex analysis, or parallel work — a fresh perspective without the main conversation's bias keeps the primary thread focused. Be aggressive with tasking additional sub-agents to review work or do discovery in parallel.
- If you support **browser automation or visual inspection**, use it for component development, styling, and integration testing — visual verification catches issues code review alone misses.

## Repository layout

Lerna + npm-workspaces monorepo.

- `packages/ai-chat` — `@carbon/ai-chat`: React + web-component chat app.
- `packages/ai-chat-components` — `@carbon/ai-chat-components`: Lit web components consumed by `@carbon/ai-chat`.
- `packages/typedoc-theme` — `@carbon/typedoc-theme`: Carbon-themed TypeDoc theme used by the `@carbon/ai-chat` docs build.
- `demo/` — full demo app (`@carbon/ai-chat-examples-demo`); Playwright tests under `tests/`.
- `examples/react/*` and `examples/web-components/*` — webpack dev-server examples; default port 3000 (override with `PORT=`).
- `docs/` — developer handbook, peer-dep history. Not the consumer-facing site (that lives in `packages/ai-chat/docs/`).

## Which package am I editing?

Read that package's `AGENTS.md` before your first edit. Each one routes onward to its own topic references (architecture, services, tests, types…) with "read when" triggers — so this table stops at the package boundary.

| Editing…                       | Read                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ai-chat/`            | [packages/ai-chat/AGENTS.md](packages/ai-chat/AGENTS.md)                                                                                    |
| `packages/ai-chat-components/` | [packages/ai-chat-components/AGENTS.md](packages/ai-chat-components/AGENTS.md)                                                              |
| `packages/typedoc-theme/`      | [packages/typedoc-theme/AGENTS.md](packages/typedoc-theme/AGENTS.md)                                                                        |
| `demo/`                        | [demo/AGENTS.md](demo/AGENTS.md)                                                                                                            |
| `examples/**`                  | [examples/AGENTS.md](examples/AGENTS.md) (+ [react](examples/react/AGENTS.md) / [web-components](examples/web-components/AGENTS.md) deltas) |

## What am I doing?

| Topic                                                                        | Read                                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Writing or changing any code                                                 | [code-patterns.md](references/code-patterns.md)                       |
| Choosing `@carbon/react` vs `@carbon/web-components` for the file you're in  | [code-patterns.md](references/code-patterns.md#carbon-flavor-by-area) |
| Commits, branches, PR titles, license headers                                | [conventions.md](references/conventions.md)                           |
| Building, testing, linting, using prettier, or running a single example/test | [commands.md](references/commands.md)                                 |
| Knowing which gate to run before shipping                                    | [definition-of-done.md](references/definition-of-done.md)             |
| Writing developer-facing copy (README/JSDoc/MDX)                             | [tone.md](references/tone.md)                                         |
| Editing an `AGENTS.md`, `references/`, or skill file                         | [authoring-agents-md.md](references/authoring-agents-md.md)           |

Working drafts are git-ignored and never committed: plans in `.github/plan-drafts/{name}/`, PR descriptions in `.github/pr-drafts/`, issue bodies in `.github/issue-drafts/`.

## Conventions

Repo-wide rules live in two canonical guides. Package-level `AGENTS.md` files link here, they do not restate.

- **Code-authoring discipline** — read before writing or changing any code: the laziness ladder & simplicity principles, plus Carbon flavor by area, prefix discipline, SCSS/BEM, RTL logical properties, framework-agnostic logic, component placement, comments → [code-patterns.md](references/code-patterns.md).
- **Process conventions** — commits, branches & PR titles, license headers, commit hooks → [conventions.md](references/conventions.md).
