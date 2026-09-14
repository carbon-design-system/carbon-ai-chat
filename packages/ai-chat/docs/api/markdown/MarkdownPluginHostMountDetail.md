# MarkdownPluginHostMountDetail

- Kind: TypeAlias
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0/docs/types/Type_reference.MarkdownPluginHostMountDetail.html

The `cds-aichat-markdown-plugin-host-mount` detail, discriminated on `kind`.

Narrow on `kind`, never on which of `html` / `element` is present — the two
members deliberately declare only their own fields, so reading the wrong one
is a compile error rather than a silent `undefined`.

## Signature

```ts
type MarkdownPluginHostMountDetail = _MarkdownPluginHostMountDetail
```
