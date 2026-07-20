# GenericItemCustomFooterSlotOptions

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemCustomFooterSlotOptions.html

Options that control the custom content in a message footer.

## Signature

```ts
interface GenericItemCustomFooterSlotOptions
```

## Members

### additional_data

`additional_data?: Record<string, unknown>`

Optional additional data to pass to the render function. This can contain
any custom metadata that the frontend needs to render the footer appropriately.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemCustomFooterSlotOptions.html#additional_data)

### is_on

`is_on?: boolean`

Indicates whether to show the custom footer slot. This defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemCustomFooterSlotOptions.html#is_on)

### slot_name

`slot_name: string`

Identifier for this footer slot, passed to the `renderCustomMessageFooter` render function.

This value **must be unique to this message** — every message that shows a footer needs its own
`slot_name`. Reusing the same value across messages collapses them onto a single slot, so only the first
message's footer renders. A per-message counter or UUID works well, e.g. `` `copy_footer_${id}` ``.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemCustomFooterSlotOptions.html#slot_name)
