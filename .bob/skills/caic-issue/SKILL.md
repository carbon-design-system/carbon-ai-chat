---
name: caic-issue
description: Draft or file a GitHub issue with a problem, outcomes, and settled constraints. Use when asked to write up a task, file an issue, or break an epic into sub-issues; implementation and proofs belong in the plan.
---

How to write a good issue in this repo and how to wire a sub-issue to its parent.

If the work is an umbrella that splits into multiple children, author it as an epic instead — see [epic-authoring.md](references/epic-authoring.md). An epic is shaped with [caic-plan](../caic-plan/SKILL.md) first, and its children are filed here.

## What an issue is

An issue states a problem, the outcomes that close it, and anything already settled. It does not choose the fix. The developer who picks it up owns the design: they plan against the issue with [caic-plan](../caic-plan/SKILL.md), and that plan holds the acceptance criteria, their proofs, and any API contract.

So a single issue needs no plan before it is filed. Write down what you know about the problem and stop there. A fix you have in mind can go under Possible approaches as one option, and the planner treats it as a hypothesis to check against the code, not an instruction.

This skill owns the body's structure and the `gh` calls that file it. **How the words go is [issue-bodies.md](../caic-copy-writer/references/issue-bodies.md)** — type 10 — including the title, the reading-level gate on the draft, and the claim-before-scaffolding rule that bites hardest here.

## Title style

How to word one: [issue-bodies.md](../caic-copy-writer/references/issue-bodies.md). The only mechanical rule is the prefix, and there isn't one for `gh`-filed sub-issues — the [DEVELOPMENT_TASK.yaml](../../../.github/ISSUE_TEMPLATE/DEVELOPMENT_TASK.yaml) form prepends `[Task]: ` for scannability in lists, and a `gh`-filed issue goes without.

## Body structure

Internal development work uses these sections, in this order — the same ones the [DEVELOPMENT_TASK.yaml](../../../.github/ISSUE_TEMPLATE/DEVELOPMENT_TASK.yaml) form prompts, so a `gh`-filed issue and a form-filed one read identically. Read that form's `description:` text for what each section has to contain; it is the per-field instruction for both paths, and `gh` never renders it.

