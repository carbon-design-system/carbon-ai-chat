# Accessibility Rules — WCAG 2.2 AA

Apply these rules **inline while writing code**. Carbon components are WCAG-compliant by
design — your job is to not break what Carbon provides and to fill the gaps Carbon cannot
fill automatically (semantic structure, alt text, focus management, form labels).

---

## Carbon handles this for you — do not override

Adding these manually duplicates Carbon's built-in ARIA and will break assistive technology.

| Carbon component                               | What it provides automatically                                         | What breaks it                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `<Modal>`                                      | `role="dialog"`, `aria-modal`, focus trap, return-focus on close       | Adding `role="dialog"` manually; overriding `tabIndex` on interior elements |
| `<Button>` (with visible text)                 | Accessible name from text content                                      | Adding `aria-label` that differs from visible text (violates 2.5.3)         |
| `<InlineNotification>` / `<ToastNotification>` | `role="alert"` or `role="status"`                                      | Wrapping in another `role="alert"` container                                |
| `<Header>`                                     | `<header>` landmark, skip-to-content link                              | Adding a second `<header>` element outside Carbon's `<Header>`              |
| `<SideNav>`                                    | `<nav>` landmark with `aria-label`                                     | Wrapping in another `<nav>`                                                 |
| `<Breadcrumb>`                                 | `<nav aria-label="Breadcrumb">`, `aria-current="page"` on current item | Setting `aria-current` manually; wrapping in `<nav>`                        |
| `<DataTable>`                                  | `role="grid"`, column sort announcements, selection state              | Re-implementing sort headers manually                                       |
| `<ComboBox>` / `<MultiSelect>`                 | `role="combobox"`, `aria-expanded`, `aria-activedescendant`            | Adding these ARIA attributes manually                                       |

---

## Required Carbon props that activate accessibility

These props are optional in TypeScript but **mandatory for accessible output**. Omitting them
produces a silently inaccessible component — no build error, no console warning.

| Component                                | Required prop(s)                  | What breaks without it                              |
| ---------------------------------------- | --------------------------------- | --------------------------------------------------- |
| `<Button>` — icon only (no visible text) | `iconDescription`                 | No accessible name; screen reader announces nothing |
| `<IconButton>`                           | `label`                           | No accessible name                                  |
| `<TextInput>`                            | `labelText`                       | Input has no programmatic label                     |
| `<TextArea>`                             | `labelText`                       | Textarea has no programmatic label                  |
| `<Select>`                               | `labelText`                       | Select has no programmatic label                    |
| `<Checkbox>`                             | `labelText`                       | Checkbox has no label                               |
| `<RadioButton>`                          | `labelText`                       | Radio has no label                                  |
| `<Toggle>`                               | `labelText` + `labelA` + `labelB` | State changes not announced                         |
| `<Search>`                               | `labelText`                       | Search field unlabeled                              |
| `<Modal>`                                | `modalHeading`                    | Dialog has no accessible name                       |
| `<FileUploader>`                         | `labelTitle` + `labelDescription` | Upload control unlabeled                            |
| `<NumberInput>`                          | `label`                           | Input has no label                                  |
| `<Slider>`                               | `labelText`                       | Slider has no label                                 |
| `<InlineNotification>`                   | `title`                           | Alert content not announced                         |
| `<Tag>` — interactive                    | `title`                           | Tag action unlabeled                                |

```jsx
// ❌ Wrong — icon-only button with no accessible name
<Button renderIcon={Add} hasIconOnly onClick={handleAdd} />

// ✅ Correct
<Button renderIcon={Add} hasIconOnly iconDescription="Add item" onClick={handleAdd} />
```

```jsx
// ❌ Wrong — input with no label
<TextInput id="email" placeholder="Enter email" />

// ✅ Correct
<TextInput id="email" labelText="Email address" placeholder="name@example.com" />
```

---

## Semantic page structure

### Heading hierarchy

- One `<h1>` per page — use Carbon `<Heading>` or native `<h1>`–`<h6>`
- Never skip heading levels (h1 → h3 is invalid; h1 → h2 → h3 is correct)
- Headings must reflect document structure, not visual styling
- Use Carbon's `<Section>` + `<Heading>` for automatic level tracking in Carbon's heading system

```jsx
// ❌ Wrong — skipped level
<h1>Dashboard</h1>
<h3>Recent activity</h3>

// ✅ Correct
<h1>Dashboard</h1>
<h2>Recent activity</h2>
```

### Landmark regions

Carbon's shell components provide landmarks automatically:

- `<Header>` → `<header>` landmark
- `<SideNav>` → `<nav>` landmark
- `<Content>` → `<main>` landmark
- `<Footer>` → `<footer>` landmark

