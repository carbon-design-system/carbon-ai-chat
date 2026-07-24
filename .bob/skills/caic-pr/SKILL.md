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

## Workflow

1. **Pick the commit range.** Default base is `main`. Run `git log main..HEAD --oneline` and present the list to the user. Ask which commits to include — they may want to exclude WIP, fixup, or chore commits, or scope the description to a subset. Wait for an answer before drafting.

2. **Re-read the template.** Always read [.github/PULL_REQUEST_TEMPLATE.md](../../../.github/PULL_REQUEST_TEMPLATE.md) fresh — its structure may have changed since this file was written. Match its sections exactly.

3. **Inspect the diff.** `git diff <base>..HEAD --stat` plus focused `git diff` on files that need it. Identify files with **particularly complex changes** (large rewrites, subtle invariants, perf-critical paths, non-obvious refactors) — these get called out by name in the Short description.

4. **Draft the file** following the template. Per-section guidance:
   - **`Closes #`** — leave the line as-is unless the user gave issue numbers. If they did, write one `Closes #N` per line; `Closes #1, #2` links only the first.
   - **`{{ Short description }}`** — 1–2 sentences on the _why_ and shape of the change. Add a short bulleted list of files with genuinely complex changes **only when there are any** — one line each (file + what's tricky, e.g. "`path/to/Bar.ts` — rewrites the X loop; check the early-return at line 142"). Skip the list entirely when the diff is straightforward.
   - **`#### Changelog`** — populate **New** / **Changed** / **Removed** from the commits and diff. One short fragment per user-visible change. Drop any subsection with nothing in it. Split into `#### Major changes` / `#### Minor changes` (each keeping the New/Changed/Removed subheadings) whenever there's a real triage benefit — a mix of headline changes and incidental ones — so the reviewer can skim the majors and skip the rest. The split organizes bullets; it doesn't license more or longer ones.
   - **`#### Testing / Reviewing`** — the fewest steps a reviewer needs to confirm it works, as terse imperatives. First ask: _can this be exercised from the demo site?_ Check [demo/AGENTS.md](../../../demo/AGENTS.md) for the query-param toggles, switchers, writeable elements, mock backend (`customSendMessage/`), and mock service desk. If reachable through any of those, give demo steps (commands, query params, what to click, expected result). Otherwise fall back to unit-test pointers or manual steps. Don't re-explain what the changelog already said.

5. **Hand back.** Tell the user the draft is ready, with its path, and stop.

## Submitting

Only after the user explicitly asks you to open, submit, or create the PR. Asking for a draft is not that instruction, and neither is "commit and push". Until then, step 5 is the end of the job.

Before running the command:

- **Confirm the base repo.** `gh repo set-default --view`. If the repo is a fork or no default is set, ask which repo the PR targets instead of letting `gh` choose — a PR opened on a public upstream is visible immediately and deleting it doesn't undo that. Pass `--repo` and `--head <owner>:<branch>` explicitly.
- **Check the branch is pushed** and even with its remote (`git status -sb`). A stale remote branch opens a PR missing your latest commits.
- **Pass `--title` explicitly**, in conventional-commit format — it becomes the squash commit, see [conventions.md](../../../references/conventions.md). Left off, `gh` infers it, which is only right on a single-commit branch.
- **No agent attribution** anywhere in the title or body — no `Co-Authored-By`, no "generated with" trailer.

```bash
gh pr create --repo <owner>/<repo> --base main --head <owner>:<branch> \
  --title "<type>: <subject>" --body-file .github/pr-drafts/<branch-name>.md
```

Then verify and report the URL: `gh pr view <number> --repo <owner>/<repo> --json baseRefName,closingIssuesReferences` confirms it landed on the intended base and that every `Closes` line registered.

The draft file goes inert once the PR exists — later edits need `gh pr edit <number> --body-file <path>`.

## Notes

- `.github/pr-drafts/` is git-ignored; never commit a draft.
- The PR title is the eventual squash commit, so it follows conventional-commit format — see [conventions.md](../../../references/conventions.md).

## Related guidance

- [tone.md](../../../references/tone.md) — voice and word economy for developer-facing copy
- [conventions.md](../../../references/conventions.md) — commits, branches, PR titles
- [Root AGENTS.md](../../../AGENTS.md) — repo overview and pointer index

Task input from the user, if any: $ARGUMENTS
