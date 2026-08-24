# setHostOriginMeta

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/functions/Type_reference.setHostOriginMeta.html

Tag a Tiptap transaction as host-originated so the value-sync extension
(and any other origin-aware reader) can suppress its own change-event
emission for the round-trip. Use when dispatching transactions via
`(await getEditor()).view.dispatch(tr)` to opt out of the change loop.

## Signature

```ts
setHostOriginMeta(tr: Transaction): Transaction
```
