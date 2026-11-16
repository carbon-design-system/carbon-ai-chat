---
status: proposed
date: 2026-10-06
feedback-by: 2026-12-07
discussion: https://github.com/carbon-design-system/carbon-ai-chat/discussions/2481
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2765, https://github.com/carbon-design-system/carbon-ai-chat/issues/1543, https://github.com/carbon-design-system/carbon-ai-chat/issues/1800, https://github.com/carbon-design-system/carbon-ai-chat/issues/1929, https://github.com/carbon-design-system/carbon-ai-chat/issues/1529, https://github.com/carbon-design-system/carbon-ai-chat/issues/2807, https://github.com/carbon-design-system/carbon-ai-chat/issues/2808
supersedes:
superseded-by:
---

# ADR-0004: Make every v2 component styleable through public hooks, inside the prebuilt chat too

## Summary

Teams have built their own chat components because the styling limits block adoption. Page CSS stops at each component's shadow root. In the prebuilt chat it stops sooner: the chat renders every component inside its own shadow root, so page CSS reaches only inherited tokens and a single forwarded part. **Keep shadow DOM. In `@carbon/ai-chat-components@2`, expose every meaningful surface through public CSS hooks. In `@carbon/ai-chat` 2.x, forward those hooks through the prebuilt chat so they work there too.** Cover every component retained or introduced in v2, including its React wrapper. Here, v2 means the 2.x line, and 2.0.0 is its first release.

| The proposal | The boundary |
| --- | --- |
| `@carbon/ai-chat-components`: parts for local CSS, tokens for shared values, slots for specific replacement needs | Full styling access over the existing structure |
| `@carbon/ai-chat`: every component hook works from the chat's element, plus parts for the chat's regions and messages | A forwarded part rule applies chat-wide; only tokens scope to a region or a message |
| Stable hook names, roles, states, and documented token behavior | Layout and default appearance can evolve; review extensive overrides when upgrading |
| 2.0.0 ships what changes what you see, plus the checks. Hooks arrive in 2.x minors. | 1.x gets deprecations only, and no new hooks |

Feedback wanted: **Which styling task would still be blocked? Which behavior needs an explicit upgrade guarantee? Which region of the prebuilt chat do you need to scope a style to?**

## Motivation

A host class cannot style autocomplete's inner padding box today. React wrappers pass classes and styles through, but page selectors stop at the shadow root.

The prebuilt chat adds one more boundary above all of them. In 2.0 its element is `cds-aichat`, the new name for today's `cds-aichat-custom-element`, and it renders the whole chat inside its own shadow root. A hook on a component inside the chat is out of reach, even after this proposal adds it. Say you want larger text in messages. The only route that avoids private selectors today is setting Carbon's type token on the whole chat. That changes every element that uses the same type style, the prompt line included.

The two packages could be separate records, and the Proposal keeps them apart. This record still holds both, because the `@carbon/ai-chat` half exists only to make the component half usable in the prebuilt chat. A reader deciding on either needs the other.

