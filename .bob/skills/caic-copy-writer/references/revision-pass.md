# revision-pass.md — the revision pass and word economy (every type)

Load this at step 4 of the loop, on every draft — including one whose reading-level score came back green. It is the only part of [caic-copy-writer](../SKILL.md) that binds all thirteen copy types, plus the git-ignored working docs that have no row of their own: plan files, review write-ups, and session notes.

Seven rules, all checkable by reading. The first six tighten sentences; the seventh orders the document.

| Rule | Binds |
| --- | --- |
| Procedural sentences ≤ 20 words, descriptive ≤ 25 | all |
| One instruction per sentence | 3, 5, 6, 8–12 |
| Noun clusters ≤ 3 words — "chat instance config object" becomes "the config for a chat instance" | all |
| Conditional clause first — "If the chat is closed, call…", not "Call… if the chat is closed" | 1, 3, 5, 6, 12, 13 |
| A finite verb over an `-ing` form | all |
| Keep the articles; don't write telegraphically | all |
| Claim before scaffolding — see below | all |

**Strictness is routed, not uniform.** Hardest on type 6, then 3 and 5, then 8–11, where the reader skims to decide whether the document concerns them at all. Softest on type 1, where a hedge can be the specification.

## Claim before scaffolding

Put the claim ahead of the material supporting it: a JSDoc block opens with what the symbol is for, a docs page with the task, an issue with the ask, a commit body with the problem, an ADR with the decision. Then keep the section carrying the ask **larger than** Background, Out of scope, and Related. A 57-word Goal sitting under 200 words of Background, beside a 221-word Out of scope, is a document that buries what it wants.

**`reading-level` is blind to this rule.** It scores sentence length and syllables, and nothing else. A buried lede scores exactly like a front-loaded one, and a document four times longer than its subject warrants scores exactly like a tight one. **A grade under the ceiling is not evidence that the copy is tight.** Order and length are checked by reading, or not at all.

## Word economy

Length hides the idea. Cut until only the idea is left.

- **One idea per sentence.** If a sentence has two "and"s, split it.
- **Delete filler.** Common offenders and their fixes:

  | Wordy                           | Tight       |
  | ------------------------------- | ----------- |
  | in order to                     | to          |
  | is able to / has the ability to | can         |
  | there is an X that              | X           |
  | due to the fact that            | because     |
  | please note that                | _(delete)_  |
  | utilize / make use of           | use         |
  | in the event that               | if          |
  | a number of                     | some / many |

- **Cut throat-clearing.** "It is important to note," "as you can see," "basically," "simply" — delete them and the sentence is stronger.
- **Prefer the verb over the noun phrase.** "configure the launcher," not "perform configuration of the launcher."

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table that says which type you are writing, and the loop this pass sits in
- [tone.md](../../../../references/tone.md) — the voice and quick rules underneath these mechanics
- [caic-review](../../caic-review/SKILL.md) — holding a diff's copy to this pass
