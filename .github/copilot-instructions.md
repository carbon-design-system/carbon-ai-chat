# GitHub Copilot instructions

The authoritative agent guidance for this repo lives in [AGENTS.md](../AGENTS.md) at the project root, plus a nested `AGENTS.md` in each package. Read those first — they are the single source of truth and are kept up to date.

Recurring task workflows are packaged as agent skills, which Copilot discovers on its own from `.claude/skills/` and `.agents/skills/`. Both hold the same files; `.bob/skills/` is the canonical copy they are generated from.
