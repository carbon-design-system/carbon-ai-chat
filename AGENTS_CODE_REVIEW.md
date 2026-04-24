This rubric governs every code review in this repo — both reviews the user explicitly requests and the self-review an agent performs against its own diff before marking a task done (see [AGENTS.md](AGENTS.md)).

## How to review

- Read the actual diff (`git diff`, `git diff --stat`, `gh pr diff`, etc.) and any referenced files. Do not rely on the author's or your own summary of what changed — verify.
- Grade every finding with a severity tag so real problems don't get buried under taste:
  - **Blocker** — must fix before merge: bug, regression, security issue, broken build/tests, violated repo convention, accidental edit to generated output.
  - **Important** — should fix: unclear naming, missing test for changed behavior, unhandled edge case, scope creep.
  - **Nit** — optional/taste. Keep these short and few.
- Cite every finding with `path/to/file.ts:line` (or a line range) so the author can jump straight to it.
- Be constructive and specific: when you flag a problem, show the fix (a diff snippet or concrete suggestion), not just the objection.

## Evaluate the changes

### If the PR contains documentation/text updates

- Identify spelling errors, grammatical mistakes, and punctuation issues.
- Assess clarity, conciseness, and readability — suggest improvements where necessary.
- Ensure technical terminology is correct and conforms to industry standards.
- Check for consistency in formatting, headings, bullet points, and structure.
- Evaluate whether the documentation fully captures the intent and gives readers clear instructions.

### If the PR contains code changes

- Ensure the code is readable, efficient, and maintainable.
- Analyze the logic for bugs, inefficiencies, and security risks (OWASP-style: injection, XSS, unsafe deserialization, secrets in code, etc.).
- Check variable names, function structure, and error handling for clarity and correctness.
- Confirm proper handling of edge cases — empty/null inputs, error paths, concurrency, cancellation, large inputs.
- Flag comments that merely restate the code or reference the current task/PR/issue. This repo's default is **no comments**; only keep comments that explain a non-obvious _why_ (hidden constraint, subtle invariant, workaround for a specific bug).
- Flag scope creep: drive-by refactors, speculative abstractions, added error handling for scenarios that cannot happen, backwards-compatibility shims for code that has no external consumers. A bug fix should not ship with unrelated cleanup.
- Suggest an alternative implementation **only** when the current one has a concrete defect (bug, measurable perf issue, violates convention). Do not recommend rewrites for stylistic preference.

### Test coverage

- Identify which changed behavior is currently untested.
- Recommend the test style appropriate to the package:
  - `@carbon/ai-chat` — Jest, specs under `packages/ai-chat/tests/spec/**/*_spec.ts(x)`.
  - `@carbon/ai-chat-components` — `@web/test-runner` for Lit components (colocated `__tests__/*.test.ts`) and Jest for the React wrappers.
  - `demo/` — Playwright under `demo/tests/`.
  - `examples/**` — Jest smoke tests where present.
- For UI changes, call out whether a visual/interaction check in the browser is required in addition to automated tests.

## Repo-specific checks

Cross-reference against [AGENTS.md](AGENTS.md) and the nearest package-level `AGENTS.md`. Flag any of:

- **License headers** missing on new source files. Enforced by `npm run lint:license`, which is part of `ci-check` but **not** the pre-commit hook — easy to miss.
- **Release notes** not updated in [docs/release-notes.md](docs/release-notes.md) for a user-facing change.
- **Hand-edits to generated output**: `dist/`, `es/`, `es-custom/`, `storybook-static/`, `packages/ai-chat-components/react/`, `packages/ai-chat-components/custom-elements.json`, `telemetry.yml` files. These are regenerated (`npm run custom-elements`, `npm run telemetry:config`).
- **New components added under `packages/ai-chat/src/chat/components-legacy/`** — that directory is closed to new components; new UI belongs in `components/` or lifted to `@carbon/ai-chat-components`.
- **SCSS violations**: missing `#{$prefix}--` prefix, descendant nesting, physical properties (`padding-left`, `right`, etc.) instead of logical properties (`padding-inline-start`, `inset-inline-end`) that are required for RTL.
- **Conventional-commit format** on the PR title / squash commit (`build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test`, header ≤ 72 chars, imperative lowercase subject, no trailing period).
- **Examples**: each example's README still satisfies the Indexer contract described in [examples/AGENTS.md](examples/AGENTS.md).
- **Accessibility** on UI changes: keyboard navigation, focus management, ARIA roles/labels, color contrast, and RTL behavior. Carbon is a design system — a11y regressions are blockers.
- **Dependencies**: new or upgraded packages should be justified; flag peer-dep conflicts, duplicate functionality already available via existing deps, or license incompatibilities.

## Output expectations

- Open with a short **Summary** (2–4 sentences): overall assessment, strengths, highest-severity concerns.
- List findings grouped by severity (**Blocker**, **Important**, **Nit**), each with a `file:line` reference and a concrete suggested fix (code snippet when useful).
- End with a **Test / verification gaps** section if the diff lacks coverage for changed behavior.
- Maintain a polite, constructive tone. Balance critical analysis with acknowledgement of what the change does well — but do not pad with praise that obscures real blockers.

## Related Guidance

For context on conventions being enforced:

- **General conventions**: [AGENTS.md](AGENTS.md) - Monorepo-wide rules
- **Package-specific rules**: See AGENTS.md in each package directory
- **PR workflow**: [AGENTS_PR.md](AGENTS_PR.md) - How to draft PR descriptions

When reviewing, cross-reference these docs to understand the "why" behind conventions.
