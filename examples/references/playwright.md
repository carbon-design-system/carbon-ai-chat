# playwright.md — Playwright tests for examples

Every servable example gets a Playwright suite. Copy a golden example, then change the spec.

- React — [react/basic-custom-element-fullscreen/](../react/basic-custom-element-fullscreen/)
- Web Components — [web-components/basic-custom-element-fullscreen/](../web-components/basic-custom-element-fullscreen/)

Copy that example's [playwright.config.ts](../react/basic-custom-element-fullscreen/playwright.config.ts), its `tests/` folder, and its `.gitignore`, then add to its `package.json`:

```json
"scripts": { "test:e2e": "playwright test" },
"devDependencies": { "@playwright/test": "^1.63.0", "vite": "^8.3.0" }
```

**Name the script `test:e2e`, not `test`.** Three examples already use `test` for a different test runner: `tests-vitest-happydom` runs vitest, and `tests-jest-happydom` and `tests-jest-jsdom` run jest. Calling yours `test` would replace theirs.

## Config conventions

Copy [playwright.config.ts](../react/basic-custom-element-fullscreen/playwright.config.ts) as-is. What it sets, and why:

| Setting | Value |
| --- | --- |
| `testDir` | `./tests` |
| `timeout` | 60s per test |
| `workers` | `1` — an example has one or two specs, so a pool buys nothing and multiplies against whatever concurrency runs the examples |
| `retries` | `process.env.CI ? 1 : 0` |
| `projects` | chromium only — webkit has shadow-DOM gaps, see [demo/playwright.config.ts](../../demo/playwright.config.ts) |
| `webServer.command` | Start the shared Vite launcher in this example's directory. |
| `webServer.wait` | Capture the URL after Vite binds. |

### Ports are allocated at run time. Never add a port table.

Every Vite example's dev server falls back to port 3000 when `PORT` is unset. The shared [launcher](../shared/playwright/start-vite.mjs) runs Vite as middleware and asks Node to bind port `0`, then reports the address of its open listener. Playwright captures that URL and the [shared fixture](../shared/playwright/helpers/index.ts) gives it to the browser. The operating system assigns the port while binding the listener, so there is no gap between finding and using a port.

Keep Vite at version 8.3.0 or later, the version used by the shared launcher. Import `test` and `expect` from the shared fixture so `page.goto('/')` uses the captured URL. Call `openExample(page)` in `beforeEach`; it also asks the page to reduce motion. Use `waitForChatReady(page, PageObjectId.INPUT)` before chat assertions. The fixture checks console and page errors after each test.

Do not add a per-example port table or a probe that closes its listener before Vite starts.

## Selectors

In order — use the first that works:

1. **`getByRole` / `getByLabel`**, where the element has a stable accessible name. This doubles as an accessibility check. The send button qualifies: `getByRole('button', { name: /send/i })`.
2. **`PageObjectId`** test IDs from `@carbon/ai-chat/server`, where no dependable role or name exists — the contenteditable input, or anything dynamic or localized.

Use Playwright locators for actions and checks. They wait for the target to be ready. If a role or text matches more than once, chain or filter the locator within a stable region.

Never reach into the chat's own markup with a CSS or structural selector, and never assert on raw model output.

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

`tests-vitest-happydom` can use the shared Vite launcher even though its `start` script pins a port: the launcher reads its Vite config and serves it on a Node-assigned port for tests. Keep its existing vitest `test` script.

`frameworks-react-17` and `frameworks-react-18` already have Playwright suites with fixed ports and `test` scripts. Root `npm test` still runs them. Do not copy their setup for new suites; migrate them to the shared launcher and `test:e2e` in #1424.

`frameworks-next` is not a Vite app. Give it a separate web-server command when adding its suite in #1424; its `start` script runs the production server and needs a build first.

## Naming

`tests/<concern>.spec.ts`, kebab-case, named for the behavior under test — [fullscreen-baseline.spec.ts](../react/basic-custom-element-fullscreen/tests/fullscreen-baseline.spec.ts), [send-clears-input.spec.ts](../react/frameworks-react-17/tests/send-clears-input.spec.ts). Never `example.spec.ts`.

Open every spec with a purpose comment, per the inline-comments rule in [examples/AGENTS.md](../AGENTS.md#authoring-rules).

## Running

```bash
npm run test:e2e --workspace=<example-workspace-name>
npm run test:e2e
```

- From the root, install dependencies once with `npm install` and build the shared packages with `npm run aiChat:build` before testing. Rebuild a changed package before testing its examples.
- Install Chromium once per machine with `npx playwright install chromium`.
- Playwright starts and stops each example's server. Root `test:e2e` runs up to four example suites at once, with one browser worker in each.
- Root `test:e2e` currently picks up the two goldens. The existing React 17 and 18 suites run under `npm test` until they are migrated.
- To compare local concurrency, run `E2E_CONCURRENCY=1 npm run test:e2e`, then repeat with `2` and `4`. Record elapsed time and peak memory before changing the default.

The local baseline on 2026-09-29 ran the two golden suites after installation and the shared-package build. `/usr/bin/time -l` reported elapsed time and maximum RSS for one process, not aggregate memory across the process tree:

| Concurrency | Elapsed | Time-reported maximum RSS |
| --- | --- | --- |
| 1 | 14.08s | 1.74 GB |
| 2 | 7.75s | 1.71 GB |
| 4 | 7.92s | 1.73 GB |

Four is the initial ceiling for new suites; with only two suites, it offers no speedup over two. These figures exclude installation and build time, so they do not yet validate the 30-minute target for the eventual full suite.

When and how the suite runs in CI at scale is not decided here. See [issue #2127](https://github.com/carbon-design-system/carbon-ai-chat/issues/2127).

## Debugging

Debug an example with `npm run test:e2e --workspace=<example> -- --debug` to inspect actions and locators. For an intermittent failure, rerun one test with `npm run test:e2e --workspace=<example> -- --grep '<test name>' --trace on`. Inspect the trace's actions, DOM snapshots, and requests. Keep full-run tracing off; when CI is added, capture traces on the first retry rather than every test.

## Definition of done

- [ ] `npm run test:e2e --workspace=<example>` passes on chromium.
- [ ] `npm run build --workspace=<example>` exits 0.
- [ ] The suite covers the example's one concern plus the baseline above.
- [ ] The Playwright config uses the shared launcher and fixture; it assigns no port.
- [ ] Every spec opens with a purpose comment.

## React vs Web Components

This guide stays one file: both flavors share the dev server, `@playwright/test`, and the same selectors, and a spec body ports between them unchanged. Only the mount differs.

- Cover behavior that runs through the React render-prop bridge in the React flavor.
- Cover shared chat behavior once. Default hide-on-close lives in the React golden, which is why no other `ChatCustomElement` example repeats it.

## Related guidance

- [examples/AGENTS.md](../AGENTS.md) — read when adding or changing an example
- [examples/react/AGENTS.md](../react/AGENTS.md) and [examples/web-components/AGENTS.md](../web-components/AGENTS.md) — flavor deltas
- [demo/tests/README.md](../../demo/tests/README.md) — read for existing Playwright helper patterns
- [Playwright best practices](https://playwright.dev/docs/best-practices) — read when choosing locators, assertions, isolation, or debugging steps
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) — read when adding an axe scan or checking its limits
