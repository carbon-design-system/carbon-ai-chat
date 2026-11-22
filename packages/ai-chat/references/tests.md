# tests.md — `@carbon/ai-chat` testing

Load this when adding, moving, or fixing a test for this package, or when deciding whether a behavior needs a demo Playwright test.

Tests sit beside the code they cover, in `__tests__/<name>.test.ts(x)`. Vitest runs them. The package's `tests/` folder holds only setup and the checks with no module to sit beside.

## Where a test goes

Use the cheapest test that can show the behavior. Answer in order, and stop at the first yes.

1. **One module owns the behavior.** Write a unit test in `__tests__/` beside that module. Build only what it needs: a stub, a test store, or one rendered component. Don't mount the chat to reach a service or the store.
2. **Several modules work together.** Write a cross-module test in the `__tests__/` of the entry it drives (table below). Boot the least you need (see [Helpers](#helpers)).
3. **It needs real focus, layout, scrolling, slotting, or a browser API happy-dom lacks.** Name it `<name>.browser.test.ts(x)`, in the folder step 1 or 2 chose. A test whose stub stands in for the geometry, focus or slotting the behavior depends on, such as a `getClientRects` stub so tabbable sees every element, belongs here without the stub. A unit that takes a measurement as its input, such as a scroll controller fed element sizes, may stub that measurement and stay where it is. Contract tests stay in their project; only scripts edit them. A real browser alone is no reason to use the demo.
4. **It needs the built demo:** the production build, a demo toggle, the host-compatibility pages, or the demo's response corpus. Only then add a spec to [demo/tests/](../../../demo/tests/), and only if no example's spec covers it. The [example suite](../../../examples/references/playwright.md) covers host integrations.

Check one behavior at one level. When a cheaper test shows it, delete the costlier copy, unless the costlier copy is a contract test.

| A cross-module test that drives… | Goes in |
| --- | --- |
| `createChatSDK` or the SDK handle | `src/sdk/__tests__/` |
| the prebuilt chat's `ChatInstance`, through any host | `src/chat/__tests__/` |
| a React wrapper's own behavior | `src/react/__tests__/` |
| the `cds-aichat-*` hosts, or parity across hosts | `src/web-components/__tests__/` |

Tests follow their folder's [import rules](../AGENTS.md#source-boundaries). A test under `src/sdk/` can import a framework's types but never its values: no React, Lit, Testing Library, or `src/chat/`, including through `vi.mock` or `vi.importActual`. If its assertions need them, it's a `chat/` test.

**Reusable component behavior** (rendering, tokens, HTML, keyboard handling inside an element) belongs in `@carbon/ai-chat-components`' tests. Keep chat state, config, messaging, and the wiring between them here.

## Prefer public behavior

Aim each behavior test at a public boundary: the `ChatInstance`, a host's props, attributes, slots, and events, or the SDK handle. Calling an internal class's exported methods doesn't make a test external.

Keep an internal-only test when it shows something public tests can't reach cheaply, such as a large input matrix or a structural-sharing check. Say why in a comment: what it protects, why public tests don't cover it, and why it's worth keeping.

To remove a test as a duplicate, show the surviving test covers it. Plant a narrow source break the old test catches, and show the survivor fails on it too.

## Contract tests pin host behavior

For a change a host can observe, add or change a contract test in the same commit. Name it `<name>.contract.test.ts(x)`; it runs in `node` or `happy-dom`. The manifest refuses a `.contract.browser.test` file for now, because CI checks the manifest without a browser. Put it in the folder of the entry it drives (`src/chat/__tests__/<area>/`, `src/sdk/__tests__/`, `src/react/__tests__/hosts/`, `src/web-components/__tests__/`, or `src/__tests__/exports/`). Shared drivers and fixtures go in `src/chat/__tests__/helpers/contract/`. The SDK's go in `src/sdk/__tests__/helpers/publicContract.ts` and `lifecycleControl.ts`.

Drive the `ChatInstance` handed to a host, public host props or attributes, slots, events, or the handle from `createChatSDK`. Assert returned values, `getState()` snapshots, the handle's `state`, events, and public callbacks such as `customSendMessage` and render props. A store-shape assertion belongs in an internal test.

Import only the public entries (`src/aiChatEntry`, `src/serverEntry`, `src/sdk/index`, `src/web-components/cds-aichat-{container,custom-element}/index`), `src/types/**`, `src/testing/**`, and the contract helpers. `sourceBoundaries` fails any other import, including through a `vi` module helper.

Find DOM through exported test IDs, slots, parts, roles and accessible names. The documented `cds-aichat--hidden` class is also public. Carbon tag names, Carbon classes, other classes, and markup shape are internal details. Prefer names you set through `config.strings` or message content. Use a browser test when happy-dom cannot show the public effect.

**If an existing contract test fails during a refactor, stop and report the failure. Never edit its expectations to make the refactor pass.** A contract test changes only for a deliberate public behavior change. Record that choice and put the `behavior-change` label on its PR.

### Guard contract edits with the manifest

After the [build preflight](../../../references/commands.md#build-preflight), run from the repo root:

```bash
npm run contract:manifest
npm run contract:manifest:check
npm run test:contract-manifest
```

Commit `tests/contract/MANIFEST.tsv` with the tests. Generation discovers every expanded case through Vitest. It hashes test bodies, helper files, and shared context such as fixtures, hooks, and parameter data. A check reads without writing and fails on stale rows. Run `npm run format:write` before generating, so formatting can't make a row stale.

CI compares the PR's exact base and head manifests. Added rows pass. Changed or removed rows require `behavior-change`. A rename removes an old row. Changing a shared parameter table can require the label even when it adds cases. A base without a manifest starts with an empty baseline.

### Check contract execution

Run `npm run measure -- --changed <base>`. Its advisory `contract` row lists changed runtime source lines no contract test executes, from Vitest's V8 coverage of the `*.contract.test.*` files. The selected `--source worktree|index|head` must match the source on disk. To reuse a report, set `CONTRACT_COVERAGE_REPORT` to its absolute path; its `.meta.json` fingerprint must match. Keep reports uncommitted.

Executed lines do not prove assertions. For each new runtime branch, name the contract test that fails on a narrow source break. Plant it in a scratch copy, then show a clean pass, the failure, and a restored pass. Give a specific reason for a branch with no public effect.

## Which project runs a file

| File | Project | Runs in |
| --- | --- | --- |
| `*.browser.test.ts(x)`, under `src/` | `browser` | Chromium. Nightly adds Firefox and WebKit; set `CAIC_ALL_BROWSERS=1` to run them locally |
| `src/sdk/**`, `tests/**` | `node` | Node, with no DOM. This shows the engine runs without a view |
| any other file under `src/` | `happy-dom` | happy-dom |

`.contract` in a name doesn't change the project. Write DOM tests for happy-dom. If a test fails there, adapt it first, keeping the same behavior covered and assertions no weaker. Only a test that needs a DOM behavior happy-dom lacks falls back to jsdom: add `// @vitest-environment jsdom` with a one-line comment naming the behavior.

Under `src/sdk/`, add `// @vitest-environment happy-dom` only to prove the SDK leaves a browser API alone, such as storage or cookies, and say so in a comment. Any other test there that needs a DOM belongs in `src/chat/__tests__/`.

## Helpers

| Need | Use | From |
| --- | --- | --- |
| A conversation store, for an SDK unit test | `sdkTestStore()` | `src/sdk/__tests__/helpers/store.ts` |
| The prebuilt chat's `ChatInstance`, no render | `bootChat()`, or `bootChat(config, { attach: true })` for a view | `src/chat/__tests__/helpers/boot.ts` |
| One component with chat context | `TestChatContext`, `makeConfigStore` | `src/chat/__tests__/helpers/` |
| Assertions on the rendered chat | `renderChatAndGetInstance()` | `src/chat/__tests__/helpers/render.ts` |
| A wait on a real event or call | `untilCalled()`, `untilDom()` | `src/chat/__tests__/helpers/waits.ts` |

Put a new shared helper in the `__tests__/helpers/` of the folder whose import rules it fits. Call `shutdownBootedChats()`, from `helpers/boot.ts`, after each test that boots. The `browser` project loads the same helpers; browser tests already use `createBaseConfig()`, `setupBeforeEach()`, `setupAfterEach()` and the waits. Wait on the event or promise a test needs, or use fake timers. Don't raise a timeout to make a slow test pass.

## Checks with no module

| Folder | Holds |
| --- | --- |
| `tests/architecture/` | Folder import rules (tests included), the conversation-read gap list, the SDK surface snapshot, and the messaging import scans |
| `tests/types/` | Type tests of the public surface |
| `tests/typedoc/` | Checks for the docs plugins in `docs/typedoc/` |
| `tests/build/` | Checks that run the built package |
| `tests/setup/` | Vitest setup: `index.ts` for `node` and `happy-dom`, `browser.ts` for `browser` |

Type errors in tests fail `npm run docs`, which type-checks every file in `tsconfig.json`.

## Running tests

From `packages/ai-chat/`:

```bash
npm test                                  # every project
npm test -- src/sdk/services/messaging    # one folder or file
npm test -- -t "name pattern"             # by name
npm test -- --project happy-dom           # one project: node, happy-dom, or browser
npm run test:watch                        # watch mode
```

The `browser` project needs Chromium once per machine: `npx playwright install chromium`.

## Debugging failures

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Failure in `@carbon/ai-chat-components` code that is correct in its source | Tests read that package's built `es/`, and `es/` is stale | Rebuild it first; see the [build preflight](../../../references/commands.md#build-preflight) |
| `vi.spyOn` on an imported module throws in a browser test | Browser mode serves sealed ES modules | `vi.mock('<path>', { spy: true })`, then `vi.mocked(fn)` |
| `sourceBoundaries` fails on a test file | The test imports outside its folder's rules | Move it to the folder of the entry it drives |
| A spy on `Storage.prototype` sees no calls in happy-dom | happy-dom copies Storage methods onto each object on first use | Spy on the window's `sessionStorage` or `localStorage` getter |

## Related guidance

- [packages/ai-chat/AGENTS.md](../AGENTS.md): package overview
- [services.md](services.md): service archetypes, for test setup background
- [src/sdk/store/AGENTS.md](../src/sdk/store/AGENTS.md): store rules
- [Components testing](../../ai-chat-components/references/testing.md): read when the behavior belongs to a component
