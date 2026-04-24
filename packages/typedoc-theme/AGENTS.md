# AGENTS.md — `@carbon/typedoc-theme`

The custom TypeDoc theme used by `@carbon/ai-chat`'s public docs site. Registered as `theme: "carbon"` via the `@carbon/typedoc-theme` plugin entry in [../ai-chat/typedoc.json](../ai-chat/typedoc.json).

## Status

**Mid-migration.** The theme is being brought in line with consistent Carbon design by replacing hand-rolled markup/CSS with `@carbon/web-components` (`cds-*`) elements. Expect mixed approaches in existing files — that's not a bug. Don't reshape hand-rolled patterns into different hand-rolled patterns; replace them with `cds-*` components, or leave them for the dedicated cleanup pass.

## Layout

- `index.js` — TypeDoc plugin entry; registers the theme as `"carbon"`.
- `carbonThemePlugin.js` — additional TypeDoc hooks.
- `theme/`
  - `layouts/default.js` — the page shell. **This is also where Carbon web components are loaded** (see below).
  - `helpers/` — template helpers.
  - `assets/` — static assets shipped with the theme.

## How Carbon components are loaded

`@carbon/web-components` is **not** an npm dependency of this package. Components are loaded at runtime by `<script>` tags appended to the rendered page in [theme/layouts/default.js](theme/layouts/default.js), pointing at IBM's hosted CDN:

```
https://1.www.s81c.com/common/carbon/web-components/tag/latest/<component>.min.js
```

Currently loaded: `ui-shell`, `breadcrumb`, `modal`, `dropdown`.

To use a new Carbon component:

1. Add a script entry in `default.js` for `<component>.min.js` at the CDN URL above.
2. Use `<cds-<component>>` in the relevant template.

Note: the CDN URLs use `/tag/latest/` — the version floats. A Carbon major rolling forward can break the docs site without any change in this repo. Pinning is a future cleanup item.

## Authoring rules

- **Prefer `cds-*` over hand-rolled HTML/CSS** for new UI in the theme. The migration direction is one-way.
- **No npm-imported Carbon components.** All Carbon UI comes via the CDN script tags above; do not `import` from `@carbon/web-components` in theme code, and do not add it to `package.json`.
- **Plain ESM JavaScript.** No TypeScript, no build step, no `dist/`. Files run as-shipped from `index.js`, `carbonThemePlugin.js`, and `theme/`.
- **Styles**: `@carbon/styles` is the only npm Carbon dep — pull tokens from there rather than hardcoding values.

## How to verify a change

There's no standalone build. Exercise the theme by building the docs from [`packages/ai-chat/`](../ai-chat/):

```bash
# from packages/ai-chat/
npm start    # rollup watch + typedoc watch + serves on http://localhost:5001
# or
npm run build
```

Reload the served site after each save; TypeDoc's watcher rebuilds on theme file changes.

## Companion plugin

[`packages/ai-chat/docs/typedoc/moduleNamePlugin.js`](../ai-chat/docs/typedoc/moduleNamePlugin.js) is a separate TypeDoc plugin registered alongside this theme in [`../ai-chat/typedoc.json`](../ai-chat/typedoc.json). It lives in the consuming package — leave it there.
