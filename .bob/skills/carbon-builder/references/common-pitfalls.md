# Common Pitfalls

## React SCSS Setup

### 1) Using the CSS file instead of SCSS tokens

```js
// ❌ Wrong — bypasses SCSS token resolution; not aligned with design system guidance
import "@carbon/styles/css/styles.css";
```

### 2) Missing `@use '@carbon/react'` — components render unstyled

`@use '@carbon/react'` is required to generate the actual component styles (button classes,
tile styles, table markup, etc.). Without it, all Carbon components render completely unstyled.

Token imports (`spacing`, `theme`, `type`, `breakpoint`) are optional SCSS variable/mixin
declarations — they emit **no compiled CSS** and are only needed if your custom SCSS uses
those tokens.

```scss
/* ❌ Wrong — missing component styles; all Carbon components will render unstyled */
@use "@carbon/react/scss/spacing" as *;
@use "@carbon/react/scss/theme" as *;
```

```scss
/* ✅ Correct — minimum required for components */
@use "@carbon/react";
```

```scss
/* ✅ Also correct — component styles + optional token imports for custom SCSS */
@use "@carbon/react/scss/spacing" as *; // optional
@use "@carbon/react/scss/theme" as *; // optional

@use "@carbon/react"; // required
```

### 3) Including unnecessary token imports

Token imports (`spacing`, `theme`, `type`, `breakpoint`) are **optional** — only include
them if your custom SCSS uses those specific tokens. If you're only using Carbon components
without custom SCSS, you don't need any token imports.

```scss
/* ✅ Minimum required — component styles only */
@use "@carbon/react";

/* ✅ Add token imports only as needed for custom SCSS */
@use "@carbon/react/scss/spacing" as *; // only if using $spacing-* in custom styles
@use "@carbon/react/scss/theme" as *; // only if using $text-*, $background, etc.
@use "@carbon/react/scss/type" as *; // only if using type mixins
@use "@carbon/react/scss/breakpoint" as *; // only if using breakpoint helpers
```

### 4) Missing app-entry SCSS import

```js
// ✅ Correct: import SCSS before component imports
import "./styles.scss";
import { Button } from "@carbon/react";
```

### 5) Using an unverified icon name

```jsx
// ❌ Wrong — never assume an icon name without querying MCP first
import { CreditCard } from "@carbon/icons-react"; // may not exist
import { WinLossChart } from "@carbon/icons-react"; // wrong — actual name is ChartWinLoss
import { SatisfiedFace } from "@carbon/icons-react"; // wrong — actual name is FaceSatisfiedFilled
```

```jsx
// ✅ Correct — query first, use exact import_stmt from MCP response
import { ChartWinLoss } from "@carbon/icons-react"; // queried "chart win loss"
import { FaceSatisfiedFilled } from "@carbon/icons-react"; // queried "face satisfied"
import { AirlineManageGates } from "@carbon/icons-react"; // queried "airline manage gates"
import { CharacterWholeNumber } from "@carbon/icons-react"; // queried "character whole number"
```

Always query `code_search` with `filters.asset_type: "icon"` first and use the exact
export name returned by MCP. If the name cannot be confirmed, tell the user.

**Import package differs by framework** — use `import_stmt` from the MCP response verbatim:

- **React**: named export from `@carbon/icons-react` (e.g. `import { AddComment } from '@carbon/icons-react'`)
- **Web Components**: default export from `@carbon/icons` ES module (e.g. `import AddComment from '@carbon/icons/es/add-comment/20.js'`)

### 6) Additional imports (use as needed, not by default)

| Need                      | Import                                   |
| ------------------------- | ---------------------------------------- |
| Grid layout utilities     | `@use '@carbon/react/scss/grid' as *;`   |
| Motion tokens             | `@use '@carbon/react/scss/motion' as *;` |
| Layer / `$layer-*` tokens | `@use '@carbon/react/scss/layer' as *;`  |
| IBM color swatches        | `@use '@carbon/react/scss/colors' as *;` |
| CSS baseline reset        | `@use '@carbon/react/scss/reset' as *;`  |

---

## CDN and Fonts

### 7) Loading IBM Plex from Google Fonts or any non-IBM CDN

```css
/* ❌ Wrong — Google Fonts is not permitted for IBM Plex */
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans...");
```

```html
<!-- ❌ Wrong — third-party CDN, not permitted -->
<link
  href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans..."
  rel="stylesheet"
/>
```

For **React SCSS projects** — no font CDN link is needed at all. IBM Plex is delivered
automatically by the SCSS pipeline (`@use '@carbon/react'`).

For **CDN/quick-start / Web Components (no bundler)** — use the IBM CDN exclusively:

```html
<!-- ✅ Correct — IBM CDN for Plex fonts -->
<link
  rel="stylesheet"
  href="https://1.www.s81c.com/common/carbon/plex/sans.css"
/>
<!-- Or for full Plex package (excluding jp and kr): -->
<link
  rel="stylesheet"
  href="https://1.www.s81c.com/common/carbon/plex/plex-full.css"
/>
```

### 8) Loading Carbon components from a non-IBM CDN

```html
<!-- ❌ Wrong — jsDelivr, unpkg, or other third-party CDNs are not permitted -->
<script src="https://cdn.jsdelivr.net/npm/@carbon/web-components/..."></script>
```

```html
<!-- ✅ Correct — IBM CDN with specific version (replace v2.24.0 with current version) -->
<script
  type="module"
  src="https://1.www.s81c.com/common/carbon/web-components/version/v2.24.0/button.min.js"
></script>
```

