---
name: caic-pr
description: Draft a pull-request description into .github/pr-drafts/ from this repo's PR template, scoped to a commit range the user confirms, then open the PR with gh once the user explicitly asks. Use when the user asks to "write up a PR", "draft a PR description", "make a PR draft", or to submit a PR already drafted — not on a plain commit or push request.
---

Workflow for drafting a pull-request description. Do **not** trigger on a plain commit/push request.

## Output

A `.github/pr-drafts/<branch-name>.md` file, populated from [.github/PULL_REQUEST_TEMPLATE.md](../../../.github/PULL_REQUEST_TEMPLATE.md). That directory is git-ignored — overwrite any existing draft for the branch. Drafting ends at the file: the user reviews it and runs `gh pr create --body-file .github/pr-drafts/<branch-name>.md` themselves, or copy-pastes into the GitHub UI.

**Opening the PR is a separate ask.** Run `gh pr create` only once the user says to — see [Submitting](#submitting).

## Style

Brevity is the goal. The reviewer is busy and the diff is the source of truth — the description points at what's non-obvious, it does not narrate the diff. Default to the shortest version that still conveys the change; err on the side of cutting.

Write it like the docs: follow [tone.md](../../../references/tone.md), kept terse. A description favors fragments, so its reading level lands low — that's fine. Just keep it at grade 11 or below; a description should read like a note to a busy teammate, not a technical manual.

- Sentence fragments over full sentences. Cut filler: "this PR", "in order to", "as well as", "note that", restated context.
- One idea per line. Don't stack parenthetical asides inside a bullet.
- Say each thing once. Don't repeat a change across Short description, Changelog, and Testing.
- Omit empty or trivial sections rather than padding them (no "None" placeholders).
- Check the reading level before handing back: `npm run reading-level -- .github/pr-drafts/<branch-name>.md`. If it reads above grade 11, split long sentences and cut clauses.

## Branch check

Run this before anything else.

1. **Read the current branch.** `git branch --show-current`.

2. **Determine the base branch.** The base is not always `main` — integration or release branches (e.g. `next`, `v2`, `release/3.x`) are valid PR targets too.
   - If the user named a target branch, use it.
   - Otherwise, inspect the upstream remote's default branch: `gh repo view <UPSTREAM_OWNER>/<REPO> --json defaultBranchRef --jq '.defaultBranchRef.name'`.
   - If the current branch appears to have diverged from an integration branch (e.g. `git log next..HEAD --oneline` returns commits but `git log main..HEAD --oneline` returns none), surface that as the likely base and confirm with the user before proceeding.
   - Record the resolved base as `<BASE>` — every subsequent `git log` and `git diff` command in this workflow uses `<BASE>`, not a hardcoded `main`.

3. **If the current branch is the same as `<BASE>`:**
   - Do not proceed with drafting. A PR from a base branch onto itself is always wrong.
   - Inspect uncommitted changes and recent commits (`git log <BASE>..HEAD --oneline`, `git status --short`) to infer what the work is about.
   - Propose a kebab-case feature branch name derived from that context — e.g. `feat/add-user-auth`, `fix/modal-focus-trap`. Follow [conventions.md](../../../references/conventions.md): kebab-case, descriptive, prefixed with the conventional-commit type (`feat/`, `fix/`, `chore/`, `docs/`, etc.).
   - Ask: _"You're on `<BASE>`. I'd suggest `<proposed-name>` — want to use that, or supply your own?"_ Wait for confirmation before creating the branch (`git checkout -b <name>`).
   - Once on the feature branch, continue to the workflow below.

4. **If the branch is already a feature branch:**
   - Compare the branch name's stated intent against the actual changes: run `git log <BASE>..HEAD --oneline` and `git diff <BASE>..HEAD --stat`.
   - If the diff is clearly out of scope for what the branch name implies (e.g. branch is `fix/tooltip-color` but commits touch auth, routing, or unrelated features), flag it: _"The branch name `<name>` doesn't seem to match these changes — consider renaming the branch or splitting the work before opening a PR."_ Give a concrete suggested name for the actual changes.
   - If the scope looks coherent, proceed silently.

## Workflow

1. **Pick the commit range.** Use `<BASE>` resolved in the Branch check above. Run `git log <BASE>..HEAD --oneline` and present the list to the user. Ask which commits to include — they may want to exclude WIP, fixup, or chore commits, or scope the description to a subset. Wait for an answer before drafting.

2. **Re-read the template.** Always read [.github/PULL_REQUEST_TEMPLATE.md](../../../.github/PULL_REQUEST_TEMPLATE.md) fresh — its structure may have changed since this file was written. Match its sections exactly. The one permitted addition is `#### Commit map`, between the short description and `#### Changelog` — see step 4 for when it earns its place.

3. **Inspect the diff.** `git diff <BASE>..HEAD --stat` plus focused `git diff` on files that need it. Identify files with **particularly complex changes** (large rewrites, subtle invariants, perf-critical paths, non-obvious refactors) — these get called out by name in the Short description.

4. **Draft the file** following the template. Per-section guidance:
   - **`Closes #`** — leave the line as-is unless the user gave issue numbers. If they did, write one `Closes #N` per line; `Closes #1, #2` links only the first.
   - **`{{ Short description }}`** — 1–2 sentences on the _why_ and shape of the change. Add a short bulleted list of files with genuinely complex changes **only when there are any** — one line each (file + what's tricky, e.g. "`path/to/Bar.ts` — rewrites the X loop; check the early-return at line 142"). Skip the list entirely when the diff is straightforward.
   - **`#### Commit map`** — a numbered map of the branch's commits, oldest first. **Include it only when the commits are the unit a reviewer walks** — several commits, each standing on its own. A single-commit PR gets none, and neither does one whose commits are arbitrary slices of a single change; a map there is filler.
     - One line per commit: subject, then what it does. Bold the load-bearing ones — drop one and the change, a proof the issue named, or the build breaks. Leave supporting proof, docs, and cleanup plain, so the reviewer knows what to read closely and what to skim.
     - Group under a package or area lead-in when the branch spans more than one, numbering straight through.
     - A map entry and a changelog bullet may cover the same change — the map indexes commits, the changelog indexes behavior.
     - The map belongs here, not in the commit bodies — those are written for the pre-merge read only, and stay governed by the [commit bodies](../../../references/conventions.md#commit-bodies) rubric rather than by this template.
   - **`#### Changelog`** — populate **New** / **Changed** / **Removed** from the commits and diff. One short fragment per user-visible change. Drop any subsection with nothing in it. Split into `#### Major changes` / `#### Minor changes` (each keeping the New/Changed/Removed subheadings) whenever there's a real triage benefit — a mix of headline changes and incidental ones — so the reviewer can skim the majors and skip the rest. The split organizes bullets; it doesn't license more or longer ones.
     - **Trace it both ways before handing back**: every bullet comes from at least one commit in range, and every commit that changes what a consumer sees has a bullet. A commit that resists the trace usually changed nothing user-visible — proof, docs, internal cleanup — and needs no bullet. If it did change behavior, the changelog has a hole; write the bullet.
   - **`#### Testing / Reviewing`** — the fewest steps a reviewer needs to confirm it works, as terse imperatives. First ask: _can this be exercised from the demo site?_ Check [demo/AGENTS.md](../../../demo/AGENTS.md) for the query-param toggles, switchers, writeable elements, mock backend (`customSendMessage/`), and mock service desk. If reachable through any of those, give demo steps (commands, query params, what to click, expected result). Otherwise fall back to unit-test pointers or manual steps. Don't re-explain what the changelog already said. These are the acceptance criteria's proofs, in the order a reviewer would run them — not a second list.

5. **Hand back.** Tell the user the draft is ready, with its path, and stop.

## Submitting

Only after the user explicitly asks you to open, submit, or create the PR. Asking for a draft is not that instruction, and neither is "commit and push". Until then, step 5 is the end of the job.

Before running the command:

- **Resolve origin and upstream.** Run `git remote -v` to identify both remotes:
  - `origin` — the fork (where the branch lives, typically `<your-username>/<repo>`)
  - `upstream` — the canonical repo the PR targets (e.g. `<org>/<repo>`)
  - If only one remote exists and it is the upstream, warn the user: a PR opened directly on the upstream from a local branch with no fork is unusual — confirm before continuing.
  - Always open the PR on `upstream` with `--repo <upstream-owner>/<repo>` and set `--head <origin-owner>:<branch>` so GitHub routes it fork → upstream.
- **Check the branch is pushed to origin** (`git status -sb`). Push with `git push -u origin <branch>` if not. A stale or unpushed branch opens a PR missing your latest commits.
- **Pass `--title` explicitly**, in conventional-commit format — it becomes the squash commit, see [conventions.md](../../../references/conventions.md). Left off, `gh` infers it, which is only right on a single-commit branch.
- **No agent attribution** anywhere in the title or body — no `Co-Authored-By`, no "generated with" trailer.

```bash
# Resolve these first:
#   UPSTREAM_OWNER — org or user owning the canonical repo  (from `git remote -v`)
#   ORIGIN_OWNER   — your fork owner                        (from `git remote -v`)
#   REPO           — repository name (same on both remotes)
#   BRANCH         — current feature branch

gh pr create \
  --repo <UPSTREAM_OWNER>/<REPO> \
  --base <BASE> \
  --head <ORIGIN_OWNER>:<BRANCH> \
  --title "<type>: <subject>" \
  --body-file .github/pr-drafts/<branch-name>.md
```

Then verify and report the URL: `gh pr view <number> --repo <owner>/<repo> --json baseRefName,closingIssuesReferences` confirms it landed on the intended base and that every `Closes` line registered.

The draft file goes inert once the PR exists — later edits need `gh pr edit <number> --body-file <path>`.

## Notes

- `.github/pr-drafts/` is git-ignored; never commit a draft.
- The PR title is the eventual squash commit, so it follows conventional-commit format — see [conventions.md](../../../references/conventions.md).
- The PR description is the durable record: commit bodies die at the squash, so anything a post-merge reader needs lives here, not in a branch commit body ([commit bodies](../../../references/conventions.md#commit-bodies)).

## Related guidance

- [tone.md](../../../references/tone.md) — voice and word economy for developer-facing copy
- [conventions.md](../../../references/conventions.md) — commits, branches, PR titles
- [Root AGENTS.md](../../../AGENTS.md) — repo overview and pointer index

Task input from the user, if any: $ARGUMENTS
