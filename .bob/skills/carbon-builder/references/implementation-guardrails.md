# Implementation Guardrails

## 1. Stability Policy (Hard Rule)

Never suggest or use unstable, preview, canary, or `@carbon/labs-react` components unless:

- the user explicitly asks for them, or
- they are already present in the repository.

If a stable Carbon equivalent exists, use the stable option by default.

---

## 2. AI Chat SSR Build-Safety (Hard Rule)

Apply this section when generating code that uses `@carbon/ai-chat` or `@carbon/web-components`.

### Detect SSR first

Before choosing imports/integration patterns, check for SSR indicators:

- SSR entry files (`entry-server.*`, `server.js`, `server.ts`)
- SSR config in `vite.config.*` / `webpack.config.*` (`ssr`, `ssr.external`, `ssr.noExternal`)
- SSR scripts in `package.json` (`build:ssr`, `dev:ssr`, `preview:ssr`)

### If SSR is present

- Do not use top-level browser-only imports in SSR-rendered code paths.
- Use client-only loading (`React.lazy` + `Suspense`, or dynamic import in `useEffect`).
- Add `@carbon/ai-chat` and `@carbon/web-components` to `ssr.external` when needed.
- Treat client-only loading and SSR config as a required pair.

### If SSR is not present

- Standard client-side imports are acceptable.

### CSS import rule

- Do not import CSS from `@carbon/ai-chat/es/index.css` (or similar paths).
- AI Chat styles are encapsulated; invalid CSS imports cause build failures.

---

## 3. Package and Dependency Rules

- Prefer official Carbon packages over recreating equivalent components.
- If the required Carbon package is missing, add the dependency instead of hand-building a clone.
- **React**: Component styles are required in the project-level SCSS file (e.g. `src/styles.scss`): `@use '@carbon/react'` — without this, all components render unstyled. Token imports (`@use '@carbon/react/scss/spacing' as *`, `theme`, `type`, `breakpoint`) are optional — only include if custom SCSS uses those tokens. Never use `@carbon/styles/css/styles.css` for React.
- **Theme configuration syntax (Hard Rule)**: When configuring the Carbon theme via `@use '@carbon/styles/scss/theme' with ($theme: ...)`, you must pass a **theme map variable**, never a string. Import theme maps from `@carbon/styles/scss/themes` first:
  ```scss
  @use "@carbon/styles/scss/themes" as *;
  @use "@carbon/styles/scss/theme" with (
    $theme: $white
  ); // $white, $g10, $g90, $g100
  ```
  ❌ `$theme: 'white'` — causes `$map2: "white" is not a map` at compile time.
  ✅ `$theme: $white` — correct; `$white` is the map variable, not a string.
- **Web Components**: Carbon global styles come from `@carbon/styles/scss/` (preferred) or `@carbon/styles/css/styles.css` as a CSS fallback. See Rule 6 in `framework-rules.md`.
- **Web Components grid default (Hard Rule)**: Prefer the CSS class grid — `.cds--grid`, `.cds--row`, and `.cds--col-*` on standard `<div>` elements. This is the reliable default and requires no JS grid import beyond Carbon CSS.
- **Web Components grid alternative**: Only use `<cds-grid>` with `<cds-column>` if the user explicitly requests the web-component grid API and you include `import '@carbon/web-components/es/components/grid/index.js';`. Never invent `<cds-row>` — it is not a registered grid element.

- When using `@carbon/react`, no separate `@carbon/styles` install is needed — it ships as a transitive dependency. Add `sass` to devDependencies if not already present.
- **React only** — when using `@carbon/ibm-products`, styles must be loaded in addition to the
  Carbon baseline. There are two valid approaches — **do not mix them**:

  **Option A — SCSS (preferred for enterprise / theme control).** Add to your project SCSS file.
  Import order is mandatory — Carbon must come before IBM Products:

  ```scss
  // ✅ Correct SCSS order
  @use "@carbon/styles"; // Carbon foundation — first
  @use "@carbon/ibm-products/scss/index"; // IBM Products layer — after Carbon
  ```

  ```scss
  // ❌ WRONG — reversed order breaks tokens and mixins
  @use "@carbon/ibm-products/scss/index";
  @use "@carbon/styles";

  // ❌ WRONG — @use does not process .css files; causes silent failure or build error
  @use "@carbon/ibm-products/css/index.min.css";
  ```

  **Option B — Prebuilt CSS (simpler, no theming).** Import both in the JS entry file:

  ```javascript
  // ✅ Correct CSS-only setup
  import "@carbon/styles/css/styles.css";
  import "@carbon/ibm-products/css/index.min.css";
  ```

  **`pkg` flags** — some IBM Products components require explicit opt-in before they render:

  ```javascript
  import { pkg } from "@carbon/ibm-products";
  pkg.component.Datagrid = true; // enable each required component
  ```

  If a component renders nothing or fails silently, missing `pkg.component` flag is the
  most likely cause.

  **Web Components:** IBM Products for Web Components uses the separate package
  `@carbon/ibm-products-web-components`. Its CSS import paths differ from the React package.
  Do not apply the React SCSS or CSS paths to a Web Components project.
  Verify the correct setup via MCP or the package's own documentation before generating.

