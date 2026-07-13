# AGENTS.md — examples (shared)

Guidance that applies to both [react/](react/) and [web-components/](web-components/). Flavor-specific deltas live in each subdirectory's own `AGENTS.md`.

> **Prerequisite**: packages must be built first. See root [AGENTS.md](../AGENTS.md) — examples resolve deps through `dist/es/`.

## Running an example

Build the packages first, then from the repo root start any single example by its workspace name (override the default port 3000 with `PORT=`):

```bash
npm run start --workspace=@carbon/ai-chat-examples-react-basic-float
PORT=3001 npm run start --workspace=@carbon/ai-chat-examples-react-basic-custom-element-fullscreen
```

When `npm run aiChat:start` is running in another terminal, example webpack servers hot-reload on package rebuilds.

## Adding a new example

1. **Pick a base and copy it.** Each flavor lists its canonical scaffolds in its own `AGENTS.md`. Both include webpack config, `tsconfig.json`, HTML entry, and `package.json`. Rename the folder to `<slug>` and update the workspace name to the flavor's naming pattern.
2. **Modify only what your example needs to demonstrate.** Keep the bundler, scripts, and file layout unless the example is specifically about a different toolchain (e.g. `frameworks-vite/`, `frameworks-next/`, `frameworks-react-17/`, `tests-jest-*/`). For a different toolchain, copy from the closest matching existing example.
3. **Write a `README.md`** from [README_TEMPLATE.md](README_TEMPLATE.md) — required. It must follow the [Indexer Contract](references/indexer-contract.md).
4. **Regenerate the aggregator** by running `npm run repair:example-readmes` — this rewrites the section list in [react/README.md](react/README.md) / [web-components/README.md](web-components/README.md) from the per-example READMEs.

## Smoke tests

- Examples should have Playwright tests testing the functionality of the example.

See [Examples smoke tests](references/playwright.md) for instructions on creating those tests.

## Definition of done

- `npm run build --workspace=<example>` exits 0.
- `npm run test --workspace=<example>` passes (if the example has tests).
- README follows the [Indexer Contract](references/indexer-contract.md).

## Authoring rules

**Single-purpose rule**: each example demonstrates exactly one concern. If a change would add a second concern, create a new example instead. Framework-variant examples (`frameworks-next`, `frameworks-vite`, `tests-jest-happydom`, `tests-jest-jsdom`, `frameworks-react-17`) count the framework / test-runner integration as their "one thing" — keep their chat configuration as thin as possible.

**Base-template rule**: non-float examples derive from the `basic-custom-element-fullscreen` baseline — `ChatCustomElement` (or `<cds-aichat-custom-element>`) + `layout.showFrame: false` + `openChatByDefault: true`. The float-pattern examples (`basic-float`, `custom-element-as-float`, `custom-element-as-float-lazy-load`, `history-float`, `watch-state`, `watch-state-redux`) are the documented exceptions — they demonstrate the launcher chat shape with host UI alongside it.

**README alignment rule**: an example's section in the aggregator README ([react/README.md](react/README.md) or [web-components/README.md](web-components/README.md)) must stay in sync with the example's own README — title, summary, start command, and APIs table. Run `npm run verify:example-readmes` (also in `ci-check`) to check; `npm run repair:example-readmes -- --from=examples` to regenerate the aggregator from the per-example READMEs.

**Title-naming rule**: a README's `# H1` title mirrors the slug's prefix family so related examples cluster visually in the aggregator.

| Slug pattern                                                                                                   | Title format                                                                 | Example                                                                  |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Shares a prefix with 3+ siblings (`custom-element-*`, `history-*`, `prompt-line-*`, `frameworks-*`, `tests-*`) | `<Prefix> / <Variant>` (capitalize prefix; sentence-case variant)            | `prompt-line-typeahead` → `Prompt line / Typeahead`                      |
| Canonical baseline (`basic-*`)                                                                                 | `Basic / <Variant>`                                                          | `basic-float` → `Basic / Float`                                          |
| Pure variant of one base (e.g. `reasoning-steps-controlled` of `reasoning-steps`)                              | `<Base name> (<variant>)`                                                    | `workspace-sidebar` → `Workspace (sidebar)`                              |
| Stands alone (no shared prefix family)                                                                         | Flat sentence case                                                           | `feedback` → `Feedback`                                                  |
| Sub-variant of a slash-family entry                                                                            | Keep the slash, append the variant in parens (avoid stacking a second slash) | `prompt-line-typeahead-custom` → `Prompt line / Typeahead (custom list)` |

Capitalize a slug-family prefix the first time you introduce a new family, even when the slug is a singleton today, if you anticipate siblings (e.g. `Integrations / watsonx.ai`).

**Inline comments rule**: every example source file has a top-of-file purpose comment (what it demonstrates, which APIs, where to start) plus inline _why_ comments on non-obvious config and bus wiring. Comments must be self-contained — no "see the basic example", no "same as the previous one but…". Each example is indexed in isolation by the Carbon MCP indexer, so context cannot rely on cross-example references.

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — monorepo conventions
- [indexer-contract.md](references/indexer-contract.md) — README format for the docs-site indexer
- [react/AGENTS.md](react/AGENTS.md) — React flavor deltas
- [web-components/AGENTS.md](web-components/AGENTS.md) — Web Components flavor deltas
