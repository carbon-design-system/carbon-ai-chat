# playwright.md — Playwright tests for examples

Run golden flows for React and Web Components from [shared/playwright/](../shared/playwright/). Each flavor has its own project and server. Other Vite examples can use the local scaffold below.

```text
shared/playwright/
  playwright.config.ts   one project per target, one server per target
  targets.ts             the table of examples under test
  start-vite.mjs         builds an example and serves it on an OS-assigned port
  helpers/index.ts       fixtures: target, baseURL, console-error check
  tests/                 shared specs, run against both flavors
```

## Which specs run against which example

Targets live in [targets.ts](../shared/playwright/targets.ts); `npm run test:e2e:goldens -- --list` shows the projects and specs. Each target name is also its Playwright project name.

### Share definitions across hosts

Share golden specs in `shared/playwright/tests/` when both hosts expose the same visible contract. Each target opens its own example, so both hosts' code runs. One-flavor flows such as `tests-vitest-happydom` map to one target. Shared assertions prove neither exact payload nor layout parity: the mentions spec checks labels, not every field ID/value.

Give host-specific behavior a separate spec mapped to that target; keep common flows shared. Local browser specs live in the example's `tests/`. Resolve URLs through the shared fixture. Unit tests for host logic may stay in the example.

### Add a target

1. Add an entry to `targets` in [targets.ts](../shared/playwright/targets.ts): the example's directory under `examples/`, and a spec path relative to `tests/`.
2. Reuse an existing spec when the visible contract matches. Otherwise, write a new spec. Import `test`, `expect`, and `openExample` from the shared helpers; never put a URL in a spec.
3. Check discovery with `npm run test:e2e:goldens -- --list`. The config derives the project, the server, and the URL variable from the entry.

An example needs a `build` script, a `vite.config.ts`, and an HTML entry. It needs no Playwright config, dependency, or script.

Writing the spec with Playwright's test agents? Read [playwright-agents.md](playwright-agents.md).

## Scaffold a local Vite suite

For an example outside the golden suite, read [playwright-local-suite.md](playwright-local-suite.md).

## Config conventions

