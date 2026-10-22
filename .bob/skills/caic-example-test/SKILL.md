---
name: caic-example-test
description: Add or change the Playwright test for an example under examples/ — register its target, write or generate the spec, run it, and check coverage. Use when asked to test or cover an example, or when a new example needs its first test. Not for unit tests, the demo app's suite, or a failing test unrelated to an example.
---

Procedure for giving an example its Playwright coverage. The rules live in [playwright.md](../../../examples/references/playwright.md). This skill is the order of work and the checks, so read the guide section each step names and do not restate it in a spec or a PR.

## Inputs and outputs

Input: an example slug (both flavors unless only one exists), or a spec to change. Output: a target entry, a spec, and a passing Chromium run. For a bug the test finds, also an issue and a `test.fixme` that links it.

## Before you start

- **Build freshness.** The suite reads built package output. Establish it per the [build preflight](../../../references/commands.md#build-preflight), and ask before starting any build or watch.
- **Stop for these.** The four skips (`integrations-watsonx` in both flavors, both `tests-jest-*`) get no suite. `frameworks-next`, `frameworks-react-17`, and `frameworks-react-18` keep their own setups. See [Skipped examples](../../../examples/references/playwright.md#skipped-examples) and [Examples that deviate](../../../examples/references/playwright.md#examples-that-deviate).

## Steps

1. **Find the one concern.** Read the example's README ("What this example shows") and `src/` in both flavors. A second concern means a second example ([single-purpose rule](../../../examples/AGENTS.md#authoring-rules)). When replies depend on random values, the date, or a live service, test the mount and what stays fixed, and name the deferred flow ([Determinism](../../../examples/references/playwright.md#determinism)).
2. **Add the target.** Follow [Add a target](../../../examples/references/playwright.md#add-a-target): one `examples/shared/playwright/targets.ts` entry per flavor, keys sorted. Share a spec only when both flavors show the same visible behavior. Use a `-react` or `-web-components` spec suffix only when behavior differs. A React-only example gets one target. Confirm with `npm run test:e2e:goldens -- --list`.
3. **Write the spec** in `examples/shared/playwright/tests/<concern>.spec.ts`.
   - Cover the mount, the concern, one negative case, and its keyboard path.
   - Follow [Selectors](../../../examples/references/playwright.md#selectors), [What to test](../../../examples/references/playwright.md#what-to-test), and [Naming](../../../examples/references/playwright.md#naming).
   - Open the file with a purpose comment shaped like the existing specs, worded per [example-copy.md](../caic-copy-writer/references/example-copy.md).
   - Read per-flavor text from the `target` fixture instead of forking the spec.
   - Read [pitfalls.md](references/pitfalls.md) before writing assertions.
4. **Or generate the spec.** Plan, generate, and heal with Playwright's three agents, following [Generate a spec with Playwright agents](../../../examples/references/playwright.md#generate-a-spec-with-playwright-agents).
   - **Ask the user which tool runs them:** VS Code (the default), Claude, Codex, or OpenCode. If they have no preference, use VS Code. Copilot is the fourth choice `init-agents` accepts; offer it only if they ask.
   - **Install for that tool.** Run the guide's `init-agents` command with `--loop=vscode`, `--loop=claude`, `--loop=codex`, or `--loop=opencode`. The guide shows `claude`; only the loop value changes. Apply the guide's MCP config fix, set `CAIC_E2E_TARGETS=<target>`, and ask before running it, since it writes files and builds.
   - **Roles.** The planner reads the README and writes a plan of the mount and the one concern. The generator writes the spec from locators it confirmed in a browser. The healer reruns a failure, fixes the locator, or marks a real bug `test.fixme` and never weakens the assertion.
   - **Treat the output as a draft.** Merge the generator's one-test-per-file output into the one spec, then apply step 3's checks.
   - **If the agents can't be installed,** run the same plan, generate, heal loop yourself with sub-agents in those roles.
5. **Run it.** `CAIC_E2E_TARGETS=<targets> npm run test:e2e:goldens` for both flavors, then once with `-- --workers=4` to catch races. For a test that looks flaky, add `--repeat-each=10`. On a failure, read `examples/shared/playwright/test-results/*/error-context.md` for the page snapshot, and fix the spec when the spec is wrong.
6. **Record a real bug; do not weaken the test.** Mark that test `test.fixme` with a one-line comment on what happens, file an issue with [caic-issue](../caic-issue/SKILL.md), and put `// Tracked in #<number>.` above the fixme. Run the fixme body as a normal test once to confirm it fails today, then restore it.
7. **Check coverage.** `CAIC_E2E_TARGETS=<targets> npm run test:e2e:coverage`. Aim for 80% of gated lines ([Coverage target](../../../examples/references/playwright.md#coverage-target)). When below, cover the concern's missing branches, not off-concern behavior. Explain any remaining gap in the PR. Add an example to `DEFERRED_EXAMPLES` or `OFF_CONCERN_BACKENDS` only with its reason in the PR.
8. **Run the gates.** Work through the guide's [Definition of done](../../../examples/references/playwright.md#definition-of-done), run `npm run format`, and report the gates you ran ([definition-of-done.md](../../../references/definition-of-done.md)).

## Stopping conditions

- The guide skips or defers the example: say so and add no suite.
- Most of the concern would need `test.fixme`: stop and ask. The example may be the problem.
- A build, watch, or scaffold would be needed and was not approved: ask first.

## Default path

Steps 2 to 4 assume the shared suite is the default, and that the local scaffold (`npm run scaffold:example-e2e`, described in the guide's [Scaffold a local Vite suite](../../../examples/references/playwright.md#scaffold-a-local-vite-suite)) is for an example that cannot use the shared launcher. If the team chooses differently, change those steps and nothing else.

Task input from the user, if any: $ARGUMENTS
