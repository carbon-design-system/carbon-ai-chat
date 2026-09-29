# review-comments.md — review findings and summaries (type 14)

Load this before writing a review finding or a review summary. Structural owner: [caic-review](../../caic-review/SKILL.md), which decides the severities, the passes, the caps on how many findings ship, and the payload that posts them.

**Write for the author a day later**, reading a notification with none of the code open. The reviewer had the diff on screen; the author has one paragraph and a filename. That gap is why this type exists, and it holds whether the finding is posted to a pull request or handed back from a self-review — same person, same delay, same missing context.

- **Orient, then diagnose.** Open with a bolded label and one or two sentences on what the code under discussion does. The severity line comes next. A defect stated first lands on nothing.
- **Four labels cover it**: `**What this block does:**` for a function or a branch, `**Context:**` for a line whose neighbors matter, `**What this test is for:**` for a spec, and `**Why this line matters:**` for a cost the line hides. Pick the one that fits; don't invent a fifth.
- **Orientation describes the code, not the review.** Say what runs, and when. Never recap the diff or restate the severity. A label may flag that the stakes are hidden; the sentences under it still describe the code.
- **The conflict, settled.** [tone.md](../../../../references/tone.md) says lead with the task, and [claim before scaffolding](revision-pass.md#claim-before-scaffolding) says put the claim ahead of what supports it; [caic-review](../../caic-review/SKILL.md) says lead with the defect. **Inside a finding, tone.md wins for one sentence** — the defect means nothing until the reader knows what the code does. In the summary the rubric wins, because that reader is deciding whether to read on, and the verdict plus the defects is what decides it.
- **The summary leads with the defects.** Under the one-line verdict, what is broken comes first. Logistics, what you checked and cleared, and any strength go below it.
- **Name the trigger, not the category.** "On every close." "When two files fail a second apart." Give the author a path they can walk. [caic-review](../../caic-review/SKILL.md#how-to-write-a-finding) owns the rest of the shape and the three habits it bans.

## Before and after

From the review of #2305, on `file-uploads.ts:265`:

- Before: "**Important** — `hasUploadError` in `Input.tsx:611` is a _state_ predicate but this announces only on _edges_, so a frame where the visible reason changes without crossing an edge is announced by neither."
- After: "**What this block does:** `_announceTransitions` walks this frame's uploads against last frame's, collects what changed, and speaks it. The loop above sorts each upload by the edge it crossed; this block turns that into one announcement.

  **Important** — `hasUploadError` in `Input.tsx:611` is a _state_ predicate but this announces only on _edges_, so a frame where the visible reason changes without crossing an edge is announced by neither."

Both quote the diagnosis as it was posted, so only the opening differs. The fix that shipped with it, a `suggestion` block, is trimmed here.

The before is not wrong. It is unreadable without the file open — and the author reads it without the file open.

## Gate

No command reads a review. Re-read each finding cold before you post — the filename and your words, the diff closed — and fix any you can't follow. [revision-pass.md](revision-pass.md) applies as it does to every type, minus the one carve-out it names for this one.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [caic-review](../../caic-review/SKILL.md) — severities, the finding shape, the caps, and the summary's order
- [tone.md](../../../../references/tone.md) — the voice, and the lead-with-the-task rule a finding applies
- [commit-bodies.md](commit-bodies.md) — the other pre-merge type, aimed at the same two people from the other side