When **not** using Carbon's shell, add landmarks manually:

```html
<!-- ✅ Minimal landmark structure without Carbon shell -->
<header>...</header>
<nav aria-label="Primary navigation">...</nav>
<main>...</main>
<footer>...</footer>
```

Multiple `<nav>` elements must each have a unique `aria-label` to distinguish them.

### Lists

Use `<ul>`/`<ol>` for groups of related items — navigation links, card grids, tag groups.
Never build lists from `<div>` elements.

```jsx
// ❌ Wrong — navigation links in divs
<div className="nav-links">
  <div><a href="/home">Home</a></div>
  <div><a href="/about">About</a></div>
</div>

// ✅ Correct
<ul>
  <li><a href="/home">Home</a></li>
  <li><a href="/about">About</a></li>
</ul>
```

---

## Images and icons

### Meaningful images

`alt` text must describe the function or content — not the appearance.

```jsx
// ❌ Wrong — describes appearance
<img src="chart.png" alt="Blue bar chart" />

// ✅ Correct — describes content/function
<img src="chart.png" alt="Monthly sales: Q1 $1.2M, Q2 $1.5M, Q3 $1.1M" />
```

### Decorative images

Set `alt=""` — never omit `alt` entirely (omission causes screen readers to announce the filename).

```jsx
<img src="decorative-wave.svg" alt="" role="presentation" />
```

### Inline SVG icons (outside Carbon components)

```jsx
// ❌ Wrong — no accessible name, not hidden
<svg viewBox="0 0 32 32"><path d="..." /></svg>

// ✅ Correct — meaningful icon
<svg viewBox="0 0 32 32" role="img" aria-label="Settings">
  <title>Settings</title>
  <path d="..." />
</svg>

// ✅ Correct — decorative icon
<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <path d="..." />
</svg>
```

Carbon icon components (`<Add />`, `<Settings />`) accept `aria-label` and `aria-hidden`
directly — use those props instead of wrapping with SVG attributes.

---

## Keyboard and focus

### Tab order

- Never use `tabIndex > 0` — positive tabindex removes the element from natural tab flow and
  creates a separate, confusing tab sequence
- `tabIndex={0}` is correct only when making a non-interactive element focusable (custom widget)
- `tabIndex={-1}` is correct for elements that receive focus programmatically but not via Tab

```jsx
// ❌ Wrong — disrupts tab order
<div tabIndex={3}>...</div>

// ✅ Correct — participates in natural tab flow
<div tabIndex={0} role="button" onClick={...} onKeyDown={...}>...</div>
```

### Non-interactive elements with click handlers

`<div>`, `<span>`, and `<p>` are not keyboard-reachable by default. Any element with an
`onClick` handler must be either a native interactive element or have all three of:
`role`, `tabIndex={0}`, and a `onKeyDown` handler.

```jsx
// ❌ Wrong — not keyboard accessible
<div onClick={handleSelect} className="card">...</div>

// ✅ Correct — use a button
<button type="button" onClick={handleSelect} className="card">...</button>

// ✅ Correct — custom interactive element
<div
  role="button"
  tabIndex={0}
  onClick={handleSelect}
  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect(e)}
>
  ...
</div>
```

### Focus management after dynamic changes

| Scenario                           | Required action                                                        |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Modal opens                        | Carbon handles — do not add manual `focus()`                           |
| Modal closes                       | Carbon returns focus to the trigger — do not override                  |
| Toast / notification appears       | No focus move required; `role="alert"` announces it                    |
| Step wizard advances               | Move focus to new step heading or first focusable element              |
| Inline content expands (accordion) | Carbon handles — do not override                                       |
| Page navigation (SPA)              | Move focus to `<main>` or new page heading after route change          |
| Item deleted from a list           | Return focus to next item, or previous item if last, or list container |

### Focus visibility

Never remove Carbon's focus ring styles:

```css
/* ❌ Wrong — removes visible focus indicator (fails 2.4.7) */
*:focus {
  outline: none;
}
button:focus {
  outline: 0;
}

/* ✅ Correct — replace with a custom visible indicator if needed */
*:focus-visible {
  outline: 2px solid var(--cds-focus);
  outline-offset: 2px;
}
```

---

## Forms

### Label association

Always use Carbon's `labelText` prop — it generates a `<label>` with a `for` attribute
wired to the input's `id`. Never substitute a visible `<p>` or `aria-label` for a real label.

