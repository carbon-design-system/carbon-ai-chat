# InputConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.InputConfig.html

Configuration for the input field in the main chat and homescreen.

## Signature

```ts
interface InputConfig
```

## Members

### isDisabled

`isDisabled?: boolean`

If true, the main input surface starts in a disabled (read-only) state.
Equivalent to PublicConfig.isReadonly, but scoped just to the assistant input.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.InputConfig.html#isdisabled)

### isVisible

`isVisible?: boolean`

Controls whether the main input surface is visible when the chat loads.
Defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.InputConfig.html#isvisible)

### maxInputCharacters

`maxInputCharacters?: number`

The maximum number of characters allowed in the input field. Defaults to 10000.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.InputConfig.html#maxinputcharacters)