The [source findings](#source-findings-behind-the-proposal) show why the contract needs nested hooks, source docs, and support for existing light-DOM paths. These examples come from source gaps, not reported consumer stylesheets.

This answers [#2275](https://github.com/carbon-design-system/carbon-ai-chat/issues/2275), the consumer styling contract for the Carbon 12 work.

## Proposal

The Proposal has three parts: what `@carbon/ai-chat-components` promises, what `@carbon/ai-chat` adds for the prebuilt chat, and how the two meet. Versioning and the release plan cover both, and come last.

### `@carbon/ai-chat-components`: every surface has a public hook

```jsx
// Existing React wrapper; the CSS hook below is proposed for v2.
<CDSAIChatAutocomplete className="product-suggestions" items={suggestions} />
```

```css
/* Today: page CSS cannot reach this private class inside the shadow root. */
.product-suggestions .cds-aichat-autocomplete-item__content {
  padding-block: 0.75rem;
}

/* Proposed v2: the public part changes each option's content padding. */
.product-suggestions::part(item-content) {
  padding-block: 0.75rem;
}

/* Proposed v2 state hook: active means the keyboard-highlighted option. */
.product-suggestions::part(item-content active) {
  background: var(--cds-layer-selected);
}
```

The same CSS works on `<cds-aichat-autocomplete class="product-suggestions">`. `suggestions` is your app's data; plain HTML consumers set the element's `items` property. These part names are examples of the proposed API. This example styles a standalone autocomplete. Inside the prebuilt chat, the same part is `cds-aichat::part(autocomplete-item-content)`, as the `@carbon/ai-chat` part explains.

#### Reference: every surface stays reachable

| You need to change | Use |
| --- | --- |
| Host size or placement | Host class or style |
| Shared colors, spacing, or other theme values | Documented custom properties |
| A region's layout, overflow, type, border, or animation | Parts, or documented selectors on an existing light-DOM surface |
| Hover or focus styles | Native pseudo-classes after the part |
| One node's state or position: active, selected, first, last | A token in that node's part list, such as `::part(item last)` |
| The whole component's state: expanded, loading, disabled, layout or responsive mode | `:state()` on the host. A reflected attribute works only when the component stands alone. |
| Rendered content, such as markdown | A part for each element role, such as `heading heading-2`, `list`, `list-item`, `link`, `blockquote`, or `code-inline` |
| Content or markup | A slot or renderer API for that use case |

Cover labels, icons, actions, scroll areas, overlays, editors, state indicators, renderer output, and layout boxes that could block an override. Tokens are not a whitelist of permitted CSS changes. Parts accept any declaration the browser supports on their targets.

Name parts by role. Document which nodes and modes they address, and what states mean. Preserve existing light-DOM styling paths. CSS access does not let you walk the DOM or add new behavior. Add replacement slots for concrete needs; state who owns events and accessibility.

A component-level state sits on the host so you can scope its parts and the page around it. `:has()` cannot see into a shadow root. Every layout or responsive mode is a required public state.

No second `::part()`, descendant selector, or structural pseudo-class can follow a part. So position is a token, and rendered content gets depth and position tokens where the design varies, such as `list-item depth-2 last`. Non-structural pseudo-classes, such as `:hover` and `:state()`, can follow a part. [MDN `::part()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part)

A pseudo-element after a part, such as `::before`, `::placeholder`, or `::marker`, works as usual. Document each one a component already uses, so you know which ones have content.

#### Reference: nested controls must expose their surfaces too

```html
<!-- Proposed v2 template inside input-send-control's shadow root. -->
<!-- part exposes the child host; exportparts forwards its inner button. -->
<cds-button part="submit" exportparts="button:submit-button"></cds-button>
```

```css
/* Proposed v2, standalone component: page CSS reaches Carbon's inner button through our alias. */
cds-aichat-input-send-control::part(submit-button) {
  border-radius: 1rem;
}
```

Forward needed parts through every nested shadow boundary. That includes the code snippet, table, and Carbon list elements that markdown renders. `exportparts` has no wildcard, so list each alias, state tokens included. Inside the stated Carbon range, the parent owns its aliases even if Carbon renames a part. **If a dependency lacks a hook, fix it upstream or change the composition.** Private-class patches and a tracked issue do not satisfy coverage.

The page's Carbon can differ from the one this package builds against. v2 depends on `@carbon/web-components@3`, where the first copy to define a tag wins and a later copy is skipped without failing. A forwarded alias can then miss with no error. State the Carbon range each forwarded part supports, and test both ends of it. Compare the parts Carbon renders, not its manifest alone.

The default build shares the page's Carbon. If you need isolation, use the prefixed build from the registration work (#1884). It renames Carbon's tags along with the chat's, so each forwarded alias always meets the Carbon it was written for.

An editor's public styling API can offer the same control; check what it covers. Browser-owned controls and cross-origin media retain platform limits. Package-owned containers, loading states, errors, and controls remain covered.

An overlay moved to `document.body` leaves the host's tree, so `::part()` cannot reach it and it needs a separate styling path. Top-layer content stays in its tree and stays reachable.

#### Reference: defaults must yield to your CSS

```css
/* Component-side pattern: inherit the public value, then use a fallback. */
.surface {
  border-radius: var(--cds-aichat-border-radius, 0.5rem);
}

/* Light-DOM surface: a named layer lets any unlayered page rule win. */
/* The layer name is an example of the proposed hook. */
@layer cds-aichat {
  :where(.cds-aichat--input-pm-content p) {
    margin: 0;
  }
}
```

```css
/* Your page, if it uses layers: make this the first layer statement on the page, */
/* before any stylesheet or @import that declares a layer. */
/* The names after cds-aichat are placeholders for your own layers. */
@layer cds-aichat, reset, components, utilities;
```

| Rule | Reason |
| --- | --- |
| Light-DOM defaults go in one named, documented `@layer` and use `:where()` | The package's rules and yours share a tree there. An unlayered rule beats every layered one, so a utility class in one of your layers cannot override it without `!important`. `:where()` lets a rule you add to that layer win. |
| Never write inline styles or document-scoped rules onto the component's own host | The host sits in your tree. An inline style there beats your selectors, and an unlayered rule beats your layers. Runtime values go on internal nodes, under private names. |
| Never write or reset a public token or a Carbon token on or below the host, except on a parted node to set a default for that node's children | A reset on `:host` masks the value you set on an ancestor. A write on an internal node masks it on the host too. On a parted node, your rule on that part still wins. Carbon 12 sets button corners for a container's buttons the same way, but on hosts, where your rule can't reach. |
| Theme and direction defaults react to inherited tokens or `:dir()`, never `:host-context()` | The CSS Working Group removed `:host-context()` from the specification, and only Chromium supports it. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/:host-context) |
| No behavior depends solely on a transition or animation event, or on a size, overflow, or display value you can change on a part | Your CSS can remove the transition or change the value. |

The layer name is a public hook under the version table below. A page that uses layers must declare its order. Without that line the package layer comes last and beats them. The package does not shield a light-DOM surface from page CSS. Its defaults there hold only against browser styles and layers you order before it. A page rule that matches wins, including a global `p { margin }` reset.

When a prop and a public token control the same value, document which wins. Do not use internal `!important` or repeated runtime writes to lock a promised style. Expose an input when geometry must be computed.

Back each transition or animation event with a timeout or state-driven logic. Hide content with conditional rendering or an exempt wrapper, not with `display` on a parted element. Where a dependence cannot be removed, such as a scroll container's `overflow`, document that property on the part as an unsupported override.

Normal outside part rules beat normal shadow styles, even normal inline styles. Inner `!important` reverses that priority. This holds for shadow surfaces only; on a light-DOM surface, inline style, layer, specificity, and order decide. [CSS Cascade](https://www.w3.org/TR/css-cascade-6/#cascade-sort)

Public tokens retain their stated effects. Distinguish them from computed internal values; the token boundary remains open below. Defaults and published examples must meet [WCAG 2.1 AA](../../references/accessibility.md), including relevant state, responsive, reduced-motion, and forced-colors behavior. Consumer CSS can still make the result inaccessible.

#### Reference: values you choose are public; values the chat measures are private

```css
/* Proposed v2, your page: a value you choose is a public input. */
cds-aichat {
  --cds-aichat-border-radius: 1rem;
}

/* Proposed v2, library code: a measured value is private. Don't set or read it. */
.panel {
  inset-block-start: var(--_cds-aichat-header-height);
}
```

| Kind of value | Name | Promise |
| --- | --- | --- |
| A value you choose, such as a radius, a width, or a color | `--cds-aichat-…` | Public input. Documented, and its stated effect holds for the whole major. |
| A value the chat measures, such as the header's height | `--_cds-aichat-…` | Private. Its name and math can change in any release. |

- **Overriding a measured value.** If you need to, the chat exposes a public setting and documents when it wins over the measurement.
- **A value JavaScript sets can still be public.** `--cds-aichat-autocomplete-max-height` is documented, so it stays public. Your value wins. The chat's measured height applies only when you set none.
- **Corners follow Carbon 12, and are tokens only.** A base corner token plus four per-corner tokens with short logical suffixes, like Carbon's `--cds-button-radius` and `--cds-button-radius-ss`, `-se`, `-es`, and `-ee`. A per-corner token wins over the base. #1874 picks the exact names once Carbon's beta settles.
- **The check is mechanical.** `validate:styling` rejects a public or Carbon token written on or below a host, except on a parted node, and a `--_cds-aichat-` name in the docs.

#### Reference: document hooks and test their stated effects

```ts
/**
 * Proposed v2 source docs: the manifest records these styling hooks.
 * @csspart item-content - Each rendered option's padding and layout box.
 * @csspart active - Added to item-content while its option has keyboard highlight.
 */
```

Document parts, aliases, and part tokens with `@csspart`, public tokens with `@cssprop`, slots with `@slot`, and `:state()` hooks with `@cssState`. A reflected host attribute enters the manifest through its property. The analyzer needs these tags. A manifest alone does not prove coverage. [CEM analyzer](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/)

Publish the standard Custom Elements Manifest. Carbon's v3 migration guide commits to that format, though its 3.0.0 alpha still ships the older one. This package already points to its manifest from the `customElements` field in `package.json`.

Both Storybooks show tables from the manifest and the same working examples. A shared styling guide explains the rules. Each example states the effect it promises, such as changing padding. Its whole appearance is not frozen.

| v2 check | What must hold |
| --- | --- |
| Source and manifest validation | Rendered hooks match their docs; public tokens are declared and consumed; dynamic names and forwarded aliases resolve |
| Browser checks from outside the host | Published examples achieve their stated effects in supported browsers, through web-component and React entry points |
| Upgrade review | Hook removals and role changes are detected; a surviving name still reaches the right surface; Carbon's rendered parts are compared across the supported range |

Coverage means every shadow-template node that receives declarations from the component stylesheet carries a part, or an `@internal` exemption that states a reason.

The proposed gate is `npm run validate:styling --workspace=@carbon/ai-chat-components`. It rejects hooks with missing or stale docs, a styled node without a part or exemption, unused public tokens, broken forwarding, removals without a record, and broken links to styling docs. Resolve Sass `get-var()` names. Declare dynamic hooks and test them with fixtures. Compare the fresh manifest with the public-hook baseline.

Browser tests cover nested parts, states, layout modes, inherited and per-instance tokens, light-DOM content, and editors. One fixture loads a hostile global stylesheet against both light-DOM and shadow surfaces: a layered reset and utility classes, a `p { margin }` reset, and `* { box-sizing }`. Page rules must win on a standalone component's light-DOM surfaces, shadow surfaces must keep their defaults, and behavior must survive. Check layout and accessibility too. These tests protect stated effects, not every possible consumer stylesheet.

### `@carbon/ai-chat`: the prebuilt chat forwards every hook

```css
/* Proposed v2: scope Carbon's body type to the message list. */
/* Region and forwarded part names are examples of the proposed API. */
cds-aichat::part(messages) {
  --cds-body-01-font-size: 1.125rem;
  --cds-body-01-line-height: 1.75rem;
  /* Markdown's phone layout reads body-02 today. */
  --cds-body-02-font-size: 1.25rem;
  --cds-body-02-line-height: 1.875rem;
}

/* Proposed v2: markdown's own heading part, forwarded with its tag prefix. */
/* It matches every markdown heading in this chat, in every region. */
cds-aichat::part(markdown-heading-2) {
  margin-block-start: 1.5rem;
}

/* Proposed v2: a component's own state, through the part on its host. */
cds-aichat::part(autocomplete):state(expanded) {
  outline: 2px solid var(--cds-focus);
}
```

A token set on a region part reaches every component inside that region, through any number of shadow roots. It stops only where something inside resets it. This contract forbids that for our components. Carbon 12 still does it for some of its own tokens: its button set resets button corners on its host. A forwarded part takes any declaration, as it does on the component itself.

#### Reference: the chat's element

| Rule | Reason |
| --- | --- |
| In 2.0, every host styles `cds-aichat`. React's `Chat` renders that element itself, not a wrapper around it. | One selector works for every host. Today React's custom-element component renders a `div` around the float container, so a `cds-aichat` rule would match nothing for React hosts. |
| The deprecated `cds-aichat-container`, and React's `ChatContainer` that renders it, get the same forwarding while they ship | [#1929](https://github.com/carbon-design-system/carbon-ai-chat/issues/1929) makes `cds-aichat` the 2.0 entry point and deprecates the float container, which keeps working. `cds-aichat` may render that container inside its own shadow root, a second boundary. |
| Each shadow boundary between a component and the chat's element forwards the full list | A list that stops one boundary short fails with no error |

#### Reference: what crosses the chat's boundary

| Rule | Reason |
| --- | --- |
| Every part, token, and `:state()` a component publishes works from the chat's element | Page selectors stop at the chat's shadow root, and `::part()` reaches only parts exported to the element you select |
| A forwarded name is the tag of the component that renders the part, without `cds-aichat-`, then the part. State and position tokens take the prefix too: `markdown-heading`, `markdown-heading-2`. | Two components can share a part name, such as `item`, and `exportparts` has no namespace |
| The name stays the same however deep the component sits. A component that nests markdown forwards markdown's parts under markdown's prefix. | One rule then styles every markdown heading, including markdown inside the feedback disclaimer or a transcript. Aliases for Carbon's parts still belong to the parent. |
| The chat puts a part named for each component on that component's host, such as `autocomplete` | So the component's `:state()` hooks follow it: `::part(autocomplete):state(expanded)` |
| A light-DOM surface inside the chat, such as the prompt-line editor, carries parts | The chat's shadow root stops your selectors and your layer order, so parts are the only way in |
| Reflected host attributes, documented light-DOM selectors, and the layer name don't cross | None of them can follow `::part()`. [#1877](https://github.com/carbon-design-system/carbon-ai-chat/issues/1877) hands phone layout to your CSS, so you scope a layout mode with your own class. |
| The build generates each forwarding list from the components' documented hooks | `exportparts` has no wildcard. A hand-kept list drifts when a component adds a part. |
| A part the chat already forwards keeps its name, such as `prompt-container` | 1.x documents it on the chat's element |

#### Reference: regions and messages

| Rule | Reason |
| --- | --- |
| Every region the shell renders gets a region part: the shell's own `slot-` part, forwarded under its plain name. Today that's `header`, `header-after`, `messages`, `input-before`, `input`, `input-after`, `workspace`, `history`, `footer`, and `panels`. | One node per region, and one rule instead of a hand-picked list. A token on it inherits into the content placed there. In `messages`, that includes the home screen. |
| Each region the shell adds gets one too | The shell's rework can add regions |
| The chat adds a `message` part on each message row | A token or layout change often needs a scope smaller than a region |
| `message` carries tokens for its kind, `request` or `response`, and its position among the rendered rows, `first` or `last`: `message response last` | Structural pseudo-classes cannot follow a part. `last` moves as rows arrive, including while a response streams. A state token, such as one for streaming, can come in a minor. |
| The home screen has no region part of its own | Its content is yours in 2.0 and sits in your page's DOM, where your CSS reaches it |

A forwarded part rule applies to the whole chat. Nothing structural can follow `::part()`, so `::part(messages) ::part(markdown-heading)` is invalid, and you can't style a heading in only the last message. Scope a part rule to one chat with a class on its element. Scope a value to a region or a message with a token on its part. A token set on `::part(message last)` reaches the headings in that message.

#### Reference: corners in the prebuilt chat

```css
/* Proposed v2, your slotted content: match the chat's corners. */
/* Token names are examples; #1874 picks them. */
.my-card {
  border-start-start-radius: var(--cds-aichat-border-radius-ss);
  border-start-end-radius: var(--cds-aichat-border-radius-se);
}

/* Proposed v2: square the corners in the input region. */
cds-aichat::part(input) {
  --cds-aichat-border-radius: 0;
}
```

The shell sets the corner tokens on each region part, as the default for the content inside. That's the parted-node default the rules allow, and it's how Carbon 12's containers set corners for their buttons. Your content reads the tokens to match the chat's rounding. A rule you set on the region part wins. `data-rounded` and `data-stacked` go away. Carbon has no attribute-based rounding, so tokens are the one way to round.

#### Reference: theme and override config

In 2.0 the chat forces no theme and has no override map. [#1792](https://github.com/carbon-design-system/carbon-ai-chat/issues/1792) removes `injectCarbonTheme`, and [#1645](https://github.com/carbon-design-system/carbon-ai-chat/issues/1645) removes `layout.customProperties`. You set Carbon and chat tokens with CSS, on the chat's element or one of its parts.

### How the two packages interact

| Where they meet | How it works |
| --- | --- |
| Forwarded names | `@carbon/ai-chat` generates its forwarding lists from the components' manifest at build time. A check in `@carbon/ai-chat` fails when a component hook isn't forwarded. |
| Mixed versions | `@carbon/ai-chat` accepts a range of component versions. A component release can add a part the chat doesn't forward yet. Until `@carbon/ai-chat` is rebuilt against it, `::part(markdown-new-part)` matches nothing, with no error. |
| Component states | Components publish whole-component states with `:state()`, not reflected attributes. The chat parts each component host it renders, so those states work from the chat's element. A browser fixture confirms `::part()` followed by `:state()` across the chat's boundaries before this is accepted. |
| Tokens | Tokens inherit through both packages' shadow roots. The one-writer rule binds both: neither resets a token you set, except as a default on a parted node. |
| Corners | Components read the corner tokens. The chat's shell sets them on its region parts. |
| Carbon | Both packages share one Carbon range, tested at both ends. The prefixed build renames all three packages' tags together. |
| Checks | `validate:styling` runs in `@carbon/ai-chat-components`. The forwarding check runs in `@carbon/ai-chat`, against the components' published hooks. Browser checks run each published example standalone and from each chat element. |

### Reference: stable hooks allow layout changes

This policy covers both packages, and starts with the styling surface published in v2. A hook is a part, a state or position token, a host state, a public token, a slot, a documented light-DOM selector, or the layer name. A hook must keep reaching a useful target for its named role. Retaining its name on an inert wrapper is a break.

| Change | Version treatment |
| --- | --- |
| Restore documented hook or token behavior | Patch |
| Add a hook or feature while preserving existing hooks | Minor |
| Refactor markup, change layout, or upgrade Carbon while preserving hook roles and documented behavior | Classify the fix or feature normally; custom styles needing review does not itself require a major |
| Remove or rename a hook, change its role or state meaning, or break documented token or styling behavior | Major, with migration guidance |

For example, autocomplete can switch from flex to grid while its padding example still works. CSS that relies on the former flex layout needs review. Exact DOM structure, private selectors, measurements, and every possible CSS combination are outside the upgrade promise. Release notes flag material visual changes.

### Reference: release plan

As part of the accepted v2 work, update `packages/ai-chat-components/AGENTS.md` and its references. Require surface-to-hook coverage, consumer precedence, source docs, tested examples, and upgrade review. Scope the new checks and deprecation rules to v2 work. **Acceptance alone activates no 1.x gate.**

Audit dependencies and retrofit every component retained or introduced in v2. Work lands in batches across 2.x minors, and v2 claims complete coverage only once supported components have no gaps. Components removed before v2 need no retrofit under this ADR. Existing 1.x guidance and the release process for its migration remain in force.

The prebuilt chat is in scope. Its 1.x refactor ([#1951](https://github.com/carbon-design-system/carbon-ai-chat/issues/1951)) moves the shell onto published components. Whatever shape it leaves, coverage isn't complete while a hook stops at the chat's element.

2.0.0 ships what changes what you see, plus the checks, so every later hook is checked from the release that adds it. Adding a hook is a minor.

| Lands in | `@carbon/ai-chat-components` | `@carbon/ai-chat` |
| --- | --- | --- |
| 1.x | Nothing new | `injectCarbonTheme`, `layout.customProperties`, `data-rounded`, and `data-stacked` deprecated, each with its replacement |
| 2.0.0 | The checks and manifest work; components stop resetting tokens you set; light-DOM defaults move into the named layer; `:host-context()` replaced; private values and corner tokens renamed | React's `Chat` renders `cds-aichat`; theme config, override config, `data-rounded`, and `data-stacked` removed; the shell's corner defaults move onto region parts; the forwarding check |
| 2.x minors | Component parts and `:state()` hooks, a batch at a time; the overlay styling path; transition-only fixes | Forwarding, component host parts, and region and message parts |

## Consumer impact

```css
/* 1.x: your slotted content reads the chat's corners. */
.my-card {
  border-start-start-radius: var(--cds-aichat-border-radius-start-start);
}

/* 2.0: the token is renamed. The old name above resolves to nothing, */
/* so the corner goes square, with no error. The new name is an example; #1874 picks it. */
.my-card {
  border-start-start-radius: var(--cds-aichat-border-radius-ss);
}
```

**Renamed and removed styling fails silently.** Nothing errors; the value goes back to its default.

- **Corner tokens.** 2.0.0 renames the documented per-corner family, `--cds-aichat-border-radius-start-start` and its three siblings. CSS that reads or sets the old names stops matching the chat.
- **`data-rounded` and `data-stacked`.** 2.0.0 removes them. Slotted content that relied on them loses its rounding. Read the corner tokens instead; 1.x deprecates both attributes and points there.
- **Measured values.** 2.0.0 makes every measured value private. If you set one, such as `--cds-aichat-header-height`, it stops having any effect.
- **React's wrapper.** In 2.0, React's `Chat` renders `cds-aichat` itself, with no `div` around it. Your `className` and `id` land on that element. A selector that reaches through the old wrapper, such as `.my-chat > cds-aichat-container`, stops matching.

The migration guide lists each rename and removal.

```html
<!-- Example if v2 retains expando: deprecate it in a stable 2.x release. -->
<!-- Publish trigger and migration guidance; keep both for the rest of 2.x. -->
<button part="expando trigger">...</button>

<!-- Earliest removal: the next major. Consumers switch ::part(expando) to ::part(trigger). -->
<button part="trigger">...</button>
```

Before removing or renaming any styling hook, deprecate it in a stable release and publish migration guidance. Publish a replacement for a rename. Keep the old hook through that major; no extra full-major waiting period applies. Audit existing exposed names before changing them, even when their JSDoc is missing.

In the prebuilt chat, every forwarded and region part is new, and they arrive in 2.x minors. Until then, you can only scope a token to the whole chat. `prompt-container` keeps its name. A page that styles `cds-aichat-custom-element` keeps working in 2.0, because #1535 keeps that tag as a deprecated alias.

A token you set on a chat part sits below the chat's root, so it wins over a value set there. 1.x marks `injectCarbonTheme` and `layout.customProperties` deprecated, and links here. Both keep working until 2.0.0.

The v2 retrofit does not translate private selectors or add guarantees to 1.x. Fixing defaults that masked inherited tokens can change existing pages; call those changes out in release notes. Light-DOM defaults now yield to page resets, so a global `p { margin }` rule can change a standalone editor with no build error. Review extensive overrides when upgrading, including compatible releases that change layout or defaults.

## Drawbacks

More public hooks mean more roles and aliases to preserve. Retrofitting editors and nested controls costs more than adding attributes; an upstream gap can block completion. Consumers also gain enough control to make the UI unusable, so defaults and examples must remain accessible.

Forwarded aliases hold only inside a stated Carbon range. Outside it, a page's Carbon copy can make an alias miss with no error. Testing both ends adds a second Carbon install to the browser checks.

The prebuilt chat's forwarding list grows with every component hook, and it spans two packages, so a mixed install can miss a new part silently. Forwarded part rules also apply chat-wide; only tokens scope to a region or a message.

## Alternatives

| Option | Disposition and cost |
| --- | --- |
| Tokens only | Rejected as the whole contract: cannot address arbitrary CSS on each layout box. Keep tokens for shared values. |
| Parts only on each element's own markup | Insufficient: nested controls stay hidden. Adopt parts with forwarding inside each component. |
| Two records: the component contract here, and the prebuilt chat in its own ADR | Rejected: the halves split cleanly, but the chat half only exists to make the component half usable in the prebuilt chat. One record keeps one decision and one discussion. The Proposal still separates them by package. |
| Render the prebuilt chat in light DOM, with each component keeping its own shadow root | Rejected: the chat places your user-defined responses, custom footers, and writeable elements through native slots in its shadow root. Without one, it must move nodes your framework owns. Its own layout styles would join your page, so a `p { margin }` reset reaches them. Its token overrides would move to a document sheet scoped per chat. Its gain is plain selectors: `cds-aichat-markdown { … }` would work as written. |
| Keep React's wrapper `div`, and document `cds-aichat-container` for React hosts | Rejected: React hosts would write a deprecated tag into their CSS, and it would break silently when the float container is removed |
| Forward component parts under their own names | Rejected: two components can share a part name, such as `item`, and `exportparts` has no namespace. |
| Mirror each component state as a token on its forwarded parts | Rejected: it multiplies the forwarding lists. `:state()` on a parted host does the same job, if the browser fixture confirms it. This is the fallback if it doesn't. |
| Region parts and tokens only; defer component forwarding | The middle path. It covers the font-size case at a fraction of the cost: region parts need only a short, fixed list. It leaves every layout and spacing change blocked, because spacing is fixed at build time, not a token. A heading's margin needs a part. Rejected as the whole answer. |
| Keep `data-rounded` and `data-stacked` as a convenience over the tokens | Rejected: Carbon 12 has no attribute-based rounding, so the chat would keep a second rounding model Carbon doesn't share |
| Let you add a stylesheet inside the chat's shadow root, limited to public component parts | Rejected: real descendant selectors would let you scope a part rule to a region. But the chat's own markup becomes selectable, so it couples to private structure. It still stops at nested roots, such as markdown rendered inside another component. |
| A type setting in the chat's markdown config | Rejected as the styling path: a JavaScript setting can't follow media queries, themes, or layers, and each new request becomes another option. A token on a region part does the same job. |
| Slot-first replacement | Rejected as the styling default: makes consumers rebuild behavior to change appearance. Add slots for concrete replacement needs. |
| Light DOM everywhere or per-instance opt-out | Rejected for this retrofit: loses existing native slot composition and isolation, or requires two render structures. Preserve current light-DOM paths. |
| Render markdown in light DOM instead of adding role parts | Rejected for this retrofit: page resets leak into every standalone message, and inside the prebuilt chat page selectors still can't reach it. The light-DOM layer rule then covers all rendered content, and the slots that project plugin output need a replacement. Its gain is ordinary selectors with no part list. |
| Stylesheet injection or subclassing | Rejected as the main escape hatch: couples CSS to private structure and still leaves nested roots. |
| Ship the prebuilt chat's region parts in 1.x | Rejected: adding a part breaks nothing, and 1.x hosts could scope a token to messages sooner. But the names would become promises before this contract settles. The 1.x shell work would then have to preserve them through its own DOM changes. |
| Isolate Carbon in every build, by default prefix or scoped registries | Rejected: a default prefix gives every host a second tag namespace to style, for a skew only some pages have. Scoped registries don't isolate the tags an element renders inside itself. React also creates elements through the page-wide registry, so they can't work across the React boundary. The prefixed build makes isolation an opt-in. |
| Separate React implementations or headless replacements | Rejected for this contract: duplicates behavior or makes consumers own rendering just to change CSS. |

Parts, tokens, and slots form one styling contract with distinct jobs. [CSS Shadow Parts](https://www.w3.org/TR/css-shadow-parts-1/), [Lit shadow DOM](https://lit.dev/docs/components/shadow-dom/#implementing-createrenderroot)

## Open questions

### Does `::part()` followed by `:state()` work through the chat's boundaries?

The specification allows a non-structural pseudo-class after a part, and `:state()` is one. This proposal relies on it for component states inside the chat. A browser fixture has to confirm it in every supported browser, across both of the chat's shadow boundaries. If it fails anywhere, the fallback is mirroring each state as a token on the component's parts.

### Should Carbon stop resetting its own tokens on hosts?

Carbon 12's button set resets the button corner tokens on its host. A corner token you set on a region part then never reaches buttons inside a button set. Do we ask Carbon to set those defaults where a page rule can still win, or document the gap?

### When does the prefixed build ship?

Opt-in isolation rests on the prefixed build (#1884), which has no scheduled release. Without it, a page whose Carbon falls outside the stated range has no fix.

### Which styling task is still blocked?

Which concrete styling task still needs a private selector or a stronger upgrade guarantee under this proposal?

## Decision

Not decided. Feedback is due December 7, 2026, in the [RFC discussion](https://github.com/carbon-design-system/carbon-ai-chat/discussions/2481). A maintainer decides on or after that date.

<details>
<summary>Appendix: evidence and references</summary>

### Source findings behind the proposal

Selected findings from October 6, 2026, at [commit b7c6a58](https://github.com/carbon-design-system/carbon-ai-chat/commit/b7c6a58cc33549a7aacf6f05d69d81f056828ebc). Rows added October 13, 2026, link to [commit cedcb5d](https://github.com/carbon-design-system/carbon-ai-chat/commit/cedcb5d52ed95d2ea372b4be98f49448d0954d93) with line anchors. Rows added November 9, 2026, link to [commit c68508d](https://github.com/carbon-design-system/carbon-ai-chat/commit/c68508d881d596e6f2a70ef6673329f160b1004b). Each explains a rule in the proposal. The v2 work still needs a full coverage audit.

| Finding in current source | Why it matters to this decision |
| --- | --- |
| [Autocomplete](https://github.com/carbon-design-system/carbon-ai-chat/blob/b7c6a58cc33549a7aacf6f05d69d81f056828ebc/packages/ai-chat-components/src/components/prompt-line/autocomplete/src/autocomplete.ts) has no public hook for its option padding box. | Expose layout surfaces so consumers can change CSS beyond the supplied tokens. |
| [File-upload item](https://github.com/carbon-design-system/carbon-ai-chat/blob/b7c6a58cc33549a7aacf6f05d69d81f056828ebc/packages/ai-chat-components/src/components/file-uploads/src/file-upload-item.ts) injects CSS into Carbon's shadow root to style filename and status regions that lack parts. | Missing dependency hooks require an upstream fix or a change in composition. Local parts alone cannot solve the gap. |
| [PromptLine](https://github.com/carbon-design-system/carbon-ai-chat/blob/b7c6a58cc33549a7aacf6f05d69d81f056828ebc/packages/ai-chat-components/src/components/prompt-line/src/prompt-line.ts) mounts its editor in light DOM. | Preserve existing styling paths; parts are for surfaces behind a shadow boundary. |
| [Reasoning step](https://github.com/carbon-design-system/carbon-ai-chat/blob/b7c6a58cc33549a7aacf6f05d69d81f056828ebc/packages/ai-chat-components/src/components/reasoning-steps/src/reasoning-step.ts) renders `expando` and `content` parts without `@csspart` docs. | Document rendered hooks and audit existing names before changing them. |
| [Prompt-line editor styles](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/prompt-line/src/tiptap/editor-styles.ts#L21-L42) install unlayered class rules through a [sheet adopted on the document](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/shared/dynamic-css-var-sheet.ts#L48-L68). | Unlayered rules beat every layered page rule. Light-DOM defaults need a named layer and zero specificity. |
| [The autocomplete React hook](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/react/hooks/useChatAutocomplete.tsx#L215-L217) writes `--cds-aichat-autocomplete-max-height` as an inline style on the host. [Video player](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/video-player/src/video-player.ts#L154-L161) targets its own host from the shared sheet. | An inline host style beats a page rule for the same token. Keep runtime values off the host, and document whether the prop or the token wins. |
| [The shell's corner manager](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/chat-shell/src/corner-manager.ts#L99-L109) writes the per-corner radius tokens on its internal `.shell` node. [Autocomplete](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/prompt-line/autocomplete/src/autocomplete.scss#L19-L25) resets them, and its max-height token, on `:host`. | Both mask a value set on an ancestor. The shell's write also masks one set on the host. Public tokens need a single writer: you. |
| [Markdown](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/markdown/src/markdown.scss#L43-L263) styles headings, paragraphs, links, lists, and blockquotes by element selector inside its shadow root. It nests a [code snippet](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/markdown/src/markdown-renderer.ts#L316-L329), a [table](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/markdown/src/utils/table-helpers.ts#L240-L254), and Carbon list elements. [Plugin output](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/markdown/src/utils/plugin-host-container.ts#L13-L20) mounts in a light-DOM host. | Rendered content needs role parts and forwarded nested parts. Plugin hosts fall under the light-DOM rule. |
| [Truncated text](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/truncated-text/src/truncated-text.ts#L209-L217) runs its focus step only on `transitionend`. [Its transition](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/truncated-text/src/truncated-text.scss#L38-L42) exists only under `prefers-reduced-motion: no-preference`. [Panel](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/chat-shell/src/panel.ts#L452-L469) completes on a timeout when no animation starts. | Behavior tied to a transition stops when the transition is absent or overridden. A timeout fallback or state-driven logic survives. |
| [Panel](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/chat-shell/src/panel.scss#L86) and [code snippet](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/src/components/code-snippet/src/code-snippet.scss#L21-L24) set direction and theme defaults with `:host-context()`. | Defaults rest on a selector removed from the specification. Use inherited tokens or `:dir()`. |
| [`@carbon/web-components`](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/package.json#L56) is a regular `^2.58.1` dependency today. v2 moves to `@carbon/web-components@3`. | A page can load a second Carbon copy that registers first. Forwarded aliases need a stated range and tests at both ends. |
| [`cds-aichat-container`](https://github.com/carbon-design-system/carbon-ai-chat/blob/c68508d881d596e6f2a70ef6673329f160b1004b/packages/ai-chat/src/web-components/cds-aichat-container/cds-aichat-container.ts#L96-L103) keeps host content in its light DOM and projects it through the chat's slots. It [renders the app](https://github.com/carbon-design-system/carbon-ai-chat/blob/c68508d881d596e6f2a70ef6673329f160b1004b/packages/ai-chat/src/web-components/cds-aichat-container/cds-aichat-container.ts#L661-L668) into its own shadow root. React's `ChatContainer` [renders the same element](https://github.com/carbon-design-system/carbon-ai-chat/blob/c68508d881d596e6f2a70ef6673329f160b1004b/packages/ai-chat/src/react/ChatContainer.tsx#L228). | Page selectors and `::part()` stop at the chat's element. A light-DOM chat would lose that slot projection. |
| [`cds-aichat-custom-element`](https://github.com/carbon-design-system/carbon-ai-chat/blob/c68508d881d596e6f2a70ef6673329f160b1004b/packages/ai-chat/src/web-components/cds-aichat-custom-element/index.ts#L355-L367) renders the container in a second shadow root and forwards `prompt-container`. The chat's input [forwards it first](https://github.com/carbon-design-system/carbon-ai-chat/blob/c68508d881d596e6f2a70ef6673329f160b1004b/packages/ai-chat/src/chat/components/input/Input.tsx#L692), into the container's root. The prompt-line shell [documents that part](https://github.com/carbon-design-system/carbon-ai-chat/blob/c68508d881d596e6f2a70ef6673329f160b1004b/packages/ai-chat-components/src/components/prompt-line/src/prompt-line-shell.ts#L48-L56) on the custom element only. A [demo test](https://github.com/carbon-design-system/carbon-ai-chat/blob/c68508d881d596e6f2a70ef6673329f160b1004b/demo/tests/react-host-compatibility.spec.ts#L313-L357) checks the part from every entry point. | Forwarding through the prebuilt chat already works for one part, across both boundaries. Each boundary needs the full list, and existing forwarded names are already public. |
| [Markdown](https://github.com/carbon-design-system/carbon-ai-chat/blob/c68508d881d596e6f2a70ef6673329f160b1004b/packages/ai-chat-components/src/components/markdown/src/markdown.scss#L24) reads Carbon's type tokens with fallbacks and never sets them. Its [phone layout](https://github.com/carbon-design-system/carbon-ai-chat/blob/c68508d881d596e6f2a70ef6673329f160b1004b/packages/ai-chat-components/src/components/markdown/src/markdown.scss#L224-L235) switches to `body-02`. | A token set on a region part reaches markdown through every boundary. Layout modes can read a different token. |
| The build [generates](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/package.json#L35) a Custom Elements Manifest and [ships](https://github.com/carbon-design-system/carbon-ai-chat/blob/cedcb5d52ed95d2ea372b4be98f49448d0954d93/packages/ai-chat-components/package.json#L28) it. When this row was written, component source had no `@csspart` or `@cssprop` tag. By November 9, one component, the conversational-search shell, documents one part. | The manifest lists almost no parts or tokens today, so coverage needs a mechanical definition, not a manifest count. |

### Standards and library precedents

| Evidence | Consequence for this proposal |
| --- | --- |
| [CSS Shadow Parts](https://www.w3.org/TR/css-shadow-parts-1/) exposes named elements and forwards them with `exportparts`, which names each part and defines no wildcard. | Parts permit arbitrary CSS declarations on exposed nodes. They do not expose all internal DOM. Both a nested host and its internal surfaces may need hooks. List every forwarded alias, and recheck the list when a dependency adds parts. |
| [Element-backed pseudo-elements](https://www.w3.org/TR/css-pseudo-4/#element-like) restrict selectors after a part. | Descendant/sibling relationships, structural pseudo-classes, and chained parts are not general traversal tools. Publish state hooks and separate parts where needed. |
| [MDN `::part()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part) says structural pseudo-classes and a second `::part()` cannot follow a part, and pseudo-elements such as `::before` can. | Publish position and depth as part tokens. Forward nested parts under aliases. Document the pseudo-elements a component uses. |
| [CSS Cascade](https://www.w3.org/TR/css-cascade-6/#cascade-sort) compares encapsulation context before specificity and style attributes. | Normal outer part rules override normal inner rules, including normal inner inline styles. Inner `!important` wins over outer `!important`. |
| [MDN `Document.adoptedStyleSheets`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptedStyleSheets) orders adopted sheets after the document's other sheets. [CSS Cascade](https://www.w3.org/TR/css-cascade-6/#cascade-sort) puts unlayered declarations in an implicit final layer, which wins for normal rules. [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4) builds on native cascade layers. | A package rule in a document-adopted sheet beats a page rule of equal specificity, and beats every layered page rule, including the utility layers of CSS frameworks built on layers. Light-DOM defaults go in a named layer. |
| [MDN `:host-context()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:host-context) marks it deprecated. The CSS Working Group removed it from the specification. | Theme and direction defaults cannot rest on it. |
| Carbon v2's [`carbonElement` decorator](https://github.com/carbon-design-system/carbon/blob/b1d8da36c1abd725498b06f7e193b9dabc31b6fc/packages/web-components/src/globals/decorators/carbon-element.ts#L44-L50) catches a duplicate `customElements.define` and logs a warning. Its v3 replacement, [`defineCustomElement`](https://github.com/carbon-design-system/carbon/blob/b1d8da36c1abd725498b06f7e193b9dabc31b6fc/packages/web-components/src/globals/register.ts#L102-L117), keeps the first definition and warns only in development. | The first Carbon copy to load owns each `cds-*` tag, in v2 and in v3. A later copy's parts never render, and nothing fails. |
| Carbon v2 publishes `custom-elements.json` in the deprecated Web Component Analyzer format. [v3 replaces it](https://github.com/carbon-design-system/carbon/blob/b1d8da36c1abd725498b06f7e193b9dabc31b6fc/docs/guides/cwc-v3-migration.md#the-wca-manifest-is-replaced-by-cem) with the standard [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest). In 2.64.0, the `cds-button` entry lists no parts, though the source documents and renders `part="button"`. Carbon doesn't set the `customElements` field in `package.json` yet. `@carbon/ai-chat-components` has set it since October 30, 2026. | The manifest stays the way to publish hooks, and v2 matches how Carbon v3 publishes it. Carbon's manifest can omit a part, so the upgrade review compares rendered parts. |
| [CSS Variables](https://www.w3.org/TR/css-variables-1/#using-variables) defines fallback values; [Lit styling](https://lit.dev/docs/components/styles/#theming) shows inherited custom properties. | Use public properties with fallbacks at consumption sites when ancestor themes must inherit. Defining the public default on each host masks inherited values. |
| [Lit React integration](https://lit.dev/docs/frameworks/react/) and its [wrapper implementation](https://github.com/lit/lit/blob/main/packages/react/src/create-component.ts) forward host props and refs. | React integration does not remove shadow boundaries. Test the same styling contract through both entry points. |
| [CEM analyzer documentation](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/) supports `@csspart`, `@cssprop`, `@cssState`, and `@slot`. | The manifest records authored documentation. It does not prove rendered reachability or detect all undocumented hooks on its own. |
| [Web Awesome customization](https://webawesome.com/docs/customizing) combines parts, properties, and states. Its [contributor guide](https://webawesome.com/docs/resources/contributing) describes nested part forwarding. | A stable named surface is an established alternative to exposing private selectors. Part removal is treated as a major change. |
| [Material Web theming](https://github.com/material-components/material-web/blob/main/docs/theming/README.md) layers component and system tokens. Its [customization guidance](https://material-web.dev/about/support/#how-do-i-customize-an-md--element-that-is-inside-another-component) covers nested parts. | Tokens suit shared values; parts avoid a new token for every CSS property. |
| [Spectrum CSS](https://github.com/adobe/spectrum-css) layers customization variables over design-token fallbacks. | Consumer values can win while defaults remain tied to the design system. |
| [Lit render roots](https://lit.dev/docs/components/shadow-dom/#implementing-createrenderroot) support light DOM. [FAST](https://fast.design/docs/1.x/fast-element/working-with-shadow-dom/#shadow-dom-configuration) documents its composition tradeoffs. | Light DOM gives ordinary selectors access but loses native shadow-slot composition and isolation. Existing components cannot safely gain it as a trivial toggle. |
| [Lit style inheritance](https://lit.dev/docs/components/styles/#inheriting-styles-from-a-superclass) and [FAST styles](https://fast.design/docs/1.x/fast-element/leveraging-css/) permit deeper style customization. | Style injection/subclassing is a real alternative. It couples consumers to internals and does not itself solve deeper shadow roots. |
| [CSS UI appearance](https://www.w3.org/TR/css-ui-4/#appearance-switching) distinguishes native control mechanisms from decorative appearance. | CSS access to a native input does not expose every browser-owned control surface. Scope the promise to package-owned presentation. |

Carbon's current upstream [button source](https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/button/button.ts) documents `@csspart button` and renders that part across button/link variants. This is evidence for the pattern, not proof that every Carbon control has sufficient hooks.

</details>
