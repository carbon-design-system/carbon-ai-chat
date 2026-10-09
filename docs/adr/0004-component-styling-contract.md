---
status: proposed
date: 2026-10-06
feedback-by: 2026-10-29
discussion: https://github.com/carbon-design-system/carbon-ai-chat/discussions/2481
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/1543
supersedes:
superseded-by:
---

# ADR-0004: Make every v2 component styleable through public hooks

## Summary

Teams have built their own chat components because the styling limits block adoption. **For Carbon 12 and `@carbon/ai-chat-components@2`, keep shadow DOM and expose every meaningful surface through public CSS hooks.** Cover all components retained or introduced in v2, including their React wrappers.

| The proposal | The boundary |
| --- | --- |
| Parts for local CSS, tokens for shared values, slots for specific replacement needs | Full styling access over the existing structure |
| Stable hook names, roles, states, and documented token behavior | Layout and default appearance can evolve; review extensive overrides when upgrading |
| v2 guidance and checks | No new enforcement or retrofit requirement for 1.x |
| Individual components, including their nested dependencies | Full-chat composition remains a separate effort |

Feedback wanted: **Which styling task would still be blocked? Which behavior needs an explicit upgrade guarantee?**

## Motivation

A host class cannot style autocomplete's inner padding box today. React wrappers pass classes and styles through, but page selectors stop at the shadow root.

