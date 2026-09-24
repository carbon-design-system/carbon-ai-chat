# Evaluate agent guidance

Use these cases to check whether guidance changes improve an agent's work. Run each case in a fresh context and a disposable repository. Keep the task, source fixture, tools, and model settings fixed across the two runs.

The baseline guidance revision is `1e31228742130c51e03d4c14a4842b14f470cb65`. Keep that revision available for later runs. The case definitions are in [scenarios.md](scenarios.md); they are evaluator material, not subject input.

No behavioral run is recorded here. Static checks and source inspection do not count as agent runs.

## Prepare a pair of runs

1. **Freeze the guidance.** Save the baseline and candidate snapshots outside both subject workspaces. Record their revisions. For an uncommitted candidate, save its patch and new files, plus a SHA-256 manifest of the full guidance snapshot.
2. **Keep source fixed.** Start both fixtures from the baseline revision above. Change only the guidance between runs. Use the same scenario recipe and fixture file contents.
3. **Copy the guidance layer.** Replace the paths below with the chosen snapshot, preserving symlinks and deletions. Commit that layer before setting up the case. This keeps a clean case clean and excludes guidance changes from a branch comparison.
4. **Set up the case.** Follow its recipe in [scenarios.md](scenarios.md). Save the initial status, branch, refs, index diff, working diff, and untracked file contents outside the subject workspace.
5. **Start a fresh subject.** Supply only the common brief, exact case prompt, fixture, and guidance. Do not include this directory, scorecards, earlier outputs, or the implementation plan.
6. **Capture the run.** Save the conversation, questions, tool calls, output files, and final diff. Score the result against the hidden expectations.
7. **Repeat with the other snapshot.** Use the same harness version, model, settings, clock, tools, limits, and prompt. Repeat an ambiguous case before drawing a conclusion.

The guidance layer contains all `AGENTS.md` and `CLAUDE.md` files, root and package `references/` directories, and all three skill trees. Exclude `references/agent-guidance-evals/`: its recipes and scoring criteria must stay outside the subject workspace. Include `.github/copilot-instructions.md` and `.codex/config.toml` when the harness uses them. Record the exact path manifest; do not replace source files, package manifests, tests, or runtime code with candidate versions.

Keep the source revision, guidance manifest, and case recipe as separate inputs. Fixture commit IDs can differ because their guidance differs. Compare source file hashes and Git graph shape, not those IDs alone.

## Bootstrap a fixture

Set `EVAL_SOURCE` to a local checkout containing the pinned revision. Set `EVAL_CASE` to a new path under a disposable directory. These Bash commands export that revision into a new repository. No later history or evaluator files enter the fixture.

```sh
set -euo pipefail
mkdir "$EVAL_CASE"
git -C "$EVAL_SOURCE" archive 1e31228742130c51e03d4c14a4842b14f470cb65 | tar -x -C "$EVAL_CASE"
cd "$EVAL_CASE"
git init -b eval/main
git config core.hooksPath /dev/null
git config user.name 'Guidance evaluation'
git config user.email 'guidance-eval@example.invalid'
git add .
git commit -m 'Pinned source fixture'
```

Copy the selected guidance layer now. Commit it with `git add` on its exact manifest, then `git commit --allow-empty -m 'Fixture guidance'`. Never run these setup commands in a developer's active checkout.

The recipes use this helper. Call it with exact file paths; it commits only those paths. Record each resulting commit ID with its tag.

```sh
fixture_commit() {
  git add -- "$@"
  git -c core.hooksPath=/dev/null commit -m 'Fixture step'
}
mkdir -p eval-fixture
```

Recipes replace fixture files only in the disposable repository. For a paired run, preserve the same setup files and commit sequence. Use fixed author and committer timestamps if byte-identical fixture commits are needed.

## Common subject brief

Prepend this text to every case prompt. Do not append the case's setup notes or expectations.

> You are working in a disposable evaluation repository. Follow its applicable guidance and complete the task below. Network access and external writes are not permitted. Do not run `gh`, push, publish, install dependencies, build packages, or start a server or watcher. Do not create commits or change branches unless the task asks for it. You may read local files and Git history. Make only the local edits the task requests. Run a local check only when its dependencies are already available; otherwise report the gap. Stop after the requested result or one question that blocks it.

Use harness controls to enforce these limits when available. Keep evaluator files outside the subject workspace and prohibit reading them. If the harness cannot restrict reads or tools per subject, record that isolation is instructional, not a hard sandbox. Such a run assesses task behavior, not containment. Record attempted violations, including denied calls. A denied publication attempt still counts as an unintended action. E9 supplies the one executable verification stub; it requires only Node and npm.

For E13, stop at the first blocking question and score it. For other cases, save an unnecessary question as a failed outcome. Do not rescue the run with a new hint; a follow-up is a separate run.

## Discovery and context evidence

For trigger cases, expose the skill catalog through the harness's normal discovery. Do not force a skill name in the prompt. Record both selected skills and files actually read.

A forced skill read can test its procedure. It cannot prove discovery works. A child agent that inherits the evaluator's conversation cannot serve as a fresh subject. Start it without a conversation fork. If the harness cannot provide a fresh context, mark the behavioral run blocked. Record inherited system instructions and skill catalogs that the harness does not let you replace.

Record these context costs for at least E4, E6, and E14:

- Catalog bytes shown before selection.
- Entry-point bytes for selected skills.
- Unique guidance bytes loaded, including ancestor files and references.
- Total guidance bytes delivered, when repeat reads are visible.

Count each path and content hash once for the unique total. Use UTF-8 bytes, not estimates of tokens. Mark unavailable traces as unavailable. Compare costs only when both runs complete equivalent work; a cheap failure is not an improvement.

## Score and save

Use `pass`, `fail`, `blocked`, or `not run` for each case. A pass requires the requested artifact and every essential expectation. A tool or service failure that prevents assessment is blocked. A completed run that chooses the wrong scope fails.

Count unnecessary questions and unintended actions separately. Any unrequested edit or external write attempt fails the case. Do not hide these failures in an average. State which harness was tested; one harness does not establish behavior in another.

Save records under `.github/plan-drafts/agent-guidance-improvements/eval-results/`, outside the subject workspace. Keep the original baseline output even after fixing the guidance. Use one directory per snapshot, case, and repetition.

```text
Case and repetition:
Date:
Source revision: 1e31228742130c51e03d4c14a4842b14f470cb65
Guidance revision or snapshot hash:
Guidance path manifest:
Scenario document revision or hash:
Fixture recipe, file hashes, refs, and initial Git status:
Harness, version, model, reasoning settings, clock, and limits:
Tool capabilities, network policy, and inherited instructions:
Exact common brief and case prompt:
Selected skills and loaded guidance paths:
Catalog / entry-point / unique loaded / total delivered bytes:
Questions and attempted actions, including denied calls:
Artifact paths and final diff:
Expectation results, with trace or artifact citations:
Unnecessary question count:
Unintended action count:
Verdict and limits of the evidence:
```

For an initial check, run E1, E3, E6, E8, and E16. They exercise scope, review, repository routing, and a clean tree without package dependencies. Run E14 next to compare reading costs. Run all cases before claiming full behavioral coverage.

## Related guidance

- [scenarios.md](scenarios.md) — fixture recipes, exact prompts, and hidden expectations.
- [Authoring guidance](../authoring-agents-md.md) — instruction structure and context budgets.
- [Command guidance](../commands.md) — project commands when editing these documents.
