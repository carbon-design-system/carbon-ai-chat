# Plan-authoring rubric

This file tells agents how to write an implementation plan that another agent (or human) can execute. It is the authoring-phase counterpart to [plan-review.md](plan-review.md).

Use this rubric when the user asks you to "draft a plan", "lay out the PRs for X", "design how we'd build Y", "write up an approach", or anything where the deliverable is a written plan rather than code.

## When to write a plan

- The work spans multiple PRs, packages, or sessions, and the executor needs to load context cold.
- There are interlocking design decisions that should be locked before code is written (API shape, deprecation policy, naming, error semantics).
- The user wants to see and approve the approach before any code lands.

If the work is one PR with one obvious approach, skip the plan and just do it. Plans for trivial work are noise.

## File layout

Plans live at the **repo root** and are git-ignored (see [.gitignore](../.gitignore)). Treat them as working notes, not documentation.

- **`PLAN.md`** — the overarching design and decision document. One per active plan.
- **`PLAN-{N}-{kebab-case-title}.md`** — one file per discrete execution step (typically one PR per file). `N` is the step number starting at 1; the title is a short kebab-case slug.

Per-step files open with a "Read first: [PLAN.md](PLAN.md)" pointer and declare their dependencies on earlier steps.

A single-step plan can live entirely in `PLAN.md`; create per-step files only when there's more than one step.

## Before starting a new plan

If `PLAN.md` or any `PLAN-*.md` files already exist on the working copy:

- Read them. Decide whether they belong to the plan you're about to draft, an in-flight plan the user hasn't finished, or a stale plan from earlier work.
- If they appear to be from a **different or stale plan**, ask the user whether to delete and clean them up before continuing. Don't silently overwrite — the user may want to archive content into a PR description, issue, or docs first.
- If they belong to the **same plan** the user is asking about, extend them in place.

## What goes in `PLAN.md`

The overview. Read once at the start of execution; referenced back to as needed.

- **Context** — what problem this solves, why now, links to issues / PRs / discussions.
- **Decisions** — numbered, terse, settled. The per-step files assume these as given. One or two sentences each; rationale only when not obvious.
- **Public API surface** — when the plan adds or changes a public API, lock the shape here (TypeScript signatures, prop names, event names, segment shapes). Per-step files implement against the locked shape rather than re-deriving it.
- **Per-step breakdown** — short table or list: step number → title → one-line scope. The index, not the detail.
- **Cross-cutting concerns** — anything that affects multiple steps (telemetry, deprecation timeline, release notes, peer-dep constraints, migration path).
- **Out of scope** — explicit list of things this plan does _not_ address, so reviewers and executors don't expand scope mid-flight.

## What goes in `PLAN-{N}-{title}.md`

The execution detail for one step. Written so an agent loading cold can implement without re-deriving the design.

- **Read-first / depends-on header** — pointer to `PLAN.md` plus any earlier steps that must merge first.
- **Scope** — one paragraph: what this step does and what it explicitly does not. Resist the urge to repeat `PLAN.md` context here.
- **Files touched** — concrete paths the executor will create / edit / delete. Vague plans produce drift; specific paths force you to verify the codebase as you draft.
- **Implementation steps** — ordered list. Each step short enough that a reasonable executor can complete it without further design questions. Cite file paths and line numbers for any claim about existing code.
- **Validation** — how to know the step is correct: which tests to add, which existing tests must still pass, which manual checks (browser smoke, type-check, build) are required. Refer to the relevant gate in [AGENTS.md](../AGENTS.md#definition-of-done).
- **Risk / open questions** — anything you're not sure about. Better to flag uncertainty than bury it.

## Style

- **Cite file paths and line numbers** for every claim about the current codebase. Plan reviewers verify load-bearing claims (see [plan-review.md](plan-review.md)) — citations make their job possible.
- **Mark unverified assumptions.** "I believe X (not yet read)" is more useful than asserting X without checking. Flagging your own uncertainty saves the reviewer time and keeps the executor from inheriting a wrong premise.
- **Terse.** Plans are read in the middle of work; long prose buries the action items. Bullets, short paragraphs, code snippets only when pinning a decision.
- **Don't defer load-bearing decisions.** "We'll figure that out later" is acceptable for trivia but not for choices that block the executor (API shape, naming, deprecation behavior, error policy). Lock them now or list them as explicit open questions.

## Lifecycle

- Plan files are git-ignored — they exist only on the working copy of whoever is driving the plan.
- They are **not** the deliverable. The deliverable is the merged PRs and any docs / release notes those PRs include.
- After all steps merge, delete the plan files. If there's institutional knowledge worth keeping (a non-obvious decision, a constraint future contributors should know), distill it into the codebase — docs, a comment on the relevant code, release notes — not a stale plan file at the repo root.

## Anti-patterns

- **Drafting `PLAN.md` without reading the code.** Load-bearing claims about "we already do X this way" will be wrong, and the per-step files inherit the mistake.
- **Vague file lists.** "Update the input shell" doesn't tell the executor where to look. Cite paths.
- **Per-step files that reproduce `PLAN.md`.** Cross-reference, don't duplicate. When `PLAN.md` changes, the per-step files should still be correct.
- **Missing the "out of scope" section.** Without it, every reviewer comment becomes a scope expansion request.
- **Bare numeric filenames** (`PLAN-1.md`). A number alone doesn't survive grep or a glance at the file tree. Always include the kebab-case title slug.
- **Using the plan as commit log.** Once a step merges, don't keep editing its file with status updates. The git history is the log.
