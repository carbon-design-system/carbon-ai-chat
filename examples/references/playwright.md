# playwright.md — Playwright tests for examples

Every servable example gets a Playwright suite. Copy a golden example, then change the spec.

- React — [react/basic-custom-element-fullscreen/](../react/basic-custom-element-fullscreen/)
- Web Components — [web-components/basic-custom-element-fullscreen/](../web-components/basic-custom-element-fullscreen/)

Copy that example's [playwright.config.ts](../react/basic-custom-element-fullscreen/playwright.config.ts), its `tests/` folder, and its `.gitignore`, then add to its `package.json`:

```json
"scripts": { "test:e2e": "playwright test" },
"devDependencies": { "@playwright/test": "^1.63.0" }
```

**Name the script `test:e2e`, not `test`.** Three examples already use `test` for a different test runner: `frameworks-vite` runs vitest, and `tests-jest-happydom` and `tests-jest-jsdom` run jest. Calling yours `test` would replace theirs.

## Config conventions

Copy [playwright.config.ts](../react/basic-custom-element-fullscreen/playwright.config.ts) as-is. What it sets, and why:

| Setting | Value |
| --- | --- |
| `testDir` | `./tests` |
| `timeout` | 60s per test |
| `workers` | `1` — an example has one or two specs, so a pool buys nothing and multiplies against whatever concurrency runs the examples |
| `retries` | `process.env.CI ? 1 : 0` |
| `projects` | chromium only — webkit has shadow-DOM gaps, see [demo/playwright.config.ts](../../demo/playwright.config.ts) |
| `webServer.command` | `PORT=<probed> npm run start` |
| `reuseExistingServer` | `!process.env.CI` |

### Ports are allocated at run time. Never add a port table.

Every example's dev server falls back to port 3000 when `PORT` is unset, so any two suites running at once collide. The config asks the OS for a free port instead:

```ts
const PORT = Number(process.env.CAIC_EXAMPLE_PORT) || (await probeFreePort());
process.env.CAIC_EXAMPLE_PORT = String(PORT);
```

**Publish the port to the environment, as above.** Playwright evaluates the config once in the runner and again in every worker. Probe on each evaluation and each process gets a different port, the dev server binds one of them, and every test fails with `ERR_CONNECTION_REFUSED`.

**Never hardcode a port in an example's [vite.config.ts](../react/basic-custom-element-fullscreen/vite.config.ts).** That overrides `PORT=`, and the example can no longer be run alongside the others.

A checked-in port table is not an alternative. It grows with the catalog, every new-example PR edits it, and it conflicts on merge.

## Selectors

In order — use the first that works:

1. **`getByRole` / `getByLabel`**, where the element has a stable accessible name. This doubles as an accessibility check. The send button qualifies: `getByRole('button', { name: /send/i })`.
2. **`PageObjectId`** test IDs from `@carbon/ai-chat/server`, where no dependable role or name exists — the contenteditable input, or anything dynamic or localized.

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

## Determinism

- Settle a stream before asserting on it. Assert the end of the reply, not a partial state mid-flight.
- No real timestamps, no randomness, no live network.
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

`frameworks-vite` (`cross-env PORT=3016 vite`) and `frameworks-next` (`cross-env PORT=3018 next start`) pin their port inside the start script, which overrides the `PORT=` the webServer command supplies. `frameworks-next`'s `start` is the production server, so it needs a build first.

For these two, skip the probe: set `webServer.command` to the example's own start script and `webServer.port` to the port that script pins.

## Naming

`tests/<concern>.spec.ts`, kebab-case, named for the behavior under test — [fullscreen-baseline.spec.ts](../react/basic-custom-element-fullscreen/tests/fullscreen-baseline.spec.ts), [send-clears-input.spec.ts](../react/frameworks-react-17/tests/send-clears-input.spec.ts). Never `example.spec.ts`.

Open every spec with a purpose comment, per the inline-comments rule in [examples/AGENTS.md](../AGENTS.md#authoring-rules).

## Running

```bash
npm run test:e2e --workspace=<example-workspace-name>
```

- Playwright starts the dev server itself. Don't start one first.
- Browsers install once per machine: `npx playwright install --with-deps`.
- `reuseExistingServer` is inert here: the probe only ever returns a port nothing is listening on, so there is never a server to reuse. It stays in the config for the deviating examples below, which use a fixed port.

When and how the suite runs in CI at scale is not decided here. See [issue #2127](https://github.com/carbon-design-system/carbon-ai-chat/issues/2127).

## Definition of done

- [ ] `npm run test:e2e --workspace=<example>` passes on chromium.
- [ ] `npm run build --workspace=<example>` exits 0.
- [ ] The suite covers the example's one concern plus the baseline above.
- [ ] No port is hardcoded anywhere in the example.
- [ ] Every spec opens with a purpose comment.

## React vs Web Components

This guide stays one file: both flavors share the dev server, `@playwright/test`, and the same selectors, and a spec body ports between them unchanged. Only the mount differs.

- Cover behavior that runs through the React render-prop bridge in the React flavor.
- Cover shared chat behavior once. Default hide-on-close lives in the React golden, which is why no other `ChatCustomElement` example repeats it.

## Related guidance

- [examples/AGENTS.md](../AGENTS.md) — read when adding or changing an example
- [examples/react/AGENTS.md](../react/AGENTS.md) and [examples/web-components/AGENTS.md](../web-components/AGENTS.md) — flavor deltas
- [demo/tests/README.md](../../demo/tests/README.md) — read for existing Playwright helper patterns
