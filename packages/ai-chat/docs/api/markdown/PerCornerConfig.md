# PerCornerConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PerCornerConfig.html

Configuration for individual corners using logical property names.
Supports RTL layouts by using start/end instead of left/right.

Any undefined corner will fall back to the default value (ROUND).

## Signature

```ts
interface PerCornerConfig
```

## Members

### endEnd

`endEnd?: CornersType`

Bottom-right corner in LTR, bottom-left in RTL.
Maps to border-end-end-radius.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PerCornerConfig.html#endend)

### endStart

`endStart?: CornersType`

Bottom-left corner in LTR, bottom-right in RTL.
Maps to border-end-start-radius.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PerCornerConfig.html#endstart)

### startEnd

`startEnd?: CornersType`

Top-right corner in LTR, top-left in RTL.
Maps to border-start-end-radius.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PerCornerConfig.html#startend)

### startStart

`startStart?: CornersType`

Top-left corner in LTR, top-right in RTL.
Maps to border-start-start-radius.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PerCornerConfig.html#startstart)
