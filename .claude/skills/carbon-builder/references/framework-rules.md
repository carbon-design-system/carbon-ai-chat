# Framework Rules

## 1. Always Set `filters.component_type`

Set `filters.component_type` whenever the user specifies a framework.

- User says "React" → `filters.component_type: "React"`
- User says "Web Components" → `filters.component_type: "Web Components"`
- User does not specify → **default to React**

---

## 2. Validate Results After Every Query

After every `code_search` response:

1. Discard any hit where `component_type` ≠ requested framework
2. If ≥ 1 valid hit remains → use only those hits
3. If 0 valid hits remain:
   - Retry **once** with an adjusted query (try aliases, hyphen/space normalization)
   - Do **not** silently fall back to the other framework

---

## 3. Never Mix React and Web Components

- React → output JSX only
- Web Components → output HTML/Lit-based examples only
- Use imports as an additional guardrail:
  - Web Components often use `import { html } from 'lit'`
  - React always uses `import React from 'react'` or direct component imports

---

## 4. Icons & Pictograms Routing Rule

> **Hard rule: Never include an icon or pictogram in generated code without first querying
> `code_search` to confirm it exists. Use the exact export name from the MCP response —
> never invent or assume an icon name.**

When the intent is an icon or pictogram search:

- Use `code_search`
- Do **not** set `filters.component_type`
- Do **not** set `filters.ibm_products`
- Set `filters.asset_type`:
  - `"icon"` for icon requests
  - `"pictogram"` for pictogram requests
- If ambiguous: try `"icon"` first, then `"pictogram"`, then retry without `asset_type`
- Normalize slugs: spaces → hyphens (e.g., `ai governance` → `ai-governance`)
- Probe Carbon-style double-hyphen slugs if applicable (e.g., `ai--governance`)
- If the icon name cannot be confirmed after retries, tell the user — do not fall back to a guessed name

**Example queries:**

```json
{"query": "ai-governance", "size": 2, "filters": {"asset_type": "icon"}}
{"query": "ai governance pictogram", "size": 2}
```

---

## 5. React SCSS Baseline

When generating React code, include Carbon SCSS imports in a project-level SCSS file
(e.g. `src/styles.scss` or `src/App.scss`).

### Required SCSS structure for React

**Component styles (required)** — emits the compiled CSS for every Carbon component (buttons,
tiles, tables, modals, etc.). Without this, all Carbon components render completely unstyled:

```scss
@use "@carbon/react";
```

**Token namespaces (optional)** — only needed if your custom SCSS uses Carbon tokens. These
enable `$spacing-*`, `$text-primary`, type mixins, breakpoint helpers, etc. in your own SCSS
without a namespace prefix:

```scss
@use "@carbon/react/scss/spacing" as *; // only if using $spacing-* tokens
@use "@carbon/react/scss/theme" as *; // only if using $text-*, $background, etc.
@use "@carbon/react/scss/type" as *; // only if using type mixins
@use "@carbon/react/scss/breakpoint" as *; // only if using breakpoint helpers
```

**Minimal baseline (components only, no custom SCSS):**

```scss
// Component styles — required for Carbon components to render correctly
@use "@carbon/react";
```

**Full baseline (with token imports for custom SCSS):**

```scss
// Token namespaces — optional, only if using these tokens in custom styles
@use "@carbon/react/scss/spacing" as *;
@use "@carbon/react/scss/theme" as *;
@use "@carbon/react/scss/type" as *;
@use "@carbon/react/scss/breakpoint" as *;

// Component styles — required
@use "@carbon/react";

// Your custom styles below
```

### Additional imports (include as needed)

| Import                                   | When to add                        |
| ---------------------------------------- | ---------------------------------- |
| `@use '@carbon/react/scss/grid' as *;`   | Carbon Grid layout utilities       |
| `@use '@carbon/react/scss/motion' as *;` | Carbon motion tokens               |
| `@use '@carbon/react/scss/layer' as *;`  | Layer nesting or `$layer-*` tokens |
| `@use '@carbon/react/scss/colors' as *;` | IBM Design Language color swatches |
| `@use '@carbon/react/scss/reset' as *;`  | CSS baseline reset                 |

### Entry-module wiring

Import the SCSS file in the app entry module **before** any component imports:

```js
// src/main.jsx or src/index.jsx
import "./styles.scss"; // ← Carbon SCSS tokens — must come first
import App from "./App";
```

The SCSS file may be named `styles.scss`, `App.scss`, or any project-consistent name.
What matters is consistency and that the import precedes component imports.

### Never do this for React

```js
// ❌ Wrong — CSS file bypasses SCSS token resolution; not aligned with design system guidance
import "@carbon/styles/css/styles.css";
```

### IBM Plex font and typography

IBM Plex is provided automatically through the Carbon SCSS token system above.
**Do not add a separate font CDN link for React SCSS projects** — the SCSS pipeline
handles it.

For CDN/quick-start scenarios (no bundler, Web Components only), load IBM Plex from the
IBM-hosted CDN exclusively:

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