```jsx
// ❌ Wrong — placeholder is not a label; disappears on input
<TextInput id="name" placeholder="Full name" />

// ❌ Wrong — aria-label replaces visible label; invisible to sighted users
<TextInput id="name" aria-label="Full name" />

// ✅ Correct
<TextInput id="name" labelText="Full name" />
```

### Error messages

Use Carbon's `invalid` and `invalidText` props — they wire up `aria-describedby` automatically.
Never convey errors only through color or icon.

```jsx
// ❌ Wrong — error only shown visually
<TextInput id="email" labelText="Email" className="error-border" />

// ✅ Correct — announced by screen reader
<TextInput
  id="email"
  labelText="Email address"
  invalid={hasError}
  invalidText="Enter a valid email address"
/>
```

### Required fields

```jsx
// ✅ Correct — Carbon marks required fields and wires aria-required
<TextInput id="email" labelText="Email address" required />
```

### Helper text

Use Carbon's `helperText` prop — it links via `aria-describedby`. Do not use a separate
`<p>` element next to an input without also wiring `aria-describedby` manually.

---

## ARIA — use sparingly

Three rules:

1. **If Carbon already provides it, do not add it again.** Duplicate ARIA (two `role="dialog"`,
   two `aria-label` on the same element) breaks assistive technology announcement.

2. **`aria-label` must contain the visible text** (WCAG 2.5.3). If a button reads "Submit",
   its `aria-label` must include "Submit" — not replace it with something different.

3. **`aria-hidden="true"`** removes an element from the accessibility tree entirely — never
   apply it to interactive elements or their ancestors.

```jsx
// ❌ Wrong — aria-label conflicts with visible text
<Button aria-label="Click here to submit the form">Submit</Button>

// ✅ Correct — visible text is the accessible name; no aria-label needed
<Button>Submit</Button>

// ✅ Correct — aria-label supplements (e.g. disambiguating identical buttons)
<Button aria-label="Delete item: Project Alpha">Delete</Button>
```

---

## WCAG 2.2 — new criteria

These criteria are new in WCAG 2.2 and are not handled by Carbon automatically.

### Focus Not Obscured (2.4.11)

A focused element must not be entirely hidden behind a sticky header, footer, or floating panel.
When adding sticky elements, ensure the page body has sufficient `scroll-margin-top` /
`scroll-padding-top` so focused elements scroll into view.

```css
/* ✅ Correct — compensate for a 48px sticky header */
html {
  scroll-padding-top: 4rem;
}
```

### Target Size — Minimum (2.5.8)

Interactive targets must be at least **24×24 CSS pixels**. Carbon buttons and controls meet
this by default. Custom interactive elements (icon links, custom toggles) must also meet it.
Prefer Carbon's built-in sizes (44×44px) over the minimum.

```css
/* ✅ Correct — custom interactive element meets minimum */
.custom-action {
  min-width: 24px;
  min-height: 24px;
}
```

### Label in Name (2.5.3)

When an interactive element has visible text, its accessible name must **contain** that text.
The `aria-label` value must not replace or contradict visible text.

```jsx
// ❌ Wrong — aria-label replaces visible text; accessible name does not contain "Next"
<Button aria-label="Go to the next step">Next</Button>

// ✅ Correct — accessible name contains "Next"
<Button aria-label="Next: Review order">Next</Button>

// ✅ Correct — no aria-label needed; visible text is sufficient
<Button>Next</Button>
```

### Accessible Authentication (3.3.8)

Do not use cognitive tests (image-matching puzzles, drag-and-drop CAPTCHAs) in
authentication flows without providing an accessible text-based alternative.
Standard password fields and Carbon form inputs are compliant.

---

## Color and contrast

- Use **Carbon tokens** for all colors — `var(--cds-text-primary)`, `var(--cds-background)`,
  `var(--cds-layer-01)`, etc. Token-based colors are WCAG AA contrast-compliant by design.
- **Never convey information by color alone.** Error states, status indicators, and data
  categories must also have a text label, icon, or pattern.
- Do not hardcode hex/rgb color values that bypass the token system — they will fail in
  dark/high-contrast themes and may fail contrast ratios.

```jsx
// ❌ Wrong — error conveyed only by red border
<div style={{ border: '2px solid red' }}>Invalid input</div>

// ✅ Correct — error conveyed by icon + text via Carbon
<InlineNotification kind="error" title="Error" subtitle="Please fix the fields below." />
```

---

## Motion

Any CSS animation or transition added **outside Carbon components** must respect the
user's motion preference. Carbon's own motion tokens already handle this internally.

```css
/* ✅ Correct — custom animation with reduced-motion respect */
.panel-slide {
  transition: transform 300ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .panel-slide {
    transition: none;
  }
}
```
