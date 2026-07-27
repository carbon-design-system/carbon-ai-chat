This rubric governs every code review in this repo — both user-requested reviews and the self-review an agent runs against its own diff before marking a task done (see [AGENTS.md](../AGENTS.md)).

## How to review

- Read the actual diff (`git diff`, `gh pr diff`, etc.) and referenced files — never a summary of what changed.
- Tag every finding with a severity so real problems aren't buried under taste:
  - **Blocker** — must fix before merge: bug, regression, security issue, broken build/tests, violated repo convention, accidental edit to generated output.
  - **Important** — should fix: unclear naming, missing test for changed behavior, unhandled edge case, scope creep.
  - **Nit** — optional/taste. Keep these short and few.
- Cite every finding with `path/to/file.ts:line` (or range) so the author can jump to it.
- When you flag a problem, show the fix (snippet or concrete suggestion), not just the objection.

## Evaluate the changes

### If the PR contains documentation/text updates

- Identify spelling, grammar, and punctuation errors.
- Assess clarity, conciseness, and readability; suggest improvements.
- Ensure technical terminology is correct and standard.
- Check consistency of formatting, headings, bullets, and structure.
- Confirm the docs capture the intent and give clear instructions.

### If the PR contains code changes

- **Favor simplicity** — confirm the diff follows the least-code discipline and simplicity principles in [code-patterns.md](code-patterns.md#writing-the-least-code-laziness-ladder); flag violations (over-built code, large multi-job functions, hidden side effects, deep nesting, shared mutable state, single-caller abstractions, cleverness over a plain version).
- Analyze logic for bugs, inefficiencies, and security risks (OWASP-style: injection, XSS, unsafe deserialization, secrets in code).
- Check variable names, function structure, and error handling for clarity and correctness.
- Confirm edge-case handling — empty/null inputs, error paths, concurrency, cancellation, large inputs.
- Flag comments that restate the code or reference the current task/PR/issue. This repo's default is **no comments** — keep only those explaining a non-obvious _why_ (hidden constraint, subtle invariant, bug workaround).
- Flag scope creep: drive-by refactors, speculative abstractions, error handling for scenarios that cannot happen, back-compat shims for code with no external consumers. A bug fix should not ship with unrelated cleanup.
- Suggest an alternative implementation **only** for a concrete defect (bug, measurable perf issue, convention violation, or a clear simplicity win per above) — not stylistic preference.

### Test coverage

- Identify which changed behavior is currently untested.
- Recommend the test style appropriate to the package:
  - `@carbon/ai-chat` — Jest, specs under `packages/ai-chat/tests/spec/**/*_spec.ts(x)`.
  - `@carbon/ai-chat-components` — `@web/test-runner` for Lit components (colocated `__tests__/*.test.ts`) and Jest for the React wrappers.
  - `demo/` — Playwright under `demo/tests/`.
  - `examples/**` — Playwright smoke tests (see [../examples/references/playwright.md](../examples/references/playwright.md)).
- For UI changes, call out whether a visual/interaction check in the browser is required in addition to automated tests.

## Repo-specific checks

For each changed file, read every `AGENTS.md` on the path from its directory up to the repo root, plus any topic docs under their `references/` folders they link to — e.g. a change under `packages/ai-chat-components/src/components/audio-player/` is governed by [packages/ai-chat-components/AGENTS.md](../packages/ai-chat-components/AGENTS.md) then the root [AGENTS.md](../AGENTS.md). Rule definitions live in [code-patterns.md](code-patterns.md) and [conventions.md](conventions.md); this list is what to flag. Flag any of:

- **Over-engineering** — code the [laziness ladder](code-patterns.md#writing-the-least-code-laziness-ladder) would have avoided: dead code or unused flexibility (delete it), hand-rolled logic the stdlib ships, a dependency or code reinventing a native platform feature, an abstraction with a single caller (YAGNI), or logic expressible in fewer lines. Correctness and security stay in the sections above — this check is only about removable complexity.
- **New components added under `packages/ai-chat/src/chat/components-legacy/`** — that directory is closed to new components ([component placement](code-patterns.md#component-placement)).
- **Prefix / SCSS violations** — hardcoded `cds--`, missing `#{$prefix}--`, descendant nesting, or physical properties instead of logical ones for RTL ([naming & prefix discipline](code-patterns.md#naming--prefix-discipline-build-breaking), [SCSS authoring](code-patterns.md#scss-authoring)).
- **Conventional-commit format** on the PR title / squash commit ([commits](conventions.md#commits)).
- **Examples**: each example's README still satisfies the Indexer contract described in [examples/AGENTS.md](../examples/AGENTS.md).
- **Accessibility** on UI changes: keyboard navigation, focus management, ARIA roles/labels, color contrast, and RTL behavior. Carbon is a design system — a11y regressions are blockers.
- **Dependencies**: new or upgraded packages should be justified; flag peer-dep conflicts, duplicate functionality already available via existing deps, or license incompatibilities.

## Output expectations

- Open with a short **Summary** (2–4 sentences): overall assessment, strengths, highest-severity concerns.
- List findings grouped by severity (**Blocker**, **Important**, **Nit**), each with a `file:line` reference and a concrete suggested fix (code snippet when useful).
- End with a **Test / verification gaps** section if the diff lacks coverage for changed behavior.
- Keep a polite, constructive tone — note what the change does well, but don't let praise obscure real blockers.

## Related Guidance

For context on conventions being enforced:

- **Code-level patterns**: [code-patterns.md](code-patterns.md) - the laziness ladder & simplicity principles, prefix discipline, SCSS, RTL, component placement, comments
- **Process conventions**: [conventions.md](conventions.md) - commits, branches, license headers, hooks
- **General overview**: [AGENTS.md](../AGENTS.md) - Monorepo pointer index
- **Package-specific rules**: See AGENTS.md in each package directory
- **PR workflow**: [pr.md](pr.md) - How to draft PR descriptions

When reviewing, cross-reference these docs to understand the "why" behind conventions.
