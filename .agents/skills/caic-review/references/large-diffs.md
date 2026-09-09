# large-diffs.md — reviewing a diff too big to read evenly

Load this when reading the whole diff at one depth would mean reading all of it shallowly: the file list scrolls past a screen, or you catch yourself skimming to keep moving. Rank the files first, then run the dimension passes from [caic-review](../SKILL.md) over whatever the ranking puts on top.

No line count triggers this. A 600-line lockfile bump is not a large diff; four files rewriting the store is.

## Rank before you read

Sort the changed files by risk per line, then spend attention in that order.

**Costs a glance, not a read**

- Pure renames and moves. `git diff -M --summary` reports a similarity index; at 100% there is nothing to review but the new path.
- `package-lock.json`. Review the `package.json` change that caused it.
- Generated output this repo does not commit, per the never-edit list in [AGENTS.md](../../../../AGENTS.md) — an edit there is a **Blocker** on sight and costs no reading at all. The telemetry configs are the exception on that list: `packages/ai-chat/telemetry.yml` and `packages/ai-chat-components/telemetry.yml` are committed and regenerated, so they belong in the diff. Glance and move on.

**Read in full**

- `packages/ai-chat/src/types/**` — the public contract. A wrong line here ships to consumers and comes back only in a major.
- `packages/ai-chat/src/chat/store/**` — reducers and state transitions, where a broken reference costs a re-render nobody asked for.
- Any file whose directory carries its own `AGENTS.md`. That file exists because the area has rules that are easy to get wrong.
- New files. There is no unchanged context to lean on — all of it is new logic.

**Read the hunks, not the file**

Everything else. Risk concentrates where the diff landed, and the surrounding code was reviewed once already.

## Size is a finding

A diff nobody can review well does not become reviewable by being reviewed anyway. When the change should have been several PRs, say so:

- **Important** by default. Name the seams — which files would have made the second PR.
- **Blocker** when the PR bundles unrelated work. That is scope creep, already a Blocker on its own; size is just how it surfaced.

Mechanical bulk is not the same thing. A rename sweep across sixty files is one job, and it reviews fine once the ranking above drops it into the glance tier.

## Say what you read

A partial review that reads as a complete one is worse than no review. Close the summary with your coverage, alongside the dropped-finding count:

> Read the store changes and public types in full. Skimmed 14 test-fixture updates and the lockfile.

## Related guidance

- [caic-review](../SKILL.md) — the rubric this triage feeds
- [reviewing-a-pr.md](reviewing-a-pr.md) — base-branch resolution, which decides how large the diff even is
- [Root AGENTS.md](../../../../AGENTS.md) — the generated-output list and the repo layout