Edit [playwright.config.ts](../shared/playwright/playwright.config.ts) for every target at once. It sets `testDir: ./tests`, a 60s per-test `timeout`, `retries: process.env.CI ? 1 : 0`, and one chromium project and one `webServer` per target, started with the example as its working directory. Chromium is the only browser because webkit has shadow-DOM gaps; see [demo/playwright.config.ts](../../demo/playwright.config.ts). `workers: 1` makes a full run take about 12 minutes; `--workers=4` finishes in under 5 with the same peak memory. Settle the default with CI in [#2127](https://github.com/carbon-design-system/carbon-ai-chat/issues/2127).

### Ports are allocated at run time. Never add a port table.

The shared [launcher](../shared/playwright/start-vite.mjs) builds the example, serves it on Node port `0`, and reports `CAIC_E2E_URL_<TARGET>=<url>`. The [fixture](../shared/playwright/helpers/index.ts) uses the project's `target` to select that URL. Binding assigns the port without a find/use race.

The suite serves production output: a cold dev server re-optimizes dependencies as chat lazy chunks load, reloading the first test.

Import `test` and `expect` from the shared fixture so `page.goto('/')` uses the target's URL. Call `openExample(page)` first; it also asks the page to reduce motion. For an auto-open example, use `waitForChatReady(page, PageObjectId.INPUT)` before chat assertions. For a float example, await `PageObjectId.LAUNCHER`, click it, then await the displayed panel. The fixture checks console and page errors after each test.

Fixtures take an object-destructured first argument, as in `async ({ target }, playWrightUse)`. Playwright rejects any other form. Name the second argument `playWrightUse`, not `use`, so the React hooks lint rule does not mistake it for a hook.

Do not add a per-example port table or a probe that closes its listener before the server starts.

## Selectors

Use the first that works:

1. **`getByRole` / `getByLabel`**, where the element has a stable accessible name.
2. **`PageObjectId`** test IDs from `@carbon/ai-chat/server`, for the contenteditable input and dynamic or localized markup without a stable role or name.

ARIA IDREFs (`aria-labelledby`, `for`) do not cross a shadow-root boundary, so names can fail there even though Playwright locators pierce open shadow roots. Use `PageObjectId` in that case.

## What to test

First prove that chat mounts with a clean console. Then test the example's one concern, named by its folder and the README's "What this example shows" section. Its "APIs and props demonstrated" table identifies the API behind the behavior.

A second concern belongs in a second example; see [examples/AGENTS.md](../AGENTS.md#authoring-rules).

## Suggestions and chips

Read [mentions and commands](../shared/playwright/tests/mentions-and-commands.spec.ts) when testing an editor popup.

- Type into `PageObjectId.INPUT` with `pressSequentially()`. `fill()` replaces text in one update and skips the separate trigger and filter updates.
- Prove chip atomicity: Backspace removes the trailing space, then a second Backspace removes the whole chip and restores its trigger.
- Test `/` after a Shift+Enter newline and in an empty input; a mid-line slash must leave the list closed. Await input text before that negative check so an unready editor cannot pass it.
- Scope the mock's `Mentions:` or `Commands:` summary to the reply in `PageObjectId.MAIN_PANEL`. A label in the editor proves display, not sent structured data.

## State reflected in the host

Read [watch state](../shared/playwright/tests/watch-state.spec.ts) when testing a host subscription.

The host reads `Chat View` before a float example opens. Await the launcher, open it, then await the homescreen and the host's `Homescreen` label. Scope labels to the host's `.watch-state-host` element in either flavor. Minimize and reopen alone cannot prove updates to `homeScreenState.isHomeScreenOpen`; move between the home screen and conversation.

Prefer the host DOM for displayed state. If the host exposes its instance, poll only the relevant `instance.getState()` field. The demo's `window.chatInstance` is not an example convention; do not add a global just for a test.

## Accessibility

The shared fixture does not include axe. Add `@axe-core/playwright` when a spec needs a scan. New UI behavior still needs the [repo accessibility checks](../../references/accessibility.md).

## Determinism

- Settle a stream before asserting the end of the reply, not a partial state mid-flight.
- Use a fresh page and context per test, with shared navigation in `beforeEach`. Never rely on another test's messages, storage, cookies, or order.
- Use retrying checks such as `await expect(locator).toBeVisible()`, not fixed sleeps or one-time checks such as `expect(await locator.isVisible()).toBe(true)`.
- No real timestamps or randomness. For external responses, register a `page.route()` with fixed data before navigation.
- Disable animation where it gates an assertion.

An example whose reply depends on a live service, the clock, or random values still gets a suite: prove its mount and any fixed behavior, never assert the varying values, and list it in `DEFERRED_EXAMPLES` ([Coverage target](playwright-coverage.md#coverage-target)). Skip an example entirely only when nothing in it runs without a live service; see [Skipped examples](#skipped-examples).

## Skipped examples

Four, deliberately. Do not add suites for these, and do not re-litigate them.

| Example | Why |
| --- | --- |
| `react/integrations-watsonx` | Answers come from live watsonx.ai through a token proxy. |
| `web-components/integrations-watsonx` | Same. |
| `react/tests-jest-happydom` | No `start`, no `build`, no HTML entry — nothing to serve. Its Jest spec is its coverage. |
| `react/tests-jest-jsdom` | Same. |

## Examples that deviate

`frameworks-react-17` and `frameworks-react-18` keep their own Playwright suites, with fixed ports and `test` scripts. Root `npm test` still runs them. Do not copy their setup for new suites.

`tests-vitest-happydom` keeps its vitest `test` script and also has the shared target `react-tests-vitest-happydom`. `frameworks-next` is not a Vite app; a suite for it needs a separate server entry, since its `start` script runs the production server and needs a build first.

## Naming

`tests/<concern>.spec.ts`, kebab-case, named for the behavior under test — [fullscreen.spec.ts](../shared/playwright/tests/fullscreen.spec.ts). Never `example.spec.ts`. A spec that only one flavor needs adds that flavor as a suffix, `<concern>-react.spec.ts` or `<concern>-web-components.spec.ts`, and its purpose comment says why the flavors differ.

Open every spec with a purpose comment, per the inline-comments rule in [examples/AGENTS.md](../AGENTS.md#authoring-rules).

## Running

```bash
npm run test:e2e:goldens
CAIC_E2E_TARGETS=react-watch-state npm run test:e2e:goldens
CAIC_E2E_TARGETS=react-watch-state,web-components-watch-state npm run test:e2e:goldens
npm run test:e2e
```

- Before testing, run the root [build preflight](../../references/commands.md#build-preflight). These suites read the built chat packages and build only the examples.
- Check test discovery with `npm run test:e2e:goldens -- --list` before opening a browser. This catches config and fixture errors; it does not run the tests. Each shared case appears once per flavor, under its own project.
- Install Chromium once per machine with `npx playwright install chromium`.
- Playwright starts every configured server, whatever `--project` selects. To run only some targets, list their names in `CAIC_E2E_TARGETS`, comma-separated; the config then builds, serves, and runs only those. An unknown name fails the run. Without it, every target runs.
- Root `test:e2e` runs the central suite once, then any `test:e2e` script a workspace still defines. The React 17 and 18 suites run under `npm test` until they are migrated.

When and how the suite runs in CI at scale is not decided here. See [issue #2127](https://github.com/carbon-design-system/carbon-ai-chat/issues/2127).

## Debugging

Debug one target with `CAIC_E2E_TARGETS=<name> npm run test:e2e:goldens -- --debug`.

Failures, screenshots, and videos land in `shared/playwright/test-results/`, which is git-ignored.

## Definition of done

- [ ] `npm run test:e2e:goldens -- --list` shows each new case once per target, and [targets.ts](../shared/playwright/targets.ts) lists the new targets.
- [ ] `npm run test:e2e:goldens` passes on chromium.
- [ ] `npm run build --workspace=<example>` exits 0.
- [ ] The suite covers the example's one concern plus the baseline above; no scaffold `test.fixme` placeholder remains.
- [ ] Golden examples use the central config; local suites use the shared launcher and fixture. Neither assigns a port.
- [ ] `CAIC_E2E_TARGETS=<targets> npm run test:e2e:coverage` ran, and the PR explains any example below the [coverage target](playwright-coverage.md#coverage-target).
- [ ] Every spec opens with a purpose comment.

## Related guidance

- [examples/react/AGENTS.md](../react/AGENTS.md) and [examples/web-components/AGENTS.md](../web-components/AGENTS.md) — flavor deltas
- [demo/tests/README.md](../../demo/tests/README.md) — read for existing Playwright helper patterns
- [Playwright best practices](https://playwright.dev/docs/best-practices) — read when choosing locators, assertions, isolation, or debugging steps
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) — read when adding an axe scan or checking its limits