- **Background** — the _why_, opening with the problem in plain language: who is bitten and what goes wrong today, before any file, script, or type name — see [issue-bodies.md](../caic-copy-writer/references/issue-bodies.md). Then the links: the parent epic if this is a sub-issue, and the ADR if this implements a recorded decision — [caic-review](../caic-review/SKILL.md) checks the diff against it.
- **Goal** — the outcome this issue exists for, not the mechanism that delivers it.
- **Done when** — a `- [ ]` list of observable outcomes. See [Done when](#done-when).
- **Constraints** _(optional)_ — what is already settled and binds any fix: an accepted ADR, a compatibility promise, an accessibility requirement. A preference is not a constraint; it is a possible approach.
- **Possible approaches** _(optional)_ and **Open questions** _(optional)_ — see [below](#possible-approaches-and-open-questions).
- **Out of scope** — what this deliberately does not cover.
- **Related** — parent epic, siblings, PRs, designs. A `Depends on: #N (reason)` line carries the _reason_ a blocker blocks; the relationship itself is a dependency link, not prose — see [Recording blockers](#recording-blockers).

## Done when

Each box is one outcome that has to hold before the issue closes. The developer's plan turns each into acceptance criteria with proofs — see [caic-plan](../caic-plan/SKILL.md#acceptance-criteria) — so the issue names the outcome and stops.

- **One outcome per box.** If it needs an "and", split it — a half-true box can't be ticked.
- **Observable from outside.** Say what a user, a host developer, the type surface, or the build sees — not which function changes. "A partial config still inherits the default field by field" is an outcome; "route all three sites through the merged config" is a fix.
- **No proofs.** Leave out spec paths, test names, commands, and the definition-of-done gate. Choosing the proof is part of planning, and a named test is usually a named fix in disguise.
- **Nothing new here.** Every outcome projects a parent one level up — an epic outcome, or the Goal on a standalone issue. The rule is [the spine](../caic-plan/SKILL.md#the-spine).

### Amending an outcome

When a developer finds an outcome wrong, missing, or open to two readings, they say so in a **comment** on the issue — what should change, and why. The issue author or a lead agrees in the thread before the PR relies on the change. Never rewrite the body; the original has to stay readable beside the correction. An agent drafts the comment into `.github/issue-drafts/<N>-amendment.md` and posts it only under the gate in [Before anything is filed](#before-anything-is-filed).

## Possible approaches and open questions

Both are optional, and most small issues need neither.

- **Possible approaches** — fixes you can see, each with its tradeoff. They are input to planning, not a decision: don't pick one, and don't restate one as the Goal. A single approach is fine; present it as an option anyway.
- **Open questions** — what you don't know and the planner has to find out: a behavior you couldn't confirm, a consumer you're unsure depends on this.

## Public API

An issue doesn't lock an API shape. Material, unresolved public behavior takes a contract proposal during planning — see [api-contract.md](../caic-plan/references/api-contract.md). A settled compatibility requirement goes under Constraints. Routine wording fixes need no new proposal.

## Drafting the body

Draft the body into `.github/issue-drafts/<kebab-case-slug>.md` and file it with `--body-file`. That directory is git-ignored, so drafts stay local. Rename to `<issue#>-<slug>.md` once filed, so the draft and the live issue are findable from either side. Use `###` headings: the form emits `### <label>` per field, so a form-filed issue is `###` by construction and a `gh`-filed one has to match.

Keep the draft in sync with the live issue whenever you edit one — correcting only the GitHub copy means the next edit from the draft silently reverts it.

## Before anything is filed

For a draft request, stop at the file. When filing is requested, finish the body and checks before posting. Use authorization already given for that action and destination; ask only about missing scope or a new external action. The same rule covers amendment comments.

Then, before the command:

- **Resolve the repo.** Every call below takes an explicit `<owner>/<repo>`. Use the user's selection; otherwise inspect `git remote -v` and ask if the destination is ambiguous. Multiple remotes alone do not invalidate a supplied destination.
- **Carry it through.** The examples below use one repository for the related issues. If the request spans repositories, resolve each issue's repository and database ID instead of silently changing its destination.
- **No agent attribution** in the title or body.

## Filing a sub-issue via `gh`

The sub-issues REST API links by the child's database **id**, not its issue number — the common mistake. The flow:

```bash
# 1. Create the child; note the new issue number N from the output.
gh issue create --repo <owner>/<repo> --title "<title>" --body-file <file>

# 2. Resolve the child's database id (NOT the issue number N).
CHILD_ID=$(gh api repos/<owner>/<repo>/issues/N --jq .id)

# 3. Link it under the parent.
gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id="$CHILD_ID"
```

- The POST response echoes the **parent** issue, not the child — that's expected.
- A `422 "duplicate sub-issue"` just means a prior POST already succeeded; treat it as done.
- A sub-issue may have only **one** parent.

## Verifying the link

```bash
gh api --paginate "repos/<owner>/<repo>/issues/<parent>/sub_issues?per_page=100"
```

Check the children list, and `sub_issues_summary.total` on the parent. The summary count can lag a cached read — trust the paginated list if the two disagree.

## Recording blockers

Record a blocker with the dependencies API. GitHub then banners the blocked issue, lists it in the blocker's sidebar, and clears the banner when the blocker closes — body prose does none of that.

The API mirrors sub-issues, including the gotcha: it keys on the blocker's database **id**, not its issue number.

```bash
# 1. Resolve the BLOCKER's database id (NOT its issue number).
BLOCKER_ID=$(gh api repos/<owner>/<repo>/issues/<blocker> --jq .id)

# 2. Link it: <blocked> is now blocked by <blocker>.
gh api --method POST repos/<owner>/<repo>/issues/<blocked>/dependencies/blocked_by \
  -F issue_id="$BLOCKER_ID"

# 3. Verify from either side.
gh api repos/<owner>/<repo>/issues/<blocked>/dependencies/blocked_by
gh api repos/<owner>/<repo>/issues/<blocker>/dependencies/blocking
```

- Unlink with `DELETE repos/<owner>/<repo>/issues/<blocked>/dependencies/blocked_by/$BLOCKER_ID` — database id again.
- Keep the `Depends on: #N (reason)` prose for the _why_, but never in place of the link.
- Bulk linking in a burst trips secondary rate limits. Pace the calls.

## Internal vs. external

- **Internal work** → the [DEVELOPMENT_TASK.yaml](../../../.github/ISSUE_TEMPLATE/DEVELOPMENT_TASK.yaml) form, or a blank issue following the body structure above.
- **External reporters** → the typed forms ([BUG_REPORT.yaml](../../../.github/ISSUE_TEMPLATE/BUG_REPORT.yaml), [FEATURE_REQUEST_OR_ENHANCEMENT.yaml](../../../.github/ISSUE_TEMPLATE/FEATURE_REQUEST_OR_ENHANCEMENT.yaml), and siblings). Don't route internal tasks through these.

## Labels

Apply labels only when they drive a workflow (triage queue, release notes, a board filter). The issue **type** (`Task`) and the parent-epic link already carry most categorization, so skip decorative labels.

## Related guidance

- [epic-authoring.md](references/epic-authoring.md) — when to group sub-issues under an epic, and how to track them
- [caic-plan](../caic-plan/SKILL.md) — planning against an issue once someone picks it up
- [issue-bodies.md](../caic-copy-writer/references/issue-bodies.md) — how to word the body and the title, and the gate before filing
- [tone.md](../../../references/tone.md) — voice and quick rules for the issue body
- [caic-pr](../caic-pr/SKILL.md) — turning a completed issue into a PR description
- [Root AGENTS.md](../../../AGENTS.md) — repo overview and pointer index

Task input from the user, if any: $ARGUMENTS
