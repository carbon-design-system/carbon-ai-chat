# MarkdownPluginHostMountDetailInput

- Kind: TypeAlias
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0/docs/types/Type_reference.MarkdownPluginHostMountDetailInput.html

A mount detail as it arrives on the wire, `kind` included or not.

`kind` is newer than the events themselves, and `@carbon/ai-chat` depends on
`@carbon/ai-chat-components` through a caret range, so a listener can still
receive the original shape from an older build. Pass anything you receive
through `resolveMarkdownPluginHostMountDetail` and narrow on the result.

## Signature

```ts
type MarkdownPluginHostMountDetailInput = _MarkdownPluginHostMountDetailInput
```
