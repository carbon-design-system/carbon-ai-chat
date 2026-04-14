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

## Indexer contract

A server scans this repo to seed an Elasticsearch-backed MCP server. These README sections are consumed directly and **must** be present and accurate:

- **What this example shows** — plain-language capability list.
- **When to use this pattern** — helps disambiguate similar examples (e.g., `custom-element` vs `custom-element-as-float` vs `custom-element-lazy-load`).
- **APIs and props demonstrated** — table of named exports, props, events, slots, and (for web-components) custom-element tags/attributes used by this example. Do not invent entries; grep the source. Column headers vary by flavor — see the flavor `AGENTS.md`.

If a section does not apply, write `N/A` and a one-sentence reason. Do not delete sections.
