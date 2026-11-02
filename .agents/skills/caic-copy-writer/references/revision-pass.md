# revision-pass.md: the revision pass and word economy (every type)

Load this at step 4 of the loop, on every draft, including one whose reading-level score came back green. Apply it alongside [the shared skim-reading rule](../SKILL.md#write-for-readers-who-skip-to-code) to all copy, including git-ignored working docs such as plan files and session notes.

## How to revise

A model picks the wording that fits the most readers and subjects. A person writes for one reader and one subject. Most of what this file cuts is that default: a sentence that signals importance instead of adding a fact, or a shape applied everywhere. Look for the default, and you'll catch tells this file doesn't name.

1. **Mark before you edit.** Read the whole draft once and mark each problem, strongest first. Check paragraph shape too: the same closer after every section, or three parallel examples, is one tell at a larger scale.
2. **Test each sentence.** Keep a sentence only if it gives the reader something they don't already have, from earlier in the text or from the context they arrive with.
3. **Rewrite around the point.** Restate the paragraph around its main claim. Swapping flagged phrases one at a time keeps the old shape.
4. **Check the facts both ways.** Compare the revision with the draft. Add no default, version, number, or behavior the source doesn't support. Drop no qualifier, failure, or limit that carries the contract. Merges and cuts lose facts most often.
5. **Re-scan for survivors.** Contrasts, closers, and dashes outlive a rewrite most often. Search for them once more.

**Weigh the evidence.** Act on [staged prose](#staged-prose) at one sighting. A weak tell, such as one hedge or one passive sentence, needs company in the same passage before it earns an edit or a review Nit.

**Leave alone** quotations, titles, names, and text that discusses a phrase rather than uses it. Keep repetition the writer chose for parallel structure.

## Sentence rules

Seven rules, all checkable by reading. The first six tighten sentences; the seventh orders the document.

| Rule | Binds |
| --- | --- |
| Procedural sentences ≤ 20 words, descriptive ≤ 25 | all |
| One instruction per sentence | 3, 5, 6, 8 to 12 |
| Noun clusters ≤ 3 words: "chat instance config object" becomes "the config for a chat instance" | all |
| Conditional clause first: "If the chat is closed, call…", not "Call… if the chat is closed" | 1, 3, 5, 6, 12, 13 |
| A finite verb over an `-ing` form | all |
| Keep the articles; don't write telegraphically | all |
| Claim before scaffolding (see below) | all |

**Strictness varies by type.** Hardest on type 6, then 3 and 5, then 8 to 11, where the reader skims to decide whether the document concerns them at all. Softest on type 1, where a hedge can be the specification.

## Claim before scaffolding

Put the claim ahead of the material supporting it: a JSDoc block opens with what the symbol is for, a docs page with the task, an issue with the problem it fixes, a commit body with the problem, an ADR with the decision. **Type 14 carves out its opening and nothing more.** A review finding opens with one line on what the code does, because its reader has none of the code open. [review-comments.md](review-comments.md) owns that opening. The defect follows immediately, the rest of the finding obeys this rule, and a review summary obeys it whole. Then keep the section carrying the ask **larger than** Background, Out of scope, and Related. A 57-word Goal sitting under 200 words of Background, beside a 221-word Out of scope, buries what the document wants.

**`reading-level` is blind to this rule.** It scores sentence length and syllables, and nothing else. A buried lede scores exactly like a front-loaded one, and a document four times longer than its subject warrants scores exactly like a tight one. **A grade under the ceiling is not evidence that the copy is tight.** Order and length are checked by reading, or not at all.

## Staged prose

These lines add weight without adding a claim. Fix each one on sight.

| Tell | Looks like | Fix |
| --- | --- | --- |
| Not X but Y | "It's not a wrapper, it's a contract." Also split ("This doesn't mean X. It means Y.") or clipped (", no guessing") | State Y. Keep the contrast only when the reader actually believes X |
| Closer or aphorism | A one-line paragraph that restates the last one; a saying in place of a claim | Cut a restatement. If the line carries a reason, state the reason plainly |
| Run-up | "Here's the thing:", "Let's look at", "Quick note:" | Start with the point |
| Arguing with no one | "To be clear", "This isn't about X", an option raised only to be rejected | Cut it and keep any real claim inside. Keep an option a reader would actually propose, such as an ADR alternative |

- Before: "Caps keep reviews short. A review nobody finishes fixes nothing."
- After: "Caps keep reviews short enough that authors finish reading them."

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
  | serves as / acts as             | is          |
  | leverage                        | use         |

- **Cut throat-clearing.** "It is important to note," "as you can see," "basically," "simply": delete them and the sentence is stronger.
- **Prefer the verb over the noun phrase.** "configure the launcher," not "perform configuration of the launcher."

## Related guidance

- [caic-copy-writer](../SKILL.md): the routing table that says which type you are writing, and the loop this pass sits in
- [tone.md](../../../../references/tone.md): the voice and quick rules underneath these mechanics, including the dash rule
- [caic-review](../../caic-review/SKILL.md): holding a diff's copy to this pass
