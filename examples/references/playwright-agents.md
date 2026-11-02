# playwright-agents.md — generate an example spec with Playwright agents

Playwright's test agents can plan, write, and repair a spec. Install them once per checkout against the shared config and one target, then start a new agent session so they load:

```bash
npx playwright init-agents --loop=claude -c examples/shared/playwright/playwright.config.ts --project <target>
```

This writes the `playwright-test-planner`, `playwright-test-generator`, and `playwright-test-healer` agents under `.claude/agents/`, a `.mcp.json` for their test server, a seed spec, and a `specs/` folder for plans. Add `--config examples/shared/playwright/playwright.config.ts` to the `run-test-mcp-server` args in `.mcp.json`; `init-agents` never writes it, and without it the agents run against a default config with no example server. Run the agents with `CAIC_E2E_TARGETS=<target>` set, so they build only that example.

Replace the seed's body so it opens the example the way every spec does, then point the planner at it:

```ts
import { openExample, test } from '../helpers';

test('seed', async ({ page }) => {
  await openExample(page);
});
```

1. **Plan with `playwright-test-planner`.** Give it the example directory, its `README.md`, and [playwright.md](playwright.md). It explores the running example and writes a plan in `specs/`: a mount scenario and the example's one concern, each with its start state, steps, and expected result. Check the plan against [What to test](playwright.md#what-to-test) and [Determinism](playwright.md#determinism) before generating.
2. **Generate with `playwright-test-generator`.** It runs each planned scenario in a browser and writes one test per file from the locators it confirmed. Merge those tests into the one concern spec, `tests/<concern>.spec.ts`, importing from `../helpers` rather than `@playwright/test`. Drop the generator's `// spec:` and `// seed:` header comments, then [add the target](playwright.md#add-a-target).
3. **Repair with `playwright-test-healer`.** When a test fails, the healer replays it, reads the failure snapshot, and fixes the locator or wait. It must not weaken an assertion to pass. When the example itself misbehaves, mark that test `test.fixme` with one line that records what happens, file the bug, and put the issue number in that line.

Agent output follows the same rules as a hand-written spec. Before committing:

- Follow [Selectors](playwright.md#selectors): no `.first()`, `.last()`, or `.nth()` to hide an ambiguous match, and no chat-internal CSS classes.
- The chat's live-region announcer repeats reply text. Scope reply assertions under `page.getByTestId(PageObjectId.MAIN_PANEL)`, or match a leaf with `{ exact: true }`. Host-rendered content is slotted, not inside `MAIN_PANEL`; select it by the example's own class.
- A negative check must follow the state that would precede what it rules out. Await the reply, or open the list, before asserting something is absent.
- No `waitForTimeout`, fixed sleeps, dates, or random values.
- Take fixture text from each flavor's own `src/`; React and Web Components mocks can differ. Read a per-flavor value from the `target` fixture rather than forking the spec.
- Check the example against the [coverage target](playwright-coverage.md#coverage-target).
