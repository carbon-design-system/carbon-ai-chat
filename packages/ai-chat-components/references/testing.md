# testing.md — `@carbon/ai-chat-components` testing

Load this when writing or running tests in this package. Vitest runs every test here, in two projects. A file's name says which one.

Tests sit beside the code they cover, under `__tests__/`, as in `@carbon/ai-chat`. Where a test goes, and when it needs a real browser, follows [the rule in `@carbon/ai-chat`](../../ai-chat/references/tests.md#where-a-test-goes). Every Lit element gets tests under its `__tests__/`. Every new or changed React wrapper should get a spec under `src/react/__tests__/`.

## Two projects

| Project | Covers | Files |
| --- | --- | --- |
| `browser` (Playwright, Chromium) | Lit elements and anything that needs real layout, focus, selection, input or a browser API happy-dom lacks | `**/__tests__/<name>.browser.test.ts` |
| `happy-dom` | React wrappers, utilities, Storybook switcher, and Lit logic that needs no real browser | every other `*.test.ts(x)`, including `.storybook/__tests__/` |

`CAIC_ALL_BROWSERS=1` adds Firefox and WebKit to the `browser` project, as the nightly jobs do. The browser project sizes its page to 800x600, as web-test-runner did. Real mouse and keyboard input goes through `src/__tests__/browser/input.ts`, which keeps the `@web/test-runner-commands` signatures.

## Snapshots

DOM snapshots use `expectDomSnapshot(el)` from `src/__tests__/browser/dom-snapshot.ts` and live in `__snapshots__/` next to the test. Regenerate with `npm run test:updateSnapshot` and **review the diff** before committing — a snapshot churn usually means a real render change.

## Running tests

The `browser` project needs Playwright's Chromium, installed once per machine with `npx playwright install chromium` (add `firefox webkit` for `CAIC_ALL_BROWSERS=1`).

From this package directory:

```bash
npm test                                   # both projects
npm test -- --project browser              # browser project only
npm test -- --project happy-dom            # happy-dom project only
npm run test:updateSnapshot                # refresh snapshots

# One file
npm test -- src/components/card/__tests__/card.browser.test.ts
```

## Gotchas

| Symptom                                            | Cause                                | Fix                                                                                                                                                                                      |
| -------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Lit element in a React test never wires its events | A dependency loaded its Node build | Add the package to `test.server.deps.inline` in `vitest.config.ts`, so it resolves with the `browser` condition. |
| A test passes in happy-dom but can't show the behavior | It needs real layout, focus, selection or input | Name it `*.browser.test.ts` so the `browser` project runs it. |
| A test fails against code that is correct in `src/` | The test imports `@carbon/ai-chat-components/es/…`, the built output, and `es/` is stale | Rebuild before testing — see the [build preflight](../../../references/commands.md#build-preflight).                                                                                     |

## Related guidance

- [../AGENTS.md](../AGENTS.md) — package authoring rules (parent router)
- [component-authoring.md](component-authoring.md) — where elements and wrappers live
- [storybook.md](storybook.md) — stories are not tests; interaction testing is not wired here
- [../../ai-chat/references/tests.md](../../ai-chat/references/tests.md) — the sibling package's test layout
