This file provides guidance to agents when working with code in this repository.

## TL;DR

- **First-time setup**: `npm install && npm run aiChat:build`. Workspace deps resolve through built artifacts (`dist/es/`, `es/`), not TS sources — nothing works until this completes; a changed package is invisible to its consumers until rebuilt.
- **Before starting any build/watch yourself, ask the user whether `npm run aiChat:start` is already running.** Most developers keep it running; a parallel `npm run build` races the watcher.
- Node ≥ 22, npm ≥ 10.
- Each package has its own `AGENTS.md` with package-specific rules. Read the relevant one before your first edit:
  - [packages/ai-chat/AGENTS.md](packages/ai-chat/AGENTS.md) — `@carbon/ai-chat` (the chat app). Topic siblings (load only what you need): [AGENTS_ARCHITECTURE.md](packages/ai-chat/AGENTS_ARCHITECTURE.md), [AGENTS_SERVICES.md](packages/ai-chat/AGENTS_SERVICES.md), [AGENTS_TESTS.md](packages/ai-chat/AGENTS_TESTS.md). Sub-areas: [src/chat/store/AGENTS.md](packages/ai-chat/src/chat/store/AGENTS.md), [src/types/AGENTS.md](packages/ai-chat/src/types/AGENTS.md), [docs/AGENTS.md](packages/ai-chat/docs/AGENTS.md) (with [docs/AGENTS_DOC_STYLE.md](packages/ai-chat/docs/AGENTS_DOC_STYLE.md)).
  - [packages/ai-chat-components/AGENTS.md](packages/ai-chat-components/AGENTS.md) — `@carbon/ai-chat-components` (Lit components).
  - [packages/typedoc-theme/AGENTS.md](packages/typedoc-theme/AGENTS.md) — `@carbon/typedoc-theme` (Carbon-themed TypeDoc theme for the docs site).
  - [demo/AGENTS.md](demo/AGENTS.md) — full demo / integration-test harness.
  - [examples/AGENTS.md](examples/AGENTS.md) — shared example rules (with [AGENTS_INDEXER_CONTRACT.md](examples/AGENTS_INDEXER_CONTRACT.md) for README format); flavor deltas in [examples/react/AGENTS.md](examples/react/AGENTS.md) / [examples/web-components/AGENTS.md](examples/web-components/AGENTS.md).
- Do not read or edit generated output: `dist/`, `es/`, `es-custom/`, `storybook-static/`, `storybook-react-static/`, `node_modules/`, `packages/ai-chat-components/src/react/`, `packages/ai-chat-components/custom-elements.json`, `packages/ai-chat/dist/docs/`.
- If you are not Bob, don't read `.bob/` (IBM Bob mode rules — not general guidance).
- **Accessibility** is a repo-wide concern: every UI change in any package must hold WCAG 2.1 AA. Load [AGENTS_ACCESSIBILITY.md](AGENTS_ACCESSIBILITY.md) for the checklist, live-region patterns, and the centralized announcer utilities.
- **Figma → code** (translating a design, calling the Carbon MCP server, or using the `carbon-builder` skill): load [AGENTS_FIGMA.md](AGENTS_FIGMA.md). The two primary packages are Web Components only — always pass `filters.component_type: "Web Components"` to Carbon MCP unless you are editing [demo/](demo/), [examples/react/](examples/react/), or a `-react.stories.jsx` / `-react.mdx` file.
- **Code reviews** (user-requested or self-review before marking a task done) follow the rubric in [AGENTS_CODE_REVIEW.md](AGENTS_CODE_REVIEW.md).
- **Writing a plan** (when the user asks you to draft a multi-PR plan, design doc, or implementation plan before code is written) follow the rubric in [AGENTS_PLAN_AUTHORING.md](AGENTS_PLAN_AUTHORING.md). Plan files (`PLAN.md`, `PLAN-{N}-{title}.md`) live at the repo root and are git-ignored.
- **Plan reviews** (when the user asks you to review PLAN.md, a design doc, or a multi-PR series before any code is written) follow the rubric in [AGENTS_PLAN_REVIEW.md](AGENTS_PLAN_REVIEW.md).
- **Writing a PR description**: when asked to draft or write up a PR, follow [AGENTS_PR.md](AGENTS_PR.md).

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

`npm run ci-check` does **not** run `build`. Because workspace deps resolve through built artifacts, `ci-check` alone can miss breakage in consumers of a changed package — always rebuild the producer before verifying. Pick the minimum gate for the area you edited:

