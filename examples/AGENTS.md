# AGENTS.md — examples (shared)

Guidance that applies to both [react/](react/) and [web-components/](web-components/). Flavor-specific deltas live in each subdirectory's own `AGENTS.md`.

> **Prerequisite**: packages must be built first. See root [AGENTS.md](../AGENTS.md) — examples resolve deps through `dist/es/`.

## Running an example

Build the packages first, then from the repo root start any single example by its workspace name (override the default port 3000 with `PORT=`):

```bash
npm run start --workspace=@carbon/ai-chat-examples-react-basic-float
PORT=3001 npm run start --workspace=@carbon/ai-chat-examples-react-basic-custom-element-fullscreen
```

Each Vite config excludes the chat packages from `optimizeDeps`, so package rebuilds reach the browser.

## Adding a new example

1. **Pick a base and copy it.** Each flavor lists its canonical scaffolds in its own `AGENTS.md`. Both include `vite.config.ts`, `tsconfig.json`, HTML entry, and `package.json`. Rename the folder to `<slug>` and update the workspace name to the flavor's naming pattern.
2. **Modify only what your example needs to demonstrate.** Keep the bundler, scripts, and file layout unless the example is specifically about a different toolchain (e.g. `frameworks-next/`, `frameworks-react-17/`, `tests-jest-*/`). For a different toolchain, copy from the closest matching existing example.
3. **Point `index.html` at your entry module.** Vite resolves the entry from a `<script type="module" src="/src/App.tsx">` tag in the HTML (`/src/main.ts` for web components) rather than injecting one, so renaming the entry file means editing the HTML too.
4. **Write a `README.md`** from [README_TEMPLATE.md](README_TEMPLATE.md) — required. It must follow the [Indexer Contract](references/indexer-contract.md).
5. **Regenerate the aggregator** by running `npm run repair:example-readmes` — this rewrites the section list in [react/README.md](react/README.md) / [web-components/README.md](web-components/README.md) from the per-example READMEs.

## Smoke tests

Playwright is the smoke-test mechanism for examples. The golden examples are covered by one central suite in [shared/playwright/](shared/playwright/): run it with `npm run test:e2e:goldens`. Golden examples use the central config, dependency, and script. Other Vite examples can use `scaffold:example-e2e` for a local suite. `tests-vitest-happydom` and both `tests-jest-*` examples use `test` for another runner. The existing `frameworks-react-17` and `frameworks-react-18` Playwright suites also use `test`; they keep their own suites under root `npm test`.

Read [playwright.md](references/playwright.md) before adding or changing an example's tests. It carries where specs live, how to add a target or scaffold a local suite, how a port is allocated, the selector rules, and the four examples that are deliberately skipped. It routes to [playwright-agents.md](references/playwright-agents.md) when generating a spec with Playwright's agents, [playwright-local-suite.md](references/playwright-local-suite.md) when scaffolding a suite outside the golden set, and [playwright-coverage.md](references/playwright-coverage.md) when measuring a suite against the coverage target.

## Definition of done

- `npm run build --workspace=<example>` exits 0.
- `CAIC_E2E_TARGETS=<target> npm run test:e2e:goldens` passes for each of the example's targets in [targets.ts](shared/playwright/targets.ts). `--project` alone still builds every target's example.
- `CAIC_E2E_TARGETS=<targets> npm run test:e2e:coverage` ran, and the PR explains any example below the [coverage target](references/playwright-coverage.md#coverage-target).
- `npm run test:e2e --workspace=<example>` passes, if the example has a local `test:e2e` script.
- `npm run test --workspace=<example>` passes, if the example has a `test` script.
- README follows the [Indexer Contract](references/indexer-contract.md).

Every new example adds a shared Playwright suite: a spec in [tests/](shared/playwright/tests/) and its targets in [targets.ts](shared/playwright/targets.ts). The four deliberate skips and the framework examples tracked in [issue #1424](https://github.com/carbon-design-system/carbon-ai-chat/issues/1424) stay outside the suite.

## Authoring rules

**Single-purpose rule**: each example demonstrates exactly one concern. If a change would add a second concern, create a new example instead. Framework-variant examples (`frameworks-next`, `tests-vitest-happydom`, `tests-jest-happydom`, `tests-jest-jsdom`, `frameworks-react-17`, `frameworks-react-18`) count the framework / test-runner integration as their "one thing" — keep their chat configuration as thin as possible.

**Base-template rule**: non-float examples derive from the `basic-custom-element-fullscreen` baseline — `ChatCustomElement` (or `<cds-aichat-custom-element>`) + `layout.showFrame: false` + `openChatByDefault: true`. The float-pattern examples (`basic-float`, `custom-element-as-float`, `custom-element-as-float-lazy-load`, `history-float`, `watch-state`, `watch-state-redux`) are the documented exceptions — they demonstrate the launcher chat shape with host UI alongside it.

**README alignment rule**: an example's section in the aggregator README ([react/README.md](react/README.md) or [web-components/README.md](web-components/README.md)) must stay in sync with the example's own README — title, summary, start command, and APIs table. Run `npm run verify:example-readmes` (also in `ci-check`) to check; `npm run repair:example-readmes -- --from=examples` to regenerate the aggregator from the per-example READMEs.

**Title naming**: follow the [Indexer Contract](references/indexer-contract.md#title-naming).

**Inline comments rule**: comments are the product here, and how to word them is [example-copy.md](../.bob/skills/caic-copy-writer/references/example-copy.md) — type 5. Read it before writing one. The constraint driving those rules is local: the Carbon MCP indexer reads each example in isolation, so nothing in this directory may point at another one.
