# definition-of-done.md — gates before shipping

Load this to pick the minimum verification gate for what you changed, before marking a task done or opening a PR.

`npm run ci-check` does **not** run `build`, and workspace deps resolve through built artifacts (`es/`, `dist/es/`) rather than TS sources. **Always run `build` BEFORE `ci-check`** — running them the other way around (or running `ci-check` on its own after edits) makes tests resolve consumer imports against a stale `es/`, which surfaces as confusing "no exported member 'X'" errors even though the source clearly exports X.

> **Before running any `build` row below, ask the user whether `npm run aiChat:start` is already running** — a parallel build races the watcher (see [commands.md](commands.md) and the Always-on rules in the root [AGENTS.md](../AGENTS.md)). This applies to the `build` gates here, not to `ci-check`/`test`/`lint`, which write no artifacts.

## Minimum gate by area edited

| Area edited                       | Minimum gate before shipping                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cross-cutting / multiple packages | `npm run build && npm run ci-check`                                                                                                                                      |
| `packages/ai-chat/`               | `npm run build --workspace=@carbon/ai-chat` + `npm run test --workspace=@carbon/ai-chat`                                                                                 |
| `packages/ai-chat-components/`    | `npm run build --workspace=@carbon/ai-chat-components` + `npm run test --workspace=@carbon/ai-chat-components` (runs web-components + react suites)                      |
| `demo/`                           | `npm run build --workspace=@carbon/ai-chat-examples-demo` + `npm run test --workspace=@carbon/ai-chat-examples-demo` (Playwright)                                        |
| `examples/**`                     | `npm run build --workspace=<example>` + visual smoke via `npm run start --workspace=<example>` (load in browser, open chat, send one message, confirm no console errors) |
| SCSS only                         | `npm run lint:styles && npm run format`                                                                                                                                  |

Always run `npm run lint` + `npm run lint:license` before opening a PR if you touched more than one file — husky's pre-commit only runs prettier/eslint/stylelint on staged files and does not check license headers.

Before declaring a task done, self-review the diff against [code-review.md](code-review.md). Prefer a sub-agent for independence and to keep the main conversation lean. Act on **Blocker** findings before handing back; surface **Important** findings to the user.

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — repo router
- [commands.md](commands.md) — the commands referenced above
- [code-review.md](code-review.md) — review rubric
- [conventions.md](conventions.md) — commits, branches, license headers, hooks
