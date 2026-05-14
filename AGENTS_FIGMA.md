# AGENTS_FIGMA.md — Figma → code workflow

Load this when translating a Figma design into code, calling the Carbon MCP server, or evaluating a `carbon-builder` skill suggestion. Designs are built from Carbon's official v11 Figma library, which maps to `@carbon/web-components` v2 and `@carbon/styles` v1 already pinned in this repo.

## Carbon flavor by area

The two primary packages are **Web Components only**. React appears only in narrow places (auto-wrapper Storybook, demo, React examples). Pick the right flavor — and the right MCP filter — for the area you are editing.

| Area                                                                              | Carbon flavor                                      | MCP `filters.component_type` |
| --------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------- |
| [packages/ai-chat/src/](packages/ai-chat/src/)                                    | `@carbon/web-components` via `@lit/react` wrappers | `"Web Components"`           |
| [packages/ai-chat-components/src/](packages/ai-chat-components/src/) Lit elements | `@carbon/web-components`                           | `"Web Components"`           |
| `packages/ai-chat-components/**/__stories__/*-react.{stories.jsx,mdx}`            | `@carbon/react` (Storybook only)                   | `"React"`                    |
| [demo/](demo/)                                                                    | `@carbon/react`                                    | `"React"`                    |
| [examples/react/](examples/react/)                                                | `@carbon/react`                                    | `"React"`                    |
| [examples/web-components/](examples/web-components/)                              | `@carbon/web-components`                           | `"Web Components"`           |

**`@carbon/react` is not a runtime dependency of either primary package.** Do not import it into [packages/ai-chat/src/](packages/ai-chat/src/) or into Lit elements under [packages/ai-chat-components/src/](packages/ai-chat-components/src/) — only into the `-react.stories.jsx` / `-react.mdx` files where it is already a devDep.

## Carbon MCP server

Endpoint: `https://mcp.carbondesignsystem.com/mcp`. Exposes `docs_search`, `code_search`, `get_charts`.

- **Always pass `filters.component_type`** matching the area from the table above. Without it, results mix React and Web Components and you will pick the wrong snippet or burn tokens filtering by hand.
- Carbon MCP is canonical for Carbon's own components — prefer its snippets over reconstructing from a Figma frame alone. The Figma library and the MCP are versioned together.
- For tokens, layout primitives, themes, and icons (`@carbon/styles`, `@carbon/layout`, `@carbon/themes`, `@carbon/icons`), search `docs_search`; these are flavor-agnostic.

## carbon-builder skill default

The official `carbon-builder` skill defaults to React. This file overrides that default for the two primary packages:

- When invoked while editing an area in the **Web Components** rows of the table, pass `filters.component_type: "Web Components"` to every Carbon MCP call and emit Lit / HTML — never JSX.
- Only emit JSX when the file you are editing is in the **React** rows ([demo/](demo/), [examples/react/](examples/react/), or a `*-react.stories.jsx` / `*-react.mdx` story file).
- If the skill volunteers a React snippet for a Web Components area, treat it as a translation hint only and rewrite as Lit before saving.

## Figma MCP server

Read-only access to design frames. Use to pull frame metadata, component names, and tokens before generating code.

- Carbon tokens always win over raw Figma styles. If a frame shows a hex color, find the corresponding Carbon token via `@carbon/styles` rather than hardcoding (see [root AGENTS.md Conventions](AGENTS.md#conventions)).
- A frame may arrive with Figma Make-generated code attached. Treat it as a hint, not authoritative — verify the snippet against Carbon MCP before adopting.

## Workflow

1. Open the Figma frame and identify each Carbon component by name (Figma layer names match Carbon component names).
2. Call Carbon MCP `code_search` with `filters.component_type` set per the table.
3. Author in the matching package following its existing patterns: [packages/ai-chat/AGENTS.md](packages/ai-chat/AGENTS.md) or [packages/ai-chat-components/AGENTS.md](packages/ai-chat-components/AGENTS.md).
4. Apply accessibility from [AGENTS_ACCESSIBILITY.md](AGENTS_ACCESSIBILITY.md) — Figma frames rarely encode live-region or focus-order requirements.
5. Verify per the per-area gate in [root AGENTS.md Definition of done](AGENTS.md#definition-of-done).

## Code Connect

Not configured for Carbon's own components — Carbon MCP already returns canonical snippets, and an extra Code Connect mapping would duplicate (and drift from) the MCP. Revisit only when this repo ships its own reusable Carbon-derived component whose Figma node has no obvious code mapping (e.g., a chat-specific composite in `@carbon/ai-chat-components`).

## Parity gotcha

`@carbon/web-components` covers the common Carbon surface but lags `@carbon/react` for some rarer and IBM Products components. Catch this before implementation, not after:

- Spot-check with `code_search` + `filters.component_type: "Web Components"` for every Carbon component named in the frame.
- If the search returns nothing usable, flag the design and choose one: substitute a supported Carbon component, compose from primitives in this repo's [packages/ai-chat-components/](packages/ai-chat-components/), or escalate to design for a swap. Do **not** silently import `@carbon/react` into the Web Components areas to fill the gap.

## Related guidance

- [Root AGENTS.md](AGENTS.md) — monorepo conventions, build gates, prefix discipline.
- [packages/ai-chat-components/AGENTS.md](packages/ai-chat-components/AGENTS.md) — Lit component authoring rules (tag naming, CEM, stories).
- [packages/ai-chat/AGENTS.md](packages/ai-chat/AGENTS.md) — React + Lit-host architecture.
- [AGENTS_ACCESSIBILITY.md](AGENTS_ACCESSIBILITY.md) — WCAG 2.1 AA checklist.