```html
<!-- ❌ Wrong — Google Fonts is not permitted for IBM Plex -->
<link
  href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans..."
  rel="stylesheet"
/>
```

```css
/* ❌ Wrong — @import from Google Fonts is not permitted */
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex...");
```

Apply typography via semantic HTML tags (`h1`, `h2`, `h3`, `p`) with Carbon type tokens or classes.

### Use Carbon spacing tokens via SCSS utility classes

```scss
.section-spacing {
  margin-block: $spacing-07;
}
.aligned-grid {
  gap: $spacing-05;
}
```

### Never use inline token strings

```jsx
// ❌ Wrong — token strings do NOT resolve at runtime
<Component style={{ margin: "$spacing-05" }} />
```

```jsx
// ✅ Correct — use className referencing an SCSS utility class
<Component className="section-spacing" />
```

---

## 6. Web Components Styling Safety Rules

When the target framework is **Web Components**, prefer a minimal import strategy first.

### Stepwise SCSS setup protocol

1. **Minimal baseline (always first)**

```scss
@use "@carbon/styles/scss/reset";
@use "@carbon/styles/scss/type";
```

2. **Add grid only when layout utilities are needed**

```scss
@use "@carbon/styles/scss/reset";
@use "@carbon/styles/scss/type";
@use "@carbon/styles/scss/grid";
```

3. **Add theme wiring only when explicitly required**

```scss
@use "@carbon/styles/scss/reset";
@use "@carbon/styles/scss/theme";
@use "@carbon/styles/scss/themes";
@use "@carbon/styles/scss/type";
@use "@carbon/styles/scss/grid";
```

### Project wiring checks

- Import SCSS from the app entry module before component imports (for example `import './styles.scss';`).
- Do not use HTML `<link>` tags for SCSS files.
- Preserve an existing app theme class when present; otherwise default to `<body class="cds--white">`.

### Avoid fragile theme wiring by default

- Do not introduce `@use '@carbon/styles/scss/theme' with (...)` or `@use '@carbon/styles/scss/themes'` unless explicitly required by the user/task.
- Start from the minimal baseline and expand only when needed.

### CSS fallback path

- If SCSS import resolution fails, fall back to app-entry CSS import:
  - `@carbon/styles/css/styles.css`
- For Carbon Web Components, keep component imports package-native and avoid inventing non-existent CSS files.

### Token usage in component styles (Hard Rule)

Carbon SCSS variables (`$spacing-*`, `$background`, `$layer-01`, etc.) are **compile-time only** —
they resolve during SCSS compilation and are unavailable at runtime in component styles or inline CSS.
In Web Components, always use **CSS custom properties** instead:

| ❌ SCSS variable (compile-time only) | ✅ CSS custom property (runtime) |
| ------------------------------------ | -------------------------------- |
| `$spacing-05`                        | `var(--cds-spacing-05)`          |
| `$spacing-09`                        | `var(--cds-spacing-09)`          |
| `$background`                        | `var(--cds-background)`          |
| `$layer-01`                          | `var(--cds-layer-01)`            |
| `$text-primary`                      | `var(--cds-text-primary)`        |
| `$border-subtle-00`                  | `var(--cds-border-subtle-00)`    |

CSS custom properties are injected by the compiled Carbon CSS (SCSS pipeline or prebuilt
`@carbon/styles/css/styles.css`) and work at runtime. Using SCSS variables produces no output
and silently renders as unstyled or zero-value properties.

```css
/* ✅ Correct — runtime-safe token usage in Web Components styles */
.hero-section {
  padding-block: var(--cds-spacing-09);
  background: var(--cds-background);
  color: var(--cds-text-primary);
}
```

### Grid layout — CSS classes, not custom elements (Hard Rule)

The Carbon grid for Web Components is **CSS-based**. Use class names directly on `<div>` elements —
this requires no JavaScript import beyond the Carbon CSS:

```html
<!-- ✅ Correct — CSS class grid, works with Carbon CSS alone -->
<div class="cds--grid">
  <div class="cds--row">
    <div class="cds--col-lg-4 cds--col-md-4 cds--col-sm-4">...</div>
    <div class="cds--col-lg-8 cds--col-md-4 cds--col-sm-4">...</div>
  </div>
</div>
```

```html
<!-- ❌ Wrong — treats the grid as web components; cds-row does not exist -->
<cds-grid>
  <cds-row>
    <cds-column lg="4">...</cds-column>
  </cds-row>
</cds-grid>
```

`<cds-grid>` and `<cds-column>` web component elements do exist in the package but they
require an explicit JS import (`@carbon/web-components/es/components/grid/index.js`) and
use a two-element system with no `<cds-row>`. The CSS class approach is simpler, requires
no import, and is the recommended default. Only use the WC element approach if the user
explicitly requests it and you include the required JS import.

---

## 7. Component Composition Rules

Certain components have silent prop or composition requirements that are easy to
miss and cause accessibility or layout failures without obvious error messages.

