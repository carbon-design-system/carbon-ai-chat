# api-contract.md — settling a public contract

Read this when a plan leaves key public behavior open. Put the proposal under [Public API surface](../SKILL.md#what-goes-in-planmd) in the plan.

## Define the contract up front

**Propose open choices that affect consumers.** These include a new public method, changed defaults, a breaking change, who calls a callback, or event order. The type signature need not change.

**Reuse settled decisions.** A JSDoc wording fix, an approved contract, or a fix that restores promised behavior needs no new proposal. Cite the contract and check the change against it. If docs and code disagree, settle which behavior is intended before changing it.

Define the new shape and how it behaves. Use the questions that affect the change; skip the rest.

| Concern | Question |
| --- | --- |
| Inputs and no-op | Which inputs or states do nothing, and what does the caller get back? |
| Failure | What rejects, throws, or resolves with an error state? |
| Events and timing | Which events fire, in what order, and when does a promise settle? |
| Repeat calls | Do repeat calls have the same effect, combine, or queue? |
| Defaults and state | What happens when a field is left out, and what produces each state a host can read? |
| Accessibility | What is announced, and where does focus land? |
| Ownership | What does the framework do, and what must the host callback do? |

Use [accessibility.md](../../../../references/accessibility.md) for changes to announcements or focus. The public-type rules remain in [packages/ai-chat/src/types/AGENTS.md](../../../../packages/ai-chat/src/types/AGENTS.md).

## Writing it down

Lead with the proposed behavior and why the choice matters. Add the signatures and cases that show how the options differ. A short section can settle one changed default; a larger contract may need a table.

State what stays the same only when a reader might infer a change. Skip unrelated concerns. Tie affected criteria to the proposal and its proof.

Settle choices that affect what you build before starting that work. Reuse the user's prior choices and approval. Work on other parts while a needed answer is pending.

## Posting the proposal

**Keep local work moving with a local proposal.** You do not need an issue or posted comment to do work the user approved.

When the user asks to publish the proposal:

1. Draft the comment in `.github/issue-drafts/<N>-api-proposal.md`. Name the target repository and issue.
2. Check whether the user's request covers this comment. Ask only if its destination, scope, or permission is missing.
3. Post through [caic-issue](../../caic-issue/SKILL.md) and keep the returned link.
4. If the agreed contract changes, update the plan. Post a follow-up when permitted, and link the current proposal from the PR.

An instruction to post does not grant permission to build. A request to build does not grant permission to post. Use permission already given for each action. If the user asked you to wait for feedback, wait.

## Related guidance

- [caic-plan](../SKILL.md) — planning workflow and outcome traceability
- [caic-issue](../../caic-issue/SKILL.md) — filing authorized issue comments
- [caic-review](../../caic-review/SKILL.md) — comparing a change with its agreed contract
- [accessibility.md](../../../../references/accessibility.md) — announcement and focus requirements
