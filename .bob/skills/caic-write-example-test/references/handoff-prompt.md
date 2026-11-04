# handoff-prompt.md — the prompt for a new session (step 3)

The tool loads the agents and the `playwright-test` server when a session starts, so the session that ran `init-agents` cannot call them. Stop there. Fill in the template and give it to the user in a fenced `text` block, then say where to paste it.

## Where to paste it

| Tool | Open |
| --- | --- |
| VS Code | A new chat in Agent mode, with the `playwright-test` server running from `.vscode/mcp.json` |
| Claude | A new session at the repo root; approve the project `.mcp.json` when asked |
| Codex | A new session at the repo root |
| OpenCode | A new session at the repo root |

Step 3 already put `CAIC_E2E_TARGETS` in the server entry's `env`. Tell the user to restart the server so it picks that up (VS Code: **Restart** above the server in `.vscode/mcp.json`, or **MCP: List Servers**), and to resume here at step 6 when the new session reports.

## Template

Fill every `<...>`. Take the concern and the mock replies from the README and `src/`.

```text
Run Playwright's planner, generator, and healer agents on <slug> and write its spec. Do not change the example.

Setup: tests/seed.spec.ts in examples/shared/playwright must open the example with openExample(page) from '../helpers'. If it still has the default body, replace it first. The <react target> entry in targets.ts has its spec set to 'seed.spec.ts' so the seed belongs to a project; set it back to '<slug>.spec.ts' once you merge the generated tests.

Read first:
- <react dir>/README.md and src/, and <web-components dir>/README.md and src/
- examples/references/playwright.md: "What to test", "Selectors", "Determinism", "Naming"
- .agents/skills/caic-write-example-test/references/pitfalls.md

The one concern: <concern>. The mock backend: <what it replies, and what stays fixed>.
Targets: <react target>, <web-components target>, already in examples/shared/playwright/targets.ts.

1. Plan with playwright-test-planner. Cover the mount, the concern, one negative case, and the keyboard path. Save one plan in specs/.
2. Generate with playwright-test-generator. Merge its tests into examples/shared/playwright/tests/<slug>.spec.ts, import from '../helpers', and drop the // spec: and // seed: comments.
3. Heal with playwright-test-healer. Never weaken an assertion; mark a real example bug test.fixme with one line on what happens.

Rules:
- getByRole or getByLabel first, then PageObjectId test IDs. No CSS or structural selectors for chat markup, and no .first(), .last(), or .nth().
- No fixed sleeps, dates, or random values.
- Read per-flavor text from the target fixture instead of forking the spec.
- Open the spec with a purpose comment like the existing specs. Do not copy the plan's step numbers into comments.
- The mount test asserts something the shared beforeEach does not already assert.
- No click({ force: true }) and no loops with an arbitrary bound; see pitfalls.md.

Run both targets with CAIC_E2E_TARGETS=<targets> npm run test:e2e:goldens. Report the result and anything you marked test.fixme. Do not commit.

Reply format: finish each reply with three short parts. "Where we are": plan, generate, or heal, and what just finished. "Your actions": numbered steps for me to do, or "None". "Next step": the one thing you will do next, then ask me whether to go ahead. Keep the rest of the reply short.
```
