This file provides guidance to agents when working with code in this repository.

## TL;DR

- **First-time setup**: `npm install && npm run aiChat:build`. Workspace deps resolve through built artifacts (`dist/es/`, `es/`), not TS sources — nothing works until this completes; a changed package is invisible to its consumers until rebuilt.
- **Before starting any build/watch yourself, ask the user whether `npm run aiChat:start` is already running.** Most developers keep it running; a parallel `npm run build` races the watcher.
- Node ≥ 22, npm ≥ 10.
- Each package has its own `AGENTS.md` with package-specific rules. Read the relevant one before your first edit:
  - [packages/ai-chat/AGENTS.md](packages/ai-chat/AGENTS.md) — `@carbon/ai-chat` (the chat app). Topic siblings (load only what you need): [architecture.md](packages/ai-chat/references/architecture.md), [services.md](packages/ai-chat/references/services.md), [tests.md](packages/ai-chat/references/tests.md). Sub-areas: [src/chat/store/AGENTS.md](packages/ai-chat/src/chat/store/AGENTS.md), [src/types/AGENTS.md](packages/ai-chat/src/types/AGENTS.md), [docs/AGENTS.md](packages/ai-chat/docs/AGENTS.md) (with [docs/references/doc-style.md](packages/ai-chat/docs/references/doc-style.md)).
  - [packages/ai-chat-components/AGENTS.md](packages/ai-chat-components/AGENTS.md) — `@carbon/ai-chat-components` (Lit components).
  - [packages/typedoc-theme/AGENTS.md](packages/typedoc-theme/AGENTS.md) — `@carbon/typedoc-theme` (Carbon-themed TypeDoc theme for the docs site).
  - [demo/AGENTS.md](demo/AGENTS.md) — full demo / integration-test harness.
  - [examples/AGENTS.md](examples/AGENTS.md) — shared example rules (with [indexer-contract.md](examples/references/indexer-contract.md) for README format); flavor deltas in [examples/react/AGENTS.md](examples/react/AGENTS.md) / [examples/web-components/AGENTS.md](examples/web-components/AGENTS.md).
- Do not read or edit generated output: `dist/`, `es/`, `es-custom/`, `storybook-static/`, `storybook-react-static/`, `node_modules/`, `packages/ai-chat-components/src/react/`, `packages/ai-chat-components/custom-elements.json`, `packages/ai-chat/dist/docs/`.
- If you are not Bob, don't read `.bob/` (IBM Bob mode rules — not general guidance).
- **Accessibility** is a repo-wide concern: every UI change in any package must hold WCAG 2.1 AA. Load [accessibility.md](references/accessibility.md) for the checklist, live-region patterns, and the centralized announcer utilities.
- **Figma → code** (translating a design, calling the Carbon MCP server, or using the `carbon-builder` skill): load [figma.md](references/figma.md). The two primary packages are Web Components only — always pass `filters.component_type: "Web Components"` to Carbon MCP unless you are editing [demo/](demo/), [examples/react/](examples/react/), or a `-react.stories.jsx` / `-react.mdx` file.
- **Web development tasks**: if your AI assistant supports browser automation or visual inspection tools (e.g., Bob's Advanced mode, Claude's Computer Use, browser MCP servers), use them for component development, styling work, and integration testing. Visual verification catches issues that code review alone misses.
- **Sub-agents**: use sub-agents (when available) for specialized tasks like code reviews, plan reviews, complex analysis, or parallel work. Sub-agents provide fresh perspective without the main conversation's context bias and keep the primary thread focused.
- **Before writing or changing any code**, follow [code-patterns.md](references/code-patterns.md) — the canonical home for code-authoring discipline (the laziness ladder & simplicity principles, prefix discipline, SCSS, RTL, component placement, comments). Process conventions (commits, branches, license headers, hooks) live in [conventions.md](references/conventions.md). These are the canonical homes — other docs link, not restate.
- **Code reviews** (user-requested or self-review before marking a task done) follow the rubric in [code-review.md](references/code-review.md).
- **Writing a plan** (when the user asks you to draft a multi-PR plan, design doc, or implementation plan before code is written) follow the rubric in [plan-authoring.md](references/plan-authoring.md). Plan files (`PLAN.md`, `PLAN-{N}-{title}.md`) live at the repo root and are git-ignored.
- **Plan reviews** (when the user asks you to review PLAN.md, a design doc, or a multi-PR series before any code is written) follow the rubric in [plan-review.md](references/plan-review.md).
- **Writing a PR description**: when asked to draft or write up a PR, follow [pr.md](references/pr.md).
- **Writing a GitHub issue** (drafting or filing an issue or sub-issue): follow [issue-authoring.md](references/issue-authoring.md).
- **Authoring or running an epic** (an umbrella issue tracking sub-issues): follow [epic-authoring.md](references/epic-authoring.md).
- **Writing developer-facing copy** (README, JSDoc, Storybook MDX, `packages/ai-chat/docs/`): follow [tone.md](references/tone.md) for voice and word economy.

