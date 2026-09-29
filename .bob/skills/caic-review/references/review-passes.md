# review-passes.md — one dimension per pass, and how the passes merge

Load this once the review is scoped and before you read the diff for findings: it carries the check that runs on every review, picks the rest of the passes from the changed paths, briefs them, and merges what they return.

## The check that runs every time

Run this pass whatever the diff touches. It scores the change against what it had to satisfy, which no per-path checklist can see.

- **Open the issue the work closes** — for a self-review, the issue or ask the task came from — and read its comments too. Walk its Done when and Constraints against the diff. An outcome the diff misses, or a constraint it breaks, is a **Blocker** until an agreed amendment on the issue says otherwise.
- **Walk the proofs next**: the plan's acceptance criteria for a self-review, the PR's Testing / Reviewing steps for someone else's PR. A proof the diff doesn't satisfy is a **Blocker**.
- **Compare the shipped shape against any API proposal comment** on the issue. A difference with no follow-up in the thread is **Important**, and the fix may be a comment rather than a code change.
- **Read any ADR the issue or its epic cites** — its Proposal and its Decision — and walk the diff against them too. A diff that contradicts an accepted ADR is a **Blocker** until a new ADR supersedes it; an implementation PR is not where a recorded decision gets reversed.

## Hand a self-review to fresh eyes

- **Hand the diff to a sub-agent when you have one.** The context that wrote the diff already justified every choice in it, and re-reading it there replays those justifications instead of testing them.
- **Pass the requirement, withhold the defense.** The sub-agent gets the diff, this rubric, and what the work had to satisfy — the issue (its Done when, its Constraints, and any amendment or API proposal in its comments) or the user's ask, any ADR it cites, and your plan's acceptance criteria and contract. It does not get your design notes, the options you ruled out, or the plan's Decisions and commentary. The requirement is what the review scores against; your reasoning is the bias you're trying to escape. A concern you already resolved comes back cheap — answer it in a line, and if the answer was worth having, it belonged in a comment or an ADR.

## Pick the passes from the changed paths

One pass over every check spends its attention on the first dimension and skims the rest. Split the review into independent passes, each holding the whole diff and one job. Pick the passes from the changed paths — a docs-only diff gets two of them, not the whole table:

| Changed | Passes |
| --- | --- |
| Any code | correctness & security, simplicity & scope creep, test coverage |
| `*.scss`, or any component | accessibility, prefix & SCSS, component placement & trapped logic |
| `AGENTS.md`, `**/references/**`, `.bob/skills/**`, `.github/copilot-instructions.md` | spec conformance, tone & docs |
| Any other `*.md`, or JSDoc on public types | tone & docs |
| `package.json` | dependencies |
| Always | Done when, constraints, proofs & ADRs |

Markdown that tells an agent what to do is a specification, not copy. The spec-conformance pass asks whether an agent following the changed text does the right thing, and holds it to [authoring-agents-md.md](../../../../references/authoring-agents-md.md) — the line budget, one topic per file, a "read when" trigger on every reference link, and the Related guidance footer.

Skip the split when a single reading holds the whole diff in view. Splitting a handful of lines across five passes is ceremony.

## Brief every pass the same way

Dispatch them in parallel when the harness gives you sub-agents (see [AGENTS.md](../../../../AGENTS.md)); run them as separate sequential passes when it doesn't. Either way, every pass gets the same brief: the diff, this rubric by path, its one dimension, and the `AGENTS.md` files governing the paths it holds ([repo-checks.md](repo-checks.md)). The finding shape and [What isn't a finding](writing-findings.md#what-isnt-a-finding) travel with the rubric. A pass told only to find things will manufacture Nits to justify itself.

A pass returns findings and nothing else — no verdict, no cap, no ranking. It can't rank what it can't see.

## Refute before you synthesize

The caps cut volume, never falsity: a wrong Blocker is unique, top-ranked, and never dropped, so it survives every other step. Take each Blocker and Important and argue the other side — name the code path that makes it wrong. A finding you can't refute ships; one you can, dies silently. Hand this to a sub-agent with the diff and the findings, not the passes' reasoning, when the harness has one; run it as your own last pass when it doesn't. Nits skip it — they are cheap to be wrong about.

## Synthesize before you write anything

Merge the passes, then read them against each other before you rank. Two findings are duplicates when they name the same root cause, not merely the same line — on a merge, keep the higher severity and union the fixes. Where two passes cite the same file or symbol for different reasons, decide whether you hold two findings or one larger defect neither pass could see alone. A finding you create here is new, so refute it before it ships — surviving refutation twice says nothing about the claim that joins them. Then rank by severity, apply the caps, and write the verdict per [Output expectations](../SKILL.md#output-expectations). Skip this and you ship N reviews stapled together.

## Related guidance

- [caic-review](../SKILL.md) — the rubric every pass is briefed with
- [evaluating-changes.md](evaluating-changes.md) — read when a pass needs its checklist: docs and text, code, or test coverage
- [repo-checks.md](repo-checks.md) — read when briefing a pass: the `AGENTS.md` chain governing its paths, and the gates that already ran
- [writing-findings.md](writing-findings.md) — read when a pass writes its findings: worked examples, and what isn't a finding
- [large-diffs.md](large-diffs.md) — read when the diff is too big to read evenly: rank the files before the passes start
