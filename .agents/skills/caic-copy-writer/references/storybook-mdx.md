# storybook-mdx.md — Storybook MDX and controls (type 4)

Load this before writing an MDX docs page or story copy under `__stories__/` in `packages/ai-chat-components/`. Structural owner: [storybook.md](../../../../packages/ai-chat-components/references/storybook.md).

**A developer deciding whether this component does what they need**, with the render one scroll away.

- **The `## Overview` intro is one or two task-led sentences.** The reader hits the hero Canvas next, so anything longer delays what they came for. Real prose goes after it, under its own `##` ([Overview MDX template](../../../../packages/ai-chat-components/references/storybook.md#overview-mdx-template)).
- **Copy the template file; don't model on another component's MDX.** Shipped Overviews carry cruft.
- **Every string the component takes is a text control**, defaulted to its current value — slot text, titles, button labels, `alt`, and `aria-label` alike, so a reader can retype them live ([Strings are controls](../../../../packages/ai-chat-components/references/storybook.md#strings-are-controls)). Copy you write here is copy a user will edit.
- **A Lit prop's JSDoc lands on this page**, through the generated custom-elements manifest and the ArgTypes table — so it is held here, not to [internal-comments.md](internal-comments.md).

## Before and after

- Before: "This component provides the ability for users to be able to render a wide variety of different custom content."
- After: "Render your own content in any slot."

## Gate

A clean `@storybook/addon-a11y` panel on both port 6006 and port 7007.

**The scorer inflates this type.** It strips markdown only, so an MDX file scores its JSX as prose. Score the Overview text on its own if you want a number.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [storybook.md](../../../../packages/ai-chat-components/references/storybook.md) — story and docs-page structure
- [revision-pass.md](revision-pass.md) — the tightening pass, which does the whole job where the number can't
