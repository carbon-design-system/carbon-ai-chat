# playwright-local-suite.md — scaffold a local Vite suite

Use the scaffold command for an example outside the golden suite, then write its behavior assertions.

```bash
npm run scaffold:example-e2e -- \
  --example react/prompt-line-typeahead \
  --concern prompt-line-typeahead \
  --startup input \
  --purpose "Checks typeahead selection and dismissal." \
  --dry-run
```

Review the preview, then remove `--dry-run` to write the files. Repeat `--example` to scaffold another host.

| Input | What the agent chooses |
| --- | --- |
| `--example` | An existing `react/<slug>` or `web-components/<slug>` Vite example. |
| `--concern` | A kebab-case name for the behavior spec. |
| `--startup` | `input`, `launcher`, or `homescreen`, based on the example's initial UI. |
| `--purpose` | The behavior the test will prove, read from the example's README. |

The command adds a local config, `tests/<concern>.spec.ts`, `test:e2e`, ignore entries, and a Playwright dependency matching root `package.json`. The config uses the shared launcher and fixture. Existing configs, versions, scripts, and authored specs stay intact; custom `test:e2e` scripts need manual setup. Choose a new concern to add a spec. Unchanged reruns write nothing.

Replace the generated `test.fixme` with a normal `test` and behavior assertions; the mount check alone is not coverage.

Run `npm install` afterward to update the lockfile. The scaffold does not install, build, or start servers. Follow the [root build rules](../../AGENTS.md#always-on-rules) before running it.

```bash
npm run test:e2e --workspace=<example-workspace-name> -- --list
npm run test:e2e --workspace=<example-workspace-name>
```

Keep the script named `test:e2e`. Some examples use `test` for Jest, Vitest, or an older Playwright setup.
Local suites keep their output in the example's ignored `test-results/` and `playwright-report/` folders.
