# Announce an ADR for feedback in Slack

Use this template in `#carbon-ai-chat` after a proposed architecture decision record (ADR) merges and its RFC discussion opens. It follows the greeting, short explanation, and direct links in the [release announcements](../../publishing-releases.md).

Replace each bracketed field. Copy the feedback date from the ADR and link to the record on `main`. Name who needs to review it and what they could lose or need to change. Draw the feedback request from the ADR's Summary.

```text
Hi all! A new architecture decision record (ADR) proposes [the change and target release].

If you [affected workflow], [the impact you need to review]. The proposal [migration path or main tradeoff].

Please share [specific use cases, constraints, or migration blockers] in the GitHub discussion by [Month D, YYYY].

Read the proposal
[ADR_URL]

Join the RFC discussion
[RFC_DISCUSSION_URL]
```

The ADR stays `proposed` during feedback. A maintainer decides on or after the feedback date. Check the links and date before posting. If the proposal changes, update the announcement to match the record. See the [ADR lifecycle](../README.md#lifecycle).
