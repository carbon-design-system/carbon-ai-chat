# issue-authoring.md — authoring GitHub issues

How to write a good issue in this repo and how to wire a sub-issue to its parent. Use this when asked to "file an issue", "open a sub-issue", "write up a task", or when breaking an epic into children. Epics themselves: see [epic-authoring.md](epic-authoring.md).

## Title style

Short, descriptive, imperative — name the change, not the area. No forced prefix for `gh`-filed sub-issues ("Add an AGENTS guide for authoring epics"); the [DEVELOPMENT_TASK.yaml](../.github/ISSUE_TEMPLATE/DEVELOPMENT_TASK.yaml) form prepends `[Task]: ` for scannability in lists.

## Body structure

Internal development work uses these sections — the same ones the [DEVELOPMENT_TASK.yaml](../.github/ISSUE_TEMPLATE/DEVELOPMENT_TASK.yaml) form prompts, so a `gh`-filed issue and a form-filed one read identically:

- **Background** — the _why_. Link the parent epic if this is a sub-issue.
- **Goal** — the change that exists when this is done.
- **Acceptance criteria** — a `- [ ]` checkbox list of conditions that must hold before closing.
- **Public API / contract** — the up-front type contract (see below); omit when there's no public-API change.
- **Out of scope** — what this deliberately does not cover.
- **Related** — parent epic, siblings, PRs, designs.

## Define the contract up front

When a task introduces or changes public API — anything exported from [packages/ai-chat/src/aiChatEntry.tsx](../packages/ai-chat/src/aiChatEntry.tsx) or [packages/ai-chat/src/serverEntry.ts](../packages/ai-chat/src/serverEntry.ts) — state the TypeScript contract **in the issue, before implementation**:

- **Data types** — the interfaces / type aliases the change adds or alters.
- **Method signatures** — the signature of every method or function introduced on the public surface.

Locking the shape up front turns review into "does the code match the agreed contract?" instead of a design debate inside the PR. The semver and JSDoc rules for that surface are canonical in [packages/ai-chat/AGENTS.md](../packages/ai-chat/AGENTS.md) and [packages/ai-chat/src/types/AGENTS.md](../packages/ai-chat/src/types/AGENTS.md) — link to them, don't restate them here.

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

## Internal vs. external

- **Internal work** → the [DEVELOPMENT_TASK.yaml](../.github/ISSUE_TEMPLATE/DEVELOPMENT_TASK.yaml) form, or a blank issue following the body structure above.
- **External reporters** → the typed forms ([BUG_REPORT.yaml](../.github/ISSUE_TEMPLATE/BUG_REPORT.yaml), [FEATURE_REQUEST_OR_ENHANCEMENT.yaml](../.github/ISSUE_TEMPLATE/FEATURE_REQUEST_OR_ENHANCEMENT.yaml), and siblings). Don't route internal tasks through these.

## Labels

Apply labels only when they drive a workflow (triage queue, release notes, a board filter). The issue **type** (`Task`) and the parent-epic link already carry most categorization, so skip decorative labels.

## Related guidance

- [epic-authoring.md](epic-authoring.md) — when to group sub-issues under an epic, and how to track them
- [pr.md](pr.md) — turning a completed issue into a PR description
- [Root AGENTS.md](../AGENTS.md) — repo overview and pointer index
