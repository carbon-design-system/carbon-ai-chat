# authoring-agents-md.md — writing & maintaining AGENTS.md files

Load this when creating or editing an `AGENTS.md` file or a `references/` topic doc. These files are loaded top-down by agents (especially smaller-context ones), so total tokens matter — keep them lean.

- **Per-file budget**: 8 KiB, enforced by `npm run validate:agents`. Beyond that, split topic detail into kebab-case files under a `references/` subfolder (`references/<topic>.md`) and link to them from the parent `AGENTS.md` with a short "read when…" hint. The bare `AGENTS.md` stays the directory's entry point; only the topic detail moves into `references/`.
- **Chain budget**: 24 KiB for the root file plus every `AGENTS.md` down to a directory, also enforced. A harness loads that whole chain when work happens there, and an ancestor pays into every chain beneath it — so the file worth trimming is often not the one named in the failure. Codex additionally caps the chain itself and drops the tail silently, which is why this budget sits well under its limit.
- **Budgets are in bytes, not lines.** Markdown here is soft-wrapped, so a line is a paragraph: density ranges about 3x across these files, and a line count ranks them backwards. Bytes are what a harness actually spends.
- **One topic per file**: if a leaf file has two unrelated H2 sections, the second one is its own file.
- **Front-load a TL;DR or pointer index**: agents scan from the top; bury nothing important.
- **Prefer tables and bullets over prose**: same information density, fewer tokens, easier to scan.
- **Cross-reference, don't restate**: when a rule is repo-wide (prefix discipline, license headers, the `aiChat:start` watcher, conventional commits), link to its canonical home — [code-patterns.md](code-patterns.md) or [conventions.md](conventions.md) — instead of inlining it.
- **Every reference link carries a "read when…" trigger, and lives in the router that owns the file's scope.** Top-level `references/` are triggered from the root [AGENTS.md](../AGENTS.md) task router; a package's own `references/` (e.g. `architecture.md`, `services.md`, `tests.md`) are triggered from that package's `AGENTS.md`. Never dump a bare list of links — the reader can't tell when to open which.
- **Trim human-onboarding prose**: drop "we chose this because…" framing unless the _why_ changes how an agent applies the rule.
- **Each leaf file ends with a "Related guidance" section** so an agent landing cold can navigate to neighbors without re-reading the parent.

## Task-workflow skills (`.bob/skills/`)

Task procedures are **skills**, not `references/` docs. The dividing line is when the guidance applies:

- **A convention applies to any edit in its scope** — prefix discipline, commit format, the WCAG gate. It has to be loadable at any moment, so it stays in `references/` and the root [AGENTS.md](../AGENTS.md) routes to it.
- **A task procedure applies only while doing that task** — writing a plan, filing an issue, drafting a PR description, reviewing a diff. It becomes a skill, because a skill's `description` is always in context (so it can trigger itself) while its body loads only on invocation.

Rules for authoring them:

- **The command surface maps to moments in the dev cycle, not to files.** Six skills cover decision records, planning, issue filing, PR description, diff review, and writing the copy itself. Don't add a skill per document — a procedure that only makes sense inside another one ships as a supporting file in that skill's own `references/` folder. [caic-copy-writer](../.bob/skills/caic-copy-writer/SKILL.md) is not the exception it looks like. It is the one skill that owns a cross-cutting concern rather than a procedure: thirteen copy surfaces, each with a rules file under its own `references/`, and every other skill points there for wording instead of restating it.
- **Guidance about writing splits by cadence.** The test is _does this change depending on which copy type you are writing?_ If yes it belongs to [caic-copy-writer](../.bob/skills/caic-copy-writer/SKILL.md); if no, to [tone.md](tone.md), which stays always-on because voice binds every edit. A workflow skill never carries its own wording rules — it links the copy type it produces, or the rules drift against the twelve others.
- **Name them `caic-` + a short task name.** An unprefixed skill silently overrides the harness built-in of the same name, and `/code-review` and `/review` are real built-ins.
- **Frontmatter is `name` and `description` only.** `name` must match the directory. Everything else is ignored by one harness or another. Write the description as one sentence of what it does plus concrete "Use when the user asks…" phrasing — that text is what every harness matches against. When the skill also covers work an agent does unprompted, name that trigger too — a description built only from user requests never fires on a task the user did not word.
- **Move the content, don't point at it.** A skill that just says "read this other file" reintroduces the hop that made docs skippable in the first place.
- **No byte budget, but the same progressive disclosure.** A skill body loads only when invoked, one at a time, and never concatenates into a chain, so it isn't competing for always-on context the way an `AGENTS.md` is. Length is still a cost once it fires: keep the procedure in the skill body and push rubrics, worked examples, and per-case rules into supporting files under the skill's own `references/`.
- **Keep skills out of the root `AGENTS.md`.** Every assistant this repo targets discovers them from disk and matches on their `description`, so a router row is redundant — it spends always-on tokens restating something already in context.
- **End every skill body with `Task input from the user, if any: $ARGUMENTS`.** Claude Code substitutes the invocation's arguments. A harness that doesn't substitute leaves the token as literal text, which reads as "no input given" — Bob is one, and it passes task text through its own tool instead. Both behave correctly.
- **`.bob/skills/` is canonical**; `.claude/skills/` (Claude Code, Copilot) and `.agents/skills/` (Codex, Copilot) are byte-identical generated mirrors, because each assistant reads only its own directory. Edit the canonical tree, then run `npm run sync:skills` — that regenerates both mirrors wholesale, so anything living only in a mirror is deleted. `npm run validate:skills` fails in CI on drift between the trees, a broken link or anchor, a name/directory mismatch, or an unquoted frontmatter value that YAML would truncate.

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — the router these rules produce
- [tone.md](tone.md) — voice & quick rules for developer-facing copy
- [.bob/skills/README.md](../.bob/skills/README.md) — the skill collection and its sync rules
