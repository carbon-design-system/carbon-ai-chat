# authoring-agents-md.md — writing & maintaining AGENTS.md files

Load this when creating or editing an `AGENTS.md` file or a `references/` topic doc. These files are loaded top-down by agents (especially smaller-context ones), so total tokens matter — keep them lean.

- **Per-file budget**: ~200 lines max. Beyond that, split topic detail into kebab-case files under a `references/` subfolder (`references/<topic>.md`) and link to them from the parent `AGENTS.md` with a short "read when…" hint. The bare `AGENTS.md` stays the directory's entry point; only the topic detail moves into `references/`.
- **One topic per file**: if a leaf file has two unrelated H2 sections, the second one is its own file.
- **Front-load a TL;DR or pointer index**: agents scan from the top; bury nothing important.
- **Prefer tables and bullets over prose**: same information density, fewer tokens, easier to scan.
- **Cross-reference, don't restate**: when a rule is repo-wide (prefix discipline, license headers, the `aiChat:start` watcher, conventional commits), link to its canonical home — [code-patterns.md](code-patterns.md) or [conventions.md](conventions.md) — instead of inlining it.
- **Every reference link carries a "read when…" trigger, and lives in the router that owns the file's scope.** Top-level `references/` are triggered from the root [AGENTS.md](../AGENTS.md) task router; a package's own `references/` (e.g. `architecture.md`, `services.md`, `tests.md`) are triggered from that package's `AGENTS.md`. Never dump a bare list of links — the reader can't tell when to open which.
- **Trim human-onboarding prose**: drop "we chose this because…" framing unless the _why_ changes how an agent applies the rule.
- **Each leaf file ends with a "Related guidance" section** so an agent landing cold can navigate to neighbors without re-reading the parent.

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — the router these rules produce
- [tone.md](tone.md) — voice & word economy for developer-facing copy
