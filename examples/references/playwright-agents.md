# playwright-agents.md — generate an example spec with Playwright agents

Playwright's test agents can plan, write, and repair a spec. Install them once per checkout against the shared config and one target, then start a new agent session so they load:

```bash
npx playwright init-agents --loop=<loop> -c examples/shared/playwright/playwright.config.ts --project <target>
```

`<loop>` names the tool that runs the agents: `vscode`, `claude`, `codex`, or `opencode`. This writes the `playwright-test-planner`, `playwright-test-generator`, and `playwright-test-healer` agents, an entry for their test server, a seed spec, and a `specs/` folder for plans. The agents and the server entry land in the tool's own files:

| Loop | Agents | Test server entry |
| --- | --- | --- |
| `vscode` | `.github/agents/` | `.vscode/mcp.json` |
| `claude` | `.claude/agents/` | `.mcp.json` |
| `codex` | `.codex/agents/` | `[mcp_servers.playwright-test]` in each agent file |
| `opencode` | `.opencode/prompts/` | `opencode.json` |

Add `--config examples/shared/playwright/playwright.config.ts` to the `run-test-mcp-server` args in that entry; `init-agents` never writes it, and without it the agents run against a default config with no example server. Set `CAIC_E2E_TARGETS=<target>` in that entry's `env`, so the agents build only that example. A tool that starts the server itself does not pass your shell's variables to it. Restart the server after editing the entry.

The `vscode` loop also writes `.github/agents/` and `.github/workflows/copilot-setup-steps.yml`. Git does not ignore them; do not commit them.

Replace the seed's body so it opens the example the way every spec does, then point the planner at it:

```ts
import { openExample, test } from '../helpers';

test('seed', async ({ page }) => {
  await openExample(page);
});
```

The shared config runs only each target's own spec, so `tests/seed.spec.ts` belongs to no project, and the planner stops with "seed test not found". While the agents run, set the `spec` of the target you passed to `--project` to `'seed.spec.ts'` in [targets.ts](../shared/playwright/targets.ts). Set it back to the concern spec when you merge the generated tests. `init-agents` resets the seed each time it runs, so redo the seed body after it.

1. **Plan with `playwright-test-planner`.** Give it the example directory, its `README.md`, and [playwright.md](playwright.md). It explores the running example and writes a plan in `specs/`: a mount scenario and the example's one concern, each with its start state, steps, and expected result. Check the plan against [What to test](playwright.md#what-to-test) and [Determinism](playwright.md#determinism) before generating.
2. **Generate with `playwright-test-generator`.** It runs each planned scenario in a browser and writes one test per file from the locators it confirmed. Merge those tests into the one concern spec, `tests/<concern>.spec.ts`, importing from `../helpers` rather than `@playwright/test`. Drop the generator's `// spec:` and `// seed:` header comments and the plan's step numbers, then point the target's `spec` back at the concern spec.
3. **Repair with `playwright-test-healer`.** When a test fails, the healer replays it, reads the failure snapshot, and fixes the locator or wait. It must not weaken an assertion to pass. When the example itself misbehaves, mark that test `test.fixme` with one line that records what happens, file the bug, and put the issue number in that line.

Agent output follows the same rules as a hand-written spec. Before committing:

- Follow [Selectors](playwright.md#selectors): no `.first()`, `.last()`, or `.nth()` to hide an ambiguous match, and no chat-internal CSS classes.
- The chat's live-region announcer repeats reply text. Scope reply assertions under `page.getByTestId(PageObjectId.MAIN_PANEL)`, or match a leaf with `{ exact: true }`. Host-rendered content is slotted, not inside `MAIN_PANEL`; select it by the example's own class.
- A negative check must follow the state that would precede what it rules out. Await the reply, or open the list, before asserting something is absent.
- No `waitForTimeout`, fixed sleeps, dates, or random values.
- No `click({ force: true })` or loop with an arbitrary bound; the generator adds both by habit. See [pitfalls.md](../../.bob/skills/caic-write-example-test/references/pitfalls.md).
- Take fixture text from each flavor's own `src/`; React and Web Components mocks can differ. Read a per-flavor value from the `target` fixture rather than forking the spec.
- Check the example against the [coverage target](playwright-coverage.md#coverage-target).
