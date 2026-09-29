---
status: proposed
date: YYYY-MM-DD
feedback-by: YYYY-MM-DD
discussion:
epic:
supersedes:
superseded-by:
---

# ADR-NNNN: <the proposal, written as a statement>

<!--
Copy this file to NNNN-kebab-case-title.md and delete these comments as you fill it in.
Process and lifecycle: ./README.md. Authoring workflow: the caic-adr skill.

The sections below are checked by `npm run validate:adrs`: all eight, in this order.
Use ### for anything inside them.
-->

## Summary

<!--
One screen at most. A reader decides from this section alone whether the rest concerns them.

**Problem.** Who is affected today, and what goes wrong. Plain language: no type names,
file paths, or internal jargon in these sentences.

**Proposal.** What changes, in two or three sentences.

**Feedback wanted.** Two or three pointed questions. "Thoughts?" gets naming opinions;
"does this break an integration that re-mounts the chat on route change?" gets an answer.
-->

## Motivation

<!--
Why this, and why now. Who hits the problem, how often, and what they do about it today.
Evidence only where it makes a cost concrete, stated in consumer terms. No line numbers:
they go stale within a sprint, and belong in the plan or the PR.
-->

## Proposal

<!--
Open with what a host developer writes: one code sample of the proposed surface in use,
then the prose it needs.

Follow with ### Reference subsections for the exact types and behavior: defaults, failure
paths, timing, repeat calls. Precise enough that someone can review a diff against it.

Put the explanation in JSDoc on the types themselves, so a reader can paste the block
into an editor and have it. Don't split it between comments in the code and bullets
underneath. Prose after a block is for what isn't a type: packaging, timing, a table of
who-owns-what.

Note that `reading-level` strips fenced code, so it can't see any of that JSDoc. Read it
for plainness yourself.
-->

## Consumer impact

<!--
OPTIONAL. Delete the heading when a host has nothing to do and nothing to notice.

Before and after code for every host that changes. A break that shows up as a compile
error is cheap. A break that shows up as a UI going quiet, or as the wrong data on
screen, is expensive: put those first. A deprecation isn't impact — the record that
retires the thing owns that.
-->

## Drawbacks

<!--
OPTIONAL. Delete the heading rather than listing costs stated elsewhere in the record.

The costs this proposal accepts, that nothing else in the record already names. A
proposal whose real costs go unsaid reads as a pitch.
-->

## Alternatives

<!--
OPTIONAL. Delete the heading when nothing else was seriously on the table.

Only alternatives someone proposed, or a reader would plausibly raise. A sentence or two
each on why it lost, naming the specific cost. What isn't here gets raised in the
discussion instead, which is a fine place for it.
-->

## Open questions

<!--
What this proposal leaves undecided, and what it deliberately leaves to later work.
The questions in Summary's "Feedback wanted" usually come from here.
-->

## Decision

<!--
While proposed: "Not decided. Feedback by YYYY-MM-DD in the RFC discussion linked above."

When decided: accepted or rejected, the date, and what feedback changed. A rejected
proposal gets the same care as an accepted one; the next person with the idea reads it.
-->
