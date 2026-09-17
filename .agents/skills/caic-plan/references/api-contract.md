# api-contract.md — locking an API contract up front

The questions a contract has to settle before implementation starts, and how to write the answers down.

Load this when the work changes what a consumer can observe on the public surface — the Public API surface section of a plan in [caic-plan](../SKILL.md#what-goes-in-planmd).

## Define the contract up front

Lock the contract **in the plan, before implementation starts**. It sits after Done when and Decisions, so a reader meets the outcome and the choice before the API shape. Write it whenever a task changes what a consumer can observe on the public surface — anything exported from [packages/ai-chat/src/aiChatEntry.tsx](../../../../packages/ai-chat/src/aiChatEntry.tsx) or [packages/ai-chat/src/serverEntry.ts](../../../../packages/ai-chat/src/serverEntry.ts). A change with no signature change still qualifies: behavior is public too.

Start with the shape — the interfaces and type aliases added or altered, and the signature of every method put on the surface. Then the half the compiler can't hold.

Work the locks below while drafting. They are a checklist, not a layout — what reaches the plan and the proposal comment is the section described under **Writing it down**, not this grid. Which ones apply depends on the subject: a method takes them all, while a type-only change — a rename, a new optional field, a JSDoc fix — takes Defaults, Derivation, and Ownership, and answers the rest in the JSDoc you're proposing.

| Lock          | The question it settles                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Preconditions | What state must hold to call this, and what happens when it doesn't?                                    |
| No-op case    | Which inputs do nothing, and does the promise still resolve?                                            |
| Failure       | What rejects, what throws, what resolves carrying an error state — and which is which?                  |
| Events        | Which bus events fire, in what order, and which deliberately do not?                                    |
| Timing        | When the promise settles: on send, on ack, or on completion?                                            |
| Repeat calls  | Idempotent, coalesced, or queued? What does an overlapping caller get?                                  |
| Defaults      | Every optional field's value when omitted, and which layer merges it.                                   |
| Derivation    | For a state or enum a host can read: the rule producing **each** value, and which are unreachable today. |
| Announcement  | What does a screen reader hear, and where does focus land? See [accessibility.md](../../../../references/accessibility.md). |
| Ownership     | Which side does the work — the framework, or the host's callback?                                       |

Derivation is the lock that gets skipped, and it is the expensive one. A type can be right while every rule behind it is wrong.

## Writing it down

Answer in prose, and only where the answer bites. The reader lands on the proposal comment without this skill open, so a bare row label — `Derivation | N/A` — asks them to decode a term whose definition lives in a file they can't see. Write the finding instead: the state that must hold, the input that does nothing, what a screen reader hears.

Then close with a single line accounting for every lock you left out, naming them:

> Everything else is unchanged: no new events, no failure path, no new defaults, nothing derived, no consumer action.

That line is the point. It is what keeps silence from passing as an answer, and it is why a settled lock costs a clause rather than a table row. A lock you can't fit into that sentence is one you haven't settled — go settle it.

Reach for a table only when four or more locks genuinely move, and then put the question in the left column rather than the keyword. Ten rows of "Unchanged" around one real answer bury it, which is the claim-before-scaffolding failure [issue-bodies.md](../../caic-copy-writer/references/issue-bodies.md) covers for an issue body.

Locking shape _and_ behavior turns review into "does the code match the posted contract?" instead of a design debate inside the PR. The semver and JSDoc rules for that surface are canonical in [packages/ai-chat/AGENTS.md](../../../../packages/ai-chat/AGENTS.md) and [packages/ai-chat/src/types/AGENTS.md](../../../../packages/ai-chat/src/types/AGENTS.md) — link to them, don't restate them here.

## Posting the proposal

When the contract changes what a consumer can observe, post it on the issue as a comment before building, so the shape is visible while it is still cheap to change.

- **Write it the way Writing it down describes** — the shape, then the locks that bite, then the one line accounting for the rest. Link any ADR behind it.
- **Don't wait for replies.** Build once it is posted. An objection that arrives later gets answered in the thread, and the PR follows whatever the thread settles.
- **Keep the thread current.** When the shape you ship moves away from the proposal, say so in a follow-up comment. Review flags a PR that silently differs from its posted proposal.
- **Link it from the PR description**, so review can walk the diff against it.

An agent drafts every comment on the issue — the proposal into `.github/issue-drafts/<N>-api-proposal.md`, and each reply or follow-up after it — and posts one only after the user has read it and said go — the gate in [caic-issue](../../caic-issue/SKILL.md#before-anything-is-filed). "Don't wait" means don't wait for the team's reply; it never means skipping the user's go.

## Related guidance

- [caic-plan](../SKILL.md) — the plan whose Public API surface section this fills
- [caic-issue](../../caic-issue/SKILL.md) — the approval gate every comment on an issue goes through
- [caic-review](../../caic-review/SKILL.md) — walks the diff against the agreed contract
- [accessibility.md](../../../../references/accessibility.md) — what the Announcement lock has to satisfy
