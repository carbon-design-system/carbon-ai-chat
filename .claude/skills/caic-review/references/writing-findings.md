# writing-findings.md — worked findings, the habits that weaken them, and what isn't a finding

Load this before you write the first finding of a review, and again whenever you can't tell whether an observation deserves to ship. The shape every finding takes lives in [caic-review](../SKILL.md#how-to-write-a-finding); this file is the judgment around it — how the words sound, what a finished finding looks like at each severity, and what stays unsaid.

## Cite the defect, and ship a fix with it

Cite a range when the defect spans lines, and show the fix as a snippet when words alone won't carry it. On a PR, a fix that replaces a line range ships as a `suggestion` block the author accepts in one click — [reviewing-a-pr.md](reviewing-a-pr.md). Never post the objection without the fix. When you genuinely can't name one, name the gap instead — "this drops the second update; whether that's a bug depends on whether the queue is ordered, and I didn't trace it." An objection with a stated gap is workable. An invented fix the author implements is not.

The consequence names the input or path that reaches the defect — "on every close", "when the list is empty" — not the category. A defect you can't trigger is a guess: drop it, or say what you didn't check.

## Hold your own words to the same standard as the diff's

Write your findings to [review-comments.md](../../caic-copy-writer/references/review-comments.md) and [tone.md](../../../../references/tone.md) — the standard you hold the diff's copy to. Three habits show up in reviews and all three go:

- **Hedging** — "I think", "it looks like", "consider possibly", "might be worth". Uncertainty is fine; say what you checked instead. "Read the happy path only — 60% sure this leaks."
- **Throat-clearing** — "just", "simply", "one small thing", "it is important to note". Delete the phrase; the sentence gets stronger.
- **Praise inside a finding** — "nice refactor, but…". A finding is the defect and the fix. The summary decides whether a strength is worth a line at all.

## Worked findings

**A leaked listener**

- Before: "I might be missing something, but I wonder if it could possibly be worth considering whether this early return may want to clean up the listener it registered above, since otherwise it seems like it might leak? Nice refactor overall though!"
- After: "**Context:** this early return is the already-closed guard, and the listener it skips past was registered a few lines above.

  **Blocker** — `packages/ai-chat/src/foo.ts:42` — the early return skips teardown, so the listener leaks on every close. Call `dispose()` before returning."

The other two severities, written the same way — orientation dropped here to show the diagnosis line alone:

- **Important** — `packages/ai-chat/src/chat/store/fooReducer.ts:88` — the reducer rebuilds every item, so one changed message re-renders the whole list. Copy the array and replace the one index.
- **Nit** — `packages/ai-chat/src/types/config/FooConfig.ts:12` — the JSDoc says "the timeout" with no unit, so a caller guesses seconds. Say "in milliseconds."

Cap the diagnosis at three sentences plus a snippet; the orientation line is not one of the three. A concern that outgrows that — a design direction, a pattern repeated across the diff — is not a line comment: give it one line in the summary and move on.

## What isn't a finding

Some observations feel like findings and aren't. These stay unsaid at every severity, not just Nit:

- **A tool already decided it.** Husky runs prettier, eslint, stylelint, and commitlint on what you commit ([commit hooks](../../../../references/conventions.md#commit-hooks)); `ci-check` adds license headers plus ADR, AGENTS, skill, and example-README validation. Formatting, quote style, import order, line length, and anything else a gate fails on are settled before you open the diff. commitlint settles commit format, not content — a body that buries or omits its why when the diff can't carry it is a **Nit**, citing [commit bodies](../../../../references/conventions.md#commit-bodies).
- **A naming swap with no clarity gain** — `data` → `payload`.
- **An equivalent style alternative** — `for` versus `.map`, ternary versus `if`.
- **"Add a comment here."** The repo's default is no comments ([comments](../../../../references/code-patterns.md#comments)). You are here to flag the ones that restate the code, not to ask for more. One narrow exception: the diff encodes a _why_ the code cannot show — a workaround for a named bug, a constraint from outside the file, an ordering that looks arbitrary and isn't. Ask for that line, and say what it has to record.
- **Speculative extraction** — "you might want to pull this out in case…". Scope creep counts from the reviewer's side too.
- **A different approach from the one the issue suggested.** An issue's Possible approaches are options, and the developer owns the choice. Judge the diff on whether it meets the outcomes and constraints, not on whether it took the suggested route. A route that is defective is still a finding — on its own merits.
- **Code the diff didn't touch.** A pre-existing problem is real and is not this PR's job — file an issue. Untouched code the diff _breaks_ is a different thing: a caller left on the old signature, a consumer of a changed default, a doc snippet that no longer runs. That is a regression, and a regression is a **Blocker** wherever it surfaces.

A pass — or a whole review — that surfaces nothing is finished, not failed. Say so and stop. Manufacturing a Nit to look thorough costs the author more than the silence would.

## Related guidance

- [caic-review](../SKILL.md) — the rubric these findings serve, and the finding shape itself
- [review-passes.md](review-passes.md) — read when splitting the review into passes: every pass writes its findings to this file
- [reviewing-a-pr.md](reviewing-a-pr.md) — read when the findings get posted: line anchors replace the `file:line` citation, and fixes ship as suggestions
- [review-comments.md](../../caic-copy-writer/references/review-comments.md) — read when wording a comment: who reads a finding and what it opens with
- [tone.md](../../../../references/tone.md) — voice and quick rules for every word this repo ships
