# ReasoningStep

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ReasoningStep.html

An individual reasoning step.

## Signature

```ts
interface ReasoningStep
```

## Members

### content

`content?: string | GenericItem<Record<string, unknown>>[]`

Optional markdown content (string) or a list of GenericItem response items to render inside this
reasoning step. When an array is supplied, each item is rendered through the standard message renderer.

GenericItem variants that render purely from their own item data (TextItem, ImageItem, UserDefinedItem,
ButtonItem, InlineErrorItem, etc.) are fully supported. Variants whose renderers rely on nested-body
hydration (Card, Carousel, Grid bodies) will not hydrate those nested children when used here.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ReasoningStep.html#content)

### open_state

`open_state?: ReasoningStepOpenState`

Marks if this individual step is open. Only use this if you don't want the default behavior.

If the step has content, by default the reasoning step will automatically open and will close when the
next step(s) have content or the first GenericItem is returned with something to display.

No matter what you choose, if the user manually marks something open/closed they retain control.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ReasoningStep.html#open_state)

### title

`title: string`

The title of the reasoning step.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ReasoningStep.html#title)
