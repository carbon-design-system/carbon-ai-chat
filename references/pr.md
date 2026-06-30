# pr.md

Workflow for drafting a pull-request description into `PR.md`. Triggered when the user asks to "write up a PR," "draft a PR description," "make a PR.md," or similar. Do **not** trigger on a plain commit/push request.

## Output

A `PR.md` file at the repo root, populated from [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md). The file is gitignored — overwrite any existing `PR.md`. The user reviews and runs `gh pr create --body-file PR.md` (or copy-pastes into the GitHub UI) themselves; **the agent does not run `gh pr create`**.

## Style

Brevity is the goal. The reviewer is busy and the diff is the source of truth — the description points at what's non-obvious, it does not narrate the diff. Default to the shortest version that still conveys the change; err on the side of cutting.

- Sentence fragments over full sentences. Cut filler: "this PR", "in order to", "as well as", "note that", restated context.
- One idea per line. Don't stack parenthetical asides inside a bullet.
- Say each thing once. Don't repeat a change across Short description, Changelog, and Testing.
- Omit empty or trivial sections rather than padding them (no "None" placeholders).

## Workflow

1. **Pick the commit range.** Default base is `main`. Run `git log main..HEAD --oneline` and present the list to the user. Ask which commits to include — they may want to exclude WIP, fixup, or chore commits, or scope the description to a subset. Wait for an answer before drafting.

2. **Re-read the template.** Always read [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) fresh — its structure may have changed since this file was written. Match its sections exactly.

3. **Inspect the diff.** `git diff <base>..HEAD --stat` plus focused `git diff` on files that need it. Identify files with **particularly complex changes** (large rewrites, subtle invariants, perf-critical paths, non-obvious refactors) — these get called out by name in the Short description.

4. **Draft `PR.md` at the repo root** following the template. Per-section guidance:
   - **`Closes #`** — leave the line as-is. The user fills in issue numbers in GitHub when they open the PR.
   - **`{{ Short description }}`** — 1–2 sentences on the _why_ and shape of the change. Add a short bulleted list of files with genuinely complex changes **only when there are any** — one line each (file + what's tricky, e.g. "[`src/foo/Bar.ts`](src/foo/Bar.ts) — rewrites the X loop; check the early-return at line 142"). Skip the list entirely when the diff is straightforward.
   - **`#### Changelog`** — populate **New** / **Changed** / **Removed** from the commits and diff. One short fragment per user-visible change. Drop any subsection with nothing in it. Split into `#### Major changes` / `#### Minor changes` (each keeping the New/Changed/Removed subheadings) whenever there's a real triage benefit — a mix of headline changes and incidental ones — so the reviewer can skim the majors and skip the rest. The split organizes bullets; it doesn't license more or longer ones.
   - **`#### Testing / Reviewing`** — the fewest steps a reviewer needs to confirm it works, as terse imperatives. First ask: _can this be exercised from the demo site?_ Check [demo/AGENTS.md](../demo/AGENTS.md) for the query-param toggles, switchers, writeable elements, mock backend (`customSendMessage/`), and mock service desk. If reachable through any of those, give demo steps (commands, query params, what to click, expected result). Otherwise fall back to unit-test pointers or manual steps. Don't re-explain what the changelog already said.

5. **Hand back.** Tell the user `PR.md` is ready and stop. Do **not** run `gh pr create`.

## Notes

- `PR.md` is gitignored at the repo root; never commit it.
