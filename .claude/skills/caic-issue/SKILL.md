---
name: caic-issue
description: Write and file a GitHub issue in this repo — body structure, the up-front API contract, sub-issue linking via gh, and escalation to an epic when the work is an umbrella. Use when the user asks to "file an issue", "open a sub-issue", "write up a task", or when breaking an epic into children.
---

How to write a good issue in this repo and how to wire a sub-issue to its parent.

If the work is an umbrella that splits into multiple children, author it as an epic instead — see [epic-authoring.md](references/epic-authoring.md).

## Start from a plan

An issue is a projection of a decision that has already been made. Filing one before the shape is settled produces an issue that gets rewritten twice, so for anything beyond a single obvious PR, plan first.

- **If you already know of a plan, ask which fork it is on** — see [caic-plan](../caic-plan/SKILL.md#pick-the-artifact-first). A plan that produces issues is consumed by filing this one: its Goal, acceptance criteria, and API contract come straight out of it, and an epic's children come from its per-step breakdown table. A plan that produces work keeps its criteria in its `PLAN-{N}` step files and is consumed by producing the PRs — don't lift them into an issue. Whichever artifact holds the criteria owns them; two copies drift.
- **If you don't, ask.** Check `.github/plan-drafts/` for a folder covering this effort and ask the user whether a plan exists that you haven't seen — plans are git-ignored, so one may be sitting on their working copy or in a past session.
- **If there is none and the work spans multiple PRs, draft one first** with the [caic-plan](../caic-plan/SKILL.md) skill. Come back and file only if that plan turns out to be issue-producing; if it produces the work directly, there is nothing to file.

A one-PR change with an obvious approach needs no plan. Don't manufacture one.

Issue text is developer-facing copy: follow [tone.md](../../../references/tone.md). Terse beats thorough — a reader skims an issue to decide whether it concerns them.

## Title style

Short, descriptive, imperative — name the change, not the area. No forced prefix for `gh`-filed sub-issues ("Add an AGENTS guide for authoring epics"); the [DEVELOPMENT_TASK.yaml](../../../.github/ISSUE_TEMPLATE/DEVELOPMENT_TASK.yaml) form prepends `[Task]: ` for scannability in lists.

## Body structure

Internal development work uses these sections — the same ones the [DEVELOPMENT_TASK.yaml](../../../.github/ISSUE_TEMPLATE/DEVELOPMENT_TASK.yaml) form prompts, so a `gh`-filed issue and a form-filed one read identically:

- **Background** — the _why_. Link the parent epic if this is a sub-issue, and the ADR if this implements a recorded decision — that is what [caic-review](../caic-review/SKILL.md) checks the diff against.
- **Goal** — the change that exists when this is done.
- **Acceptance criteria** — a `- [ ]` list of observable outcomes, each carrying its proof. See [Acceptance criteria](#acceptance-criteria).
- **Public API / contract** — the up-front contract, shape and behavior (see below); omit only when nothing a consumer can observe changes.
- **Out of scope** — what this deliberately does not cover.
- **Related** — parent epic, siblings, PRs, designs. A `Depends on: #N (reason)` line carries the _reason_ a blocker blocks; the relationship itself is a dependency link, not prose — see [Recording blockers](#recording-blockers).

## Acceptance criteria

Each box is one observable outcome plus the proof it holds. Write the outcome, then how anyone checks it: a command that exits 0, a named spec, or demo steps with the expected result. An outcome nobody can check is a wish.

- **One outcome per box.** If it needs an "and", split it — a half-true box can't be ticked.
- **Observable from outside.** Say what the chat, the type surface, or the build does, not which function gets edited. "Route all three sites through the merged config" is a plan step; "a partial config still inherits the default field by field" is a criterion.
- **No spec-dump box.** A single `Specs cover: a, b, c…` box is unfalsifiable, and in practice it restates criteria already written above it. Attach each case to the criterion it proves. The cases left over with nowhere to attach are the criteria you forgot to write — promote them.
- **Name the proof.** A spec path, a command, or demo steps. Reuse the spec that already owns the area; for new surface, name the spec that will own it — see the package testing guides ([ai-chat](../../../packages/ai-chat/references/tests.md), [ai-chat-components](../../../packages/ai-chat-components/references/testing.md)). Name the case that fails today, not the properties the proof will have: "a symbol of kind `Interface` with no members and no allowlist entry fails the run" is a proof; "a guard that runs in milliseconds and catches the next one too" is a description of one, and it passes the day it is written.
- **One box carries the gate.** The last criterion is the definition-of-done gate for every area this touches, as the commands that must exit 0. Link [definition-of-done.md](../../../references/definition-of-done.md) rather than restating it — the rows change, and its ordering rule and watcher precondition are load-bearing. Don't settle for "tests pass".
- **Nothing new here.** Every criterion projects a parent one level up — an epic outcome, a plan's Done when item, or the Goal on a standalone issue. The rule is [the spine](../caic-plan/SKILL.md#the-spine).

When implementation proves a criterion wrong, say so in a **comment** on the issue — what the code does instead, and why the original was wrong. Never rewrite the criterion in the body; the original reasoning has to stay readable beside the correction. An amendment takes the same approval gate as filing.

Changing a criterion and weakening its proof are different acts, and only the first has that route. Loosening an assertion, deleting a case, skipping a case, or regenerating a snapshot to match current output all turn the light green while the criterion still reads exactly as filed — which is what makes them worse than an unmet criterion, not better. None is an amendment. Catching one in a diff is [caic-review](../caic-review/SKILL.md)'s job.

## Drafting the body

Draft the body into `.github/issue-drafts/<kebab-case-slug>.md` and file it with `--body-file`. That directory is git-ignored, so drafts stay local. Rename to `<issue#>-<slug>.md` once filed, so the draft and the live issue are findable from either side. Use `###` headings: the form emits `### <label>` per field, so a form-filed issue is `###` by construction and a `gh`-filed one has to match.

Keep the draft in sync with the live issue whenever you edit one — correcting only the GitHub copy means the next edit from the draft silently reverts it.

Don't cite repo guidance from an issue body. External readers can't follow a repo-relative path and the target rots — an already-filed issue still links references/issue-authoring.md, deleted when these workflows became skills. State the contract; the rule that made you state it is internal.

## Define the contract up front

State the contract **in the issue, before implementation**, whenever a task changes what a consumer can observe on the public surface — anything exported from [packages/ai-chat/src/aiChatEntry.tsx](../../../packages/ai-chat/src/aiChatEntry.tsx) or [packages/ai-chat/src/serverEntry.ts](../../../packages/ai-chat/src/serverEntry.ts). A change with no signature change still qualifies: behavior is public too.

Start with the shape — the interfaces and type aliases added or altered, and the signature of every method put on the surface. Then the half the compiler can't hold.

Rows apply per subject. A method takes them all. A type-only change — a rename, a new optional field, a JSDoc fix — takes Defaults, Derivation, and Ownership; say that in one line rather than writing ten "N/A"s. Answer the rest in the JSDoc you're proposing or in prose beside it. "N/A" is an answer; silence is not.

| Lock          | The question it settles                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Preconditions | What state must hold to call this, and what happens when it doesn't?                                    |
| No-op case    | Which inputs do nothing, and does the promise still resolve?                                            |
| Failure       | What rejects, what throws, what resolves carrying an error state — and which is which?                  |
| Events        | Which bus events fire, in what order, and which deliberately do not?                                    |
| Timing        | When the promise settles: on send, on ack, or on completion?                                            |
| Repeat calls  | Idempotent, coalesced, or queued? What does an overlapping caller get?                                  |
| Defaults      | Every optional field's value when omitted, and which layer merges it.                                   |
| Derivation    | For a state or enum a host can read: the rule producing **each** value, and which are unreachable today. |
| Announcement  | What does a screen reader hear, and where does focus land? See [accessibility.md](../../../references/accessibility.md). |
| Ownership     | Which side does the work — the framework, or the host's callback?                                       |

Derivation is the row that gets skipped, and it is the expensive one. A type can be right while every rule behind it is wrong.

Locking shape _and_ behavior turns review into "does the code match the agreed contract?" instead of a design debate inside the PR. The semver and JSDoc rules for that surface are canonical in [packages/ai-chat/AGENTS.md](../../../packages/ai-chat/AGENTS.md) and [packages/ai-chat/src/types/AGENTS.md](../../../packages/ai-chat/src/types/AGENTS.md) — link to them, don't restate them here.

## Before anything is filed

Drafting ends at the file. Filing is a separate ask — **never run a `gh` command that writes to GitHub before the user has seen the body and said go.** An issue opened on a public repo is visible immediately, and closing it doesn't undo that. The same gate covers amending a filed issue.

Then, before the command:

- **Resolve the repo.** Every call below takes an explicit `<owner>/<repo>`, and nothing here fills it in for you. Run `git remote -v`; if more than one remote is configured, or any of them points somewhere other than where this issue belongs, ask which repo to file against rather than letting `gh` pick a default. Same check [caic-pr](../caic-pr/SKILL.md) runs before opening a PR.
- **Carry it through.** The sub-issue and dependency calls take the same `<owner>/<repo>`. A child filed on one repo can't be linked under a parent on another.
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
- [tone.md](../../../references/tone.md) — voice and word economy for the issue body
- [caic-pr](../caic-pr/SKILL.md) — turning a completed issue into a PR description
- [Root AGENTS.md](../../../AGENTS.md) — repo overview and pointer index

Task input from the user, if any: $ARGUMENTS
