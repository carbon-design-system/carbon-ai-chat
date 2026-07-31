# storybook.md — `@carbon/ai-chat-components` Storybook

Load this when authoring or editing a component's stories (`*.stories.js` / `*-react.stories.jsx`) or docs (`*.mdx` / `*-react.mdx`). Every component's Overview must lead with a live, rendered example.

This package runs **two** Storybooks: the Lit one (`.storybook/`, port 6006, `npm run storybook`) and the React-wrapper one (`.storybook-react/`, port 7007, `npm run storybook:react`). Every component ships stories + docs for both. Titles, args, and story names are kept identical across the two so they line up. CSF3, no autodocs — docs are hand-written MDX attached with `<Meta of={Stories}/>`; the docs tab is globally named **Overview**.

## Files per component

All four live directly in `<component>/__stories__/` — the Storybook globs are flat, so do **not** nest a `stories/` subfolder.

| File                                  | Port   | Purpose                                                                                              |
| ------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `<name>.stories.js`                   | 6006   | Lit CSF3 stories: `Default` + variants                                                               |
| `<name>.mdx`                          | 6006   | Lit Overview; leads with `<Canvas of={Stories.Default}/>`                                            |
| `<name>-react.stories.jsx`            | 7007   | React-wrapper stories; reuse the Lit `args`/`argTypes` via spread                                    |
| `<name>-react.mdx`                    | 7007   | React Overview; also leads with a live `<Canvas>`                                                    |
| `preview-<name>.stories.*`            | either | Experimental variants; title under `Preview/` (see [component-authoring.md](component-authoring.md)) |
| `story-data.js` / `story-styles.scss` | —      | Co-located shared fixtures (`?lit` import for Lit, plain import for React)                           |

## Overview MDX template

Lead with a live render, then the API. **Copy the template files, don't model on another component's MDX** — shipped Overviews predate this shape and still carry CDN blocks and other cruft.

| Template                                                   | Copy to                                    |
| ---------------------------------------------------------- | ------------------------------------------ |
| [overview-lit.template.mdx](overview-lit.template.mdx)     | `<component>/__stories__/<name>.mdx`       |
| [overview-react.template.mdx](overview-react.template.mdx) | `<component>/__stories__/<name>-react.mdx` |

Each template carries the full section order with every section marked REQUIRED or OPTIONAL, plus placeholder-replacement instructions in a leading `{/* … */}` comment — delete that comment and the OPTIONAL sections you don't need. The two files live here, outside `src/`, so Storybook's globs never pick them up.

