# issue-bodies.md — issue and epic bodies (type 10)

Load this before drafting an issue or epic body into `.github/issue-drafts/`. Structural owner: [caic-issue](../../caic-issue/SKILL.md) for the sections and Done when; [epic-authoring.md](../../caic-issue/references/epic-authoring.md) for an umbrella.

**A reader skims an issue to decide whether it concerns them.** Terse beats thorough.

- **Open with the problem, in plain language.** The first two or three sentences of Background say who is bitten and what goes wrong today. Keep type names, file paths, and script names out of them. Plain, not simplistic: write it for a colleague who doesn't work in this area.
- **Leave the fix open.** Goal and Done when state outcomes. Only Possible approaches may sketch a fix, and it reads as one option among others. An issue that names the function to change has made the planner's decision before anyone opened the code.
- **Claim before scaffolding is the rule that bites here.** That opening, Goal, and Done when carry the ask, so they go ahead of the rest of Background, Out of scope, and Related, and together stay larger than them — [revision-pass.md](revision-pass.md#claim-before-scaffolding) carries the worked failure.
- **The title names the change, not the area.** Short, descriptive, imperative: "Add an AGENTS guide for authoring epics".
- **One instruction per sentence**, hardest in Done when — a box that needs an "and" is two boxes, and a half-true box can't be ticked.
- **Never cite repo guidance from the body.** External readers can't follow a repo-relative path and the target rots; an already-filed issue still links references/issue-authoring.md, deleted when these workflows became skills. State the outcome; the rule that made you state it is internal.
- **Write for the reader who arrives cold.** Gloss an internal name on first use, and spell out what a linked epic or ADR decided in the clause that links it.

## Gate

`npm run reading-level -- .github/issue-drafts/<slug>.md` at grade 10 or below, then read it once for order — the score is blind to a buried ask, and blind to an opening only its author can follow. The draft is the gate, because the body is reviewed before it is filed and an edit to a live issue is a second ask.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [caic-issue](../../caic-issue/SKILL.md) — body structure, Done when, and filing
- [revision-pass.md](revision-pass.md) — the tightening pass, and the claim-before-scaffolding rule
