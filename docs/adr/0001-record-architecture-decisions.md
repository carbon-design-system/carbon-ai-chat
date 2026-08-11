---
status: accepted
comments-by:
date: 2026-07-30
deciders: '@carbon-design-system/carbon-ai-chat-developers'
consulted:
informed:
epic:
discussion:
supersedes:
superseded-by:
---

# ADR-0001: Record architecture decisions

## Context and problem statement

Work in this repo moves through four artifacts, and each one answers a different question. A plan says how to build something. An epic says what work makes it true. An issue says how you know a piece is done. A guide says how you use the result. Together they form a chain where one requirement is restated at each scale and proved at the end.

Nothing in that chain says **why**.

Rationale lives in one place today: the numbered `Decisions` list in a plan file. Plan files are git-ignored and deleted once their steps merge. The lifecycle rule that governs them is explicit about what should survive:

> If there's institutional knowledge worth keeping (a non-obvious decision, a constraint future contributors should know), distill it into the codebase — docs, a comment on the relevant code, release notes — not a stale plan file.

That instruction has no valid destination. A JSDoc comment cannot hold three candidate message-envelope shapes and the reasons two of them lost. So the alternatives vanish when the plan is deleted, and what remains is an epic that states the winner as fact.

The 2.0 release made the gap expensive. The umbrella epic and its eleven children commit to removing theming, removing the launcher, deleting the transport timers, dropping `getState()`, and culling response types. Each is a real decision with real alternatives. None of them is written down, and no artifact exists that a maintainer or a consumer can comment on before the code lands.

## Considered options

Two questions, decided together because a format with no process is a folder of drafts, and a process with no format is a debate about headings.

### The format

**A. Trimmed MADR 4.x, plus a required consumer-cost section — chosen.**

[MADR](https://adr.github.io/madr/) is the widely used ADR format, so an outside contributor recognizes the headings and any ADR tooling can read them. Three of its sections do not earn their place here. `Decision Drivers` restates the context. `Pros and Cons of the Options` splits each option's reasoning away from the option itself, so a reader scrolls between two lists. `Confirmation` asks how compliance is checked, which is exactly what an epic's expected outcomes already carry — and duplicating them means they drift.

In their place, one section MADR does not have: **For consumers**. This library's decisions are felt by people who ship on top of it, and a record that omits the migration is only half written.

**B. Full MADR 4.x, verbatim — rejected.** Maximum recognizability and tool compatibility. Rejected because the three sections above are redundant here, and `Confirmation` actively conflicts with the rule that a requirement is stated in exactly one place. MADR itself marks two of the three optional.

**C. The repo's own vocabulary — rejected.** Reuse words already in the epic and plan templates, so every artifact reads in one voice. Cheapest to adopt internally. Rejected because an outside contributor would not recognize the file as an ADR, and the repo is public and takes outside contributions. Familiarity is worth more than internal symmetry for a document written partly for strangers.

### How a proposal becomes a decision

**D. Merge early, decide explicitly after a minimum window — chosen.** The ADR merges quickly as `proposed`, so it is findable while it is still open. Discussion runs on a tracking issue. `comments-by` sets the earliest date the decision should be ratified, and a person on the maintainer team then accepts or rejects it.

Silence is not agreement. Nobody objecting is not the same as everybody agreeing — it usually means nobody looked, and a decision that reaches `accepted` because a clock ran out has no one behind it. So the window gates _when_ the decision can be made and never makes it.

The obvious cost is that a decided-in-practice ADR can sit at `proposed`. The tracking issue absorbs that: it stays open until the status is set, so the undecided ones are a query, not an audit of frontmatter. An open issue is visible in a way a stale field is not.

**E. Hold the PR open until agreement — rejected.** Simpler to explain, and review comments sit next to the text they discuss. Rejected on two counts. The ADR is invisible on `main` for the whole discussion, which is the period when people most need to find it. And review comments on a merged PR are hard to find later, so the reasoning would be lost exactly the way plan files lose it.

**F. Lazy consensus — rejected.** Borrowed from RFC practice: the ADR declares a default, and on the `comments-by` date it becomes that default unless an objection is open. Rust's final comment period works this way. It solves the stale-proposal problem outright, because the date is self-executing.

Rejected because it buys that at the price of manufacturing agreement. On a public repo the people most affected by a breaking decision are the least likely to be watching a tracking issue, and auto-accepting on their silence records a consensus that was never tested. A stale `proposed` is a visible piece of unfinished work; a decision nobody actually made is not.

## Decision outcome

Architecture decisions are recorded as numbered markdown files in `docs/adr/`, in trimmed MADR form with a required `For consumers` section. An ADR merges as `proposed` and collects comments on a linked tracking issue. On or after its `comments-by` date, a maintainer accepts or rejects it explicitly. The window never decides on its own.

An ADR is written when a consumer can feel the decision, or when someone is likely to re-propose the option that lost. Everything else stays a numbered decision in the plan.

The full process is in [README.md](README.md). The authoring workflow is the [caic-adr](../../.bob/skills/caic-adr/SKILL.md) skill.

This record is `accepted` on merge with no `comments-by`, because the process it describes did not exist when it was written and there was nothing to run it through. That is not a precedent — every ADR after this one takes a window.

### Consequences

The chain of artifacts gains the level it was missing, and the plan lifecycle rule finally has somewhere to point.

An epic stops being where decisions are silently asserted. `EPIC.yaml` gains a `Decisions` field, so an epic cites the records that govern it. A consumer-visible choice stated in an epic with no ADR behind it is now a visible gap rather than an invisible one.

Three costs, taken knowingly:

**The frontmatter is not standard MADR.** `comments-by` comes from RFC practice — Rust's final comment period, and the variants Ember and React use. Classic ADRs have no notion of a comment window, because they assume a small team decides in a room and the ADR records the outcome. This repo is public and its decisions reach people who are not in the room. Anyone reading these files as plain MADR should know that field is a local addition, and that unlike an RFC's final comment period it does not decide anything by itself.

**An ADR can sit at `proposed` after its window closes.** That is the price of refusing to auto-accept, and it is deliberate: the alternative is recording agreement nobody gave. The tracking issue is the backstop — it stays open until the status is set, so unfinished decisions are a list you can query rather than a field you have to go looking for.

**The folder can rot.** Every ADR practice risks becoming a write-only archive. Three things push against it: the promotion test keeps the volume low, superseding is a first-class outcome so a wrong record gets replaced rather than ignored, and `npm run validate:adrs` fails CI on a broken link, a malformed record, a missing index row, or a one-sided supersede pair.

### For consumers

Nothing in the shipped library changes. No API moves, no behavior differs, no migration is needed.

What changes is when you find out about the ones that do. Breaking changes for 2.0 have been decided in issues that state the outcome and not the reasoning. From here, the ones with real consequences get a record that names the alternatives and spells out the migration — merged while it is still `proposed`, with an open tracking issue and a date before which it will not be ratified. If a decision is wrong for your integration, that issue is where to say so, and saying nothing is not counted as agreement.

## More information

- [README.md](README.md) — the process, numbering, and how the comment window closes.
- [template.md](template.md) — the section skeleton this ADR follows.
- [MADR](https://adr.github.io/madr/) — the format this trims.
- [Michael Nygard's original post](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) — where the practice and the "ADR-0001 records the practice itself" convention come from.
- [Rust RFC final comment period](https://github.com/rust-lang/rfcs#the-rfc-life-cycle) — where the comment window comes from, and the lazy-consensus disposition this rejects.
