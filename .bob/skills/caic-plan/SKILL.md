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
| A choice a consumer can feel, not yet settled — which shape, whether to remove it at all | An ADR, alongside the plan — see [caic-adr](../caic-adr/SKILL.md). |

Then settle the fork, before opening a single step file. A plan produces one of two things, and which one decides where the acceptance criteria live:

| Fork          | Consumed by                          | Criteria live in                                                                | Step files    |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------- | ------------- |
| Plan → issues | Producing an epic and its sub-issues | The issues — see [caic-issue](../caic-issue/SKILL.md#acceptance-criteria)       | None          |
| Plan → work   | Producing the PRs directly           | The `PLAN-{N}` step file, above its implementation steps                        | One per step  |

**Never both.** Two copies of one criteria list drift, and then neither is trusted. A plan on the issues fork that also writes per-step criteria has produced a stale second copy — the issue outlives the plan, so the issue owns them.

This is not the single-step carve-out under File layout. That one is about _how many_ step files a plan needs; the fork is about whether step files are the deliverable at all.

A plan and an epic are not alternatives. Big work usually gets a plan file first, and the epic is a projection of the plan's step breakdown — so don't make the user choose between them.

Nor is an ADR an alternative to either. It answers a different question — _why this shape_ — and it is the only one of the three that survives the work.

**It is not a phase before the plan, either.** The two interleave: you shape the work far enough to know the options are real and what each costs, and that shaping is what makes the ADR writable. Usually the ADR is a promotion — a `D<n>` in a plan already underway turns out to be something a consumer can feel, so it graduates. What an ADR needs from the plan is _feasibility_, not sequencing. If you are drafting per-step files to justify an option, stop: you are planning the losing option too.

## The spine

One requirement, restated at each scale, never re-invented:

| Level                       | Section             | Rule                                                                                                                                     |
| --------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| ADR                         | Decision outcome    | The why: one decision, what lost, what it costs consumers.                                                                               |
| Plan                        | Done when           | The observable outcomes. Written first; survives redesign.                                                                               |
| Epic                        | Expected outcomes   | One per plan outcome, in the same words where they still fit.                                                                            |
| Issue, or Step (`PLAN-{N}`) | Acceptance criteria | Each traces to one epic outcome — or, with no epic above it, to a Done when item — and carries its proof. The fork decides which of the two holds them; never both. |
| PR                          | Testing / Reviewing | The steps that exercise the criteria that PR closes.                                                                                     |
| Diff                        | Review              | The criteria walked against the code that shipped.                                                                                       |

Two rules make it a spine rather than six lists. **Nothing appears at a lower level without a parent above it** — a criterion with no outcome is scope nobody agreed to. **A change propagates down from where it was made** — when a decision moves the goalposts, fix Done when, then the epic and its issues, or the step files, depending on the fork. Skip that and the artifacts describe different products.

The ADR row is the exception to the first rule: it is the only optional level, and most plans don't have one. Where a plan does sit under an ADR, the propagation rule still applies from the top — a superseding ADR reopens the Done when list below it.

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

## Two phases, two stopping rules

Planning is two activities and the files split along the same seam. Doing them at once is the common failure: detailing a step while the shape above it is still open means you detail the version that gets thrown away.

| Phase | You are deciding | File | Stop when |
| ----- | ----------------- | ---- | ---------- |
| Shaping | What the work is, and where it ends | `PLAN.md` | Every step is one PR's worth and traces to a Done when item |
| Implementation | How one step gets built | `PLAN-{N}-*.md` | An agent loading cold can execute it without a design question, and can tell whether it succeeded without asking |

The fork decides how far you go. On the issues fork, shaping is the whole job: you stop at the end of the first row and file, and the issues carry what the second row would have held.

**Don't open a `PLAN-{N}` file while `PLAN.md` still has an open question that would move the step boundaries.** Finish shaping first. The tell is a step you can't state in one line — that is an undecided shape, not a long step.

Decision shaping sits above both, and is its own skill: [caic-adr](../caic-adr/SKILL.md). Its stopping rule is looser on purpose — feasibility, not sequencing.

## What goes in `PLAN.md`

The overview, and the output of the shaping phase. Read once at the start of execution; referenced back to as needed.

- **Context** — what problem this solves, why now, links to issues / PRs / discussions.
- **Done when** — the observable outcomes that make this plan finished, as a `- [ ]` list. Written before the decisions, so a redesign can't quietly change what done means. An outcome is something the next thing you build with this observably does; if it reads "the file now says X", it is a step — move it to the breakdown, and see the prose carve-out under Acceptance criteria below. These become the epic's Expected outcomes, carried across per [the spine](#the-spine) rather than re-derived.
- **Decisions** — numbered `D1`, `D2`, … and cited by that id everywhere else, per-step files included. Terse and settled: a sentence or two, rationale only when not obvious. When a real alternative was rejected, name it and why in one clause, or the next reader re-proposes it. Ids are stable — supersede a decision with a new one rather than renumbering. A decision that meets the promotion test in [caic-adr](../caic-adr/SKILL.md) outgrows this list: write the ADR and leave `D<n>` as a one-line pointer. Apply that test as written rather than from memory: it has two clauses and a set of sub-criteria, and abbreviating it is how a decision that needed a record stays a `D<n>` and gets deleted with the plan. This list is git-ignored and gets deleted; an ADR doesn't.
- **Public API surface** — when the plan changes what a consumer can observe, lock it here: the TypeScript shape, plus the behavior the shape can't carry — preconditions, no-op and failure paths, events, timing, repeat calls, defaults, derivation, announcement, and ownership. The questions behind each are in [caic-issue](../caic-issue/SKILL.md#define-the-contract-up-front). Per-step files implement against the locked contract rather than re-deriving it. A change with no signature change still needs this section.
- **Per-step breakdown** — a table: step → file → one-line scope, plus a status cell while the plan is in flight. The index, not the detail. One row is one PR's worth of work: if you can't state a step's scope in one line, or its Files touched sprawls, it's two steps.
- **Cross-cutting concerns** — anything that affects multiple steps (telemetry, deprecation timeline, release notes, peer-dep constraints, migration path).
- **Out of scope** — explicit list of things this plan does _not_ address, so reviewers and executors don't expand scope mid-flight.

## What goes in `PLAN-{N}-{title}.md`

The execution detail for one step, on the work fork only — a plan producing issues has none of these. Written so an agent loading cold can implement without re-deriving the design.

When execution proves a criterion wrong, strike it in place and write the correction beneath it, so the original reasoning stays readable next to it. An amendment takes the same approval the plan took. A `Done when` change is shaping-level: strike it in `PLAN.md` instead, so the propagation rule can carry it down.

- **Read-first / depends-on header** — pointer to `PLAN.md` plus any earlier steps that must merge first.
- **Scope** — one paragraph: what this step does and what it explicitly does not. Resist the urge to repeat `PLAN.md` context here.
- **Files touched** — concrete paths the executor will create / edit / delete. Vague plans produce drift; specific paths force you to verify the codebase as you draft.
- **Acceptance criteria** — what makes this step correct, settled **before** the implementation steps below and not derived from them. Written after them, they describe whatever got built. Each is one observable outcome plus the proof it holds, in the format [caic-issue](../caic-issue/SKILL.md#acceptance-criteria) already defines — don't invent a second one. Name the case that fails today, not the properties the proof will have — and the no-op and failure paths, which are where an executor under time pressure decides alone. Name which existing tests must pass **unchanged**; that is the half authors drop, and it is what makes a weakened proof visible later. For a change whose deliverable is prose, the outcome is what a reader can do after loading the file and where the text sits — not that the file contains a string.
- **Implementation steps** — ordered list. Each step short enough that a reasonable executor can complete it without further design questions. Cite file paths and line numbers for any claim about existing code.
- **Gate** — the commands that must exit 0 for the areas this step touches, from [definition-of-done.md](../../../references/definition-of-done.md), plus any manual check (browser smoke, type-check, build). Looked up rather than authored, which is why it is its own section and not the last acceptance box — buried in a checklist it becomes the item nobody reads.
- **Risk / open questions** — anything you're not sure about; flag uncertainty rather than burying it. A question that changes what the step builds has to close before the step is handed off. Carry forward only the ones the executor can hit and route around.

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
- A plan's durable projection is the **epic and its sub-issues**, not the file. A shaping plan is consumed by producing the epic; an implementation plan is consumed by producing the PRs. Before deleting a plan, confirm its Done when list, its locked contract, and any decision an implementor still needs have landed on the epic or an issue — a plan good enough to share is evidence the epic needs more, not that the plan needs committing.
- After all steps merge, delete the plan files. If there's institutional knowledge worth keeping, distill it into the codebase — not a stale plan file. Pick the destination by what it is: a **decision** and its rejected alternatives go to `docs/adr/` ([caic-adr](../caic-adr/SKILL.md)); a **constraint** goes in a comment beside the code it constrains; **anything a consumer needs** goes to the docs or the release notes. A decision that gets deleted with the plan is one the next person re-litigates.

## Anti-patterns

- **Drafting `PLAN.md` without reading the code.** Load-bearing claims about "we already do X this way" will be wrong, and the per-step files inherit the mistake.
- **Vague file lists.** "Update the input shell" doesn't tell the executor where to look. Cite paths.
- **Per-step files that reproduce `PLAN.md`.** Cross-reference, don't duplicate. When `PLAN.md` changes, the per-step files should still be correct.
- **Missing the "out of scope" section.** Without it, every reviewer comment becomes a scope expansion request.
- **Bare numeric filenames** (`PLAN-1.md`). A number alone doesn't survive grep or a glance at the file tree. Always include the kebab-case title slug.
- **Narrating merged work.** A status cell (`DONE`, `blocked on #N`) in the step table is how a cold resume finds its place — keep it current, and let `DONE` mean merged. If you can't confirm that from `git log`, leave the cell blank; a wrong `DONE` is worse than an empty one. Prose about _how_ a merged step went does not belong; that is what the commit and the PR are for. When the last step merges the whole plan goes, status cells included.
- **Criteria on both sides of the fork.** A plan that files issues _and_ writes per-step criteria has two lists that will disagree. Pick the fork, and let the artifact that outlives the plan hold them.
- **Weakening a proof instead of amending a criterion.** Once a plan is approved its criteria are frozen — correct one through the amendment route above, never by making its proof weaker. Loosening an assertion, deleting a case, skipping a case, or regenerating a snapshot to match current output all turn the light green while leaving the criterion looking untouched, which is what makes this worse than missing the target outright. Same rule [caic-issue](../caic-issue/SKILL.md) states for a filed issue's criteria; catching it in a diff is [caic-review](../caic-review/SKILL.md)'s job.
- **Skipping the review phase.** An unreviewed plan hands its unverified assumptions straight to the executor.

## Related guidance

- [plan-review.md](references/plan-review.md) — the review rubric this workflow closes with
- [tone.md](../../../references/tone.md) — voice and word economy for the plan itself
- [epic-authoring.md](../caic-issue/references/epic-authoring.md) — projecting a plan onto a GitHub epic
- [Root AGENTS.md](../../../AGENTS.md) — repo overview and pointer index

Task input from the user, if any: $ARGUMENTS
