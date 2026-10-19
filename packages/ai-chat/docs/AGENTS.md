# AGENTS.md — `@carbon/ai-chat` docs

Guidance for authoring inside [packages/ai-chat/docs/](.). The documents here ship to `chat.carbondesignsystem.com` via TypeDoc; treat them as public copy.

`docs/README.md` is a GitHub-only viewer heads-up; it's not in the published site.

## Authoring net-new docs

For markdown structure (page anatomy, cross-linking, code blocks, tables), see [doc-style.md](references/doc-style.md). For voice and quick rules, see [tone.md](../../../references/tone.md). For what a page owes its reader and the gate it clears, see [docs-pages.md](../../../.bob/skills/caic-copy-writer/references/docs-pages.md) — type 3. Routine edits don't need them.

## Authoring rules

- **Audience is external.** No internal code paths, no Slack/Jira references, no TODO notes.
- **Adding a new document**: follow [doc-style.md](references/doc-style.md#page-anatomy) for `projectDocuments` registration.
- **Renaming or removing a document**: keep URLs stable where possible. If you must break a URL, flag it in the PR — external links depend on them.
- **API surface**: if a code example references a type/function, make sure it's actually exported from `aiChatEntry.tsx`. Match `categoryOrder` from [`typedoc.json`](../typedoc.json) when grouping examples.
- **Migration docs are append-only** within a major. Don't rewrite history in `Migration-1.0.0.md`; add `Migration-<version>.md` for the next major and register it in `projectDocuments`.

## Code examples in docs

For what makes a good example — self-contained, minimal, realistically typed, production-safe — follow [code-examples.md](../references/code-examples.md). This section covers only the docs-specific workflow: **every example must be tested in a real example project before publishing.**

- For inline snippets, copy them into a relevant example project (e.g. [examples/react/basic-float/](../../../examples/react/basic-float/)) and verify it compiles and runs.
- For full examples, create a standalone entry in [examples/](../../../examples/) that follows the [Indexer Contract](../../../examples/references/indexer-contract.md). Reference implementation: [examples/react/basic-custom-element-fullscreen/](../../../examples/react/basic-custom-element-fullscreen/).
- When public API changes, update affected docs and corresponding example projects in the same PR.

`typedoc/` holds the build's TypeDoc plugins and their helper modules — `moduleNamePlugin.js`, `demoteValidationWarningsPlugin.js`, `apiIndexPlugin.js`, and `crossPackageLinksPlugin.js`, each registered in [../typedoc.json](../typedoc.json). Only edit when changing TypeDoc behavior, and keep the directory free of unregistered plugins. The Carbon theme lives in [`packages/typedoc-theme/`](../../typedoc-theme/); see its [AGENTS.md](../../typedoc-theme/AGENTS.md) for the loading model.

## Release-owned API artifacts

`docs/api/markdown/` and `docs/api/symbol-index.json` are release-owned: do not inspect or rewrite them for branch work. Fix source JSDoc; local `docs:api:check` drift is expected, not a CI failure. Their sibling `README.md` is hand-authored.

## Build + preview

From the monorepo root, under the [build/watch rule](../../../AGENTS.md#always-on-rules):

```bash
npm run docs --workspace=@carbon/ai-chat       # TypeDoc only; no rollup
npm run build:docs --workspace=@carbon/ai-chat # rollup + TypeDoc
npm run aiChat:build:docs                     # build the stack + TypeDoc
npm start --workspace=@carbon/ai-chat         # watch rollup/TypeDoc; preview on :5001
```

Docs emit to `packages/ai-chat/dist/docs/`; preview serves `dist/docs/carbon-tsdocs`.

**Run the docs gate for published docs changes.** `npm run docs` from the package root rejects broken `{@link …}` references. Agent-guidance edits use the [guidance gate](../../../references/definition-of-done.md#minimum-gate-by-area-edited) instead.
