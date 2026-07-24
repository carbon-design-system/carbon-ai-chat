---
name: caic-review
description: Review a working diff or a pull request against this repo's rubric — severity-tagged findings with file:line citations, repo-specific convention checks, test-coverage gaps, and optional line comments posted back to the PR. Use when the user asks to "review my diff", "review this branch", "review this PR", or "self-review before done", and for the self-review an agent runs on its own work before marking a task complete.
---

This rubric governs every code review in this repo — both user-requested reviews and the self-review an agent runs against its own diff before marking a task done (see [AGENTS.md](../../../AGENTS.md)).

## Scope the review first

Two jobs share this rubric. Settle which one you're doing before reading any code — ask the user when the request doesn't make it obvious:

- **Own work** — a self-review of the working diff before marking a task done. Findings come back as text; nothing is posted anywhere.
- **A pull request** — someone else's branch, or your own PR up for review. Findings can be posted as line comments with a verdict.

### On a PR, resolve the base branch before diffing

Never assume `main`. A PR usually targets `upstream/main`, but long-running integration branches are common here, and diffing against the wrong base buries the review under unrelated commits.

```bash
gh pr view <pr> --json baseRefName,headRefName,headRefOid,isCrossRepository,url
gh pr diff <pr>   # already scoped to the PR's real base
```

Use `gh pr diff`, or diff explicitly against the reported `baseRefName`. When the base is an integration branch rather than `main`, say so in the summary — it changes what is in scope and what counts as a regression.

## Posting a review on a PR

Line comments beat a wall of prose: they land next to the code they're about. Build the whole review as one payload and submit it once.

**Draft first, submit second. Never run a `gh` command that writes to GitHub before the user has seen the exact payload and said go.** Write it to `.github/pr-drafts/review-<pr>.json` (git-ignored), show the summary and findings, then wait.

```json
{
  "commit_id": "<headRefOid from gh pr view>",
  "event": "COMMENT",
  "body": "Summary — overall assessment and the highest-severity concerns.",
  "comments": [
    {
      "path": "packages/ai-chat/src/foo.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "**Blocker** — the early return skips the teardown; call `dispose()` before returning."
    }
  ]
}
```

```bash
gh api --method POST repos/<owner>/<repo>/pulls/<pr>/reviews --input .github/pr-drafts/review-<pr>.json
```

- **`event`** is `COMMENT` (feedback only), `APPROVE`, or `REQUEST_CHANGES`. Ask the user which — the verdict is theirs, not yours. GitHub rejects `APPROVE` and `REQUEST_CHANGES` on your own PR, so a self-authored PR can only take `COMMENT`.
- **`line`** is the line number in the file as of `commit_id`, and it must fall inside the diff. `side: "RIGHT"` is the post-change file; use `"LEFT"` for a removed line. For a range, add `start_line` (and `start_side`).
- A comment outside the diff hunks returns 422. Put that finding in the summary `body` rather than forcing a line onto it.

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

- Open with a short **Summary** (2–4 sentences): overall assessment, strengths, highest-severity concerns.
- List findings grouped by severity (**Blocker**, **Important**, **Nit**), each with a `file:line` reference and a concrete suggested fix (code snippet when useful).
- End with a **Test / verification gaps** section if the diff lacks coverage for changed behavior.
- Keep a polite, constructive tone — note what the change does well, but don't let praise obscure real blockers.

## Related guidance

For context on conventions being enforced:

- **Voice and tone**: [tone.md](../../../references/tone.md) — what to hold documentation and developer-facing copy to
- **Code-level patterns**: [code-patterns.md](../../../references/code-patterns.md) — the laziness ladder & simplicity principles, prefix discipline, SCSS, RTL, framework-agnostic logic, component placement, comments
- **Process conventions**: [conventions.md](../../../references/conventions.md) — commits, branches, license headers, hooks
- **General overview**: [AGENTS.md](../../../AGENTS.md) — monorepo pointer index
- **Package-specific rules**: see `AGENTS.md` in each package directory
- **PR workflow**: [caic-pr](../caic-pr/SKILL.md) — drafting PR descriptions
- **Plan-phase analog**: [plan-review.md](../caic-plan/references/plan-review.md) — the same discipline applied before code exists

When reviewing, cross-reference these docs to understand the "why" behind conventions.

Task input from the user, if any: $ARGUMENTS