The [source findings](#source-findings-behind-the-proposal) show why the contract needs nested hooks, source docs, and support for existing light-DOM paths. These examples come from source gaps, not reported consumer stylesheets.

This answers [#2275](https://github.com/carbon-design-system/carbon-ai-chat/issues/2275), the consumer styling contract for the Carbon 12 work.

## Proposal

```jsx
// Existing React wrapper; the CSS hook below is proposed for Carbon 12 / v2.
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

The same CSS works on `<cds-aichat-autocomplete class="product-suggestions">`. `suggestions` is your app's data; plain HTML consumers set the element's `items` property. These new part names are examples of the proposed API.

### Reference: every surface stays reachable

| You need to change | Use |
| --- | --- |
| Host size or placement | Host class or style |
| Shared colors, spacing, or other theme values | Documented custom properties |
| A region's layout, overflow, type, border, or animation | Parts, or documented selectors on an existing light-DOM surface |
| Hover, focus, selection, expansion, or loading styles | Native pseudo-classes and documented state hooks |
| Content or markup | A slot or renderer API for that use case |

Cover labels, icons, actions, scroll areas, overlays, editors, state indicators, and layout boxes that could block an override. Tokens are not a whitelist of permitted CSS changes. Parts accept any declaration the browser supports on their targets.

Name parts by role. Document which nodes and modes they address, and what states mean. Preserve existing light-DOM styling paths. CSS access does not let you walk the DOM or add new behavior. Add replacement slots for concrete needs; state who owns events and accessibility.

### Reference: nested controls must expose their surfaces too

```html
<!-- Proposed v2 template inside input-send-control's shadow root. -->
<!-- part exposes the child host; exportparts forwards its inner button. -->
<cds-button part="submit" exportparts="button:submit-button"></cds-button>
```

```css
/* Proposed v2: page CSS reaches Carbon's inner button through our alias. */
cds-aichat-input-send-control::part(submit-button) {
  border-radius: 1rem;
}
```

Forward needed parts through every nested shadow boundary. The parent owns its aliases even if Carbon changes its names. **If a dependency lacks a hook, fix it upstream or change the composition.** Private-class patches and a tracked issue do not satisfy coverage.

An editor's public styling API can offer the same control; check what it covers. Browser-owned controls and cross-origin media retain platform limits. Package-owned containers, loading states, errors, and controls remain covered.

### Reference: defaults must yield to consumer CSS

```css
/* Component-side pattern: inherit the public value, then use a fallback. */
.surface {
  border-radius: var(--cds-aichat-border-radius, 0.5rem);
}
```

Avoid resetting inherited public values on each host. Do not use internal `!important` or repeated runtime writes to lock a promised style. Expose an input when geometry must be computed.

Normal outside part rules beat normal shadow styles, even normal inline styles. Inner `!important` reverses that priority. [CSS Cascade](https://www.w3.org/TR/css-cascade-6/#cascade-sort)

Public tokens retain their stated effects. Distinguish them from computed internal values; the token boundary remains open below. Defaults and published examples must meet [WCAG 2.1 AA](../../references/accessibility.md), including relevant state, responsive, reduced-motion, and forced-colors behavior. Consumer CSS can still make the result inaccessible.

### Reference: stable hooks allow layout changes

This policy starts with the styling surface published in v2. A hook must keep reaching a useful target for its named role. Retaining its name on an inert wrapper is a break.

| Change | Version treatment |
| --- | --- |
| Restore documented hook or token behavior | Patch |
| Add a hook or feature while preserving existing hooks | Minor |
| Refactor markup, change layout, or upgrade Carbon while preserving hook roles and documented behavior | Classify the fix or feature normally; custom styles needing review does not itself require a major |
| Remove or rename a hook, change its role or state meaning, or break documented token or styling behavior | Major, with migration guidance |

For example, autocomplete can switch from flex to grid while its padding example still works. CSS that relies on the former flex layout needs review. Exact DOM structure, private selectors, measurements, and every possible CSS combination are outside the upgrade promise. Release notes flag material visual changes.

### Reference: document hooks and test their stated effects

```ts
/**
 * Proposed v2 source docs: the manifest records these styling hooks.
 * @csspart item-content - Each rendered option's padding and layout box.
 * @csspart active - Added to item-content while its option has keyboard highlight.
 */
```

Document parts and aliases with `@csspart`, public tokens with `@cssprop`, and slots with `@slot`. The analyzer needs these tags. A manifest alone does not prove coverage. [CEM analyzer](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/)

Both Storybooks show tables from the manifest and the same working examples. A shared styling guide explains the rules. Each example states the effect it promises, such as changing padding. Its whole appearance is not frozen.

| v2 check | What must hold |
| --- | --- |
| Source and manifest validation | Rendered hooks match their docs; public tokens are declared and consumed; dynamic names and forwarded aliases resolve |
| Browser checks from outside the host | Published examples achieve their stated effects in supported browsers, through web-component and React entry points |
| Upgrade review | Hook removals and role changes are detected; a surviving name still reaches the right surface |

The proposed gate is `npm run validate:styling --workspace=@carbon/ai-chat-components`. It rejects hooks with missing or stale docs, unused public tokens, broken forwarding, removals without a record, and broken links to styling docs. Resolve Sass `get-var()` names. Declare dynamic hooks and test them with fixtures. Compare the fresh manifest with the public-hook baseline.

Browser tests cover nested parts, states, layout modes, inherited and per-instance tokens, light-DOM content, and editors. Check layout and accessibility too. These tests protect stated effects, not every possible consumer stylesheet.

### Reference: enforce this with v2, not today's 1.x work

As part of the accepted Carbon 12 / v2 implementation, update `packages/ai-chat-components/AGENTS.md` and its references. Require surface-to-hook coverage, consumer precedence, source docs, tested examples, and upgrade review. Scope the new checks and deprecation rules to v2 work. **Acceptance alone activates no 1.x gate.**

Audit dependencies and retrofit every component retained or introduced in v2. Work can land in batches, but v2 cannot claim complete coverage while supported components have gaps. Components removed before v2 need no retrofit under this ADR. Existing 1.x guidance and the release process for its migration remain in force.

The full chat is separate. Its planned refactor keeps React only at the React entry point and aims to add no extra shadow layers. Once that composition is settled, assess whether page CSS still reaches these hooks; any new barrier needs a follow-up contract.

## Consumer impact

```html
<!-- Example if v2 retains expando: deprecate it in a stable 2.x release. -->
<!-- Publish trigger and migration guidance; keep both for the rest of 2.x. -->
<button part="expando trigger">...</button>

<!-- Earliest removal: 3.0. Consumers switch ::part(expando) to ::part(trigger). -->
<button part="trigger">...</button>
```

Before removing or renaming any styling hook, deprecate it in a stable release and publish migration guidance. Publish a replacement for a rename. Keep the old hook through that major; no extra full-major waiting period applies. Audit existing exposed names before changing them, even when their JSDoc is missing.

The v2 retrofit does not translate private selectors or add guarantees to 1.x. Fixing defaults that masked inherited tokens can change existing pages; call those changes out in release notes. Review extensive overrides when upgrading, including compatible releases that change layout or defaults.

## Drawbacks

More public hooks mean more roles and aliases to preserve. Retrofitting editors and nested controls costs more than adding attributes; an upstream gap can block completion. Consumers also gain enough control to make the UI unusable, so defaults and examples must remain accessible.

## Alternatives

| Option | Disposition and cost |
| --- | --- |
| Tokens only | Rejected as the whole contract: cannot address arbitrary CSS on each layout box. Keep tokens for shared values. |
| Parts only on each element's own markup | Insufficient: nested controls stay hidden. Adopt parts with forwarding inside each component. |
| Forward parts through the full chat | Deferred until its composition is settled; that work may remove today's extra boundaries. |
| Slot-first replacement | Rejected as the styling default: makes consumers rebuild behavior to change appearance. Add slots for concrete replacement needs. |
| Light DOM everywhere or per-instance opt-out | Rejected for this retrofit: loses existing native slot composition and isolation, or requires two render structures. Preserve current light-DOM paths. |
| Stylesheet injection or subclassing | Rejected as the main escape hatch: couples CSS to private structure and still leaves nested roots. |
| Separate React implementations or headless replacements | Rejected for this contract: duplicates behavior or makes consumers own rendering just to change CSS. |

Parts, tokens, and slots form one styling contract with distinct jobs. [CSS Shadow Parts](https://www.w3.org/TR/css-shadow-parts-1/), [Lit shadow DOM](https://lit.dev/docs/components/shadow-dom/#implementing-createrenderroot)

## Open questions

### Which CSS variables should become a supported API?

Should v2 support every CSS variable as a setting, even one that stores a measured value? These two variables exist today:

| Example | What it means today | Recommended v2 treatment (still open) |
| --- | --- | --- |
| `--cds-aichat-border-radius: 1rem` | You choose how round the corners should be. | Public input: document it and preserve its stated effect. |
| `--cds-aichat-header-height` | The shell records the measured header height. Panels use it to leave room for the header. Setting it to `80px` changes that space; it does not make the header 80px tall. | Internal measurement: allow its name and layout math to change. |

The suggested split keeps chosen settings public and measured results private. In v2, the header and panel still need public styling hooks for their size and position. If you need to override a measured value, expose a setting. State when it wins over that value.

A value set by JavaScript is not always private. For example, `--cds-aichat-autocomplete-max-height` is already documented for consumers, even though a React hook also sets it. Check the docs before marking a token private. Keep or migrate any promise already made.

### Which styling task is still blocked?

Which concrete styling task still needs a private selector or a stronger upgrade guarantee under this proposal?

## Decision

Not decided. Feedback is due October 29, 2026, in the [RFC discussion](https://github.com/carbon-design-system/carbon-ai-chat/discussions/2481). A maintainer decides on or after that date.

<details>
<summary>Appendix: evidence and references</summary>

### Source findings behind the proposal

Selected findings from October 6, 2026, at [commit b7c6a58](https://github.com/carbon-design-system/carbon-ai-chat/commit/b7c6a58cc33549a7aacf6f05d69d81f056828ebc). Each explains a rule in the proposal. The v2 work still needs a full coverage audit.

| Finding in current source | Why it matters to this decision |
| --- | --- |
| [Autocomplete](https://github.com/carbon-design-system/carbon-ai-chat/blob/b7c6a58cc33549a7aacf6f05d69d81f056828ebc/packages/ai-chat-components/src/components/prompt-line/autocomplete/src/autocomplete.ts) has no public hook for its option padding box. | Expose layout surfaces so consumers can change CSS beyond the supplied tokens. |
| [File-upload item](https://github.com/carbon-design-system/carbon-ai-chat/blob/b7c6a58cc33549a7aacf6f05d69d81f056828ebc/packages/ai-chat-components/src/components/file-uploads/src/file-upload-item.ts) injects CSS into Carbon's shadow root to style filename and status regions that lack parts. | Missing dependency hooks require an upstream fix or a change in composition. Local parts alone cannot solve the gap. |
| [PromptLine](https://github.com/carbon-design-system/carbon-ai-chat/blob/b7c6a58cc33549a7aacf6f05d69d81f056828ebc/packages/ai-chat-components/src/components/prompt-line/src/prompt-line.ts) mounts its editor in light DOM. | Preserve existing styling paths; parts are for surfaces behind a shadow boundary. |
| [Reasoning step](https://github.com/carbon-design-system/carbon-ai-chat/blob/b7c6a58cc33549a7aacf6f05d69d81f056828ebc/packages/ai-chat-components/src/components/reasoning-steps/src/reasoning-step.ts) renders `expando` and `content` parts without `@csspart` docs. | Document rendered hooks and audit existing names before changing them. |

### Standards and library precedents

| Evidence | Consequence for this proposal |
| --- | --- |
| [CSS Shadow Parts](https://www.w3.org/TR/css-shadow-parts-1/) exposes named elements and forwards them with `exportparts`. | Parts permit arbitrary CSS declarations on exposed nodes. They do not expose all internal DOM. Both a nested host and its internal surfaces may need hooks. |
| [Element-backed pseudo-elements](https://www.w3.org/TR/css-pseudo-4/#element-like) restrict selectors after a part. | Descendant/sibling relationships, structural pseudo-classes, and chained parts are not general traversal tools. Publish state hooks and separate parts where needed. |
| [CSS Cascade](https://www.w3.org/TR/css-cascade-6/#cascade-sort) compares encapsulation context before specificity and style attributes. | Normal outer part rules override normal inner rules, including normal inner inline styles. Inner `!important` wins over outer `!important`. |
| [CSS Variables](https://www.w3.org/TR/css-variables-1/#using-variables) defines fallback values; [Lit styling](https://lit.dev/docs/components/styles/#theming) shows inherited custom properties. | Use public properties with fallbacks at consumption sites when ancestor themes must inherit. Defining the public default on each host masks inherited values. |
| [Lit React integration](https://lit.dev/docs/frameworks/react/) and its [wrapper implementation](https://github.com/lit/lit/blob/main/packages/react/src/create-component.ts) forward host props and refs. | React integration does not remove shadow boundaries. Test the same styling contract through both entry points. |
| [CEM analyzer documentation](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/) supports `@csspart`, `@cssprop`, and `@slot`. | The manifest records authored documentation. It does not prove rendered reachability or detect all undocumented hooks on its own. |
| [Web Awesome customization](https://webawesome.com/docs/customizing) combines parts, properties, and states. Its [contributor guide](https://webawesome.com/docs/resources/contributing) describes nested part forwarding. | A stable named surface is an established alternative to exposing private selectors. Part removal is treated as a major change. |
| [Material Web theming](https://github.com/material-components/material-web/blob/main/docs/theming/README.md) layers component and system tokens. Its [customization guidance](https://material-web.dev/about/support/#how-do-i-customize-an-md--element-that-is-inside-another-component) covers nested parts. | Tokens suit shared values; parts avoid a new token for every CSS property. |
| [Spectrum CSS](https://github.com/adobe/spectrum-css) layers customization variables over design-token fallbacks. | Consumer values can win while defaults remain tied to the design system. |
| [Lit render roots](https://lit.dev/docs/components/shadow-dom/#implementing-createrenderroot) support light DOM. [FAST](https://fast.design/docs/1.x/fast-element/working-with-shadow-dom/#shadow-dom-configuration) documents its composition tradeoffs. | Light DOM gives ordinary selectors access but loses native shadow-slot composition and isolation. Existing components cannot safely gain it as a trivial toggle. |
| [Lit style inheritance](https://lit.dev/docs/components/styles/#inheriting-styles-from-a-superclass) and [FAST styles](https://fast.design/docs/1.x/fast-element/leveraging-css/) permit deeper style customization. | Style injection/subclassing is a real alternative. It couples consumers to internals and does not itself solve deeper shadow roots. |
| [CSS UI appearance](https://www.w3.org/TR/css-ui-4/#appearance-switching) distinguishes native control mechanisms from decorative appearance. | CSS access to a native input does not expose every browser-owned control surface. Scope the promise to package-owned presentation. |

Carbon's current upstream [button source](https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/button/button.ts) documents `@csspart button` and renders that part across button/link variants. This is evidence for the pattern, not proof that every Carbon control has sufficient hooks.

</details>
