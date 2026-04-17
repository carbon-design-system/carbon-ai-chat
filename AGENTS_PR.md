# AGENTS_PR.md

Workflow for drafting a pull-request description into `PR.md`. Triggered when the user asks to "write up a PR," "draft a PR description," "make a PR.md," or similar. Do **not** trigger on a plain commit/push request.

## Output

A `PR.md` file at the repo root, populated from [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md). The file is gitignored — overwrite any existing `PR.md`. The user reviews and runs `gh pr create --body-file PR.md` (or copy-pastes into the GitHub UI) themselves; **the agent does not run `gh pr create`**.

## Workflow

1. **Pick the commit range.** Default base is `main`. Run `git log main..HEAD --oneline` and present the list to the user. Ask which commits to include — they may want to exclude WIP, fixup, or chore commits, or scope the description to a subset. Wait for an answer before drafting.

2. **Re-read the template.** Always read [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) fresh — its structure may have changed since this file was written. Match its sections exactly.

3. **Inspect the diff.** `git diff <base>..HEAD --stat` plus focused `git diff` on files that need it. Identify files with **particularly complex changes** (large rewrites, subtle invariants, perf-critical paths, non-obvious refactors) — these get called out by name in the Short description.

4. **Draft `PR.md` at the repo root** following the template. Per-section guidance:
   - **`Closes #`** — leave the line as-is. The user fills in issue numbers in GitHub when they open the PR.
   - **`{{ Short description }}`** — 1–3 sentences explaining the _why_ and shape of the change. Then a short bulleted list naming files with particularly complex changes and what's complex about them (e.g. "[`src/foo/Bar.ts`](src/foo/Bar.ts) — rewrites the X loop to handle Y; review the early-return at line 142 carefully").
   - **`#### Changelog`** — populate **New** / **Changed** / **Removed** subsections from the commits and diff. One bullet per user-visible change. **If the changelog would exceed ~6 bullets total, OR the diff touches >10 files / >500 LOC**, duplicate this section: label one `#### Major changes` and the other `#### Minor changes` (each keeps the New/Changed/Removed subheadings) so the reviewer can triage.
   - **`#### Testing / Reviewing`** — first ask: _can this be exercised from the demo site?_ Check [demo/AGENTS.md](demo/AGENTS.md) for the query-param toggles, switchers, writeable elements, mock backend (`customSendMessage/`), and mock service desk. If the change is reachable through any of those, **focus this section on demo steps**: commands to run, query params to load, what to click, expected behavior. If not demo-reachable, fall back to unit-test pointers, manual verification steps, or screenshot expectations.

5. **Hand back.** Tell the user `PR.md` is ready and stop. Do **not** run `gh pr create`.

## Notes

- `PR.md` is gitignored at the repo root; never commit it.
