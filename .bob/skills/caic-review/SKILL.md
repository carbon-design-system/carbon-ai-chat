---
name: caic-review
description: Review a working diff or a pull request against this repo's rubric — severity-tagged findings with file:line citations, repo-specific convention checks, test-coverage gaps, and optional line comments posted back to the PR. Use when the user asks to "review my diff", "review this branch", "review this PR", or "self-review before done", and for the self-review an agent runs on its own work before marking a task complete.
---

This rubric governs every code review in this repo — both user-requested reviews and the self-review an agent runs against its own diff before marking a task done (see [AGENTS.md](../../../AGENTS.md)).

## Scope the review first

Two jobs share this rubric. Settle which one you're doing before reading any code — ask the user when the request doesn't make it obvious:

- **Own work** — a self-review of the working diff before marking a task done. Findings come back as text; nothing is posted anywhere.
- **A pull request** — someone else's branch, or your own PR up for review. Findings can be posted as line comments with a verdict. Read [reviewing-a-pr.md](references/reviewing-a-pr.md) before you diff: it carries base-branch resolution and the posting payload.

## How to review

- Read the actual diff (`git diff`, `gh pr diff`, etc.) and referenced files — never a summary of what changed.
- Open the issue the PR closes and walk its acceptance criteria against the diff. A criterion the diff contradicts is a **Blocker** until the issue carries an amendment saying so.
- If the issue or its epic cites an ADR, read that ADR's Decision outcome and walk the diff against it too. A diff that contradicts an accepted ADR is a **Blocker** until a new ADR supersedes it — an implementation PR is not where a recorded decision gets reversed.
- Tag every finding with a severity so real problems aren't buried under taste:
  - **Blocker** — must fix before merge: bug, regression, security issue, broken build/tests, violated repo convention, accidental edit to generated output.
  - **Important** — should fix: unclear naming, missing test for changed behavior, unhandled edge case, scope creep.
  - **Nit** — optional/taste. Keep these short and few.

## How to write a finding

One shape, one order — severity, the defect, what it costs, the fix:

```
**<Severity>** — `path/to/file.ts:42` — <what is wrong>, so <what it costs>. <The fix.>
```

Cite a range when the defect spans lines, and show the fix as a snippet when words alone won't carry it. Never post the objection without the fix. In a line comment on a PR, the `path` and `line` fields carry the citation — drop it from the body and keep the rest of the order.

Hold your own words to [tone.md](../../../references/tone.md) — the same standard you hold the diff's copy to. Three habits show up in reviews and all three go:

- **Hedging** — "I think", "it looks like", "consider possibly", "might be worth". Uncertainty is fine; say what you checked instead. "Read the happy path only — 60% sure this leaks."
- **Throat-clearing** — "just", "simply", "one small thing", "it is important to note". Delete the phrase; the sentence gets stronger.
- **Praise inside a finding** — "nice refactor, but…". Strengths go in the summary. A finding is the defect and the fix.

**A leaked listener**

- Before: "I might be missing something, but I wonder if it could possibly be worth considering whether this early return may want to clean up the listener it registered above, since otherwise it seems like it might leak? Nice refactor overall though!"
- After: "**Blocker** — `packages/ai-chat/src/foo.ts:42` — the early return skips teardown, so the listener leaks on every close. Call `dispose()` before returning."

Cap a finding at three sentences plus a snippet. A concern that outgrows that — a design direction, a pattern repeated across the diff — is not a line comment: give it one line in the summary and move on.

## Evaluate the changes

### If the PR contains documentation/text updates

- Hold developer-facing copy to [tone.md](../../../references/tone.md) — voice, word economy, and the cuts it asks for.
- Identify spelling, grammar, and punctuation errors.
- Assess clarity, conciseness, and readability; suggest improvements.
- Ensure technical terminology is correct and standard.
- Check consistency of formatting, headings, bullets, and structure.
- Confirm the docs capture the intent and give clear instructions.

### If the PR contains code changes

