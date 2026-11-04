---
name: caic-write-example-test
description: Add or change the Playwright test for an example under examples/ — register its target, plan, generate, and heal the spec, run it, and check coverage. Use when asked to test or cover an example, or when a new example needs its first test. Not for unit tests, the demo app's suite, or a failing test unrelated to an example.
---

Procedure for giving an example its Playwright coverage. The rules live in [playwright.md](../../../examples/references/playwright.md). This skill is the order of work and the checks, so read the guide section each step names and do not restate it in a spec or a PR.

## Inputs and outputs

Input: an example slug (both flavors unless only one exists), or a spec to change. Output: a target entry, a spec, and a passing Chromium run. For a bug the test finds, also an issue and a `test.fixme` that links it.

## Keep the user oriented

The steps run long and some happen in another session, so the user must always see where they are. End every reply, and every stop to ask, with this block:

- **Where we are:** `Step N of 9: <name>`, and what just finished.
- **Your actions:** numbered steps for the user, or "None".
- **Next:** `Step N+1: <name>`, the one thing you will do, then ask whether to go ahead. Ask as an option list.

## Before you start

- **Ask up front,** in one option-list prompt: which tool runs the agents in step 3, and how to get a current build (build now, a watcher is running, or skip and report the result unverified).
- **Build freshness.** The suite reads built package output. Establish it per the [build preflight](../../../references/commands.md#build-preflight), and do not start a build or watch the user did not approve.
- **A new example needs `npm install`** to register its workspace. That rewrites `package-lock.json`; do not stage it unless the example's dependencies changed.
- **Stop for these.** The four skips (`integrations-watsonx` in both flavors, both `tests-jest-*`) get no suite. `frameworks-next`, `frameworks-react-17`, and `frameworks-react-18` keep their own setups. See [Skipped examples](../../../examples/references/playwright.md#skipped-examples) and [Examples that deviate](../../../examples/references/playwright.md#examples-that-deviate).

## Steps

1. **Find the one concern.** Read the example's README ("What this example shows") and `src/` in both flavors. If there is no README, infer the concern from `src/` and the closest sibling examples, and ask the user to confirm it. If the code does not make the concern clear, ask which use cases the example covers. Then write the README from [README_TEMPLATE.md](../../../examples/README_TEMPLATE.md), worded per [example-copy.md](../caic-copy-writer/references/example-copy.md), using a sibling example's README as the model, and run `npm run repair:example-readmes`. A second concern means a second example ([single-purpose rule](../../../examples/AGENTS.md#authoring-rules)). When replies depend on random values, the date, or a live service, test the mount and what stays fixed, and name the deferred flow ([Determinism](../../../examples/references/playwright.md#determinism)).
2. **Add the target.** Follow [Add a target](../../../examples/references/playwright.md#add-a-target): one `examples/shared/playwright/targets.ts` entry per flavor, keys sorted. Share a spec only when both flavors show the same visible behavior. Use a `-react` or `-web-components` spec suffix only when behavior differs. A React-only example gets one target. Confirm discovery with `npm run test:e2e:goldens -- --list` once the spec exists (step 4). Before that, a target whose spec is missing lists no tests and still exits 0.
3. **Plan the spec.** Use Playwright's three agents (planner, generator, healer), following [playwright-agents.md](../../../examples/references/playwright-agents.md).
   - **Tool.** Use the answer from the up-front prompt: VS Code (the default), Claude, Codex, or OpenCode. Copilot is the fourth choice `init-agents` accepts; offer it only if they ask.
   - **Install for that tool.** Ask, then run the guide's `init-agents` command with `--loop` set to that tool: `vscode`, `claude`, `codex`, or `opencode`. It writes files, and for Claude and OpenCode it replaces the project MCP config instead of merging into it, so back up an existing one first. Then apply the guide's fixes: `--config` and `CAIC_E2E_TARGETS` on the tool's test server entry, the seed body, and the target's `spec` pointed at the seed spec. Redo them after every `init-agents` run, which resets the seed.
   - **Check `git status`.** The VS Code loop writes agent files under `.github/agents/` and a Copilot setup workflow under `.github/workflows/`, which git does not ignore. Do not commit them.
   - **Hand off to a new session.** The tool loads the agents and the test server only when a session starts, so this session cannot call them. Stop. Give the user the filled-in prompt from [handoff-prompt.md](references/handoff-prompt.md), in a fenced block, with where to paste it, and resume at step 6 when that session reports. The prompt has it set the target's `spec` back to the concern spec. Do not carry on in this session unless the user asks for the fallback.
   - **Planner.** It reads the README and writes a plan of the mount and the one concern.
4. **Generate the spec.** The generator writes the spec from locators it confirmed in a browser. Treat the output as a draft: merge its one-test-per-file output into the one spec, then apply the checks in [Fallback: write the spec by hand](#fallback-write-the-spec-by-hand). Drop the plan's step numbers from comments.
5. **Heal the spec.** The healer reruns a failure, fixes the locator, or marks a real bug `test.fixme` and never weakens the assertion.
6. **Run it.** First confirm that the target's `spec` in `examples/shared/playwright/targets.ts` names the concern spec again, not the seed, and that `--list` shows its tests. Then run `CAIC_E2E_TARGETS=<targets> npm run test:e2e:goldens` for both flavors, then once with `-- --workers=4` to catch races. For an intermittent failure, follow the guide's [Debugging](../../../examples/references/playwright.md#debugging): rerun that one test with `--grep` and `--trace on`, then inspect the trace. On a failure, read `examples/shared/playwright/test-results/*/error-context.md` for the page snapshot, and fix the spec when the spec is wrong. Once both flavors pass, flip the one config line the concern depends on, such as `isDisabled: true` to `false`, rerun, and confirm the spec fails. Restore the line. A spec that stays green proves nothing.
7. **Record a real bug; do not weaken the test.** Mark that test `test.fixme` with a one-line comment on what happens, file an issue with [caic-issue](../caic-issue/SKILL.md), and put `// Tracked in #<number>.` above the fixme. Run the fixme body as a normal test once to confirm it fails today, then restore it.
8. **Check coverage.** `CAIC_E2E_TARGETS=<targets> npm run test:e2e:coverage`. Aim for 80% of gated lines ([Coverage target](../../../examples/references/playwright-coverage.md#coverage-target)). When below, cover the concern's missing branches, not off-concern behavior. Explain any remaining gap in the PR. Add an example to `DEFERRED_EXAMPLES` or `OFF_CONCERN_BACKENDS` only with its reason in the PR.
9. **Run the gates.** Work through the guide's [Definition of done](../../../examples/references/playwright.md#definition-of-done), run `npm run format`, and report the gates you ran ([definition-of-done.md](../../../references/definition-of-done.md)). Stage only the example, spec, target, and README changes.

## Fallback: write the spec by hand

Use this when the agents can't be installed or can't produce a usable spec. You can also run the same plan, generate, heal loop yourself with sub-agents in those roles. Write the spec in `examples/shared/playwright/tests/<concern>.spec.ts`.

- Cover the mount, the concern, one negative case, and its keyboard path.
- Follow [Selectors](../../../examples/references/playwright.md#selectors), [What to test](../../../examples/references/playwright.md#what-to-test), and [Naming](../../../examples/references/playwright.md#naming).
- Open the file with a purpose comment shaped like the existing specs, worded per [example-copy.md](../caic-copy-writer/references/example-copy.md).
- Read per-flavor text from the `target` fixture instead of forking the spec.
- Give the mount test an assertion the shared `beforeEach` does not already make.
- Read [pitfalls.md](references/pitfalls.md) before writing assertions.

## Stopping conditions

- The guide skips or defers the example: say so and add no suite.
- Most of the concern would need `test.fixme`: stop and ask. The example may be the problem.
- A build, watch, or scaffold would be needed and was not approved: ask first.

## Default path

Steps 2 to 5 assume the shared suite is the default, and that the local scaffold (`npm run scaffold:example-e2e`, described in the guide's [Scaffold a local Vite suite](../../../examples/references/playwright.md#scaffold-a-local-vite-suite)) is for an example that cannot use the shared launcher. If the team chooses differently, change those steps and nothing else.

Task input from the user, if any: $ARGUMENTS
