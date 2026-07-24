# AGENTS.md — `chat/components`

Internal React components that render the chat. **Not** the published elements — those live in
[`@carbon/ai-chat-components`](../../../../ai-chat-components/AGENTS.md). This tree is heading
toward complete React removal: presentational pieces publish as Lit elements
([#1803](https://github.com/carbon-design-system/carbon-ai-chat/issues/1803)), message list/row
become web-component shells
([#1802](https://github.com/carbon-design-system/carbon-ai-chat/issues/1802)), and the remaining
response-type tree becomes internal Lit **helpers**
([#1863](https://github.com/carbon-design-system/carbon-ai-chat/issues/1863)). The folder layout
mirrors those destinations, so put new code where its destiny points.

New UI goes here, never in [`../components-legacy/`](../components-legacy/) (closed to new
components). Repo-wide component-placement and the "lift to `@carbon/ai-chat-components`" rule are
canonical in [code-patterns.md](../../../../../references/code-patterns.md) — read it before adding
a component.

## Where does my component go? (first match wins)

1. **No chat-specific state, reusable outside chat?** → publish to `@carbon/ai-chat-components`
   (leaves this package). See [code-patterns.md](../../../../../references/code-patterns.md).
2. **Renders a message response type?** → `responseTypes/<type>/`.
3. **App chrome that reads the store / uses `ServiceManager`** (a header, input, panel, modal)? →
   the matching feature folder (`header/`, `input/`, `panels/`, `modals/`, `homeScreen/`).
4. **Reusable render helper** — attribute-driven, **no store, no `ServiceManager`**, but not worth
   publishing (the #1863 contract)? → `helpers/`.
5. **Pure function, no JSX/markup?** → not here — `chat/utils/` (one level up).
6. **React-only framework glue** (a portal, a `@lit/react` binding, a Carbon React wrapper)? →
   `portals/` or `carbon/`. These are transitional; don't add new ones.

## Folder taxonomy

| Folder                                               | Holds                                                                                                                              | Destiny                                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `responseTypes/`                                     | one subfolder per response type (`button/`, `media/`, `card/`, `message/`, `userDefined/`, `error/`, `options/`, `datePicker/`, …) | internal Lit helpers (#1863); some primitives publish (#1803)                                                   |
| `helpers/`                                           | internal render helpers, **one folder per helper**                                                                                 | internal Lit helpers (#1863), never published                                                                   |
| `header/` `homeScreen/` `input/` `panels/` `modals/` | store-coupled app chrome                                                                                                           | thin containers over shells + helpers                                                                           |
| `aria/`                                              | live-region components                                                                                                             | **transitional** — being removed by [#1933](https://github.com/carbon-design-system/carbon-ai-chat/issues/1933) |
| `carbon/`                                            | `@lit/react` wrappers of `@carbon/web-components`                                                                                  | **transitional** — shrinks to 0 as React is removed                                                             |
| `portals/`                                           | `ReactDOM` portal bridges (light-DOM / slots)                                                                                      | **transitional** — shrinks to 0 as React is removed                                                             |

Legacy renderers (image, iframe, grid, preview-card, conversational-search, connect-to-human-agent,
citations) and the `MessageTypeComponent` dispatcher still live in `../components-legacy/`; they
land in `responseTypes/` as #1802/#1803/#1863 migrate them.

## `helpers/` vs `chat/utils/`

One test: **does it return something that goes in the DOM?**

- **Yes** (`.tsx`, JSX / a Lit template) → `helpers/`.
- **No** (`.ts`, pure logic) → `chat/utils/` (the sibling `utils` one level up — note the plural;
  there is deliberately no `components/util`).

A `helpers/` component is _internal_: attribute-driven, reads no store, holds no `ServiceManager`.
If it also carries zero chat-specific anything, it should be **published** instead (rule 1), not
parked in `helpers/`.

## Naming & nesting

- **PascalCase filenames** for every component/helper `.tsx`.
- **One folder per helper** under `helpers/`: `helpers/<Name>/<Name>.tsx` (+ `<Name>.scss` +
  `_imports.scss`). No flat helper files.
- `responseTypes/` groups by _type_ (several related renderers per type folder) — the deliberate
  contrast with `helpers/`.
- **Every component owns its own styles — no shared/floating SCSS.** A style-only partial with no
  matching component in its folder is a defect: fold it into the consuming component's stylesheet
  or delete it. Each folder's `_imports.scss` aggregates its own partials; parents `@use`
  `"<child>/imports"`.

## Related guidance

- [Package AGENTS.md](../../../AGENTS.md) — `@carbon/ai-chat` overview, build/test, gotchas
- [code-patterns.md](../../../../../references/code-patterns.md) — component placement, lift rule, SCSS/BEM, prefix discipline
- [store/AGENTS.md](../store/AGENTS.md) — rules for anything touching the store
- [../../../../ai-chat-components/AGENTS.md](../../../../ai-chat-components/AGENTS.md) — authoring the published Lit components
