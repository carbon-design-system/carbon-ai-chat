# commands.md — build, test & run commands

Load this when you need to build, watch, lint, format, test, or run an example/Storybook. Run from the repo root unless noted.

> **Ask first** if the user has `npm run aiChat:start` running — don't kick off a parallel build/watch; it races the watcher.
>
> **Before a test that reads built output**, run the [build preflight](#build-preflight).

## Common commands

| Task | Command |
| --- | --- |
| Fresh install + first-time build | `npm install && npm run aiChat:build` |
| Dev watch (builds + watches both packages + demo, TypeDoc on 5001) | `npm run aiChat:start` |
| Storybook (Lit) | `npm run aiChat:start:storybook` |
| Storybook (React wrappers) | `npm run aiChat:start:storybook:react` |
| Build everything | `npm run build` |
| Build only the ai-chat stack (components + ai-chat + demo) | `npm run aiChat:build` |
| Build the ai-chat stack + generate TypeDoc | `npm run aiChat:build:docs` |
| Build example applications | `npm run examples:build` |
| Lint (eslint on `packages/`, `scripts/`, `tools/`) | `npm run lint` |
| Stylelint | `npm run lint:styles` |
| License header check | `npm run lint:license` |
| Dead-code check (knip) | `npm run lint:dead` |
| Prettier check / write | `npm run format` / `npm run format:write` |
| All package tests | `npm run test` |
| Example app tests only (CI's `examples` suite) | `npm run test:examples` |
| Guidance validator regression tests (no build) | `npm run test:guidance` |
| Lint + format + license + test gate (no build) | `npm run ci-check` |
| Remove every `node_modules`, plus `es/`, `es-custom/`, `dist/`, and `storybook-static/` in the components package | `npm run clean` |

**Always run the npm script, never the underlying binary.** `npx prettier`, a bare `eslint`, or `stylelint` invoked by hand drops the project configuration and ignore rules in `.prettierignore` and will reformat generated output — which is never editable, see [Root AGENTS.md](../AGENTS.md). The scripts are also the only thing CI and husky run, so a hand-rolled invocation can disagree with the gate that actually blocks the merge.

There is no per-file variant. `format:write` is `--cache`d, so re-running it across the repo after a one-file edit is cheap; passing a path (`npm run format:write -- src/foo.ts`) appends to the globs rather than narrowing them, and formats everything anyway.

Which gate to run before shipping a change → [definition-of-done.md](definition-of-done.md).

## Build preflight

Run these steps before a test, example, or demo run that reads built output. Guidance-only edits skip them: they need no package build.

1. Find what the run reads in the table below. A run that reads no built output needs no preflight.
2. Check the [evidence](#evidence-that-a-build-is-current) for each package it reads.
3. If evidence is missing, ask, then build. If you cannot build, mark freshness unknown.
4. Run the test, then [report the build with it](#report-the-build-with-the-test).

Workspace deps resolve through built artifacts, not TS sources. A test can run old code while the source is correct.

| Run | Reads built output from | Builds for itself |
| --- | --- | --- |
| `@carbon/ai-chat` Jest | `packages/ai-chat-components/es/`. Its own code runs from `src/`. | Nothing |
| `@carbon/ai-chat-components` WTR | Its own `es/`, in each test that imports `@carbon/ai-chat-components/es/…` | Nothing |
| Demo Playwright | `packages/ai-chat/dist/es/` and `packages/ai-chat-components/es/` | The demo only (`tsc --noEmit && vite build`), never the chat packages. It can skip even that → [demo/AGENTS.md](../demo/AGENTS.md#build-run-test). |
| Example tests and e2e | The same two package outputs | At most the example |

`npm run ci-check` never builds the chat packages. Its test step can start the demo and example builds.

### Evidence that a build is current

Output directories that exist prove nothing. A build that exited 0 earlier proves nothing about now. A build can count for a test run only when you can show all three:

- **Same worktree.** The build ran in the directory the test runs in. Each worktree has its own `node_modules` and output; another checkout's build does not carry over.
- **After the last invalidating change** (next section), for every package the test reads. `npm run aiChat:build` builds the components package, then `@carbon/ai-chat`, then the demo.
- **Finished with exit 0, and you saw it.** Your own command counts. A watcher rebuild counts once you [confirm it](#with-a-watcher-running).

To confirm instead of assume, check the output. Search it for a symbol or string the change added, and check that the matching file is newer than the source edit. The components package's `es/` mirrors `src/`. `@carbon/ai-chat` bundles into `packages/ai-chat/dist/es/`, where chunks from older builds remain.

**With any of the three missing, freshness is unknown.** Unknown is not "probably fine." Build after coordinating, or report the test result as unverified.

A build can meet all three and still be stale: they do not cover leftover `node_modules` state or output from an older tree. When a failure still looks environmental, go to the [clean rebuild](#clean-rebuild-for-suspected-stale-state).

### What invalidates earlier evidence

| Change since the build | Do again |
| --- | --- |
| Checkout, pull, merge, rebase, cherry-pick, or a new worktree | `npm install && npm run aiChat:build`. These can change source, dependencies, and build configuration at once. Use a narrower row only after you check what changed. |
| `package.json` or `package-lock.json` | `npm install`, then rebuild |
| Source edit in a package | `npm run build --workspace=<package>` before a run that reads its output (table above) |
| Build configuration (`tasks/`, `tsconfig*.json`, `.babelrc`, Rollup or Vite config) | Rebuild the package. Ask for a restart of any watcher started before the change. |

### With a watcher running

The ask-first rule at the top of this file applies here. If `npm run aiChat:start` is running, let it build the packages. A second build of the same packages races it on the same files.

A watcher is evidence only for what it watches, and only once a rebuild succeeds:

- **It rebuilds on source edits, one package at a time.** Confirm each package's output on its own. Do not assume that a components rebuild also rebuilt `@carbon/ai-chat`.
- **It does not install dependencies or write `demo/dist`.** After a checkout, rebase, or dependency change, ask the user to stop it, run `npm install`, and start it again. `aiChat:start` builds both packages in full before it watches.
- **You rarely see its terminal.** The components watcher logs `Build complete` after every rebuild, including a failed one. A failed one logs `Build error:` just before it. Ask the user about both lines, or check the output as described above.
- **Its demo dev server blocks the demo's Playwright run** → [demo/AGENTS.md](../demo/AGENTS.md#build-run-test).

### Clean rebuild for suspected stale state

Use this when a failure looks like the environment and not the change. Signs: the failing tests are outside what the diff touches, the same commit passes in a fresh worktree or in CI, or the failure appeared after a rebase or dependency change. Try it before you blame the source change or upstream, and after the cheaper steps:

1. Rerun the failing test once. A pass without a rebuild is a flake, not stale state.
2. For the demo's Playwright suite, confirm that it started its own server → [demo/AGENTS.md](../demo/AGENTS.md#build-run-test).
3. Rebuild the normal way and check the output.
4. Clean rebuild, with the user's go-ahead. It deletes every `node_modules` and removes files that a running watcher or dev server uses. Ask the user to stop those first.

```bash
npm run clean && npm install && npm run aiChat:build
```

Then rerun the same failing command. A pass means stale state: report it as that, not as a fix. A repeat failure makes stale state unlikely. Look at the source change, then at the base branch.

`npm run clean` leaves `packages/ai-chat/dist` in place. No script removes it. Each build overwrites the current files there and leaves files from older builds beside them, so a file's presence in that directory is not evidence. When you cannot disturb the current worktree, a fresh worktree with the same changes, installed and built, answers the same question.

### Report the build with the test

For a run that reads built output, give each of these with the result:

- The build command, the worktree it ran in, when it ran relative to the last change, and its result.
- The test command and its result.
- What you did not verify: a watcher you could not see, a server Playwright reused, a build you were asked not to start.

"Build freshness unknown" is a valid line in a report. Without a build line, the result of such a run is incomplete. The general rule for showing a gate → [definition-of-done.md](definition-of-done.md).

## scripts/ vs tools/

- **`tools/`** — enforcement. It runs on every commit. A gate calls it: `ci-check`, `lint-staged`, or CI. The license check lives here.
- **`scripts/`** — opt-in. A developer runs it on purpose. So does a release workflow. The measurement tools live here, and so do the release steps. One exception: `ci-check` and the pre-commit hook run [`scripts/verify-example-readmes.mjs`](../scripts/verify-example-readmes.mjs).

Name files in both plainly, with no underscore prefix. A shared module says so with a `-lib` suffix ([`scripts/measure-lib.mjs`](../scripts/measure-lib.mjs)), not with a leading `_`.

## Running a single example or test

Each lives with the thing it tests — no recipes are restated here:

- **One example** → [examples/AGENTS.md](../examples/AGENTS.md) ("Running an example").
- **One `@carbon/ai-chat` test** (Jest) → [packages/ai-chat/references/tests.md](../packages/ai-chat/references/tests.md).
- **One `@carbon/ai-chat-components` test** (two runners — `@web/test-runner` + Jest) → [packages/ai-chat-components/AGENTS.md](../packages/ai-chat-components/AGENTS.md).

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — repo router
- [definition-of-done.md](definition-of-done.md) — which gate to run before shipping
- [demo/AGENTS.md](../demo/AGENTS.md) — read when running the demo's Playwright suite: its server and port
- [conventions.md](conventions.md) — commits, branches, license headers, hooks
