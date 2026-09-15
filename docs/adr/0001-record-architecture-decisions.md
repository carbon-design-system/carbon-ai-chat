---
status: accepted
date: 2026-09-15
feedback-by:
discussion:
epic:
supersedes:
superseded-by:
---

# ADR-0001: Record architecture decisions

## Summary

**Problem.** Decisions that change how people build on this library get made in issues and in working plans. Plans are deleted once the work merges. Issues state the winning choice as fact. Nobody outside the room can see why a choice was made, or object before the code lands.

**Proposal.** Record those decisions as ADRs that open as requests for feedback. Each one leads with the problem, the proposal, and the feedback it wants, all on one screen. It merges early as `proposed`, collects feedback in an RFC discussion, and is decided by a maintainer on or after a stated date.

**Feedback wanted.** None. This record was accepted on merge. The Decision section says why.

## Motivation

Work here moves through plans, epics, issues, and guides. None of them keeps the reasoning. A plan's decisions list holds the alternatives, but plans are git-ignored and deleted once their steps merge. An epic keeps only the winner.

The 2.0 release makes that gap expensive. It removes theming and the built-in launcher, reshapes the instance, and adds a headless entry point. Each of those has real alternatives, and each lands on hosts that never saw the discussion.

A first attempt at this practice used a trimmed MADR format, the most widely used ADR layout: context, then options, then the decision. It produced records that were hard to act on. The proposal sat most of the way down each page, under line-number evidence that went stale within weeks. A quota for rejected options padded every record. Eight records on one program only made sense read together. The first outside question on them was, in effect, "why are you doing this at all?" That question should have been answered in the first paragraph. Those records were withdrawn before the practice was announced.

## Proposal

An ADR is a request for feedback that becomes a record. Its sections run in the order a reader needs them:

1. **Summary.** The problem, the proposal, and pointed questions for reviewers, on one screen. A reader decides here whether to go on.
2. **Motivation.** Who hits the problem, and why now.
3. **Proposal.** What a host developer writes, then Reference subsections with exact types and behavior.
4. **Consumer impact.** Before and after code, with silent breaks first.
5. **Drawbacks.** The costs the proposal accepts.
6. **Alternatives.** Only ones someone proposed or a reader would raise. None is a valid answer.
7. **Open questions.** What stays undecided.
8. **Decision.** Written when the ADR is accepted or rejected.

The lifecycle, numbering, and superseding rules are in [README.md](README.md). The authoring workflow is the [caic-adr](../../.bob/skills/caic-adr/SKILL.md) skill.

### Reference: frontmatter

| Key | Meaning |
| --- | --- |
| `status` | `proposed`, `accepted`, `rejected`, or `superseded` |
| `date` | When the record was written |
| `feedback-by` | The earliest date a `proposed` record can be decided. Required while `proposed` |
| `discussion` | The RFC discussion URL, added after merge |
| `epic` | The epic that carries the work, if any |
| `supersedes`, `superseded-by` | The other half of a supersede pair |

### Reference: what CI checks

`npm run validate:adrs` fails when a record:

- is missing a section, has an extra `##` section, or has them out of order
- uses a frontmatter key outside the table above
- is `proposed` with no `feedback-by`, or `superseded` with no `superseded-by`
- has a one-sided supersede pair, a broken relative link, or no row in the README index

The template is held to the same section and key checks.

### Reference: where the shape comes from

The section order borrows from request-for-comment practice: the [Rust RFC template](https://github.com/rust-lang/rfcs/blob/master/0000-template.md) and Oxide's [RFD process](https://rfd.shared.oxide.computer/rfd/0001). Both lead with a summary and motivation and keep open questions as a first-class section. Numbered records in a repo folder, with this record as 0001, come from [Michael Nygard's original ADR post](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

## Consumer impact

Nothing in the shipped library changes.

What changes is how you hear about decisions that affect you. A breaking change or a new public surface arrives as a proposal with a one-screen summary, a date, and a discussion thread, before the code lands. If a proposal is wrong for your integration, say so in its discussion. Saying nothing doesn't count as agreement.

## Drawbacks

- **The format isn't standard MADR.** ADR tooling that expects MADR headings won't recognize these records.
- **A `proposed` record can outlive its date.** No one gets to accept a record by waiting, so an undecided one stays open until someone decides it. The open threads in RFC Discussions are the list to check.
- **The section check is strict.** A record with nothing to say under a heading still carries it, with one line such as "None."
- **The folder can rot.** Every ADR practice risks becoming an archive nobody reads. Keeping the bar for writing one high, and superseding wrong records rather than ignoring them, pushes against that.

## Alternatives

- **Trimmed MADR.** The first version of this practice used it. It lost because it puts the decision after the context and the options, so a reader has to finish most of the page before learning what's proposed.
- **Nygard's short form.** It has only context, decision, status, and consequences. It's the lightest format, but it has no place for open questions or the feedback a proposal wants.
- **Lazy consensus.** A record becomes accepted when its date passes with no open objection, as in Rust's final comment period. It lost because silence on a public repo usually means nobody looked. The hosts most affected by a breaking change are the least likely to be watching.
- **A tracking issue per record as the feedback venue.** It lost to Discussions, which thread replies, and don't add an item to the work backlog for each open proposal.

## Open questions

None. Changes to this practice go through a new ADR that supersedes this one.

## Decision

Accepted on 2026-09-15, on merge, with no feedback window. It replaces an earlier version of itself that was never announced, and the process it describes is the one a window would have run through. That isn't a precedent: every later ADR merges as `proposed` with a `feedback-by` date.