## Repository layout

Lerna + npm-workspaces monorepo.

- `packages/ai-chat` — `@carbon/ai-chat`: React + web-component chat app.
- `packages/ai-chat-components` — `@carbon/ai-chat-components`: Lit web components consumed by `@carbon/ai-chat`.
- `packages/typedoc-theme` — `@carbon/typedoc-theme`: Carbon-themed TypeDoc theme used by the `@carbon/ai-chat` docs build.
- `demo/` — full demo app (`@carbon/ai-chat-examples-demo`); Playwright tests under `tests/`.
- `examples/react/*` and `examples/web-components/*` — webpack dev-server examples; default port 3000 (override with `PORT=`).
- `docs/` — developer handbook, peer-dep history. Not the consumer-facing site (that lives in `packages/ai-chat/docs/`).

## Common commands

Run from repo root unless noted. **Ask first** if the user has `npm run aiChat:start` running; don't kick off a parallel build/watch.

| Task                                                               | Command                                   |
| ------------------------------------------------------------------ | ----------------------------------------- |
| Fresh install + first-time build                                   | `npm install && npm run aiChat:build`     |
| Dev watch (builds + watches both packages + demo, TypeDoc on 5001) | `npm run aiChat:start`                    |
| Storybook (Lit)                                                    | `npm run aiChat:start:storybook`          |
| Storybook (React wrappers)                                         | `npm run aiChat:start:storybook:react`    |
| Build everything                                                   | `npm run build`                           |
| Build only the ai-chat stack (components + ai-chat + demo)         | `npm run aiChat:build`                    |
| Lint (eslint on `packages/`)                                       | `npm run lint`                            |
| Stylelint                                                          | `npm run lint:styles`                     |
| License header check                                               | `npm run lint:license`                    |
| Prettier check / write                                             | `npm run format` / `npm run format:write` |
| All tests                                                          | `npm run test`                            |
| Lint + format + license + test gate (no build)                     | `npm run ci-check`                        |
| Clean everything                                                   | `npm run clean`                           |

### Running a single example

Build the packages first, then from the root:

```bash
npm run start --workspace=@carbon/ai-chat-examples-react-basic-float
PORT=3001 npm run start --workspace=@carbon/ai-chat-examples-react-basic-custom-element-fullscreen
```

When `aiChat:start` is running in another terminal, example webpack servers hot-reload on package rebuilds.

### Running a single test

- `@carbon/ai-chat` uses Jest. From `packages/ai-chat/`:
  ```bash
  npx jest path/to/file_spec.ts
  npx jest -t "test name pattern"
  ```
- `@carbon/ai-chat-components` has two suites:
  - Web components via `@web/test-runner`: `npm run test:web-components --workspace=@carbon/ai-chat-components` (pass a glob to narrow).
  - React wrappers via Jest: `npm run test:react --workspace=@carbon/ai-chat-components`.
  - Regenerate WTR snapshots: `npm run test:updateSnapshot --workspace=@carbon/ai-chat-components`.

## Definition of done

