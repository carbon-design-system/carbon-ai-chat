# plan-files.md — the files a plan produces

Where plan files live, what each one holds, and where what they settled has to land before they are deleted.

Load this when you are about to create or fill `PLAN.md` or a `PLAN-{N}` step file, and again once the last step merges.

## File layout

Plans live in `.github/plan-drafts/{name}/` and are git-ignored (see [.gitignore](../../../../.gitignore)) — one folder per plan, `{name}` being a short kebab-case slug for the effort, prefixed with the issue number (`<N>-<slug>`) when planning against an issue. Grouping the files under a named folder is what makes a plan easy to point at while it is in flight. Treat them as working notes, not documentation; they are never committed.

- **`PLAN.md`** — the overarching design and decision document. One per plan folder.
- **`PLAN-{N}-{kebab-case-title}.md`** — one file per discrete execution step (typically one PR per file). `N` is the step number starting at 1; the title is a short kebab-case slug.

Per-step files open with a "Read first: PLAN.md" pointer and declare their dependencies on earlier steps.

A single-step plan can live entirely in `PLAN.md`; create per-step files only when there's more than one step.

## What goes in `PLAN.md`

The overview, and the output of the shaping phase. Read once at the start of execution; referenced back to as needed.

- **Context** — what problem this solves, why now, links to issues / PRs / discussions.
- **Done when** — the observable outcomes that make this plan finished, as a `- [ ]` list. Written before the decisions, so a redesign can't quietly change what done means. An outcome is something the next thing you build with this observably does; if it reads "the file now says X", it is a step — move it to the breakdown, and see the prose carve-out under [Acceptance criteria](writing-plans-well.md#acceptance-criteria). These become the epic's Expected outcomes, carried across per [the spine](../SKILL.md#the-spine) rather than re-derived. When planning against an issue, this is the issue's list, cited by id — see [Planning against an issue](../SKILL.md#planning-against-an-issue).
- **Decisions** — numbered `D1`, `D2`, … and cited by that id everywhere else, per-step files included. Terse and settled: a sentence or two, rationale only when not obvious. When a real alternative was rejected, name it and why in one clause, or the next reader re-proposes it. Ids are stable — supersede a decision with a new one rather than renumbering. When a decision passes the test in [caic-adr](../../caic-adr/SKILL.md) — a consumer can feel it, or someone will re-propose the option that lost — suggest an ADR, and shrink `D<n>` to a one-line pointer if one gets written. Whether to write it is the developer's call. When they skip it, the reasoning goes in the PR description — or, on the issues fork, the epic's Details — because this list is git-ignored and gets deleted.
- **Public API surface** — when the plan changes what a consumer can observe, lock it here: the TypeScript shape, plus the behavior the shape can't carry — preconditions, no-op and failure paths, events, timing, repeat calls, defaults, derivation, announcement, and ownership. The questions behind each, and how to write the answers down, are in [api-contract.md](api-contract.md). Per-step files implement against the locked contract rather than re-deriving it. A change with no signature change still needs this section. Post the contract on the issue before building — see [Posting the proposal](api-contract.md#posting-the-proposal).
- **Per-step breakdown** — a table: step → file → one-line scope, plus a status cell while the plan is in flight. The index, not the detail. One row is one PR's worth of work: if you can't state a step's scope in one line, or its Files touched sprawls, it's two steps.
- **Cross-cutting concerns** — anything that affects multiple steps (telemetry, deprecation timeline, release notes, peer-dep constraints, migration path).
- **Out of scope** — explicit list of things this plan does _not_ address, so reviewers and executors don't expand scope mid-flight.
- **Scope, files touched, acceptance criteria, implementation steps, gate, and risk** — in a single-step plan only, which has no step file to hold them. Same rules as a step file below, criteria before implementation steps.

## What goes in `PLAN-{N}-{title}.md`

The execution detail for one step, on the work fork only — a plan producing issues has none of these. Written so an agent loading cold can implement without re-deriving the design.

When execution proves a criterion wrong, strike it in place and write the correction beneath it, so the original reasoning stays readable next to it. An amendment takes the same approval the plan took. A `Done when` change is shaping-level: strike it in `PLAN.md` instead, so the propagation rule can carry it down. When the Done when is an issue's, cited by id, don't strike it locally — take it through the issue's [amendment route](../../caic-issue/SKILL.md#amending-an-outcome).

- **Read-first / depends-on header** — pointer to `PLAN.md` plus any earlier steps that must merge first.
- **Scope** — one paragraph: what this step does and what it explicitly does not. Resist the urge to repeat `PLAN.md` context here.
- **Files touched** — concrete paths the executor will create / edit / delete. Vague plans produce drift; specific paths force you to verify the codebase as you draft. For a new code file, name its precedent: the file it most resembles, or its directory's median at `<base>`. Give the precedent's line count, the new file's expected count, and the part they share. Above 1.5×, say why in one line; above 2×, or more than a third shared, lift out the shared part or split the step first.
- **Acceptance criteria** — what makes this step correct, settled **before** the implementation steps below and not derived from them. Written after them, they describe whatever got built. Each is one observable outcome plus the proof it holds, in the format under [Acceptance criteria](writing-plans-well.md#acceptance-criteria) — don't invent a second one. Name the case that fails today, not the properties the proof will have — and the no-op and failure paths, which are where an executor under time pressure decides alone. Name which existing tests must pass **unchanged**; that is the half authors drop, and it is what makes a weakened proof visible later. For a change whose deliverable is prose, the outcome is what a reader can do after loading the file and where the text sits — not that the file contains a string.
- **Implementation steps** — ordered list. Each step short enough that a reasonable executor can complete it without further design questions. Cite file paths and line numbers for any claim about existing code.
- **Gate** — the commands that must exit 0 for the areas this step touches, from [definition-of-done.md](../../../../references/definition-of-done.md), plus any manual check (browser smoke, type-check, build). Looked up rather than authored, which is why it is its own section and not the last acceptance box — buried in a checklist it becomes the item nobody reads.
- **Risk / open questions** — anything you're not sure about; flag uncertainty rather than burying it. A question that changes what the step builds has to close before the step is handed off. Carry forward only the ones the executor can hit and route around.

## Lifecycle

- Plan files are git-ignored and **never committed** — they exist only on the working copy of whoever is driving the plan.
- They are **not** the deliverable. The deliverable is the merged PRs and any docs / release notes those PRs include.
- What a plan settled has to land somewhere that lasts before the plan is deleted. A shaping plan lands in the **epic and its sub-issues**. A plan against an issue lands in the **PR description** — the proofs under Testing / Reviewing, a link to any API proposal, and the reasoning behind a decision that didn't get an ADR — and in the proposal comment itself. Don't rewrite the issue body with design detail; the proposal and amendment comments are the only design that lands on the issue.
- After all steps merge, delete the plan files. If there's institutional knowledge worth keeping, distill it into the codebase — not a stale plan file. Pick the destination by what it is: a **decision** and its rejected alternatives go to `docs/adr/` when a record is worth writing ([caic-adr](../../caic-adr/SKILL.md)), and to the PR description when it isn't; a **constraint** goes in a comment beside the code it constrains; **anything a consumer needs** goes to the docs or the release notes. A decision that gets deleted with the plan is one the next person re-litigates.

## Related guidance

- [caic-plan](../SKILL.md) — the planning procedure these files serve
- [writing-plans-well.md](writing-plans-well.md) — read while writing the words: criteria rules, style, and the failure list
- [api-contract.md](api-contract.md) — read when the plan changes what a consumer can observe
- [artifact-choice.md](artifact-choice.md) — read when it isn't settled that a plan is the artifact at all
