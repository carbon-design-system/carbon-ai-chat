# repo-checks.md — the gates to run, and the conventions to flag by hand

Load this on every review before you write findings: it names the read-only gates that settle part of the diff for you, and the repo conventions no gate catches.

## Run the read-only gates

**Run the gates for what changed before you write anything, whenever you can run commands** — `lint`, `lint:dead`, `lint:license`, `lint:styles`, `validate:*`, `format`. A failure you watched outranks one you inferred.

**Start no build and no test run without asking the user first.** The rows in [definition-of-done.md](../../../../references/definition-of-done.md) all build, and a build races the watcher a developer probably has running. Ask when a build would turn a finding you would otherwise have to hedge into one you watched fail. Testing a suggestion before you post it is the usual case — [reviewing-a-pr.md](reviewing-a-pr.md) carries that ask. Report an unrun build as a stated gap.

## Flag the conventions no gate catches

For each changed file, read every `AGENTS.md` on the path from its directory up to the repo root, plus any topic docs under their `references/` folders they link to — e.g. a change under `packages/ai-chat-components/src/components/audio-player/` is governed by [packages/ai-chat-components/AGENTS.md](../../../../packages/ai-chat-components/AGENTS.md) then the root [AGENTS.md](../../../../AGENTS.md). Rule definitions live in [code-patterns.md](../../../../references/code-patterns.md) and [conventions.md](../../../../references/conventions.md); this list is what to flag. A convention finding links the rule it breaks — an anchor in one of those two files, or the governing `AGENTS.md`. No link, no finding: you are quoting a convention this repo may not have. Flag any of:

- **Logic trapped in a component** — parsing, formatting, validation, state transitions, or timing/geometry math written inside a React or Lit component instead of a plain module it could call ([framework-agnostic logic](../../../../references/code-patterns.md#framework-agnostic-logic)). The tell is a behavior you could only test by rendering.
- **New components added under `packages/ai-chat/src/chat/components-legacy/`** — that directory is closed to new components ([component placement](../../../../references/code-patterns.md#component-placement)).
- **Prefix / SCSS violations** — hardcoded `cds--`, missing `#{$prefix}--`, descendant nesting, or physical properties instead of logical ones for RTL ([naming & prefix discipline](../../../../references/code-patterns.md#naming--prefix-discipline-build-breaking), [SCSS authoring](../../../../references/code-patterns.md#scss-authoring)).
- **Accessibility** on UI changes: keyboard navigation, focus management, ARIA roles/labels, color contrast, and RTL behavior. Carbon is a design system — a11y regressions are blockers.
- **Dependencies**: new or upgraded packages should be justified; flag peer-dep conflicts, duplicate functionality already available via existing deps, or license incompatibilities.

## Related guidance

- [caic-review](../SKILL.md) — the rubric that runs these checks, and where the findings go
- [review-passes.md](review-passes.md) — read when briefing a pass: it hands each pass the `AGENTS.md` files governing its paths
- [evaluating-changes.md](evaluating-changes.md) — read alongside this file on a code diff: the correctness, simplicity, and coverage checklists
- [writing-findings.md](writing-findings.md) — read before filing a convention finding: a tool may already have decided it