`npm run ci-check` does **not** run `build`, and workspace deps resolve through built artifacts (`es/`, `dist/es/`) rather than TS sources. **Always run `build` BEFORE `ci-check`** — running them the other way around (or running `ci-check` on its own after edits) makes tests resolve consumer imports against a stale `es/`, which surfaces as confusing "no exported member 'X'" errors even though the source clearly exports X. Pick the minimum gate for the area you edited:

**Before running any `build` row below, ask the user whether `npm run aiChat:start` is already running** — a parallel build races the watcher (canonical rule: [Common commands](#common-commands), and TL;DR above). This applies to the `build` gates here, not to `ci-check`/`test`/`lint`, which write no artifacts.

| Area edited                       | Minimum gate before shipping                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cross-cutting / multiple packages | `npm run build && npm run ci-check`                                                                                                                                      |
| `packages/ai-chat/`               | `npm run build --workspace=@carbon/ai-chat` + `npm run test --workspace=@carbon/ai-chat`                                                                                 |
| `packages/ai-chat-components/`    | `npm run build --workspace=@carbon/ai-chat-components` + `npm run test --workspace=@carbon/ai-chat-components` (runs web-components + react suites)                      |
| `demo/`                           | `npm run build --workspace=@carbon/ai-chat-examples-demo` + `npm run test --workspace=@carbon/ai-chat-examples-demo` (Playwright)                                        |
| `examples/**`                     | `npm run build --workspace=<example>` + visual smoke via `npm run start --workspace=<example>` (load in browser, open chat, send one message, confirm no console errors) |
| SCSS only                         | `npm run lint:styles && npm run format`                                                                                                                                  |

Always run `npm run lint` + `npm run lint:license` before opening a PR if you touched more than one file — husky's pre-commit only runs prettier/eslint/stylelint on staged files and does not check license headers.

Before declaring a task done, self-review the diff against [code-review.md](references/code-review.md). Prefer a sub-agent for independence and to keep the main conversation lean. Act on **Blocker** findings before handing back; surface **Important** findings to the user.

## Gotchas

- `packages/ai-chat/src/chat/components-legacy/` is closed to **new** components — author new UI in `components/`, or lift reusable pieces to `@carbon/ai-chat-components`. Bug fixes and refactoring transitions out are welcome.
- `packages/ai-chat-components/src/react/` and `custom-elements.json` are generated by `npm run custom-elements`. Don't hand-edit.
- `telemetry.yml` files are generated — regenerate with `npm run telemetry:config`.
- Each example's README must follow the Indexer contract — see [examples/AGENTS.md](examples/AGENTS.md).

## Conventions

Repo-wide rules live in two canonical guides. Package-level `AGENTS.md` files should link to these, not restate them.

- **Code-authoring discipline** — read before writing or changing any code: the laziness ladder & simplicity principles, plus prefix discipline, SCSS/BEM, RTL logical properties, component placement, comments → [code-patterns.md](references/code-patterns.md).
- **Process conventions** (commits, branches & PR titles, license headers, commit hooks) → [conventions.md](references/conventions.md).

## Authoring AGENTS.md files

Rules for keeping these guidance files lean — agents (especially smaller-context ones) load them top-down, so total tokens matter.

- **Per-file budget**: ~200 lines max. Beyond that, split topic detail into kebab-case files under a `references/` subfolder (`references/<topic>.md`) and link to them from the parent `AGENTS.md` with a short "read when…" hint. Bare `AGENTS.md` stays the directory's entry point; only the topic detail moves into `references/`.
- **One topic per file**: if a leaf file has two unrelated H2 sections, the second one is its own file.
- **Front-load a TL;DR or pointer index**: agents scan from the top; bury nothing important.
- **Prefer tables and bullets over prose**: same information density, fewer tokens, easier to scan.
- **Cross-reference, don't restate**: when a rule is repo-wide (prefix discipline, license headers, `aiChat:start` watcher, conventional commits), link to its canonical home — [code-patterns.md](references/code-patterns.md) or [conventions.md](references/conventions.md) — instead of inlining.
- **Trim human-onboarding prose**: drop "we chose this because…" framing unless the _why_ changes how an agent applies the rule.
- **Each leaf file ends with a "Related guidance" section** so an agent landing cold can navigate to neighbors without re-reading the parent.
