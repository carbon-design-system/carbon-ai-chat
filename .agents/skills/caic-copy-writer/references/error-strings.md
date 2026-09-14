# error-strings.md — thrown errors and console messages (type 12)

Load this before writing the text of a `throw new Error(...)`, a `consoleError`, or a `consoleWarn` anywhere under `packages/*/src/**`.

**The only copy a consumer reads without opening the docs or the source.** A host developer hits it at runtime, in a console, next to a stack trace and nothing else — so it carries no page around it, no signature above it, and no chance to ask a follow-up.

- **Name what the caller did, not what the code found.** "Input is not currently rendered" tells them the state; "Call `requestInputFocus` after the chat mounts" tells them the fix. Say both, fix last.
- **Public names in the message, internal names never.** The symbol a host can act on belongs in the text; a private field, a reducer, or a file path names something they cannot reach.
- **One sentence, no period-less fragments.** This is not [ui-strings.md](ui-strings.md) — the reader is a developer mid-debug, and a full sentence reads faster in a console than a label does.
- **The helpers own the prefix, in the package that has them.** In `@carbon/ai-chat`, `consoleError` and `consoleWarn` ([miscUtils.ts](../../../../packages/ai-chat/src/chat/utils/miscUtils.ts)) prepend `[Chat]`, so never write it into the message and never reach for bare `console.*`. `@carbon/ai-chat-components` ships no such helpers and prefixes per module, so match the file you are editing.
- **Say what the chat did next.** Whether it recovered, dropped the message, or fell back decides whether the reader has a bug to chase.

**A thrown message is closer to [public-jsdoc.md](public-jsdoc.md) than to [internal-comments.md](internal-comments.md).** Both sit in the source; only one is read by someone who cannot see it.

## Before and after

- Before: `throw new Error('Input is not currently rendered')`
- After: `throw new Error('The input is not rendered yet. Call this after the chat has mounted.')`

- Before: `consoleError('Error calling onError')`
- After: `consoleError('The onError handler threw, so the chat swallowed it and continued.')`

## Gate

Review, plus the `packages/ai-chat/` rows in [definition-of-done.md](../../../../references/definition-of-done.md). Nothing enforces this text — it is TypeScript, so `reading-level` does not apply and [revision-pass.md](revision-pass.md) does the whole job by hand.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [code-patterns.md](../../../../references/code-patterns.md) — error handling is one of the things never traded for fewer lines
- [ui-strings.md](ui-strings.md) — the other runtime-visible copy, written for a person instead
