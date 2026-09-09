# ui-strings.md — strings the chat shows a person (type 6)

Load this before adding or rewording a key in `packages/ai-chat/src/chat/languages/en.json`. **The only type whose reader is not a developer**, and no other file in this repo states a voice for them, so this one does.

Someone is mid-conversation with an assistant and needs the label to land at a glance.

- **Fragments over sentences.** This is the type where that rule bites hardest; [tone.md](../../../../references/tone.md#tone--flexes-with-context) carries the worked example.
- **No developer jargon.** No `structuredData`, no "payload", no "request failed with status" — name what happened to the person, not what happened to the code.
- **ICU placeholders survive rewording.** `{assistantName}`, `{max}`, and `{shortcut}` keep their exact spelling, and the sentence has to read correctly for anything they expand to.
- **`aria` and announcement strings are heard, not seen.** With no layout around them, name the thing and then its state, stay near ten words, and never lean on an adjacent label. [accessibility.md](../../../../references/accessibility.md#screen-readers--live-regions--announcements) owns the announcer plumbing, not the wording.

## An edit here is never "just copy"

[LanguagePack.ts](../../../../packages/ai-chat/src/types/config/LanguagePack.ts) declares `export type LanguagePack = typeof enLanguagePack` over that file, so the JSON *is* a public type source: adding a key widens `PublicConfig.strings`, and renaming or removing one breaks consumers. There is a single locale file — hosts translate through `PublicConfig.strings` — so this gates on types, not on locale parity.

## Before and after

- Before: "An error occurred while your request was being processed. Please try again at a later time."
- After: "Something went wrong. Try again."

## Gate

The `packages/ai-chat/` rows in [definition-of-done.md](../../../../references/definition-of-done.md), treating the key set as public API. The file is JSON, so `reading-level` does not apply and [revision-pass.md](revision-pass.md) does the whole job by hand — at its strictest.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [accessibility.md](../../../../references/accessibility.md) — what an announced string owes a screen-reader user
- [public-jsdoc.md](public-jsdoc.md) — the type rules that follow a widened `PublicConfig.strings`
