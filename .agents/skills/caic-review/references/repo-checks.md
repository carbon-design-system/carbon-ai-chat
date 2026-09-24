# repo-checks.md — gates and repo rules

Load this before writing findings. Choose the gates for this diff and check rules no gate catches.

## Run the read-only gates

**Choose gates by the changed paths and behavior.** Use [definition-of-done.md](../../../../references/definition-of-done.md) and each package's test guide. Guidance-only edits need guidance checks, not package builds. Choose from checks such as `lint`, `lint:license`, `lint:styles`, `validate:*`, and `format`. Run `lint:dead` when its trigger applies.

**Reuse checks for the same code and setup.** Record the command, revision or working-tree state, result, and limits. Rerun when edits, failures, or open risks make the old result stale. A review alone does not make it stale.

**Coordinate builds and watchers before starting them.** Follow the root [AGENTS.md](../../../../AGENTS.md) and reuse the user's current answer. This includes tests that launch a build, such as the demo's Playwright server. Tests that do not build need no blanket approval. State which checks were blocked or not run.

## Flag the rules no gate catches

**Read the governing AGENTS chain**, from the repo root down to each changed file's directory. Reuse files already loaded. Follow a topic link only when its trigger fits the changed paths or behavior. An audio-player edit loads the root and [components package AGENTS.md](../../../../packages/ai-chat-components/AGENTS.md). Then read the component or test guides the edit calls for.

**Cite the rule behind a convention finding.** Use its governing `AGENTS.md`, [code-patterns.md](../../../../references/code-patterns.md), or [conventions.md](../../../../references/conventions.md). Without a source, do not claim a preference is a repo rule. Flag any of:

- **Logic trapped in a component** — parsing, formatting, validation, state changes, or timing/geometry math belong in a plain module. See [framework-agnostic logic](../../../../references/code-patterns.md#framework-agnostic-logic). Flag logic you could only test by rendering.
- **New components added under `packages/ai-chat/src/chat/components-legacy/`** — that directory is closed to new components ([component placement](../../../../references/code-patterns.md#component-placement)).
- **Prefix / SCSS violations** — hardcoded `cds--`, missing `#{$prefix}--`, descendant nesting, or physical properties instead of logical ones for RTL ([naming & prefix discipline](../../../../references/code-patterns.md#naming--prefix-discipline-build-breaking), [SCSS authoring](../../../../references/code-patterns.md#scss-authoring)).
- **Accessibility** on UI changes: keyboard navigation, focus management, ARIA roles/labels, color contrast, and RTL behavior. Carbon is a design system — a11y regressions are blockers.
- **Dependencies**: new or upgraded packages need a reason. Flag peer-dep conflicts, duplicate functions in existing deps, or license conflicts.

## Related guidance

- [caic-review](../SKILL.md) — the rubric that runs these checks, and where the findings go
- [review-passes.md](review-passes.md) — read when briefing a pass: it hands each pass the `AGENTS.md` files governing its paths
- [evaluating-changes.md](evaluating-changes.md) — read alongside this file on a code diff: the correctness, simplicity, and coverage checklists
- [writing-findings.md](writing-findings.md) — read before filing a convention finding: a tool may already have decided it
