# ReasoningSteps

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ReasoningSteps.html

The interface describing how to pass reasoning steps to the UI.

## Signature

```ts
interface ReasoningSteps
```

## Members

### content

`content?: string | GenericItem<Record<string, unknown>>[]`

Optional markdown content (string) or a list of GenericItem response items to render as a preamble
above the reasoning steps. When an array is supplied, each item is rendered through the standard message
renderer.

GenericItem variants that render purely from their own item data (TextItem, ImageItem, UserDefinedItem,
ButtonItem, InlineErrorItem, etc.) are fully supported. Variants whose renderers rely on nested-body
hydration (Card, Carousel, Grid bodies) will not hydrate those nested children when used here.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ReasoningSteps.html#content)

### open_state

`open_state?: ReasoningStepOpenState`

Marks if the reasoning step interface is open. Only use this if you don't want the default behavior.

By default the reasoning step interface will automatically open and will then close when the first
GenericItem is returned with something to display.

No matter what you choose, if the user manually marks something open/closed they retain control.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ReasoningSteps.html#open_state)

### steps

`steps?: ReasoningStep[]`

The array of reasoning steps for this message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ReasoningSteps.html#steps)
