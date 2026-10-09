# testing.md — `@carbon/ai-chat-components` testing

Load this when writing or running tests in this package. Two runners live here — pick the right one for the file.

Tests are colocated with source (opposite of `@carbon/ai-chat`, which puts specs under `tests/`). Every Lit element gets a `__tests__/<name>.test.ts`. Every new or changed React wrapper should get a spec under `src/react/__tests__/`.

## Two runners

| Runner                   | Covers              | Location                                      | Command                       |
| ------------------------ | ------------------- | --------------------------------------------- | ----------------------------- |
| `@web/test-runner` (WTR) | Lit custom elements | `src/components/<c>/__tests__/<name>.test.ts` | `npm run test:web-components` |
| Jest                     | React wrappers      | `src/react/__tests__/<file>.test.ts`          | `npm run test:react`          |

`npm test` runs both. Use the right runner for the file — a Lit element test under Jest (or vice versa) will fail to resolve its environment.

## Snapshots

WTR snapshots live in `__snapshots__/` next to the test. Regenerate with `npm run test:updateSnapshot` and **review the diff** before committing — a snapshot churn usually means a real render change.

## Running tests

From this package directory:

```bash
npm test                        # both suites
npm run test:web-components      # WTR (Lit) only
npm run test:react              # Jest (React wrappers) only
npm run test:updateSnapshot     # refresh WTR snapshots

# Single web-component test
npm run test:web-components -- src/components/card/__tests__/card.test.ts

# Single react-wrapper test
npm run test:react -- src/react/__tests__/<file>.test.ts
```

## Gotchas

| Symptom                                            | Cause                                | Fix                                                                                                                                                                                      |
| -------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Unexpected token 'export'` in a React (Jest) test | A new ESM-only dep isn't transpiled  | Add its package name to `transformIgnorePatterns` in the Jest config. The list already covers lit, `@carbon` packages, lodash-es, `@floating-ui`, uuid, `@formatjs`, `@codemirror`, etc. |
| Import not found at build/test time                | Missing `.js` extension              | Relative imports use explicit `.js` even for `.ts` source (`import { foo } from "./bar.js"`).                                                                                            |
| Wrong runner picked up a file                      | Lit vs React test in the wrong suite | Lit → WTR (`.test.ts` under `__tests__/`); React wrappers → Jest (under `src/react/__tests__/`).                                                                                         |
| A WTR test fails against code that is correct in `src/` | The test imports `@carbon/ai-chat-components/es/…`, the built output, and `es/` is stale | Rebuild before testing — see the [build preflight](../../../references/commands.md#build-preflight).                                                                                     |

## Related guidance

- [../AGENTS.md](../AGENTS.md) — package authoring rules (parent router)
- [component-authoring.md](component-authoring.md) — where elements and wrappers live
- [storybook.md](storybook.md) — stories are not tests; interaction testing is not wired here
- [../../ai-chat/references/tests.md](../../ai-chat/references/tests.md) — the sibling package's (different) Jest-in-`tests/` layout
