# evaluating-changes.md — what to look for, by what the diff changed

Load this when a pass has its dimension and needs the checklist behind it. Take the section that matches what the diff touched — documentation and text, code, or the tests that prove it — and skip the rest.

## If the diff contains documentation/text updates

- Hold developer-facing copy to [tone.md](../../../../references/tone.md) for voice and quick rules, to [caic-copy-writer](../../caic-copy-writer/SKILL.md) for the rules of the copy type in the diff, and to [revision-pass.md](../../caic-copy-writer/references/revision-pass.md) for the tightening pass. The commit bodies and the PR description are copy too — types 8 and 9.
- Identify spelling, grammar, and punctuation errors.
- Assess clarity, conciseness, and readability; suggest improvements.
- Ensure technical terminology is correct and standard.
- Check consistency of formatting, headings, bullets, and structure.
- Confirm the docs capture the intent and give clear instructions.

## If the diff contains code changes

- **Favor simplicity** — run `npm run measure -- --changed <base>` before reading, and read its size row before any function row: a new file twice the size of its neighbors is the finding no per-function score can show. A bare score is not a finding either — it selects which function to read, and a clean run proves shape only, never that the change was worth making. **The `severity` column is the verdict** — the tool applies the bands itself and prints `Important`/`Blocker` (a notch lower under `demo/`), closing with a line naming how many rows it labeled. A row is labeled only when this change made it *worse*, so a high score that stayed flat or improved stays blank by design, and an all-blank column is a result, not a skipped check. Report it either way, the negative included. Percentiles and blind spots are in [measuring.md](../../../../references/measuring.md#measuring-complexity), the rungs in the [laziness ladder](../../../../references/code-patterns.md#writing-the-least-code-laziness-ladder). Flag over-built code, large multi-job functions, hidden side effects, deep nesting, shared mutable state, single-caller abstractions (YAGNI), cleverness over a plain version, dead code or unused flexibility, logic expressible in fewer lines, and JS re-creating what CSS or a native element or browser API already does. Run `npm run lint:dead` to verify no unreferenced source files were introduced or left behind. This check is removable complexity only — correctness and security are the bullets below.
- Analyze logic for bugs, inefficiencies, and security risks (OWASP-style: injection, XSS, unsafe deserialization, secrets in code).
- Check variable names, function structure, and error handling for clarity and correctness.
- Confirm edge-case handling — empty/null inputs, error paths, concurrency, cancellation, large inputs.
- Flag comments that restate the code or reference the current task/PR/issue. This repo's default is **no comments** — keep only those explaining a non-obvious _why_ (hidden constraint, subtle invariant, bug workaround).
- Flag scope creep: drive-by refactors, speculative abstractions, error handling for scenarios that cannot happen, back-compat shims for code with no external consumers. A bug fix should not ship with unrelated cleanup.
- Suggest an alternative implementation **only** for a concrete defect (bug, measurable perf issue, convention violation, or a clear simplicity win per above) — not stylistic preference.

## Test coverage

- Identify which changed behavior is currently untested.
- Check whether any existing proof got weaker, which a passing run will not tell you. A loosened assertion, a deleted case, a case newly skipped, or a regenerated snapshot all turn the light green while the criterion still reads as written — **Blocker** when the weakened proof covers behavior this diff changed, **Important** otherwise. Regenerating is allowed and sometimes correct ([testing.md](../../../../packages/ai-chat-components/references/testing.md) asks for the diff to be read before committing); what the review demands is the reason, not the command's absence.
- Recommend the test style appropriate to the package:
  - `@carbon/ai-chat` — Jest, specs under `packages/ai-chat/tests/<area>/spec/**/*_spec.ts(x)` ([tests.md](../../../../packages/ai-chat/references/tests.md)).
  - `@carbon/ai-chat-components` — `@web/test-runner` for Lit components (colocated `__tests__/*.test.ts`) and Jest for the React wrappers.
  - `demo/` — Playwright under `demo/tests/`.
  - `examples/**` — Playwright smoke tests (see [playwright.md](../../../../examples/references/playwright.md)).
- For UI changes, call out whether a visual/interaction check in the browser is required in addition to automated tests.
- **If you support browser automation or visual inspection, use it** rather than only recommending it — load the change and look at it. Visual verification catches styling, layout, focus, and interaction regressions that reading a diff cannot.

## Related guidance

- [caic-review](../SKILL.md) — the rubric that sends a pass here, and the shape its findings take
- [review-passes.md](review-passes.md) — read when choosing which of these checklists a pass gets
- [repo-checks.md](repo-checks.md) — read alongside the code section: the conventions a code change also has to clear
- [writing-findings.md](writing-findings.md) — read before filing what you found here, especially what isn't a finding
