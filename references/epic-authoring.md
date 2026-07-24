# epic-authoring.md — authoring and running epics

When to group work under an umbrella epic, how to structure one, and how to track its children. Use this when asked to "open an epic", "plan out a big effort", or when deciding whether a chunk of work is one issue or many. Sub-issue mechanics live in [issue-authoring.md](issue-authoring.md).

## Epic vs. plain issue

An epic must pass a **two-part test** — it is _both_:

1. **Too big for one issue** — the work splits into multiple child issues, often interdependent or sequenced.
2. **Bounded and finishable** — it has a fixed scope and a describable done-state, so it can be closed.

Fail either test and it is **not** an epic:

- Fits in one PR → a plain issue.
- Open-ended feature area that never completes ("Prompt line development") → a **label or project**, not an epic. An epic-as-label keeps accreting children, so `percent_completed` is meaningless and the issue never closes. Avoid this shape.

## Structuring an epic

File epics with the [EPIC.yaml](../.github/ISSUE_TEMPLATE/EPIC.yaml) form. The body holds:

- **Value proposition** — why we're doing this, framed from the user/stakeholder's side.
- **Expected outcomes** — the done-state: the measurable result or observable change that tells you the epic is complete and can be closed.
- **Out of scope** — what this epic deliberately excludes. This boundary is what keeps an epic from drifting into a feature-area bucket.
- **Details / child work** — links to the living list of sub-issues that make up the effort.

If you can't write a crisp "out of scope" and a concrete done-state, the work is probably a label, not an epic — see the test above.

## Adding children

- Sub-issue creation and the database-**id** linking gotcha: see [issue-authoring.md](issue-authoring.md).
- A sub-issue may have only **one** parent — a child can't belong to two epics at once.
- Each child should be independently closeable and map to one PR's worth of work.

## Tracking progress

The parent's `sub_issues_summary` reports `total`, `completed`, and `percent_completed`. Read it with:

```bash
gh api repos/<owner>/<repo>/issues/<parent> --jq .sub_issues_summary
```

For the actual child list, paginate:

```bash
gh api --paginate "repos/<owner>/<repo>/issues/<parent>/sub_issues?per_page=100"
```

The summary count can lag a cached read; when the summary and the paginated list disagree, trust the list.

## Grouping and ordering

- Keep related children together and order them roughly in the sequence they'll be tackled, so the epic reads as a plan.
- When a child grows its own multi-issue scope, spin it into its **own** epic and link the two — don't nest sub-issues arbitrarily deep or overload one epic past its bounded scope.

## Related guidance

- [issue-authoring.md](issue-authoring.md) — writing the child issues and wiring the sub-issue link
- [plan-authoring.md](plan-authoring.md) — when the effort needs a written implementation plan, not just an issue tree
- [Root AGENTS.md](../AGENTS.md) — repo overview and pointer index
