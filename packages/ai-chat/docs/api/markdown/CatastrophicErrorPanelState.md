# CatastrophicErrorPanelState

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CatastrophicErrorPanelState.html

The state information for a catastrophic error panel.

## Signature

```ts
interface CatastrophicErrorPanelState
```

## Members

### bodyText

`bodyText?: string`

The error body text to be displayed in the `CatastrophicErrorPanel`. Will render markdown if provided.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CatastrophicErrorPanelState.html#bodytext)

### hideRetryButton

`hideRetryButton?: boolean`

When true, the panel renders without the built-in retry button. The consumer is then responsible
for closing the panel by calling `instance.updateCatastrophicErrorPanel({ isOpen: false })` once
their own recovery flow completes.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CatastrophicErrorPanelState.html#hideretrybutton)

### isOpen

`isOpen: boolean`

Whether the catastrophic error panel is currently open.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CatastrophicErrorPanelState.html#isopen)

### title

`title?: string`

The error title to be displayed in the `CatastrophicErrorPanel`.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CatastrophicErrorPanelState.html#title)
