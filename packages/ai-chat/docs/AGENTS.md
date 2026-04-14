# AGENTS.md — `@carbon/ai-chat` docs

Guidance for authoring inside [packages/ai-chat/docs/](.). The documents here ship to `chat.carbondesignsystem.com` via TypeDoc; treat them as public copy.

`docs/README.md` is a GitHub-only viewer heads-up; it's not in the published site.

`typedoc/` holds the TypeDoc plugins (site chrome, not prose) — only edit when changing TypeDoc behavior.

## Authoring rules

- **Audience is external.** No internal code paths, no Slack/Jira references, no TODO notes.
- **Adding a new document**: create the `.md` and register it in `projectDocuments` ([../typedoc.json](../typedoc.json)) at your desired sidebar position. It will not appear otherwise.
- **Renaming or removing a document**: keep URLs stable where possible. If you must break a URL, flag it in the PR — external links depend on them.
- **Cross-links**:
  - Prefer TypeDoc `{@link SymbolName}` for API references — survives renames and is validated by `validation.invalidLink`.
  - Use relative Markdown links (`./React.md`) between project documents.
  - Do not link into `src/` — source paths are internal and the site can't resolve them.
- **API surface**: if a code example references a type/function, make sure it's actually exported from `aiChatEntry.tsx`. Match `categoryOrder` from `typedoc.json` (`React`, `Web component`, `Config`, `Instance`, `Events`, `Service desk`, `Messaging`, `Testing`) when grouping examples.
- **Code blocks**: tag language (` ```tsx `, ` ```ts `, ` ```html `, ` ```bash `) so the Carbon theme syntax-highlights. Keep examples copy-pasteable.
- **Migration docs are append-only** within a major. Don't rewrite history in `Migration-1.0.0.md`; add a new `Migration-<version>.md` for the next major and register it in `projectDocuments`.
- **No emoji** and no marketing language.

## Build + preview

From [../](../) (the package root): `npm run build` runs rollup + typedoc; `npm start` runs rollup (watch) + typedoc (watch) + serves `dist/docs/carbon-tsdocs` on `:5001`.

**Run `npm run build` before pushing.** TypeDoc's `validation.invalidLink` rejects broken `{@link ...}` references.