### Modal

**`onRequestClose` not `onClose`** — the callback prop for dismissal:

```jsx
// ❌ Wrong — does not fire:
<Modal onClose={() => setOpen(false)} open={open} />

// ✅ Correct:
<Modal onRequestClose={() => setOpen(false)} open={open} />
```

**`autoAlign` on floating-UI children inside Modal** — required to prevent Dropdown,
ComboBox, and Select from positioning outside the viewport when rendered inside a Modal:

```jsx
// ❌ Wrong — dropdown clips or overflows:
<Dropdown id="d1" titleText="Region" items={items} />

// ✅ Correct — use autoAlign inside Modal:
<Dropdown autoAlign id="d1" titleText="Region" items={items} itemToString={i => i?.text ?? ''} />
<ComboBox autoAlign id="c1" titleText="Role" items={items} />
```

**`data-modal-primary-focus` on the first focusable input** — Carbon uses this
attribute to set initial focus when the Modal opens (accessibility requirement):

```jsx
<TextInput
  data-modal-primary-focus
  id="domain"
  labelText="Domain name"
  placeholder="example.com"
/>
```

**Complete correct Modal with form composition:**

```jsx
<Modal
  open={open}
  onRequestClose={() => setOpen(false)}
  modalHeading="Add a custom domain"
  primaryButtonText="Add"
  secondaryButtonText="Cancel"
>
  <TextInput
    data-modal-primary-focus
    id="domain"
    labelText="Domain name"
    placeholder="example.com"
    style={{ marginBottom: "1.5rem" }}
  />
  <Dropdown
    autoAlign
    id="region"
    titleText="Region"
    label="Select region"
    items={[{ id: "us-south", text: "US South" }]}
    itemToString={(item) => item?.text ?? ""}
  />
  <ComboBox
    autoAlign
    id="role"
    titleText="Permissions"
    items={["Viewer", "Editor", "Manager"]}
  />
</Modal>
```

### Feature flags for Modal

When using the `enableDialogElement` or `enablePresence` flags:

```jsx
import { FeatureFlags } from '@carbon/react';

<FeatureFlags enableDialogElement enablePresence>
  <Modal ... />
</FeatureFlags>
```

---

## 8. Component Selection Rules (Critical)

Certain Carbon components have specific use cases and must not be confused with similar-looking alternatives.

### Tag vs Status Indicators

**Tag** — classifies content: "what is this?" (category, label, keyword). Use for: categories, labels, filters.

**Status Indicators** — communicate state: "what is happening?" Use `IconIndicator` or `ShapeIndicator`.

- Import: `import { preview__IconIndicator as IconIndicator } from '@carbon/react';`
- Use the `kind` prop: `failed`, `warning`, `caution`, `succeeded`, `in-progress`, `pending`, etc.
- **Never query `code_search` with `asset_type: "icon"` for status indicators** — they are components, not icons.

**Critical Rule:** NEVER use colored Tag for status — use `IconIndicator`/`ShapeIndicator` instead.

```jsx
// ❌ Wrong — Tag is not a status indicator
<Tag type="red">Failed</Tag>
<Tag type="green">Success</Tag>

// ✅ Correct — Tag for classification
<Tag>Category: Documentation</Tag>

// ✅ Correct — Status Indicator for state
import { preview__IconIndicator as IconIndicator } from '@carbon/react';

<IconIndicator kind="failed" />
<IconIndicator kind="succeeded" />
<IconIndicator kind="in-progress" />
```

**Decision:** Classification (what it IS) → Tag | State (what's HAPPENING) → IconIndicator/ShapeIndicator

---

### Tabs Component Pairing

Horizontal and vertical tabs use different component sets — never mix them.

**Horizontal Tabs** — `Tabs` + `TabList`:

```jsx
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";

<Tabs>
  <TabList aria-label="List of tabs">
    <Tab>Tab 1</Tab>
    <Tab>Tab 2</Tab>
  </TabList>
  <TabPanels>
    <TabPanel>Content 1</TabPanel>
    <TabPanel>Content 2</TabPanel>
  </TabPanels>
</Tabs>;
```

**Vertical Tabs** — `TabsVertical` + `TabListVertical`:

```jsx
import {
  TabsVertical,
  TabListVertical,
  Tab,
  TabPanels,
  TabPanel,
} from "@carbon/react";

<TabsVertical>
  <TabListVertical aria-label="List of vertical tabs">
    <Tab>Tab 1</Tab>
    <Tab>Tab 2</Tab>
  </TabListVertical>
  <TabPanels>
    <TabPanel>Content 1</TabPanel>
    <TabPanel>Content 2</TabPanel>
  </TabPanels>
</TabsVertical>;
```

**Critical Rules:**

- NEVER mix `Tabs` with `TabListVertical` or `TabsVertical` with `TabList`
- `Tab`, `TabPanels`, and `TabPanel` work with both orientations

**Decision:** Horizontal → `Tabs` + `TabList` | Vertical → `TabsVertical` + `TabListVertical`