- **Favor simplicity** — confirm the diff follows the least-code discipline and simplicity principles in [code-patterns.md](../../../references/code-patterns.md#writing-the-least-code-laziness-ladder); flag violations (over-built code, large multi-job functions, hidden side effects, deep nesting, shared mutable state, single-caller abstractions, cleverness over a plain version).
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
  - `examples/**` — Playwright smoke tests (see [playwright.md](../../../examples/references/playwright.md)).
- For UI changes, call out whether a visual/interaction check in the browser is required in addition to automated tests.
- **If you support browser automation or visual inspection, use it** rather than only recommending it — load the change and look at it. Visual verification catches styling, layout, focus, and interaction regressions that reading a diff cannot.

## Repo-specific checks

For each changed file, read every `AGENTS.md` on the path from its directory up to the repo root, plus any topic docs under their `references/` folders they link to — e.g. a change under `packages/ai-chat-components/src/components/audio-player/` is governed by [packages/ai-chat-components/AGENTS.md](../../../packages/ai-chat-components/AGENTS.md) then the root [AGENTS.md](../../../AGENTS.md). Rule definitions live in [code-patterns.md](../../../references/code-patterns.md) and [conventions.md](../../../references/conventions.md); this list is what to flag. Flag any of:

- **Over-engineering** — code the [laziness ladder](../../../references/code-patterns.md#writing-the-least-code-laziness-ladder) would have avoided: dead code or unused flexibility (delete it), JS re-creating what CSS or a native element/browser API already does, a dependency duplicating Carbon or an existing one, an abstraction with a single caller (YAGNI), or logic expressible in fewer lines. Correctness and security stay in the sections above — this check is only about removable complexity.
- **Logic trapped in a component** — parsing, formatting, validation, state transitions, or timing/geometry math written inside a React or Lit component instead of a plain module it could call ([framework-agnostic logic](../../../references/code-patterns.md#framework-agnostic-logic)). The tell is a behavior you could only test by rendering.
- **New components added under `packages/ai-chat/src/chat/components-legacy/`** — that directory is closed to new components ([component placement](../../../references/code-patterns.md#component-placement)).
- **Prefix / SCSS violations** — hardcoded `cds--`, missing `#{$prefix}--`, descendant nesting, or physical properties instead of logical ones for RTL ([naming & prefix discipline](../../../references/code-patterns.md#naming--prefix-discipline-build-breaking), [SCSS authoring](../../../references/code-patterns.md#scss-authoring)).
- **Conventional-commit format** on the PR title / squash commit ([commits](../../../references/conventions.md#commits)).
- **Examples**: each example's README still satisfies the Indexer contract described in [examples/AGENTS.md](../../../examples/AGENTS.md).
- **Accessibility** on UI changes: keyboard navigation, focus management, ARIA roles/labels, color contrast, and RTL behavior. Carbon is a design system — a11y regressions are blockers.
- **Dependencies**: new or upgraded packages should be justified; flag peer-dep conflicts, duplicate functionality already available via existing deps, or license incompatibilities.

## Output expectations

- **Lead the summary with the verdict on one line** — ship, fix blockers, or rework — before any context. Then 2–3 sentences: what the change does well, and the highest-severity concerns.
- List findings grouped by severity (**Blocker**, **Important**, **Nit**), each written to the shape above.
- **Cap the review at ten findings**, highest severity first. Drop Nits first, then Importants, and name the drop in one summary line: "12 further Nits (naming, comment wording) not listed." A review nobody finishes fixes nothing, and a silent cut reads as full coverage.
- Carry design-level concerns in the summary too, one line each — they are what a finding overflows into.
- End with a **Test / verification gaps** section if the diff lacks coverage for changed behavior.

## Related guidance

For context on conventions being enforced:

- **Voice and tone**: [tone.md](../../../references/tone.md) — what to hold documentation and developer-facing copy to, and the comments you write about it
- **Code-level patterns**: [code-patterns.md](../../../references/code-patterns.md) — the laziness ladder & simplicity principles, prefix discipline, SCSS, RTL, framework-agnostic logic, component placement, comments
- **Process conventions**: [conventions.md](../../../references/conventions.md) — commits, branches, license headers, hooks
- **General overview**: [AGENTS.md](../../../AGENTS.md) — monorepo pointer index
- **Package-specific rules**: see `AGENTS.md` in each package directory
- **Reviewing a PR**: [reviewing-a-pr.md](references/reviewing-a-pr.md) — base branch, the review payload, and the `gh` call
- **PR workflow**: [caic-pr](../caic-pr/SKILL.md) — drafting PR descriptions
- **Plan-phase analog**: [plan-review.md](../caic-plan/references/plan-review.md) — the same discipline applied before code exists

When reviewing, cross-reference these docs to understand the "why" behind conventions.

Task input from the user, if any: $ARGUMENTS
