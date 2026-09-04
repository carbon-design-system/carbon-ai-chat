# adr-prose.md — ADR prose (type 11)

Load this before writing the body of a numbered ADR under `docs/adr/`. Structural owner: [caic-adr](../../caic-adr/SKILL.md) and [docs/adr/template.md](../../../../docs/adr/template.md), which own the sections, the option set, and the comment window.

**An ADR is read years later by someone who was not in the room**, and quoted back at an author in review. Write for both.

- **The Decision outcome is present tense, active voice, one decision.** This is the sentence people quote — make it precise enough to review a diff against. If it can be satisfied two incompatible ways, tighten it.
- **Link, never restate.** The epic's Expected outcomes, the issues, the superseded ADR — a copy drifts, and then someone argues with the stale version.
- **Claim before scaffolding.** Context is the material that supports the decision, so it stays shorter than the decision and its consequences.
- **Write for the cold reader.** Gloss an internal name the first time it appears, and say in the clause that links an epic or an issue what that link decided — years later, half of them will be closed.
- **Prose is the fallback, not the default.** Where [caic-adr](../../caic-adr/SKILL.md) says a section takes code — For consumers — words only carry what the snippets can't show.

## Gate

Review, against [adr-review.md](../../caic-adr/references/adr-review.md). The file is markdown, so `npm run reading-level -- docs/adr/<file>.md` gives a real number — but wording is the cheapest thing to fix after merge, and the option set is not, so never let a prose pass stand in for that review.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [caic-adr](../../caic-adr/SKILL.md) — the sections, the promotion test, and the comment window
- [adr-review.md](../../caic-adr/references/adr-review.md) — the fresh-eyes review an ADR closes with
