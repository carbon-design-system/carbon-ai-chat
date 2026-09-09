# Agent skills

This repo's task workflows live here as skills. Each one holds a full procedure — how to record a decision, how to shape work into a plan or an epic, how to file an issue, how to draft a PR description, how to review a diff, how to write the copy itself — rather than pointing at a document that holds it.

The one skill that is not a procedure is [caic-copy-writer](caic-copy-writer/SKILL.md). It owns the wording for every surface this repo writes. The others carry structure and procedure, and point there for the words.

Skills exist because always-on guidance and task guidance need different delivery. A convention has to be loadable at any moment, so it stays in [references/](../../references/) and the root [AGENTS.md](../../AGENTS.md) routes to it. A task procedure is only needed while doing that task, and a skill matches that shape: its `description` is always in context so it can trigger itself, while its body loads only when invoked.

## The skills

| Skill                               | Use it when                                                                        | Also carries                          |
| ----------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------- |
| [caic-adr](caic-adr/SKILL.md)       | recording why a decision went the way it did, and what it costs consumers          | the ADR-review rubric it closes with  |
| [caic-plan](caic-plan/SKILL.md)     | shaping upcoming work at any size — a plan, an epic, or a single issue-sized slice | the plan-review rubric it closes with |
| [caic-issue](caic-issue/SKILL.md)   | filing a GitHub issue or sub-issue                                                 | epic authoring, for umbrella work     |
| [caic-pr](caic-pr/SKILL.md)         | drafting a PR description                                                          | —                                     |
| [caic-review](caic-review/SKILL.md) | reviewing a diff, including self-review before marking a task done                 | PR posting, and large-diff triage     |
| [caic-copy-writer](caic-copy-writer/SKILL.md) | writing any copy this repo ships — JSDoc, docs pages, READMEs, UI strings, thrown errors, and the bodies of commits, PRs, issues, and ADRs | a rules file per copy type, and the revision pass under all of them |

`carbon-builder` also lives here. It is a vendored Carbon Design System skill from upstream, not a repo workflow — the sync and mirror rules below apply to it, but its content is not ours to edit.

## Three copies, one source of truth

Each assistant looks for skills in its own directory: IBM Bob reads `.bob/skills/`, Claude Code reads `.claude/skills/`, Codex reads `.agents/skills/`, and Copilot reads the last two. None of them reads a shared location, so the tree is stored three times — and **this one is canonical**, since most contributors here work in Bob. The other two are generated from it:

```bash
npm run sync:skills      # regenerate the mirrors from here
npm run validate:skills  # check the mirrors, frontmatter, and links
```

All three are committed, because an assistant has to find its skills in a fresh clone. They sit at the same directory depth, so relative links inside a skill resolve identically in any of them.

Edit this copy and sync — never edit a mirror, it gets overwritten. `validate:skills` runs in `ci-check` and in CI, and fails on drift between the trees, a `SKILL.md` whose frontmatter `name` doesn't match its directory, a frontmatter value YAML would silently truncate, or a broken link inside a `caic-*` skill.

Bob and Claude Code expose each skill as a slash command — `/caic-adr`, `/caic-plan`, `/caic-issue`, `/caic-pr`, `/caic-review`, `/caic-copy-writer`. Codex lists the same six under `$`.

## Authoring

Conventions for adding or changing a skill — naming, frontmatter, what belongs in a skill versus in `references/` — are in [authoring-agents-md.md](../../references/authoring-agents-md.md).
