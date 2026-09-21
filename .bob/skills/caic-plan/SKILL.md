---
name: caic-plan
description: Plan work before building it — against a GitHub issue someone is picking up, or to shape a big effort into an epic with sub-issues — following this repo's planning rubric, then close with a fresh-eyes plan review. Use when the user asks to "plan issue 1234", "pick up this issue", "draft a plan", "lay out the PRs for X", "design how we'd build Y", "plan out a big effort", or "write up an approach".
---

Follow this when the deliverable is a written plan rather than code. It tells you how to write a plan another agent (or human) can execute cold.

## Planning against an issue

Most plans start from an issue someone has picked up. The issue states the problem, the outcomes that close it, and what is settled; the plan decides how to get there. Before writing anything:

- **Read the issue and every comment.** `gh issue view <N> --repo <owner>/<repo> --comments`. Comments carry amendments and any API proposal already posted. Fetch it rather than working from a summary in the task text.
- **Its Done when is your Done when.** Cite it as a table of ids and short labels — `O1 | Partial config inherits defaults` — never the full outcome text, which drifts from the issue. Issues don't number their boxes, so the ids are positions in the issue's list. Every acceptance criterion in the plan traces to one id; a criterion that closes an open question traces to the outcome that question affects.
- **Constraints bind.** When the plan can't satisfy one, stop and take it through the issue's [amendment route](../caic-issue/SKILL.md#amending-an-outcome), like a wrong outcome.
- **Treat a suggested fix as a hypothesis.** A fix under Possible approaches, or one that slipped into Background or Goal, was written before anyone opened the code. Before adopting it:
  - verify its premise — the function, pattern, or data flow it assumes — against the code;
  - name at least one alternative the issue didn't list, such as the precedent the codebase already uses for the same problem, or a cheaper middle path;
  - record the choice as a `D<n>`, with each loser, why it lost, and the code citation that decided it.

  Adopting the suggestion is fine. Adopting it unexamined is the failure.

- **Close every open question** as a `D<n>`, or carry it as a Risk the executor can route around.
- **An outcome is wrong, missing, or open to two readings?** Don't absorb the change into the plan. Take it through the issue's [amendment route](../caic-issue/SKILL.md#amending-an-outcome).
- **Name the folder `<N>-<slug>`**, so the plan and the issue find each other.

If the approach is obvious once you've read the issue and the code, skip the plan and build — see [When to write a plan](#when-to-write-a-plan). A suggested fix that looks obvious still gets its premise checked and one alternative named before you build, even with no plan file. A change a consumer can observe is the exception: it still takes a `PLAN.md` holding at least the Public API surface, and the proposal posted from it.

## Pick the artifact first

Decide what you are producing before writing anything: a plan against an issue, a plan whose breakdown becomes an epic, an ADR alongside either, or nothing at all when one obvious PR closes the work. Then settle the fork that decides where the acceptance criteria live — a plan producing issues writes none, and a plan producing PRs writes them in `PLAN.md` or in each step file. Both tables, and why a plan, an epic, and an ADR are companions rather than alternatives, are in [artifact-choice.md](references/artifact-choice.md). Read it before you open the first file.

## The spine

One requirement, restated at each scale, never re-invented:

| Level                       | Section             | Rule                                                                                                                                     |
| --------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| ADR                         | Proposal            | The why: what changes, why now, and what it costs consumers.                                                                             |
| Shaping plan                | Done when           | The observable outcomes of an effort. Written first; survives redesign.                                                                  |
| Epic                        | Expected outcomes   | One per plan outcome, in the same words where they still fit.                                                                            |
| Issue                       | Done when           | Outcomes only, no proofs. Each traces to one epic outcome, or to the issue's own Goal.                                                   |
| Plan, or Step (`PLAN-{N}`)  | Acceptance criteria | Each traces to one issue Done-when item — or, with no issue, to the plan's own Done when — and carries its proof.                        |
| PR                          | Testing / Reviewing | The steps that exercise the criteria that PR closes.                                                                                     |
| Diff                        | Review              | The outcomes and criteria walked against the code that shipped.                                                                          |

Two rules make it a spine rather than seven lists. **Nothing appears at a lower level without a parent above it** — a criterion with no outcome is scope nobody agreed to. **A change propagates down from where it was made** — when a decision moves the goalposts, fix the highest level it touches, then every level below it: the epic, its issues (amended by comment, never by editing the body), and the plans written against them. Skip that and the artifacts describe different products.

The ADR row is the exception to the first rule: it is the only optional level, and most plans don't have one. Where a plan does sit under an ADR, the propagation rule still applies from the top — a superseding ADR reopens the Done when list below it.

## When to write a plan

- The work spans multiple PRs, packages, or sessions, and the executor needs to load context cold.
- There are interlocking design decisions that should be locked before code is written (API shape, deprecation policy, naming, error semantics).
- The user wants to see and approve the approach before any code lands.
- An issue leaves the approach open, and the right one isn't obvious from the code.

If the work is one PR with one obvious approach, skip the plan and just do it. Plans for trivial work are noise.

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

The fork decides how far you go. On the issues fork, shaping is the whole job: you stop at the end of the first row and file the epic's children with Done when outcomes. Whoever picks up each child plans its second row.

**Don't open a `PLAN-{N}` file while `PLAN.md` still has an open question that would move the step boundaries.** Finish shaping first. The tell is a step you can't state in one line — that is an undecided shape, not a long step.

Decision shaping sits above both, and is its own skill: [caic-adr](../caic-adr/SKILL.md). Its stopping rule is looser on purpose — feasibility, not sequencing.

## What goes in `PLAN.md`

Plans live in `.github/plan-drafts/{name}/`, are git-ignored, and are never committed. `PLAN.md` carries Context, Done when, Decisions, Public API surface, the per-step breakdown, Cross-cutting concerns, and Out of scope; each `PLAN-{N}-{title}.md` step file carries its read-first header, Scope, Files touched, Acceptance criteria, Implementation steps, Gate, and Risk. What every one of those sections has to say, which of them a single-step plan absorbs, and where a finished plan's reasoning lands before the files are deleted are in [plan-files.md](references/plan-files.md). Read it before you create either file.

Lock the contract under Public API surface whenever the plan changes what a consumer can observe, and post it on the issue before building — the locks and the posting rules are in [api-contract.md](references/api-contract.md).

## Acceptance criteria

Each box is one observable outcome plus the proof it holds. Write the outcome, then how anyone checks it: a command that exits 0, a named spec, or demo steps with the expected result. An outcome nobody can check is a wish, and every criterion traces to a parent one level up per [the spine](#the-spine). The five rules that keep a box falsifiable — one outcome per box, observable from outside, no spec-dump box, name the proof, nothing new — are in [writing-plans-well.md](references/writing-plans-well.md#acceptance-criteria). Read it while you write the boxes, together with the style rules and the anti-patterns beside them.

## Review before executing

A plan is not done when it is written. Close every planning session by reviewing it with fresh eyes against [plan-review.md](references/plan-review.md) — spawn a sub-agent for the review when sub-agents are available, since reviewing your own plan against itself produces a tautological thumbs-up.

Resolve what the review surfaces and bake the resolutions into the plan files before handing back. The same rubric applies standalone when the user asks you to review a plan you didn't write.

## Related guidance

- [artifact-choice.md](references/artifact-choice.md) — read first when it isn't settled whether the work needs a plan, an epic, an ADR, or none of them
- [plan-files.md](references/plan-files.md) — read when creating or filling `PLAN.md` or a step file, and again when the last step merges
- [writing-plans-well.md](references/writing-plans-well.md) — read while writing the words: criteria rules, style, and the failure list
- [api-contract.md](references/api-contract.md) — read when the work changes what a consumer can observe, and before posting the proposal
- [plan-review.md](references/plan-review.md) — read when closing a planning session: the review rubric this workflow ends with
- [epic-authoring.md](../caic-issue/references/epic-authoring.md) — read when projecting a plan's breakdown onto a GitHub epic
- [tone.md](../../../references/tone.md) — read while drafting: voice and quick rules for the plan itself
- [Root AGENTS.md](../../../AGENTS.md) — repo overview and pointer index

Task input from the user, if any: $ARGUMENTS
