---
name: caic-plan
description: Shape upcoming work at any size — a local PLAN.md, a GitHub epic with sub-issues, or a single issue — following this repo's planning rubric, then close with a fresh-eyes plan review. Use when the user asks to "draft a plan", "lay out the PRs for X", "design how we'd build Y", "plan out a big effort", or "write up an approach".
---

Follow this when the deliverable is a written plan rather than code. It tells you how to write a plan another agent (or human) can execute cold.

## Pick the artifact first

Plans, epics, and issues are the same act — shaping upcoming work — at three scales. Decide which you are producing before writing anything:

| The work                                                                      | Artifact                                                                                                                          |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| One PR, one obvious approach                                                  | No plan. File an issue (`caic-issue`) or just do the work.                                                                        |
| Multiple PRs, packages, or sessions; interlocking design decisions            | `PLAN.md` plus per-step files, per this rubric.                                                                                   |
| A plan whose steps others will pick up, or work that needs tracking on GitHub | The plan, then project its per-step breakdown onto an epic — see [epic-authoring.md](../caic-issue/references/epic-authoring.md). |

A plan and an epic are not alternatives. Big work usually gets a plan file first, and the epic is a projection of the plan's step breakdown — so don't make the user choose between them.

## When to write a plan

- The work spans multiple PRs, packages, or sessions, and the executor needs to load context cold.
- There are interlocking design decisions that should be locked before code is written (API shape, deprecation policy, naming, error semantics).
- The user wants to see and approve the approach before any code lands.

If the work is one PR with one obvious approach, skip the plan and just do it. Plans for trivial work are noise.

## File layout

Plans live in `.github/plan-drafts/{name}/` and are git-ignored (see [.gitignore](../../../.gitignore)) — one folder per plan, `{name}` being a short kebab-case slug for the effort. Grouping the files under a named folder is what makes a plan easy to point at while it is in flight. Treat them as working notes, not documentation; they are never committed.

- **`PLAN.md`** — the overarching design and decision document. One per plan folder.
- **`PLAN-{N}-{kebab-case-title}.md`** — one file per discrete execution step (typically one PR per file). `N` is the step number starting at 1; the title is a short kebab-case slug.

Per-step files open with a "Read first: PLAN.md" pointer and declare their dependencies on earlier steps.

A single-step plan can live entirely in `PLAN.md`; create per-step files only when there's more than one step.

## Before starting a new plan

Check `.github/plan-drafts/` for existing plan folders before creating one. If any hold work related to what you're about to draft:

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
- **Validation** — how to know the step is correct: which tests to add, which existing tests must still pass, which manual checks (browser smoke, type-check, build) are required. Refer to the relevant gate in [definition-of-done.md](../../../references/definition-of-done.md).
- **Risk / open questions** — anything you're not sure about. Better to flag uncertainty than bury it.

## Style

- **Cite file paths and line numbers** for every claim about the current codebase. The review phase verifies load-bearing claims — citations make that possible.
- **Mark unverified assumptions.** "I believe X (not yet read)" is more useful than asserting X without checking. Flagging your own uncertainty saves the reviewer time and keeps the executor from inheriting a wrong premise.
- **Terse.** Plans are read in the middle of work; long prose buries the action items. Bullets, short paragraphs, code snippets only when pinning a decision. [tone.md](../../../references/tone.md) applies here as much as to shipped docs — a plan is read under time pressure, so word economy matters more, not less.
- **Don't defer load-bearing decisions.** "We'll figure that out later" is acceptable for trivia but not for choices that block the executor (API shape, naming, deprecation behavior, error policy). Lock them now or list them as explicit open questions.

## Review before executing

A plan is not done when it is written. Close every planning session by reviewing it with fresh eyes against [plan-review.md](references/plan-review.md) — spawn a sub-agent for the review when sub-agents are available, since reviewing your own plan against itself produces a tautological thumbs-up.

Resolve what the review surfaces and bake the resolutions into the plan files before handing back. The same rubric applies standalone when the user asks you to review a plan you didn't write.

## Lifecycle

- Plan files are git-ignored and **never committed** — they exist only on the working copy of whoever is driving the plan.
- They are **not** the deliverable. The deliverable is the merged PRs and any docs / release notes those PRs include.
- A plan's durable projection is the **epic and its sub-issues**, not the file. A shaping plan is consumed by producing the epic; an implementation plan is consumed by producing the PRs. If the plan holds something the implementor needs, put it in the epic — a plan good enough to share is evidence the epic needs more, not that the plan needs committing.
- After all steps merge, delete the plan files. If there's institutional knowledge worth keeping (a non-obvious decision, a constraint future contributors should know), distill it into the codebase — docs, a comment on the relevant code, release notes — not a stale plan file.

## Anti-patterns

- **Drafting `PLAN.md` without reading the code.** Load-bearing claims about "we already do X this way" will be wrong, and the per-step files inherit the mistake.
- **Vague file lists.** "Update the input shell" doesn't tell the executor where to look. Cite paths.
- **Per-step files that reproduce `PLAN.md`.** Cross-reference, don't duplicate. When `PLAN.md` changes, the per-step files should still be correct.
- **Missing the "out of scope" section.** Without it, every reviewer comment becomes a scope expansion request.
- **Bare numeric filenames** (`PLAN-1.md`). A number alone doesn't survive grep or a glance at the file tree. Always include the kebab-case title slug.
- **Using the plan as commit log.** Once a step merges, don't keep editing its file with status updates. The git history is the log.
- **Skipping the review phase.** An unreviewed plan hands its unverified assumptions straight to the executor.

## Related guidance

- [plan-review.md](references/plan-review.md) — the review rubric this workflow closes with
- [tone.md](../../../references/tone.md) — voice and word economy for the plan itself
- [epic-authoring.md](../caic-issue/references/epic-authoring.md) — projecting a plan onto a GitHub epic
- [Root AGENTS.md](../../../AGENTS.md) — repo overview and pointer index

Task input from the user, if any: $ARGUMENTS
