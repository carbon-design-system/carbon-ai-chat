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
- **Decisions** — stable IDs (`D1`, `D2`, …), cited from step files. Record the choice and the evidence that decides between real alternatives. Supersede a changed decision without renumbering the others. Cite existing decisions; suggest an [ADR](../../caic-adr/SKILL.md) only when an unsettled choice merits wider feedback. The developer decides whether to write one. Preserve lasting rationale in the eventual PR, epic, or documentation before plan cleanup.
- **Public API surface** — state the consumer contract the plan changes or relies on. Cite an existing decision when it settles the behavior. For material, unresolved behavior, propose the shape and relevant semantics using [api-contract.md](api-contract.md). Routine wording fixes and restoring an agreed contract need no new proposal. Per-step files reference the settled contract. The local proposal is sufficient; [publication](api-contract.md#posting-the-proposal) is a separate, authorized action.
- **Per-step breakdown** — a table of step, file, scope, dependencies, and status. Aim for coherent changes a reviewer can assess independently. Split by real boundaries, not a fixed file count.
- **Cross-cutting concerns** — anything that affects multiple steps (telemetry, deprecation timeline, release notes, peer-dep constraints, migration path).
- **Out of scope** — explicit list of things this plan does _not_ address, so reviewers and executors don't expand scope mid-flight.
- **Scope, files touched, acceptance criteria, implementation steps, gate, and risk** — in a single-step plan only, which has no step file to hold them. Same rules as a step file below, criteria before implementation steps.

## What goes in `PLAN-{N}-{title}.md`

The execution detail for one step, on the work fork only — a plan producing issues has none of these. Written so an agent loading cold can implement without re-deriving the design.

When evidence disproves a criterion, record the correction and its reason. Preserve the agreed outcome; ask only if the change alters an approved requirement or unresolved design choice. If Done when must change, update the shaping plan and affected steps. For an issue-owned outcome, use the [amendment route](../../caic-issue/SKILL.md#amending-an-outcome) rather than silently changing its meaning locally.

- **Read-first / depends-on header** — pointer to `PLAN.md` plus any earlier steps that must merge first.
- **Scope** — one paragraph: what this step does and what it explicitly does not. Resist the urge to repeat `PLAN.md` context here.
- **Files touched** — concrete paths the executor will create, edit, or delete. For significant new code, identify a nearby precedent and what can be reused. Estimate size when it helps assess scope; a ratio alone does not require extraction or splitting.
- **Acceptance criteria** — an observable outcome and its proof, defined before the implementation steps. Follow [Acceptance criteria](writing-plans-well.md#acceptance-criteria). Name relevant regression cases and existing tests that protect unchanged behavior. Add no-op or failure cases when they affect this change. For prose, prove what a reader can do after loading it; checking that a string exists is insufficient.
- **Implementation steps** — ordered list. Each step short enough that a reasonable executor can complete it without further design questions. Cite file paths and line numbers for any claim about existing code.
- **Gate** — the commands that must exit 0 for the areas this step touches, from [definition-of-done.md](../../../../references/definition-of-done.md), plus any manual check (browser smoke, type-check, build). Looked up rather than authored, which is why it is its own section and not the last acceptance box — buried in a checklist it becomes the item nobody reads.
- **Risk / open questions** — anything you're not sure about; flag uncertainty rather than burying it. A question that changes what the step builds has to close before the step is handed off. Carry forward only the ones the executor can hit and route around.

## Lifecycle

- Plan files are git-ignored and **never committed** — they exist only on the working copy of whoever is driving the plan.
- For a planning request, the reviewed plan is the deliverable. When implementation is also authorized, it guides the resulting changes and their verification.
- Before requested cleanup, preserve lasting decisions in an appropriate artifact: a PR description, authorized epic or issue comment, source comment, or consumer documentation. Reference an existing ADR where one applies. The [ADR workflow](../../caic-adr/SKILL.md) proposes unsettled decisions; do not fabricate a retrospective proposal for merged work.
- Delete plan files only when cleanup is authorized. Unrelated or stale drafts do not block a new plan. Keep status accurate, distinguishing implemented, verified, and merged work.

## Related guidance

- [caic-plan](../SKILL.md) — the planning procedure these files serve
- [writing-plans-well.md](writing-plans-well.md) — read while writing the words: criteria rules, style, and the failure list
- [api-contract.md](api-contract.md) — read when the plan changes what a consumer can observe
- [artifact-choice.md](artifact-choice.md) — read when it isn't settled that a plan is the artifact at all
