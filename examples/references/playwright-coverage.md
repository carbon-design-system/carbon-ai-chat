# playwright-coverage.md — coverage of example suites

`npm run test:e2e:coverage` runs the suite with Chromium's V8 coverage on, then reports it with [monocart-coverage-reports](https://github.com/cenfun/monocart-coverage-reports). It honors `CAIC_E2E_TARGETS`, so one example can be measured alone:

```bash
CAIC_E2E_TARGETS=react-feedback,web-components-feedback npm run test:e2e:coverage
```

- It measures each example's own `src/`. The launcher builds with sourcemaps while coverage is on, and the fixture maps the bundle back to the example's sources; the chat packages and third-party code are left out.
- `coverage/examples-e2e/index.html` lists every measured example, with a link to its own report. `lcov.info` beside it merges them all.
- Sources the suite never loads count as zero.
- A covered line is one a test ran, whether or not an assertion checked its result.

## Coverage target

Aim for a suite that runs at least **80% of its example's gated `src/` lines**. The target is advisory: the report flags a measured, non-deferred example below it, and the command still exits 0. A new suite below the target should say why in its PR. [coverage-options.mjs](../shared/playwright/coverage-options.mjs) holds two lists:

- `OFF_CONCERN_BACKENDS` — examples whose `customSendMessage.ts` copies the baseline mock back end without being part of their concern. That back end is proven once, in `basic-custom-element-fullscreen`, so the copies are left out of the target. A back end the concern runs through stays in.
- `DEFERRED_EXAMPLES` — examples whose concern cannot be checked deterministically: it depends on random content, dates, or timing, or a product defect blocks it and its concern test is a `test.fixme`. Their suites prove a mount and any behavior that stays fixed, and they are reported, not flagged. An entry names a slug for both flavors, or `<flavor>/<slug>` for one.

Add to either list only with the reason in the PR description. Do not add assertions outside the example's concern to raise the number; open the example's report and cover the branches its concern takes.
