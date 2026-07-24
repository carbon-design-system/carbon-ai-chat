# AGENTS.md — `@carbon/ai-chat` docs

Guidance for authoring inside [packages/ai-chat/docs/](.). The documents here ship to `chat.carbondesignsystem.com` via TypeDoc; treat them as public copy.

`docs/README.md` is a GitHub-only viewer heads-up; it's not in the published site.

## Authoring net-new docs

For markdown structure (page anatomy, cross-linking, code blocks, tables), see [doc-style.md](references/doc-style.md). For voice and word economy, see [tone.md](../../../references/tone.md). Routine edits don't need them.

## Authoring rules

- **Audience is external.** No internal code paths, no Slack/Jira references, no TODO notes.
- **Adding a new document**: create the `.md` and register it in `projectDocuments` ([../typedoc.json](../typedoc.json)) at your desired sidebar position. It will not appear otherwise.
- **Renaming or removing a document**: keep URLs stable where possible. If you must break a URL, flag it in the PR — external links depend on them.
- **Cross-links**:
  - Prefer TypeDoc `{@link SymbolName}` for API references — survives renames and is validated by `validation.invalidLink`.
  - Use relative Markdown links (`./React.md`) between project documents.
  - Do not link into `src/` — source paths are internal and the site can't resolve them.
- **API surface**: if a code example references a type/function, make sure it's actually exported from `aiChatEntry.tsx`. Match `categoryOrder` from [`typedoc.json`](../typedoc.json) (`React`, `Web component`, `Config`, `Instance`, `Events`, `Service desk`, `Messaging`, `Testing`) when grouping examples.
- **Code blocks**: tag the language (` ```tsx `, ` ```ts `, ` ```html `, ` ```bash `) so the Carbon theme syntax-highlights. Keep examples copy-pasteable.
- **Migration docs are append-only** within a major. Don't rewrite history in `Migration-1.0.0.md`; add `Migration-<version>.md` for the next major and register it in `projectDocuments`.
- **No emoji** and no marketing language.

## Code examples in docs

For what makes a good example — self-contained, minimal, realistically typed, production-safe — follow [code-examples.md](../references/code-examples.md). This section covers only the docs-specific workflow: **every example must be tested in a real example project before publishing.**

- For inline snippets, copy them into a relevant example project (e.g. [examples/react/basic-float/](../../../examples/react/basic-float/)) and verify it compiles and runs.
- For full examples, create a standalone entry in [examples/](../../../examples/) that follows the [Indexer Contract](../../../examples/references/indexer-contract.md). Reference implementation: [examples/react/basic-custom-element-fullscreen/](../../../examples/react/basic-custom-element-fullscreen/).
- When public API changes, update affected docs and corresponding example projects in the same PR.

`typedoc/` holds `moduleNamePlugin.js` (a small TypeDoc hook) — only edit when changing TypeDoc behavior. The Carbon theme lives in [`packages/typedoc-theme/`](../../typedoc-theme/); see its [AGENTS.md](../../typedoc-theme/AGENTS.md) for the loading model.

## Build + preview

Run `npm run build:docs` from the **monorepo root** to regenerate. This builds TypeDoc for all packages, not just `@carbon/ai-chat`.

To build docs for only this package:

```bash
cd packages/ai-chat
npm run build:docs
```

Generated docs appear in `packages/ai-chat/dist/docs/`.

From [../](../) (the package root): `npm run build` runs rollup + typedoc; `npm start` runs rollup (watch) + typedoc (watch) + serves `dist/docs/carbon-tsdocs` on `:5001`.

**Run `npm run build` before pushing.** TypeDoc's `validation.invalidLink` rejects broken `{@link …}` references.

## Related guidance

- [packages/ai-chat/AGENTS.md](../AGENTS.md) — package overview
- [doc-style.md](references/doc-style.md) — markdown structure for net-new docs
- [tone.md](../../../references/tone.md) — voice and word economy
- [../src/types/AGENTS.md](../src/types/AGENTS.md) — JSDoc standards for API docs
- [../../typedoc-theme/AGENTS.md](../../typedoc-theme/AGENTS.md) — theme customization
