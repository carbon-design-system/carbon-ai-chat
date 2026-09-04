# docs-pages.md — docs-site pages (type 3)

Load this before writing or editing a page under `packages/ai-chat/docs/`. For a net-new page, load [doc-style.md](../../../../packages/ai-chat/docs/references/doc-style.md) in full as well — it owns the markdown structure.

**A consumer developer solving a task, not taking a tour.** Open with what they do, then the mechanism.

- **Conceptual and task guides only.** Never hand-write a page that lists a type's properties — TypeDoc already renders those from [public-jsdoc.md](public-jsdoc.md).
- **The YAML `title` renders as the page heading, so the body starts at `##`** — no H1 of your own ([Page anatomy](../../../../packages/ai-chat/docs/references/doc-style.md#page-anatomy)).
- **An unregistered page never renders.** Add it to `projectDocuments` in `packages/ai-chat/typedoc.json` at the sidebar position you want; the page is not done when the prose is done.
- **This is a scored surface** — step 3 of the loop applies to every page you touch, and the number is trustworthy here because the file is plain markdown.

## Before and after

- Before: "It is possible for you to make use of this method in the event that you would like to update a message."
- After: "Use this method to update a message."

## Gate

`npm run reading-level -- <file>` at grade 10 or below, and the page registered in `projectDocuments`.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [doc-style.md](../../../../packages/ai-chat/docs/references/doc-style.md) — markdown structure, page anatomy, registration
- [revision-pass.md](revision-pass.md) — the tightening pass every page takes before its gate
