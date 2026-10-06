# playwright.md — Playwright tests for examples

Run the golden Playwright flows only against the React examples. Every spec lives in one place: [shared/playwright/](../shared/playwright/). No example holds a Playwright config, spec, or `test:e2e` script of its own, so no suite can run twice. Examples do not import or depend on each other.

```text
shared/playwright/
  playwright.config.ts   one project per target, one server per target
  targets.ts             the table of examples under test
  start-vite.mjs         builds an example and serves it on an OS-assigned port
  helpers/index.ts       fixtures: target, baseURL, console-error check
  tests/                 detailed behavior, run against React
```

## Which specs run against which example

[targets.ts](../shared/playwright/targets.ts) maps a target name to an example directory and a spec. The name is also the Playwright project name, so a failure reads `[react-watch-state] › tests/watch-state.spec.ts:35:63`: the target, then the assertion.

| Project | Example | Spec |
| --- | --- | --- |
| `react-fullscreen` | `react/basic-custom-element-fullscreen` | `tests/fullscreen.spec.ts` |
| `react-mentions-and-commands` | `react/prompt-line-mentions-and-commands` | `tests/mentions-and-commands.spec.ts` |
| `react-watch-state` | `react/watch-state` | `tests/watch-state.spec.ts` |

### Run shared behavior once

Run the detailed flows through the React wrappers in `tests/`. These exercise the
shared chat implementation. The golden suite does not launch the standalone Web
Components examples or check their separate host wiring.

This coverage choice relies on React mounting through the shared web component.
Verify that mounting path before treating a React result as proof of shared
behavior. Use unit or integration tests for framework-specific wiring. This
suite does not establish coverage of every example's callbacks or subscriptions.

### Add a target

1. Add an entry to `targets` in [targets.ts](../shared/playwright/targets.ts): the React example's directory under `examples/`, and a spec path relative to `tests/`.
2. Write that spec. Import `test`, `expect`, and `openExample` from the shared helpers; never put a URL in a spec.
3. Check discovery with `npm run test:e2e:goldens -- --list`. The config derives the project, the server, and the URL variable from the entry.

An example needs a `build` script, a `vite.config.ts`, and an HTML entry. It needs no Playwright config, dependency, or script.

## Config conventions

Edit [playwright.config.ts](../shared/playwright/playwright.config.ts) for every target at once. What it sets, and why:

| Setting | Value |
| --- | --- |
| `testDir` | `./tests` |
| `timeout` | 60s per test |
| `workers` | `1` — each project has one or two specs, so a pool buys nothing |
| `retries` | `process.env.CI ? 1 : 0` |
| `projects` | One per target, chromium only — webkit has shadow-DOM gaps, see [demo/playwright.config.ts](../../demo/playwright.config.ts) |
| `webServer` | One per target, started with the example as its working directory |

### Ports are allocated at run time. Never add a port table.

The shared [launcher](../shared/playwright/start-vite.mjs) runs `vite build` in the example, serves the output, and asks Node to bind port `0`. It reports `CAIC_E2E_URL_<TARGET>=<url>` once the listener is open. Playwright captures each URL into its own variable, and the [shared fixture](../shared/playwright/helpers/index.ts) hands the right one to the browser through the project's `target`. The operating system assigns the port while binding, so there is no gap between finding and using a port.

The suite serves a production build, not the dev server. On a cold cache, the dev server re-optimizes dependencies as the chat's lazy chunks load and reloads the page during the first test.

Import `test` and `expect` from the shared fixture so `page.goto('/')` uses the target's URL. Call `openExample(page)` first; it also asks the page to reduce motion. For an auto-open example, use `waitForChatReady(page, PageObjectId.INPUT)` before chat assertions. For a float example, await `PageObjectId.LAUNCHER`, click it, then await the displayed panel. The fixture checks console and page errors after each test.

Fixtures take an object-destructured first argument, as in `async ({ target }, playWrightUse)`. Playwright rejects any other form. Name the second argument `playWrightUse`, not `use`, so the React hooks lint rule does not mistake it for a hook.

Do not add a per-example port table or a probe that closes its listener before the server starts.

## Selectors

In order — use the first that works:

1. **`getByRole` / `getByLabel`**, where the element has a stable accessible name. This doubles as an accessibility check. The send button qualifies: `getByRole('button', { name: /send/i })`.
2. **`PageObjectId`** test IDs from `@carbon/ai-chat/server`, where no dependable role or name exists — the contenteditable input, or anything dynamic or localized.

Use Playwright locators for actions and checks. They wait for the target to be ready. If a role or text matches more than once, chain or filter the locator within a stable region.