| Area edited                       | Minimum gate before shipping                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cross-cutting / multiple packages | `npm run ci-check && npm run build`                                                                                                                                      |
| `packages/ai-chat/`               | `npm run test --workspace=@carbon/ai-chat` + `npm run build --workspace=@carbon/ai-chat`                                                                                 |
| `packages/ai-chat-components/`    | `npm run test --workspace=@carbon/ai-chat-components` (runs web-components + react suites) + `npm run build --workspace=@carbon/ai-chat-components`                      |
| `demo/`                           | `npm run build --workspace=@carbon/ai-chat-examples-demo` + `npm run test --workspace=@carbon/ai-chat-examples-demo` (Playwright)                                        |
| `examples/**`                     | `npm run build --workspace=<example>` + visual smoke via `npm run start --workspace=<example>` (load in browser, open chat, send one message, confirm no console errors) |
| SCSS only                         | `npm run lint:styles && npm run format`                                                                                                                                  |

Always run `npm run lint` + `npm run lint:license` before opening a PR if you touched more than one file — husky's pre-commit only runs prettier/eslint/stylelint on staged files and does not check license headers.

Before declaring a task done, self-review the diff against [AGENTS_CODE_REVIEW.md](AGENTS_CODE_REVIEW.md). Prefer a sub-agent for independence and to keep the main conversation lean. Act on **Blocker** findings before handing back; surface **Important** findings to the user.

## Gotchas

- `packages/ai-chat/src/chat/components-legacy/` is closed to **new** components — author new UI in `components/`, or lift reusable pieces to `@carbon/ai-chat-components`. Bug fixes and refactoring transitions out are welcome.
- `packages/ai-chat-components/src/react/` and `custom-elements.json` are generated by `npm run custom-elements`. Don't hand-edit.
- `telemetry.yml` files are generated — regenerate with `npm run telemetry:config`.
- Each example's README must follow the Indexer contract — see [examples/AGENTS.md](examples/AGENTS.md).

## Conventions

This section is the canonical home for repo-wide rules. Package-level `AGENTS.md` files should link here, not restate.

- **Commits**: conventional-commits, enforced by commitlint. Types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`. Header ≤ 72 chars, body lines ≤ 90. Subject uses imperative present tense, lowercase, no trailing period.
- **Branches**: kebab-case, descriptive. PR title follows the same Conventional Commit format as the eventual squash commit.
- **Prefix discipline (build-breaking)**: never hardcode `cds--` in SCSS or TSX class strings. Use `#{$prefix}--` in SCSS and the prefix helpers in TS — otherwise the `es-custom` build breaks. Lit tag strings come from the shared prefix constant for the same reason.
- **SCSS**: BEM with the `#{$prefix}--` prefix (resolves to `cds--`). No descendant nesting; `&:hover`, `&--modifier`, and media queries are fine. Use CSS logical properties (`padding-block-start`, `inset-inline-end`, etc.) for RTL support.
- **License headers**: every source file needs the Apache-2.0 header. Enforced by `npm run lint:license` (part of `ci-check`) — **not** by a commit hook, so it can still fail CI even after a clean commit.
- **Commit hooks**: `.husky/pre-commit` runs `lint-staged` only — prettier (+ eslint) on `*.{js,jsx,ts,tsx}`, prettier (+ stylelint) on `*.scss`, prettier on `*.md`. `.husky/commit-msg` runs commitlint.

## Authoring AGENTS.md files

Rules for keeping these guidance files lean — agents (especially smaller-context ones) load them top-down, so total tokens matter.

- **Per-file budget**: ~200 lines max. Beyond that, split into `AGENTS_<TOPIC>.md` siblings and link from the parent.
- **One topic per file**: if a leaf file has two unrelated H2 sections, the second one is its own file.
- **Front-load a TL;DR or pointer index**: agents scan from the top; bury nothing important.
- **Prefer tables and bullets over prose**: same information density, fewer tokens, easier to scan.
- **Cross-reference, don't restate**: when a rule is repo-wide (prefix discipline, license headers, `aiChat:start` watcher, conventional commits), link to its canonical home here instead of inlining.
- **Trim human-onboarding prose**: drop "we chose this because…" framing unless the _why_ changes how an agent applies the rule.
- **Each leaf file ends with a "Related guidance" section** so an agent landing cold can navigate to neighbors without re-reading the parent.