---

## Web Components Styling

### 1) Incomplete SCSS imports

```scss
// Wrong
@use "@carbon/styles";
```

```scss
// Correct (minimal baseline)
@use "@carbon/styles/scss/reset";
@use "@carbon/styles/scss/type";
```

### 2) Missing app-entry style import

```js
// Correct: import styles before component imports
import "./styles.scss";
import "@carbon/web-components/es/components/button/index.js";
```

### 3) Missing Carbon theme class on `<body>`

```html
<!-- Correct: keep existing Carbon theme class; default to cds--white when absent -->
<body class="cds--white"></body>
```

### 4) SCSS linked from HTML instead of entry module

```html
<!-- Wrong -->
<link rel="stylesheet" href="styles.scss" />
```

```js
// Correct
import "./styles.scss";
```

### 5) Using SCSS variables as runtime tokens in Web Component styles

Carbon SCSS variables (`$spacing-*`, `$background`, etc.) resolve at **compile time** inside
`.scss` files only. They are undefined in component `<style>` blocks, inline CSS, and any
context outside the SCSS pipeline — producing zero-value or unstyled output with no error.

```css
/* ❌ Wrong — $spacing-09 is undefined at runtime; renders as nothing */
.hero {
  padding-block: $spacing-09;
}
```

```css
/* ✅ Correct — CSS custom properties are injected by Carbon CSS and work at runtime */
.hero {
  padding-block: var(--cds-spacing-09);
}
```

Common token mappings:

| ❌ SCSS variable    | ✅ CSS custom property        |
| ------------------- | ----------------------------- |
| `$spacing-05`       | `var(--cds-spacing-05)`       |
| `$spacing-09`       | `var(--cds-spacing-09)`       |
| `$background`       | `var(--cds-background)`       |
| `$layer-01`         | `var(--cds-layer-01)`         |
| `$text-primary`     | `var(--cds-text-primary)`     |
| `$border-subtle-00` | `var(--cds-border-subtle-00)` |

CSS custom properties are available whenever Carbon CSS is loaded (SCSS pipeline or
`@carbon/styles/css/styles.css`).

### 6) Using `<cds-row>` or treating the WC grid as a three-element system

`<cds-row>` is **not** a registered Carbon Web Component. Using it wraps columns in an
unknown element that collapses the entire layout.

```html
<!-- ❌ Wrong — cds-row does not exist; layout will collapse -->
<cds-grid>
  <cds-row>
    <cds-column lg="4">Content</cds-column>
  </cds-row>
</cds-grid>
```

**Default approach — CSS classes (no JS import required):**

```html
<!-- ✅ Correct — CSS class grid works with Carbon CSS alone -->
<div class="cds--grid">
  <div class="cds--row">
    <div class="cds--col-lg-4 cds--col-md-4 cds--col-sm-4">Content</div>
  </div>
</div>
```

**Alternative — WC elements (only when explicitly requested):**

```js
// Required import — must be included or columns will not render
import "@carbon/web-components/es/components/grid/index.js";
```

```html
<!-- ✅ Correct WC element grid — two elements only, columns are direct children of cds-grid -->
<cds-grid>
  <cds-column lg="4">Content</cds-column>
  <cds-column lg="12">Content</cds-column>
</cds-grid>
```

Do not use the WC element approach unless the user explicitly requests it.

---

## UIShell Layout

### 11) Hardcoding `margin-top` to compensate for a fixed Header

Carbon's `Header` is `position: fixed` — it is removed from document flow. Content
underneath will be hidden behind the header unless explicit top offset is applied.

```jsx
// ❌ Wrong — hardcoded pixel offset; breaks on custom header heights and is not Carbon
<main className="dashboard-content" style={{ marginTop: "48px" }}>
  ...
</main>
```

```scss
/* ❌ Also wrong — same problem in CSS */
.dashboard-content {
  margin-top: 48px;
}
```

```jsx
// ✅ Correct — use Carbon's Content component; padding-top: 3rem applied automatically
import { Content } from "@carbon/react";

<Content>{/* page content here */}</Content>;
```

`Content` is part of the UIShell layout family (`@carbon/react`). It is the only
approved way to offset content below a Carbon `Header`. Never substitute a hardcoded
pixel value regardless of how the agent frames it.

---

## Query Pitfalls

### 9) Putting framework names in `code_search` query text for component queries

```js
// ❌ Wrong — "react" in query text triggers AI Chat code routing
//    All passes search carbon_ai_chat_code; the modal is never found
code_search({
  query: "modal react default",
  filters: { component_type: "React" },
});

// ✅ Correct — component name only in query; framework goes in filters
code_search({ query: "modal default", filters: { component_type: "React" } });
```

The words `"react"` and `"web components"` in `code_search` query text trigger AI Chat
code intent detection. Every query pass is then routed to the AI Chat code index, regardless
of `component_type` or `component_id` filters. The component will never be found.

**Rule:** Express the framework exclusively via `filters.component_type`. Keep query text
to component names and variant descriptors only. Include `"ai chat"` only when AI Chat
example files are the actual goal.

### 10) Using `example` instead of `example_clean` for component JSX

```js
// ❌ Wrong — example field is stripped from variants after Stage 1 transform
const code = variant.example;

// ✅ Correct — example_clean is the authoritative, always-present field
const code = variant.example_clean;
```

Exception: for **icon and pictogram** results, use `source.example` — icon sources do not
have `variants[]` and their `example` field is preserved verbatim.
