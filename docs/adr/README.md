# Architecture decision records

An ADR here is a proposal first and a record second. It opens by asking people who build on this library for feedback on a decision they will feel. Once someone decides it, it stays as the record of what was chosen and why.

Every ADR opens with a one-screen summary: the problem, the proposal, and the feedback it wants. Read that, and you know whether the rest concerns you.

[0001-record-architecture-decisions.md](0001-record-architecture-decisions.md) records why the practice exists and why it takes this shape.

## What an ADR is not

| Artifact | Answers | Lives |
| --- | --- | --- |
| ADR | Why this shape, and what it costs the people who use it | `docs/adr/`, committed |
| Epic or issue | What work makes it true, and how you know it's done | GitHub |
| Guide | How you use the thing once it exists | `packages/ai-chat/docs/`, published |

An epic tracks work and an ADR justifies it. When an epic treats a choice as settled, the ADR is where a reader finds out why, and where they push back.

## When to write one

The developer doing the work decides. Consider an ADR when any of these holds:

- **A consuming developer feels it directly.** A breaking change, or a new public surface.
- **A contributor feels it.** An architectural change, a foundational technical choice, or a new utility, service, or pattern others will build on.
- **The reasoning isn't obvious.** Nobody needs an ADR to use JSON. Choosing between dependency X and dependency Y may deserve one.

Everything else stays a decision in the plan or the PR description. Most decisions aren't ADRs.

## Lifecycle

Status runs `proposed`, then `accepted` or `rejected`. An accepted ADR that a later one replaces becomes `superseded`.

1. **Draft it** in `.github/adr-drafts/`, which is git-ignored, from [template.md](template.md). Set `feedback-by`: the earliest date it can be decided. Ten working days is the usual minimum. Give a wide-reaching change, or one that spans a holiday, longer.
2. **Open the PR**, titled `docs: ADR-NNNN <title>`. Merge it once it reads clearly, not once everyone agrees. It merges as `proposed`, so nothing is settled, but people can find it on `main`.
3. **Open the RFC discussion** from the [RFC Discussions form](https://github.com/carbon-design-system/carbon-ai-chat/discussions/new?category=rfc-discussions), and set the ADR's `discussion` field to its URL in a follow-up PR. The discussion is where feedback happens.
4. **Decide it** on or after `feedback-by`. Someone on `@carbon-design-system/carbon-ai-chat-developers` sets the status, fills in the Decision section, and closes the discussion.

> **Note**: Silence isn't agreement. A date passing doesn't accept an ADR; a person does. Until someone sets the status, the ADR is still `proposed`.

To find the undecided ADRs, look at the open threads in [RFC Discussions](https://github.com/carbon-design-system/carbon-ai-chat/discussions/categories/rfc-discussions).

## What happens to your feedback

A `proposed` ADR is still a draft. Feedback worth acting on changes the ADR itself, so the next reader doesn't have to dig through a thread.

- **An alternative nobody listed** goes into Alternatives, or replaces the proposal if it wins.
- **A break Consumer impact missed** goes into Consumer impact.
- **A constraint nobody knew about** usually changes the proposal.

A change to the Proposal pushes `feedback-by` out, because everyone who already read it agreed to something else. Every substantive comment gets a reply, with a link to the change if there was one. A point that doesn't win still gets an answer that says why.

## Numbering

Files are named `NNNN-kebab-case-title.md`: four digits, then a lowercase slug. Claim the next free number when you open the PR. If two open PRs claim the same number, the one that merges second takes the next free number first. A merged number is never reused or changed.

> **Note**: A first set of ADRs, numbered 0002 to 0025, was withdrawn before the practice was announced. Numbers 0002 and 0003 now belong to their replacements. An older issue citing a number above 0003 points at a withdrawn record, which you can still find in git history.

## Superseding

Never rewrite an accepted ADR's decision. A later reader needs to see what was believed then, and what changed.

Write a new ADR and set its `supersedes` field. On the old one, set `superseded-by` and `status: superseded`. That's the only edit an accepted ADR takes, beyond fixing a typo or a broken link.

## Writing one

Use the [caic-adr](../../.bob/skills/caic-adr/SKILL.md) skill. It walks through the template, the review before the PR, and opening the discussion. The wording rules are type 11 in [caic-copy-writer](../../.bob/skills/caic-copy-writer/SKILL.md).

## The records

Generated from the records. Run `npm run sync:adrs` after you add one or change a status. `npm run validate:adrs` fails CI if this table drifts, or if a record is missing a section or has them out of order.

<!-- adr-index:start -->

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-headless-sdk.md) | Ship a headless SDK so you can compose your own chat | Proposed |
| [0003](0003-chat-survives-remount.md) | A chat survives being unmounted and mounted again | Proposed |

<!-- adr-index:end -->
