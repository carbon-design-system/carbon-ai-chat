# review-comments.md — review findings and summaries (type 14)

Load this before writing a review finding or a review summary. Structural owner: [caic-review](../../caic-review/SKILL.md), which decides the severities, the passes, the caps on how many findings ship, and the payload that posts them.

**Write for the author a day later**, reading a notification with none of the code open. The reviewer had the diff on screen; the author has one paragraph and a filename. That gap is why this type exists, and it holds whether the finding is posted to a pull request or handed back from a self-review — same person, same delay, same missing context.

- **Orient, then diagnose.** Open with a bolded label and one or two sentences on what the code under discussion does. The severity line comes next. A defect stated first lands on nothing.
- **Four labels cover it**: `**What this block does:**` for a function or a branch, `**Context:**` for a line whose neighbors matter, `**What this test is for:**` for a spec, and `**Why this line matters:**` for a cost the line hides. Pick the one that fits; don't invent a fifth.
- **Orientation describes the code, not the review.** Say what runs, and when. Never recap the diff or restate the severity. A label may flag that the stakes are hidden; the sentences under it still describe the code.
- **The conflict, settled.** [tone.md](../../../../references/tone.md) says lead with the task, and [claim before scaffolding](revision-pass.md#claim-before-scaffolding) says put the claim ahead of what supports it; [caic-review](../../caic-review/SKILL.md) says lead with the defect. **Inside a finding, tone.md wins for one sentence** — the defect means nothing until the reader knows what the code does. In the summary the rubric wins, because that reader is deciding whether to read on, and the verdict plus the defects is what decides it.
- **The summary leads with the defects.** Under the one-line verdict, what is broken comes first. Logistics, what you checked and cleared, and any strength go below it, in the [layout](../../caic-review/SKILL.md#output-expectations) caic-review fixes.
- **A summary bullet is a pointer, not a finding.** One line: the defect and where. The finding it points to carries the why and the fix, so the summary never restates it.
- **Name the trigger, not the category.** "On every close." "When two files fail a second apart." Give the author a path they can walk. [caic-review](../../caic-review/SKILL.md#how-to-write-a-finding) owns the rest of the shape and the three habits it bans.

## Before and after

From the review of #2305, on `file-uploads.ts:265`:

- Before: "**Important** — `hasUploadError` in `Input.tsx:611` is a _state_ predicate but this announces only on _edges_, so a frame where the visible reason changes without crossing an edge is announced by neither."
- After: "**What this block does:** `_announceTransitions` walks this frame's uploads against last frame's, collects what changed, and speaks it. The loop above sorts each upload by the edge it crossed; this block turns that into one announcement.

  **Important** — `hasUploadError` in `Input.tsx:611` is a _state_ predicate but this announces only on _edges_, so a frame where the visible reason changes without crossing an edge is announced by neither."

Both quote the diagnosis as it was posted, so only the opening differs. The fix that shipped with it, a `suggestion` block, is trimmed here.

The before is not wrong. It is unreadable without the file open — and the author reads it without the file open.

### A summary

From the review of #2627, with the patch trimmed. Before, the visible part ran to six paragraphs:

> Approved as the short-term stopgap.
>
> Please retain the release-version tooling tests (**Important**) and include these three small improvements: …
>
> There are **3 inline suggestion blocks**. The complete patch below includes and supersedes all three, plus the demo-build exclusion and the full three-shard matrix. Apply the complete patch on its own; if you already applied an inline suggestion, reconcile that overlap first. …
>
> **Verification:** Checked in an isolated checkout of the target revision. `git apply --check` and `git diff --check` pass. …
>
> **Test / verification gaps:** The complete patch has not run through GitHub Actions. …

After:

```markdown
### AI Review

**Fix or answer the Importants, then ship.** 4 Important; 3 inline suggestions, superseded by the complete patch.

**Not verified**
- The patch hasn't run in GitHub Actions: no three-shard run, guidance job, or release dry run.

<details><summary>Complete patch</summary>

Target `0d9c124`; supersedes the 3 inline suggestions. After applying, update the PR description: three chat shards, guidance job on, no demo build in ordinary CI. …

</details>

<details><summary>Checked</summary>

At `0d9c124`: `git apply --check`, `npm run format`, and `npm run test:versions` pass.

</details>
```

The line comments already carried the four findings, so the after counts them instead of listing them. The overlap rules and the verification report fold into the two collapsed blocks.

## Gate

No command reads a review. Re-read each finding cold before you post — the filename and your words, the diff closed — and fix any you can't follow. [revision-pass.md](revision-pass.md) applies as it does to every type, minus the one carve-out it names for this one.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [caic-review](../../caic-review/SKILL.md) — severities, the finding shape, the caps, and the summary's order
- [tone.md](../../../../references/tone.md) — the voice, and the lead-with-the-task rule a finding applies
- [commit-bodies.md](commit-bodies.md) — the other pre-merge type, aimed at the same two people from the other side
