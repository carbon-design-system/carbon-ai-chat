# @carbon/typedoc-theme

Custom TypeDoc theme for Carbon AI Chat documentation. Private, internal-only
workspace package — not published to npm.

## Usage

Install as a dev dependency (via the monorepo workspace) and reference by name
in `typedoc.json`:

```json
{
  "plugin": ["@carbon/typedoc-theme"],
  "theme": "carbon"
}
```

### Options

| Option         | Type | Description                                                                                                 |
| -------------- | ---- | ----------------------------------------------------------------------------------------------------------- |
| `versionsFile` | path | Path to a `versions.js` file to copy to the output root. Resolved relative to `typedoc.json`. Omit to skip. |

Example:

```json
{
  "plugin": ["@carbon/typedoc-theme"],
  "theme": "carbon",
  "versionsFile": "../../versions.js"
}
```

## What the plugin does

- Registers a `carbon` theme that extends TypeDoc's `DefaultTheme` and swaps in
  a Carbon UI Shell layout.
- On every render, copies the theme's JS/CSS assets from `theme/assets/` into
  `<out>/assets/`.
- Copies `@carbon/styles/css/styles.min.css` into `<out>/assets/carbon-styles.min.css`
  (resolved via Node's module resolution, so npm hoisting works).
- If `versionsFile` is set, copies that file to `<out>/versions.js` for the
  versions dropdown to consume.

## References

- TypeDoc theme basics: https://typedoc.org/guides/themes/
- Default theme source: https://github.com/TypeStrong/typedoc/tree/master/src/lib/output/themes/default
