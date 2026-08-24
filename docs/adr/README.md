# Architecture decision records

An ADR records one decision: what you chose, what you turned down, and what it costs the people who use this library. It is written before the code and it stays after the code ships.

Every ADR lives in this folder. Read [0001-record-architecture-decisions.md](0001-record-architecture-decisions.md) for why the practice exists and how the format was picked.

## What an ADR is not

Three artifacts already shape work here. An ADR is none of them.

| Artifact | Answers | Lives |
| --- | --- | --- |
| ADR | Why this shape, and what else was on the table | `docs/adr/`, committed |
| Epic / issue | What work makes it true, and how you know it is done | GitHub |
| Guide | How you use the thing once it exists | `packages/ai-chat/docs/`, published |

The split that matters: an epic tracks work, an ADR justifies it. When an epic asserts a choice as settled, the ADR is where a reader finds out why — and where they argue if they disagree.

## When to write one

Write an ADR when either test passes:

- **A consuming developer will be directly effected by.** A breaking change. A new feature.
- **An author developer can feel it.** Architectural changes. Foundational technical choices. Adding new utilities, services or patterns.
- **The reasoning isn't obvious.** We wouldn't need an ADR to say "we are going to use JSON", but we may want one if we are deciding between dependency X or dependency Y.

Everything else stays a numbered decision in the plan. Most decisions are not ADRs. A folder full of records nobody reads is worse than no folder.

## Numbering and status

Files are named `NNNN-kebab-case-title.md`, four digits, starting at `0001`. Claim the next free number when you open the PR. Numbers are never reused and never renumbered — if two ADRs land at once, the second one rebases and renumbers before merge.

Status runs `proposed` → `accepted` or `rejected`. An accepted ADR that a later decision replaces becomes `superseded`.

## How an ADR gets decided

Review comments on a merged PR stop being findable, so the comment venue is a [GitHub Discussion](https://github.com/carbon-design-system/carbon-ai-chat/discussions) in the **RFC Discussions** category, and the ADR itself merges early.

1. **Draft it.** Copy [template.md](template.md), fill it in, claim a number. Drafts go in `.github/adr-drafts/`, which is git-ignored.
2. **Pick the window.** Set `comments-by` to the earliest date this decision should be ratified. Ten working days is the recommended minimum; a decision with a wide blast radius, or one that lands over a holiday, deserves longer.
3. **Open the PR**, titled `docs: ADR-NNNN <title>`.
4. **Open the RFC discussion**, titled `[RFC]: <title>`, in the **RFC Discussions** category, and put its URL in the ADR's `discussion` field. That discussion is where the feedback happens, and it stays open until the ADR is decided.
5. **Merge it.** Merge once the ADR reads clearly, not once everyone agrees. Status stays `proposed`, so nothing is settled — but the ADR is on `main` where people can find it, and it stops collecting rebases.
6. **Accept or reject it**, on or after `comments-by`. Someone on `@carbon-design-system/carbon-ai-chat-developers` sets the status in a follow-up PR and closes the discussion.

> **Note**: Silence is not agreement. A window closing does not accept an ADR — someone has to. `comments-by` is the earliest date that decision can be made, not a timer that makes it for you. Until a person sets the status, the ADR is still `proposed` and the decision is still open.

An objection pushes `comments-by` out. It does not reject the ADR. Rejection is its own outcome and needs the same write-up as acceptance — the next person to have the idea deserves to know it was already tried.

**Find the undecided ones through the open RFC discussions**, not by reading frontmatter. That is what they are for: an open discussion in the [RFC Discussions category](https://github.com/carbon-design-system/carbon-ai-chat/discussions/categories/rfc-discussions) is an ADR nobody has ratified yet.

## What happens to your comment

A `proposed` ADR is still a draft, so a comment worth acting on gets folded into the record itself rather than living on in a thread.

- **An option you name that nobody considered** gets added to Considered options — as a rejected option with the reason it lost, or as the new decision if it wins.
- **A break you point out that `For consumers` missed** gets added there.
- **A constraint nobody knew about** usually rewrites the decision.

Anything that moves the Decision outcome pushes `comments-by` out, because everyone who already read the ADR agreed to something else.

You will get a reply either way, with a link to the change if there was one. A point that does not win still gets an answer explaining why — if it was worth raising, it is worth recording, and the next person with the same idea should find it in the ADR rather than have it again.

Commenting after acceptance is still worth doing, but it cannot change that ADR — it starts a new one, below.

## Superseding

Never rewrite an accepted ADR's decision. The old reasoning is the point — a future reader needs to see what you believed then and what changed.

Write a new ADR, set its `supersedes` field, and on the old one set `superseded-by` and `status: superseded`. That is the only edit an accepted ADR takes.

## Writing one

Use the [caic-adr](../../.bob/skills/caic-adr/SKILL.md) skill. It carries the full workflow: the promotion test, how to fill each section, and the approval gate before anything reaches GitHub.

Voice follows [tone.md](../../references/tone.md) — the same rules as every other developer-facing file here.

## The records

Generated from the records themselves — run `npm run sync:adrs` after adding one or changing a status, and `npm run validate:adrs` fails CI if this drifts.

<!-- adr-index:start -->

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-core-react-wrapper-headless-sdk-split.md) | The core, React wrapper, and headless SDK ship from one package | Proposed |
| [0003](0003-instance-lifetime-belongs-to-the-acquire.md) | Instance lifetime belongs to the acquire, not the host mount | Proposed |
| [0004](0004-per-field-scoped-stores.md) | Chat state is read through per-field scoped stores | Proposed |
| [0005](0005-chat-instance-survives-as-the-composition.md) | `ChatInstance` survives the split as the composition of both halves | Proposed |
| [0007](0007-one-store-pipeline-behind-both-delivery-apis.md) | Both message-delivery APIs run on one store pipeline | Proposed |
| [0009](0009-conversation-verbs-on-instance-messaging.md) | Every conversation verb is reached through `instance.messaging` | Proposed |
| [0023](0023-sdk-prefixed-seam-types.md) | Callbacks survive the split unchanged through a parameterized config | Proposed |
| [0025](0025-the-sdk-entry-point-shape.md) | The SDK is acquired, and lifecycle lives on what the acquire returns | Proposed |

<!-- adr-index:end -->

Every `proposed` row has an open RFC discussion behind it. The [Discussions tab, filtered to RFC Discussions](https://github.com/carbon-design-system/carbon-ai-chat/discussions/categories/rfc-discussions), is the same list, with the discussion attached.