Use roles, labels, or maintained test IDs for chat markup. Avoid CSS and structural selectors there.

Do not assert on live model output. A fixed mock summary is a valid proof of sent data. Scope it to the response so input text or welcome copy cannot satisfy the assertion.

The example's own elements are a different matter — select those however the example defines them. The host `<div>` an
example hands to `ChatCustomElement` carries no role and no test id, so the class the example sets on it is the right
handle, and the only way to assert how the chat sizes that host.

Shadow DOM does not decide this: Playwright locators pierce open shadow roots either way. The real web-component caveat is that ARIA IDREFs (`aria-labelledby`, `for`) do not cross a shadow-root boundary, which makes accessible names unreliable there — that is what `PageObjectId` is for.

## What to test

Two things, in this order:

1. **That the example mounts** — the chat renders, and the console stays clean.
2. **What the example is showing you** — the one behavior it exists to demonstrate.

To work out what that behavior is, read two things:

- **The folder name.** It names the concern. `prompt-line-typeahead` is about typeahead in the prompt line; `history-float` is about history in a float layout.
- **The example's `README.md`.** Its "What this example shows" section lists the behavior in plain words, and its "APIs and props demonstrated" table names the API behind each one. Test the behavior, not the API.

Then stop. A second concern means a second example — see the single-purpose rule in [examples/AGENTS.md](../AGENTS.md#authoring-rules).

## Suggestions and chips

Read [mentions and commands](../shared/playwright/tests/mentions-and-commands.spec.ts) when testing an editor popup.

- Use the `PageObjectId.INPUT` locator for the contenteditable editor. Click it and use `pressSequentially()` to type the trigger, then the query. `fill()` replaces text in one update; it does not exercise the trigger and filter updates as separate steps.
- Await the `listbox`, then type the query. Use retrying checks for the filtered `option` count and name. After selection, await the chosen label in the input and the list's dismissal.
- Check keyboard selection with arrow keys and Enter. Open the list again, press Escape, and await dismissal and editor focus with `toBeFocused()`.
- Prove a chip is atomic: remove its trailing space with Backspace, then press Backspace again. Assert the whole label disappears and the trigger returns. Clear the trigger and await list dismissal. Send ordinary text and check the mock reports no structured fields.
- For slash commands, test `/` in an empty input and after a newline made with Shift+Enter. Test that a mid-line slash leaves the list closed. Await input text before the negative list check so an unready editor cannot pass it.
- After sending, scope the mock's `Mentions:` or `Commands:` summary to the reply in `PageObjectId.MAIN_PANEL`. A label in the editor proves display, not sent structured data.

Choose the states that prove the behavior: open, filtered, selected, dismissed, and sent. Use assertions for those states; screenshots of every intermediate state add no proof.

## State reflected in the host

Read [watch state](../shared/playwright/tests/watch-state.spec.ts) when testing a host subscription.

Await the launcher before opening a float example. Open it, then await the homescreen panel and the host's `Homescreen` label. Do not assert the label before opening: the host reads `Chat View` until the chat opens and reports the homescreen. Click a conversation starter, then await the main panel and host `Chat View` label. Return home and await `Homescreen` again. Scope the label to the host's own `.watch-state-host` element in either flavor.

This sequence changes the mirrored `homeScreenState.isHomeScreenOpen` field. Minimize and reopen alone cannot prove that mirror updates.

Prefer the host DOM when it displays the state under test. If a host already exposes its chat instance, `page.evaluate()` can read `instance.getState()` there. Wrap that field read in `expect.poll` to await asynchronous changes. Read only the relevant field rather than comparing whole state snapshots. The demo's `window.chatInstance` is not a convention for examples; do not add a global just for a test.

## Accessibility

- Use role and label locators where they work. They check that a control has a name, but cannot prove the full flow is accessible.
- If the example adds an interactive flow, test its keyboard path and focus when UI opens or closes. Follow [the repo accessibility guide](../../references/accessibility.md) for WCAG 2.1 AA checks and screen-reader review.
- For an axe scan, wait until the UI reaches the state you want to test. Use `@axe-core/playwright` to scan the page or `AxeBuilder.include()` to scan one region. Assert that `violations` is empty. Add the package when an example needs a scan; it is not in the shared fixture today.
- To scan for WCAG 2.1 A and AA rules, use `withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])`. Avoid broad exclusions: they skip every rule for all child elements. Link each known issue and keep any temporary exclusion narrow.

An axe scan catches some issues, but cannot prove WCAG conformance. Check keyboard use and screen-reader output by hand for new behavior.

## Determinism

- Settle a stream before asserting on it. Assert the end of the reply, not a partial state mid-flight.
- Use Playwright's fresh page and context for each test. Put shared navigation in `beforeEach`. Do not rely on another test's messages, storage, cookies, or order.
- Use retrying checks such as `await expect(locator).toBeVisible()` or `toHaveText()` for UI changes. Await actions and checks. Avoid fixed sleeps and one-time checks such as `expect(await locator.isVisible()).toBe(true)`.
- No real timestamps or randomness. If an example needs an external response, register a `page.route()` with fixed data before navigation; never depend on a live third-party service.
- Disable animation where it gates an assertion.

An example is non-deterministic when its reply depends on a live service or on the clock. Skip it rather than working around it.

## Skipped examples

Four, deliberately. Do not add suites for these, and do not re-litigate them.

| Example | Why |
| --- | --- |
| `react/integrations-watsonx` | Answers come from live watsonx.ai through a token proxy. |
| `web-components/integrations-watsonx` | Same. |
| `react/tests-jest-happydom` | No `start`, no `build`, no HTML entry — nothing to serve. Its Jest spec is its coverage. |
| `react/tests-jest-jsdom` | Same. |

## Examples that deviate

`frameworks-react-17` and `frameworks-react-18` keep their own Playwright suites, with fixed ports and `test` scripts. Root `npm test` still runs them. Do not copy their setup for new suites; migrate them into the shared suite in #1424.

`tests-vitest-happydom` keeps its vitest `test` script. `frameworks-next` is not a Vite app; add a separate server entry for it when its suite lands in #1424, since its `start` script runs the production server and needs a build first.

## Naming

`tests/<concern>.spec.ts`, kebab-case, named for the behavior under test — [fullscreen.spec.ts](../shared/playwright/tests/fullscreen.spec.ts). Never `example.spec.ts`.

Open every spec with a purpose comment, per the inline-comments rule in [examples/AGENTS.md](../AGENTS.md#authoring-rules).

## Running

```bash
npm run test:e2e:goldens
npm run test:e2e:goldens -- --project react-watch-state
npm run test:e2e
```

- From the root, install dependencies once with `npm install` and build the shared packages with `npm run aiChat:build` before testing. Rebuild a changed package before testing its examples.
- Check test discovery with `npm run test:e2e:goldens -- --list` before opening a browser. This catches config and fixture errors; it does not run the tests. Each case appears once.
- Install Chromium once per machine with `npx playwright install chromium`.
- Playwright builds and serves all three React examples on every run, even when `--project` selects one. Select projects with the usual Playwright arguments.
- Root `test:e2e` runs the central suite once, then any `test:e2e` script a workspace still defines. The React 17 and 18 suites run under `npm test` until they are migrated.

When and how the suite runs in CI at scale is not decided here. See [issue #2127](https://github.com/carbon-design-system/carbon-ai-chat/issues/2127).

## Debugging

Debug one project with `npm run test:e2e:goldens -- --project <name> --debug` to inspect actions and locators. For an intermittent failure, rerun one test with `npm run test:e2e:goldens -- --project <name> --grep '<test name>' --trace on`. Inspect the trace's actions, DOM snapshots, and requests. Keep full-run tracing off; when CI is added, capture traces on the first retry rather than every test.

Failures, screenshots, and videos land in `shared/playwright/test-results/`, which is git-ignored.

## Definition of done

- [ ] `npm run test:e2e:goldens -- --list` shows each case once, under the right project.
- [ ] `npm run test:e2e:goldens` passes on chromium.
- [ ] `npm run build --workspace=<example>` exits 0.
- [ ] The suite covers the example's one concern plus the baseline above.
- [ ] The example has no Playwright config, dependency, or script, and its target assigns no port.
- [ ] Every spec opens with a purpose comment.

## React vs Web Components

Run each golden flow once through React, including the render-prop bridge and
shared chat behavior. Keep all specs in `tests/`; do not add a duplicate project
for the matching Web Components example.

## Related guidance

- [examples/AGENTS.md](../AGENTS.md) — read when adding or changing an example
- [examples/react/AGENTS.md](../react/AGENTS.md) and [examples/web-components/AGENTS.md](../web-components/AGENTS.md) — flavor deltas
- [demo/tests/README.md](../../demo/tests/README.md) — read for existing Playwright helper patterns
- [Playwright best practices](https://playwright.dev/docs/best-practices) — read when choosing locators, assertions, isolation, or debugging steps
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) — read when adding an axe scan or checking its limits
