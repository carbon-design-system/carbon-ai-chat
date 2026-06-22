# AGENTS.md — `@carbon/ai-chat` docs

Guidance for authoring inside [packages/ai-chat/docs/](.). The documents here ship to `chat.carbondesignsystem.com` via TypeDoc; treat them as public copy.

`docs/README.md` is a GitHub-only viewer heads-up; it's not in the published site.

## Authoring net-new docs

For markdown structure (page anatomy, cross-linking, code blocks, tables), see [AGENTS_DOC_STYLE.md](AGENTS_DOC_STYLE.md). For voice and word economy, see [AGENTS_TONE.md](../../../AGENTS_TONE.md). Routine edits don't need them.

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

All code examples must be tested. Validation checklist before publishing:

- [ ] All imports are correct and available in the published package.
- [ ] All types are exported and accessible.
- [ ] Code compiles without TypeScript errors.
- [ ] Code runs without runtime errors.
- [ ] Example demonstrates the documented behavior.
- [ ] Example follows current best practices (e.g. React function components + hooks; never internal imports like `@carbon/ai-chat/src/...`).

For inline snippets, copy them into a relevant example project (e.g. [examples/react/basic/](../../../examples/react/basic/)) and verify behavior. For full examples, create a standalone entry in [examples/](../../../examples/) that follows the [Indexer Contract](../../../examples/AGENTS.md). Reference implementation: [examples/react/custom-element/](../../../examples/react/custom-element/).

When public API changes, update affected docs and corresponding example projects in the same PR.

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
- [AGENTS_DOC_STYLE.md](AGENTS_DOC_STYLE.md) — markdown structure for net-new docs
- [AGENTS_TONE.md](../../../AGENTS_TONE.md) — voice and word economy
- [../src/types/AGENTS.md](../src/types/AGENTS.md) — JSDoc standards for API docs
- [../../typedoc-theme/AGENTS.md](../../typedoc-theme/AGENTS.md) — theme customization
