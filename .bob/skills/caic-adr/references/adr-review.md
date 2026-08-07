# adr-review.md — reviewing an architecture decision record

Load this when closing out an ADR draft (the `caic-adr` skill ends here), or when the user asks you to review one before it is opened as a PR.

An ADR is not a plan, and reviewing it like one produces the wrong findings. A plan asserts how something gets built, so its review verifies those assertions against the code. An ADR asserts **what breaks and what it costs** — and its expensive failures are an option that was never seriously considered, and a migration section that only covers the breakage a compiler catches.

This is the last cheap moment to disagree. Once the ADR is accepted, reversing it takes a superseding ADR and usually a release.

## Phase 1 — Sort the claims

Read it end to end, then put every assertion in one of three buckets. They get different treatment and mixing them is what makes ADR reviews useless.

- **Evidence** — checkable statements about the code today. "This field has no readers." "Only one member of the union narrows its discriminant." "Every write site hardcodes the same value." Verify these. They are load-bearing: an option's cost is usually derived from one of them, and a wrong one invalidates the comparison.
- **Cost** — what breaks for whom. "A host calling this gets a compile error." "Nothing fails to build; the UI goes quiet." Verify by finding who actually breaks — grep the examples, the demo, and the docs snippets. A cost claim nobody checked is how a migration section ends up half true.
- **Judgment** — which option should win. Not verifiable. Argue with it directly, and separate it from the two above so the author can tell a fact from an opinion.

## Phase 2 — Attack the options

The rejected options are the point of the document. Spend the review here.

1. **Is any rejected option a strawman?** Would someone who genuinely wanted that option recognize their own argument in it? If the strongest form of the case is missing, the ADR has not actually rejected anything — it has described a preference. Say what the strongest form would be.
2. **Is an option missing?** The most valuable finding a reviewer produces. Two rejected options is normal, and the third one nobody wrote down is where the good ideas hide. Look specifically for the middle path — the ADR usually poses a binary, and "do the cheap half now, revisit the rest" often beats both ends.
3. **Does each rejection name a specific cost?** "Worse" and "more complex" are not reasons. The next person to have the idea should learn something from the paragraph that killed it.
4. **Was any option ruled out on an unverified premise?** This is where Phase 1's evidence bucket pays off. An option rejected because "that field is load-bearing" dies for nothing if the field has no readers.

## Phase 3 — Check the decision holds together

- **One decision?** If the Decision outcome contains an "and", it is two ADRs, and an objection to either half will block both.
- **Is it precise enough to review a diff against?** Someone will hold a PR up to this sentence six months from now. If it can be satisfied two incompatible ways, tighten it.
- **Do the Consequences include costs?** An ADR listing only upsides is a pitch. Every real decision gives something up; if none is stated, either the author is selling or the decision is trivial.
- **Does `For consumers` cover the silent breakage?** The failure mode is a migration section that lists the compile errors and stops. Ask directly: is there any consumer who finds out from their UI rather than their build? That belongs in the first line.
- **Is the before/after code real?** Runnable, using types that actually exist. Invented shapes in a migration section get copied.

## Phase 4 — Check it against the spine

- The epic's Expected outcomes are how anyone confirms this shipped. The ADR must **link** them, not restate them. A copy drifts.
- If work is already in flight under this decision, does the ADR match what the epic and issues say? A mismatch means one of them is stale, and it is usually not the ADR.
- If this supersedes an accepted ADR, is `supersedes` set on this one and `superseded-by` set on the old one? A one-sided link is invisible from the side people arrive on.

## Phase 5 — Write it up

Four sections, in this order:

1. **Options** — strawmen, missing alternatives, rejections resting on nothing. Lead here; it is what changes the ADR.
2. **Verified vs. contradicted evidence** — ✅ / ⚠️ / ❌ per claim, with file-and-line citations. Lead with ❌.
3. **Consumer cost** — what the migration section misses, especially silent breakage.
4. **Open questions** — ≤ 5, each with concrete options, asked one at a time.

Then bake the resolutions into the ADR. The deliverable is a mergeable ADR, not a critique beside it.

## Anti-patterns

- **Reviewing it as a plan.** Asking an ADR for file paths and step ordering pushes it into work it should not contain, and the sequencing belongs to a plan that may not exist yet.
- **Approving because the winner is right.** The chosen option being correct does not make the record good. A right decision with a strawman alternative still loses the argument the next time someone reopens it.
- **Nitpicking prose while the option set goes unchallenged.** Wording is cheap to fix after merge. A missing option is not.
- **Treating the comment window as the review.** The window is for people who were not in the room. An ADR should be right before it merges, not repaired by strangers.

## Related guidance

- [caic-adr](../SKILL.md) — the authoring workflow this review closes out
- [plan-review.md](../../caic-plan/references/plan-review.md) — the same discipline for a plan, and the level selector that routes here
- [caic-review](../../caic-review/SKILL.md) — the same discipline applied to a diff
