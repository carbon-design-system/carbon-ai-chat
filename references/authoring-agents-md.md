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

## Task-workflow skills (`.bob/skills/`)

Task procedures are **skills**, not `references/` docs. The dividing line is when the guidance applies:

- **A convention applies to any edit in its scope** — prefix discipline, commit format, the WCAG gate. It has to be loadable at any moment, so it stays in `references/` and the root [AGENTS.md](../AGENTS.md) routes to it.
- **A task procedure applies only while doing that task** — writing a plan, filing an issue, drafting a PR description, reviewing a diff. It becomes a skill, because a skill's `description` is always in context (so it can trigger itself) while its body loads only on invocation.

Rules for authoring them:

- **The command surface maps to moments in the dev cycle, not to files.** Four skills cover planning, issue filing, PR description, and diff review. Don't add a skill per document — a procedure that only makes sense inside another one ships as a supporting file in that skill's own `references/` folder.
- **Name them `caic-` + a short task name.** An unprefixed skill silently overrides the harness built-in of the same name, and `/code-review` and `/review` are real built-ins.
- **Frontmatter is `name` and `description` only.** `name` must match the directory. Everything else is ignored by one harness or the other. Write the description as one sentence of what it does plus concrete "Use when the user asks…" phrasing — that text is what both harnesses match against.
- **Move the content, don't point at it.** A skill that just says "read this other file" reintroduces the hop that made docs skippable in the first place.
- **Same ~200-line budget**, with supporting files for progressive disclosure.
- **Keep skills out of the root `AGENTS.md`.** They advertise themselves to any assistant that loads them, so a router row is redundant — the pointers live in [.github/copilot-instructions.md](../.github/copilot-instructions.md) instead, for tooling that has no skills support. A new skill needs a row there, and `npm run validate:skills` fails without one.
- **End every skill body with `Task input from the user, if any: $ARGUMENTS`.** Claude Code substitutes the invocation's arguments; Bob passes task text through its own tool and leaves the token as literal text, which reads as "no input given". Both behave correctly.
- **`.bob/skills/` is canonical**; `.claude/skills/` is a byte-identical generated mirror, because each assistant reads only its own directory. Edit the canonical tree, then run `npm run sync:skills` — that regenerates the mirror wholesale, so anything living only in `.claude/skills/` is deleted. `npm run validate:skills` fails in CI on drift between the trees, a broken link or anchor, a name/directory mismatch, or an unquoted frontmatter value that YAML would truncate.

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — the router these rules produce
- [tone.md](tone.md) — voice & word economy for developer-facing copy
- [.bob/skills/README.md](../.bob/skills/README.md) — the skill collection and its sync rules
