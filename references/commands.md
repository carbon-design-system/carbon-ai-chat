# commands.md — build, test & run commands

Load this when you need to build, watch, lint, format, test, or run an example/Storybook. Run from the repo root unless noted.

> **Ask first** if the user has `npm run aiChat:start` running — don't kick off a parallel build/watch; it races the watcher.

## Common commands

| Task                                                               | Command                                   |
| ------------------------------------------------------------------ | ----------------------------------------- |
| Fresh install + first-time build                                   | `npm install && npm run aiChat:build`     |
| Dev watch (builds + watches both packages + demo, TypeDoc on 5001) | `npm run aiChat:start`                    |
| Storybook (Lit)                                                    | `npm run aiChat:start:storybook`          |
| Storybook (React wrappers)                                         | `npm run aiChat:start:storybook:react`    |
| Build everything                                                   | `npm run build`                           |
| Build only the ai-chat stack (components + ai-chat + demo)         | `npm run aiChat:build`                    |
| Lint (eslint on `packages/`)                                       | `npm run lint`                            |
| Stylelint                                                          | `npm run lint:styles`                     |
| License header check                                               | `npm run lint:license`                    |
| Prettier check / write                                             | `npm run format` / `npm run format:write` |
| All tests                                                          | `npm run test`                            |
| Lint + format + license + test gate (no build)                     | `npm run ci-check`                        |
| Clean everything                                                   | `npm run clean`                           |

**Always run the npm script, never the underlying binary.** `npx prettier`, a bare `eslint`, or `stylelint` invoked by hand drops the ignore globs these scripts carry (`!**/*.snap.js`, `!**/{build,es,lib,…}/**`) and will reformat generated output — which is never editable, see [Root AGENTS.md](../AGENTS.md). The scripts are also the only thing CI and husky run, so a hand-rolled invocation can disagree with the gate that actually blocks the merge.

There is no per-file variant. `format:write` is `--cache`d, so re-running it across the repo after a one-file edit is cheap; passing a path (`npm run format:write -- src/foo.ts`) appends to the globs rather than narrowing them, and formats everything anyway.

Which gate to run before shipping a change → [definition-of-done.md](definition-of-done.md).

## Running a single example or test

Each lives with the thing it tests — no recipes are restated here:

- **One example** → [examples/AGENTS.md](../examples/AGENTS.md) ("Running an example").
- **One `@carbon/ai-chat` test** (Jest) → [packages/ai-chat/references/tests.md](../packages/ai-chat/references/tests.md).
- **One `@carbon/ai-chat-components` test** (two runners — `@web/test-runner` + Jest) → [packages/ai-chat-components/AGENTS.md](../packages/ai-chat-components/AGENTS.md).

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — repo router
- [definition-of-done.md](definition-of-done.md) — which gate to run before shipping
- [conventions.md](conventions.md) — commits, branches, license headers, hooks
