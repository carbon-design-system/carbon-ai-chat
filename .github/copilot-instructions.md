# GitHub Copilot instructions

The authoritative agent guidance for this repo lives in [AGENTS.md](../AGENTS.md) at the project root, plus a nested `AGENTS.md` in each package. Read those first — they are the single source of truth and are kept up to date.

## TL;DR

- Node ≥ 22, npm ≥ 10. On a fresh clone, run `npm install && npm run aiChat:build` once — workspace deps resolve through built artifacts (`dist/es/`, `es/`), not TS sources, so nothing works until both core packages are built.
- Before editing a package, open that package's `AGENTS.md`:
  - [packages/ai-chat/AGENTS.md](../packages/ai-chat/AGENTS.md)
  - [packages/ai-chat-components/AGENTS.md](../packages/ai-chat-components/AGENTS.md)
  - [demo/AGENTS.md](../demo/AGENTS.md)
  - [examples/react/AGENTS.md](../examples/react/AGENTS.md) and [examples/web-components/AGENTS.md](../examples/web-components/AGENTS.md)
- Commits follow conventional-commits (commitlint-enforced). Header ≤ 72 chars, lowercase imperative subject, no trailing period.
- `npm run ci-check` runs lint/format/license/tests but **does not build**. For cross-cutting changes, also run `npm run build`. Per-package test/build commands are listed in the root AGENTS.md "Definition of done" table.
- Don't edit generated output: `dist/`, `es/`, `es-custom/`, `packages/ai-chat-components/custom-elements.json`, `packages/ai-chat-components/react/` wrappers, `telemetry.yml` files. Regenerate them with the documented commands.
- `packages/ai-chat/src/chat/components-legacy/` is closed to new components (bug fixes and refactoring transitions are fine). Author new UI in `components/` or lift reusable pieces to `@carbon/ai-chat-components`.

For everything else — architecture, conventions, per-package gotchas, definition of done — see [AGENTS.md](../AGENTS.md).