- For charts, continue following `get_charts` assembly hints verbatim.
- For Web Components projects:
  - Use `@carbon/web-components` for components and `@carbon/styles` for global Carbon styles/fonts.
  - Add `sass` only when SCSS is explicitly used.
  - Never reference undocumented/non-existent style paths (for example ad-hoc component CSS files).

---

## 4. Component/API Correctness

- Avoid deprecated props when a supported prop exists.
- Validate props against current examples/docs returned by MCP tools.
- Keep imports aligned with returned package/source guidance.

---

## 5. Styling and Theming Discipline

- **MANDATORY: Never use inline styles in JSX/TSX components.** All styling must be defined in SCSS/CSS files using Carbon tokens and mixins. Apply styles via `className` prop with custom class names. Inline `style` props are forbidden except for dynamic values that cannot be predetermined (e.g., user-controlled dimensions, animation transforms).
- Use Carbon theme tokens, spacing tokens, and typography mixins over hardcoded values.
- Avoid targeting Carbon internal class names (for example `.bx--`, `.cds--`) unless no alternative exists and the user explicitly confirms.
- Avoid direct style overrides of Carbon internals unless necessary and explicitly confirmed.
- Do not force explicit `<Theme>` wrappers when the host app already provides Carbon theme context.
- For Web Components runtime styles, SCSS token variables are unavailable at runtime. Use CSS custom properties such as `var(--cds-spacing-05)`, `var(--cds-background)`, and `var(--cds-layer-01)` instead of `$spacing-05`, `$background`, or `$layer-01`.
- For Web Components styling setup:
  - Prefer a minimal SCSS baseline first: `@use '@carbon/styles/scss/reset';` and `@use '@carbon/styles/scss/type';`
  - Only add advanced theme SCSS wiring when explicitly required.
  - If SCSS wiring fails, fall back to `@carbon/styles/css/styles.css` in the entry module.
- **CDN guidance** — only the IBM CDN (`1.www.s81c.com`) is permitted. Never use Google Fonts, jsDelivr, unpkg, or any other third-party CDN for Carbon components or IBM Plex fonts.

  | Resource                | IBM CDN URL                                                                              |
  | ----------------------- | ---------------------------------------------------------------------------------------- |
  | IBM Plex Sans           | `https://1.www.s81c.com/common/carbon/plex/sans.css`                                     |
  | IBM Plex (full package) | `https://1.www.s81c.com/common/carbon/plex/plex-full.css`                                |
  | Carbon Web Components   | `https://1.www.s81c.com/common/carbon/web-components/version/v2.24.0/[component].min.js` |

  Replace `[component]` with the component name (e.g. `button`, `dropdown`, `modal`).
  For React SCSS projects, IBM Plex is delivered by the SCSS pipeline — no CDN font link needed at all.

---

## 6. Web Components Project Setup Checklist

Before finalizing a Web Components implementation:

- Ensure an app entry module imports styles before component imports (for example `import './styles.scss';` first).
- Ensure `<body>` preserves an existing Carbon theme class; if none exists, use `cds--white`.
- Ensure SCSS files are not referenced through HTML `<link>` tags.
- Ensure dependencies include `@carbon/web-components` and `@carbon/styles`; add `sass` only when SCSS is used.

---

## 7. Layout and Accessibility Guardrails

- Use separate Grid containers for distinct logical content groups; specify responsive spans (`sm`/`md`/`lg`) for all layout columns. See [references/grid-system.md](references/grid-system.md) for variants, vertical spacing, nested grids, and column span calculation.
- Keep overlay/floating UI (modals, side panels, tooltips, toasts) out of normal page Grid flow.
- Breadcrumb current item must use `isCurrentPage` and must not include `href`.
- Icon-only interactive controls must include descriptive `iconDescription`.
- **UIShell Header + Content (Hard Rule):** Carbon's `Header` uses `position: fixed`, removing it from document flow. Always wrap the main page content in the `Content` component from `@carbon/react` — it applies `padding-top: 3rem` (48px) automatically. Never apply `margin-top: 48px` or any hardcoded pixel offset as a substitute. The `Content` component is the correct Carbon composition pattern and the only approved fix.

### Layer System

Never set `level` manually — nesting determines level automatically. Use `withBackground` when a visible background color change is intended; without it, Layer only provides theme context with no visual change.

```jsx
// ✅ Correct — nesting determines level; withBackground for visible layer
<Layer withBackground>
  <ComponentOnLayer01 />
  <Layer>
    <ComponentOnLayer02 />
  </Layer>
</Layer>

// ❌ Wrong — manual level prop breaks the automatic system
<Layer level={2}>...</Layer>
```

---

## 8. Image-Driven UI Workflow Guardrails

Apply this section when the user provides images or visual references for UI implementation.

- Perform a complete design analysis before implementation.
- Start with design scale analysis (dimensions/proportions) before mapping components.
- Include these sections in analysis output:
  - Component Inventory
  - Typography Analysis
  - Grid Analysis — see [references/grid-system.md](references/grid-system.md) for variant selection, column span calculation, and logical content group rules
  - Spacing Analysis
- Use separate Grid containers for logical content groups that should wrap together.
- Pause after presenting analysis and get user confirmation before implementation.
- Prefer custom class names for styling; avoid Carbon internal class targeting unless explicitly confirmed.
- Validate implemented UI behavior in the browser (visual, responsive, and accessibility checks).