**ArgTypes source differs by side**: Lit MDX passes the **tag string** (`<ArgTypes of="cds-aichat-<name>"/>`, reads `custom-elements.json`); React MDX passes the **module ref** (`<ArgTypes of={Stories.Default}/>`, documents the wrapper's camelCase props / `on*` handlers).

Rules: the `## Overview` intro is 1–2 task-led sentences ([tone.md](../../../references/tone.md)); the reader sees the render next. Any real prose (extra usage, perf notes) goes **after** the hero Canvas under its own `##`. Multi-element families add a `<Canvas>` per meaningful variant and an `<ArgTypes>` per sub-element. Keep the Lit and React Overviews on the same headings and the same story names — they document one component from two sides.

## Story template (CSF3)

Lit `<name>.stories.js` — kebab-case attributes, `?bool` / `.prop` / `ifDefined` / `@event`+`action()` bindings, every control with a `description`; add `table.defaultValue` only where Storybook can't infer the default from `args`:

```javascript
/**
 * @license
 * Copyright IBM Corp. 2026
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "../src/<name>";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { action } from "storybook/actions";

export default {
  title: "Components/<Name>", // "Preview/<Name>" for experimental components
  component: "cds-aichat-<name>",
};

export const Default = {
  argTypes: {
    label: {
      control: "text",
      description: "Visible label text.",
      table: { defaultValue: { summary: "Label" } },
    },
    "@cds-aichat-<name>-<verb>": {
      action: "<verb>",
      table: { category: "events" },
    },
  },
  args: { label: "Label" },
  render: (args) => html`
    <cds-aichat-<name>
      label=${ifDefined(args.label)}
      @cds-aichat-<name>-<verb>=${(e) => action("<verb>")(e.detail)}
    ></cds-aichat-<name>>
  `,
};
```

React `<name>-react.stories.jsx` imports the WC story and **spreads its `args`/`argTypes`** so the two stay in sync (model on `card-react.stories.jsx`):

```jsx
/**
 * @license
 * Copyright IBM Corp. 2026
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
import React from "react";
import <Name> from "../../../react/<name>";
import { Default as DefaultWC } from "./<name>.stories";

export default { title: "Components/<Name>", component: <Name> };

export const Default = {
  argTypes: { ...DefaultWC.argTypes },
  args: { ...DefaultWC.args },
  render: (args) => <<Name> label={args.label} onVerb={(e) => console.log(e.detail)} />,
};
```

Variant stories compose, never copy: `args: { ...Default.args, … }`, `argTypes: { ...Default.argTypes, … }`. Re-map WC event argTypes (`@cds-…`) to the React `on*` handler with `control: "none"` + `table: { category: "events" }`.

## When to add a story vs a control

**Core test: a non-default story must show something `Default`'s controls cannot reproduce.** A single prop that a text/boolean/select control can toggle is a **control on `Default`**, not a new story. A story earns its place when it is one of:

1. **Distinct slot/DOM composition** — adds or removes slotted children / subcomponents (not just an attribute). _Canonical: every extra `card` story — `WithActions` adds a footer subcomponent, `WithImage`/`OnlyImage` change the media slot._
2. **Orchestrated behavior / dynamic state** — needs timers, streaming, events, or controlled-mode wiring. _E.g. `code-snippet` Streaming, `chat-history` DeleteFlow, `reasoning-steps` Controlled._
3. **State reachable only via fixture injection** — error / empty / loading from bad or absent data. _E.g. `audio-player` ErrorState, `workspace-shell-body` EmptyState._
4. **Fixture shape a control can't express** — grouped/structured data or long-content overflow. _E.g. `autocomplete` WithCategories, `transcript` LongTranscript._
5. **A distinct visual state that needs its own Chromatic baseline.** Chromatic (CI: [.github/workflows/ci.yml](../../../.github/workflows/ci.yml) `chromatic-wc-storybook`) snapshots each story **at its default args only** — never at interactive control states. So a visually-distinct single-prop variant (`attached=false`, a `kind`, a `descriptionType`) earns a story when that look needs regression coverage — **but wire it to compose from the real control** (set the arg's default), never hardcode the value. _Canonical: `autocomplete` Detached, the sole baseline for the detached rounded-corner layout._ This is why enum "kinds" (e.g. `chat-button` primary/secondary/tertiary) get one story each, matching `@carbon/web-components` — keep the full `kind` select live on every one.

**Convert to a control** when a variant differs by one prop and the delta is minor / non-visual / already VR-covered. **Cut** when a story is byte-identical to another or **ignores its own args**. **Merge** when a story is the union of two existing ones. Name stories UpperCamelCase and semantic (`Default` always; `WithActions`, `Streaming`, `ErrorState`); use `name:` only when the label must differ from the export.

## Strings are controls

**Every string passed into the component is a text-control arg defaulted to its current value** — visible slot text, titles, button labels, `aria-label`/`alt`, and i18n/a11y label props (`error-message`, `loading-status-message`, `show-label`/`hide-label`, panel titles). This lets users edit and translation-preview them live. Exceptions stay fixtures with `control: false`: structured preset arrays / `groups[]`, base64 or `data:` URIs, and multi-paragraph markdown or code payloads (co-locate those in `story-data.js`).

## Titles, grouping, interaction tests

- Two groups only: `Components/<Name>` (stable, published contract) and `Preview/<Name>` (experimental). Lit and React titles for the same component are **identical strings**. `storySort` order lives in `.storybook/preview.js` — new top-level entries may need adding there.
- **Play functions**: this package uses none, and no interaction-test runner is installed — behavior is covered by `@web/test-runner` (Lit) and Jest (React); see [testing.md](testing.md). The empty **Interactions** panel is bundled into Storybook core and can't be cleanly hidden; leave it. Reach for a `play` function only if a future story needs interaction-driven state, and wire a runner if so.

## API tables and the manifest

`<ArgTypes>` renders stale or empty until `npm run custom-elements` regenerates `custom-elements.json`. Run it after any JSDoc / prop / slot / event / CSS-part change, then restart Storybook. The React wrappers under `src/react/` are hand-authored, not regenerated by this command — hand-edit the matching wrapper for new prop types. `preview.js` filters `privacy: "private"` members out, so mark internals accordingly.

## Definition of done

- `Default` exists in both `<name>.stories.js` and `<name>-react.stories.jsx`, with identical `title`.
- Both `<name>.mdx` and `<name>-react.mdx` open with `<Canvas of={Stories.Default}/>` under `## Overview`; no CDN block.
- Every non-default story passes the Core test; single-prop differences are controls, not stories.
- Every string is a defaulted text control; structured/long payloads are `control: false` fixtures.
- Controls have descriptions; add `table.defaultValue` only where Storybook can't infer it from `args`. Events use `action` + `table: { category: "events" }`.
- `npm run custom-elements` run; `<ArgTypes>` render fully in both Storybooks.
- Copy follows [tone.md](../../../references/tone.md); renders clean on 6006 and 7007 with no `@storybook/addon-a11y` violations.

## Related guidance

- [../AGENTS.md](../AGENTS.md) — package authoring rules (parent router)
- [overview-lit.template.mdx](overview-lit.template.mdx) / [overview-react.template.mdx](overview-react.template.mdx) — copy-to-start Overview skeletons
- [component-authoring.md](component-authoring.md) — directory shape, manifest, React-wrapper generation
- [testing.md](testing.md) — WTR + Jest test setup
- [../../../references/tone.md](../../../references/tone.md) — voice & word economy for MDX copy
- [../../../references/accessibility.md](../../../references/accessibility.md) — a11y-addon expectations
