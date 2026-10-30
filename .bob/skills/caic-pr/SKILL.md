---
name: caic-pr
description: Draft a PR description from the selected changes, or submit it when requested. Use for PR descriptions and PR creation, not a plain commit or push request.
---

Workflow for drafting a pull-request description. Do **not** trigger on a plain commit/push request.

**Before drafting any copy**, read [caic-copy-writer](../caic-copy-writer/SKILL.md) and apply its shared skim-reading rule and workflow. This includes local drafts and final artifacts. Reuse it if already loaded.

## Output

A `.github/pr-drafts/<scope-slug>.md` file, populated from [.github/PULL_REQUEST_TEMPLATE.md](../../../.github/PULL_REQUEST_TEMPLATE.md). Use the branch name or a short range label for the slug. Update the draft for this task; preserve unrelated drafts. The directory is git-ignored.

**Draft requests end at the file.** When the user also requests publication, complete the draft and applicable checks, then follow [Submitting](#submitting). Reuse authorization already given for that action and destination.

## Style

This skill owns the template's sections and what belongs in each. **How the words go is [pr-descriptions.md](../caic-copy-writer/references/pr-descriptions.md)** — type 9 — and it governs every section you draft below, down to the reading-level check you run before handing back.

## Resolve the scope

Use the range, commits, or PR the user named. Do not ask them to confirm it again. For a branch PR, resolve `<BASE>` and `<HEAD>` from the request, existing PR, or repository context. Ask only when plausible choices would describe different work.

- **Branch PR:** inspect `git log <BASE>..<HEAD> --oneline` and `git diff <BASE>...<HEAD>`. The diff starts at the merge base, so changes made only on the base branch stay out.
- **Explicit endpoint comparison:** honor the requested endpoints with `git diff <START> <END>`; do not silently substitute a merge-base comparison.
- **Selected commits:** read each selected commit's patch and message. State the selection in the draft by commit subject, not hash. Excluding a commit from prose does not exclude it from an eventual PR.
- **No changes in scope:** report that fact rather than inventing a range or changelog.

Local drafting does not require a branch switch or creation. A supplied historical range can be described while checked out on the base branch. Resolve publishable branch state when submission is requested.

## Workflow

1. **Record the selected scope.** Use the resolved inputs above. Ask about missing information only when it changes the description.

2. **Re-read the template.** Always read [.github/PULL_REQUEST_TEMPLATE.md](../../../.github/PULL_REQUEST_TEMPLATE.md) fresh — its structure may have changed since this file was written. Keep its sections in this order: short description, `#### Commit map`, `#### Architecture`, `#### Public API changes`, `#### Changelog`, `#### Testing / Reviewing`. Commit map is this skill's only addition to the template. Delete each optional section you don't use; step 4 says when each earns its place.

3. **Inspect the actual patches.** Use the comparison for the selected scope, then read the affected code. Call out files with complex changes that deserve a reviewer's attention.

4. **Draft the file** following the template. Per-section guidance:
   - **`Closes #`** — leave the line as-is unless the user gave issue numbers. If they did, write one `Closes #N` per line; `Closes #1, #2` links only the first.
   - **`{{ Short description }}`** — 1–2 sentences on the _why_ and shape of the change. Add a short bulleted list of files with genuinely complex changes **only when there are any** — one line each (file + what's tricky, e.g. "`path/to/Bar.ts` — rewrites the X loop; check the early-return at line 142"). Skip the list entirely when the diff is straightforward. If a decision a consumer can feel got no ADR, give its reasoning in a sentence — the plan that held it gets deleted.
   - **`#### Commit map`** — a numbered map of the branch's commits, oldest first. **Include it only when the commits are the unit a reviewer walks** — several commits, each standing on its own. A single-commit PR gets none, and neither does one whose commits are arbitrary slices of a single change; a map there is filler.
     - One line per commit: subject, then what it does. Bold the load-bearing ones — drop one and the change, a proof the plan named, or the build breaks. Leave supporting proof, docs, and cleanup plain, so the reviewer knows what to read closely and what to skim.
     - Group under a package or area lead-in when the branch spans more than one, numbering straight through.
     - A map entry and a changelog bullet may cover the same change — the map indexes commits, the changelog indexes behavior.
     - The map belongs here, not in the commit bodies — those are written for the pre-merge read only, and stay governed by the [commit bodies](../../../references/conventions.md#commit-bodies) rubric rather than by this template.
   - **`#### Architecture`** — include it only when the PR is stacked, or moves data or event flow, or ownership of state or behavior, between modules. Crossing packages and CSS-only changes don't count. When it applies, read [diagrams.md](references/diagrams.md) and follow it.
   - **`#### Public API changes`** — include it only when the PR changes public API, as [packages/ai-chat/AGENTS.md](../../../packages/ai-chat/AGENTS.md) defines it for `@carbon/ai-chat` and [component-authoring.md](../../../packages/ai-chat-components/references/component-authoring.md#public-api--deprecation) for `@carbon/ai-chat-components`. Write no "None" line.
     - One line per symbol, marked added, changed, deprecated, or removed. Call out changed defaults and breaking changes.
     - Link the governing ADR, or the API proposal comment on the issue, if one exists.
     - The changelog says what a consumer sees; this section names the contract.
   - **`#### Changelog`** — populate **New** / **Changed** / **Removed** from the commits and diff. One short fragment per user-visible change. Drop any subsection with nothing in it. Split into `#### Major changes` / `#### Minor changes` (each keeping the New/Changed/Removed subheadings) whenever there's a real triage benefit — a mix of headline changes and incidental ones — so the reviewer can skim the majors and skip the rest. The split organizes bullets; it doesn't license more or longer ones.
     - **Trace it both ways before handing back**: every bullet comes from at least one commit in range, and every commit that changes what a consumer sees has a bullet. A commit that resists the trace usually changed nothing user-visible — proof, docs, internal cleanup — and needs no bullet. If it did change behavior, the changelog has a hole; write the bullet.
   - **`#### Testing / Reviewing`** — the fewest steps a reviewer needs to confirm it works, as terse imperatives with the expected result. These are the proofs from the plan's acceptance criteria, in the order a reviewer would run them — not a second list. Don't re-explain the changelog. For each thing to verify, use the first source that covers it:
     1. **The demo site.** Check [demo/AGENTS.md](../../../demo/AGENTS.md) for the query-param toggles, switchers, writeable elements, mock backend, and mock service desk.
     2. **An existing example** under `examples/`, run as it is.
     3. **An existing example with edits.** Supply the snippet or patch.
     - List each manual check you didn't do and a reviewer should, such as a screen-reader pass, one per line.
   - **Measurement** — always measure the PR's actual scope, and report it only by exception.
     - Run `npm run measure -- --changed <PR base> --source head`; a stacked layer uses its parent branch as the base. If the checkout isn't at the PR head, run it in a git worktree at the head. Never measure a working tree that doesn't match the selection.
     - Mention size only past the [Over 400 row](../../../references/pr-reviewability.md#use-size-to-find-useful-boundaries). Then write one sentence with the counted lines and why the change stays together; don't paste the `== size` block. Quote only the rows the tool labels with a severity. Otherwise say nothing about measurement.
   - **Leave out**, in every PR, including an ADR PR:
     - commit hashes and base/head lines; hashes go stale on rebase, and GitHub shows the base;
     - results of checks CI runs, such as tests, lint, and builds;
     - notes on how you did the work;
     - notes for a later layer of the work, which go in the plan.

5. **Hand back or submit.** For a draft request, return its path. Report gates, measurement, and source citations in the hand-back, per [definition-of-done.md](../../../references/definition-of-done.md). If publication is already requested, continue below.

## Submitting

Load [submitting.md](references/submitting.md) only when the user requests opening or updating a PR. It resolves the destination, checks the branch, and verifies the result. A draft request or plain commit/push request does not authorize PR creation.

## Notes

- `.github/pr-drafts/` is git-ignored; never commit a draft.
- The PR title is the eventual squash commit, so it follows conventional-commit format — see [conventions.md](../../../references/conventions.md).
- The PR description is the durable record: commit bodies die at the squash, so anything a post-merge reader needs lives here, not in a branch commit body ([commit bodies](../../../references/conventions.md#commit-bodies)).

## Related guidance

- [pr-descriptions.md](../caic-copy-writer/references/pr-descriptions.md) — how to word the description, and the gate it takes
- [tone.md](../../../references/tone.md) — voice and quick rules for developer-facing copy
- [conventions.md](../../../references/conventions.md) — commits, branches, PR titles
- [Root AGENTS.md](../../../AGENTS.md) — repo overview and pointer index

Task input from the user, if any: $ARGUMENTS
