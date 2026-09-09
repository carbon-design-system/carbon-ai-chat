# readme-copy.md — package and repo READMEs (type 13)

Load this before editing `README.md` at the repo root or under `packages/`. Structural owner: none. A README has no fixed section shape, so this file is the whole bar.

**A developer deciding whether to adopt the package.** npm renders the package README on the registry page, so it is the first page they see and often the only one.

- **The first sentence says what the package is and who it is for.** Not what it is built on, and not why it exists.
- **Getting started comes before concepts.** The install command, then the smallest example that runs.
- **Absolute URLs only.** npm serves the README from its own domain, so a relative link that works on GitHub is broken on the registry page.
- **Link the docs site; never mirror it.** A property table copied here goes stale, then contradicts what TypeDoc generates from [public-jsdoc.md](public-jsdoc.md).
- **No badge walls and no emoji.** A README is where marketing language creeps back in, and [tone.md](../../../../references/tone.md) bans it everywhere.

## Before and after

- Before: "Carbon AI Chat is a comprehensive, enterprise-grade solution that leverages the Carbon Design System to deliver world-class conversational experiences."
- After: "Carbon AI Chat is a chat application for React and web components, built on Carbon."

## Gate

`npm run reading-level -- <file>` at grade 10 or below. The root README and the one under `packages/ai-chat/` overlap heavily, so edit both when a change touches shared text.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [docs-pages.md](docs-pages.md) — the docs site a README links to instead of restating
- [revision-pass.md](revision-pass.md) — the tightening pass every README takes before its gate
