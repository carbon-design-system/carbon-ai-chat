# GitHub Copilot instructions

The authoritative agent guidance for this repo lives in [AGENTS.md](../AGENTS.md) at the project root, plus a nested `AGENTS.md` in each package. Read those first — they are the single source of truth and are kept up to date.

Recurring task workflows are packaged as agent skills, which Copilot does not load automatically. They are ordinary markdown, so read the relevant one before doing that task:

| Task                                          | Read                                               |
| --------------------------------------------- | -------------------------------------------------- |
| Drafting a plan, or shaping work into an epic | [caic-plan](../.bob/skills/caic-plan/SKILL.md)     |
| Filing a GitHub issue or sub-issue            | [caic-issue](../.bob/skills/caic-issue/SKILL.md)   |
| Writing a PR description                      | [caic-pr](../.bob/skills/caic-pr/SKILL.md)         |
| Reviewing a diff or a pull request            | [caic-review](../.bob/skills/caic-review/SKILL.md) |

`.claude/skills/` holds a generated copy of the same files; read either.
