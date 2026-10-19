# authoring-agents-md.md — writing & maintaining AGENTS.md files

Load this when creating or editing AGENTS files, skills, or their references. Include the repository facts and constraints that change an agent's decisions. Assume the agent already knows general software development.

- **Per-file budget**: 12 KiB per `AGENTS.md` and per `.md` or `.mdx` file directly under any `references/` directory, linked or not, enforced by `npm run validate:agents`. Split over-budget references by topic or replace copied lists with links. For `AGENTS.md`, split topic detail into kebab-case files under a `references/` subfolder (`references/<topic>.md`) and link to them from the parent `AGENTS.md` with a short "read when…" hint. The bare `AGENTS.md` stays the directory's entry point; only the topic detail moves into `references/`.
- **Chain budget**: 28 KiB for `AGENTS.md` files only: the root file plus every AGENTS file down to a directory. An ancestor counts against every chain beneath it. This repository gate excludes personal instructions and references loaded later. Check the active harness configuration when diagnosing truncation; the repository limit is a safeguard, not its total context limit.
- **Budgets use bytes as a proxy.** Soft-wrapped Markdown makes line counts misleading. Bytes are easy to compare, but they are not tokens. A passing file budget does not prove that a task's full reading path is small.
- **One topic per file**: if a leaf file has two unrelated H2 sections, the second one is its own file.
- **Front-load a TL;DR or pointer index**: agents scan from the top; bury nothing important.
- **Choose a readable structure**: use tables for comparisons and lists for steps. Short prose works for a single rule and its reason.
- **Cross-reference, don't restate**: when a rule is repo-wide (prefix discipline, license headers, the `aiChat:start` watcher, conventional commits), link to its canonical home — [code-patterns.md](code-patterns.md) or [conventions.md](conventions.md) — instead of inlining it.
- **Every reference link carries a "read when…" trigger, and lives in the router that owns the file's scope.** Top-level `references/` are triggered from the root [AGENTS.md](../AGENTS.md) task router; a package's own `references/` (e.g. `architecture.md`, `services.md`, `tests.md`) are triggered from that package's `AGENTS.md`. Never dump a bare list of links — the reader can't tell when to open which.
- **Trim human-onboarding prose**: drop "we chose this because…" framing unless the _why_ changes how an agent applies the rule.
- **Related guidance**: routers omit the footer. Leaf references list only links absent from the body. Skills keep their footers.
- **Link to a list's owner**, rather than copying an enumeration or count. Keep numbers only when they calibrate judgment. Link to a file or heading, not a drifting `#L` anchor.
- **Cite an issue only when it changes what the agent does.** Drop the citation when the issue closes.
- **Committed guidance never links to plan drafts.** Drafts are git-ignored and get deleted.

## Task-workflow skills (`.bob/skills/`)

For the skill/reference split and mirror mechanics, read [.bob/skills/README.md](../.bob/skills/README.md).

Rules for authoring them:

- **Keep one skill per task.** The six owned skills cover ADRs, plans, issues, PRs, reviews, and copy. Put substeps in the skill's references. The [copy skill](../.bob/skills/caic-copy-writer/SKILL.md) routes among audiences; other workflows link to it for wording.
- **Put writing rules in one place.** Voice rules live in [tone.md](tone.md). Rules that vary by copy type live in [caic-copy-writer](../.bob/skills/caic-copy-writer/SKILL.md). Link to the needed type rather than copying its rules.
- **Name them `caic-` + a short task name.** The repository prefix avoids collisions with unrelated skills and harness commands.
- **Use `name` and `description` frontmatter.** This is the repository's shared metadata convention, not a claim that other fields are unsupported everywhere. Match the name to the directory. Describe the capability and its triggers briefly; include incidental use during implementation when relevant. Put subtype catalogs and workflow details in the body.
- **Keep a usable entry point.** The skill body states inputs, outputs, essential steps, and stopping conditions. Put substantial conditional procedures, rubrics, and examples in references with explicit triggers. A short, self-contained skill needs no extra routing layer.
- **Preserve the 12 KiB file budget.** `npm run validate:skills` checks owned skill bodies and references; vendored skills are exempt. Several skills and references can load during one task, so assess their combined cost. A size limit is a ceiling, not a target.
- **Preserve task scope and authorization.** Distinguish drafting from publishing and feedback from revision. Use supplied choices and prior authorization. Ask only when missing information changes the work or a new external action needs approval. Finish the local artifact before that approval step.
- **Match detail to risk.** Use exact commands and fixed checks for fragile operations. Give writing and design tasks clear outcomes and room for judgment. Mark preferences as preferences; do not turn one past failure into a universal gate.
- **Check both selection and behavior.** Test a request that should use the skill and a nearby request that should not. Static validators check structure, not whether the agent performs the right task.
- **Keep the skill catalog out of root AGENTS.** Skill metadata supplies task discovery. The root router carries rules and package routes, not a second list of skills.
- **End each skill body with `Task input from the user, if any: $ARGUMENTS`.** Some harnesses substitute invocation arguments. If the token remains literal, use the actual user request; do not treat it as missing task input.
