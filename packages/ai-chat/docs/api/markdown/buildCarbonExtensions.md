# buildCarbonExtensions

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/functions/Type_reference.buildCarbonExtensions.html

Translate the Carbon-curated configs surfaced on InputConfig into
a Tiptap `Extension` list. Filters out empty configs so the returned list
contains exactly the extensions whose backing config was supplied. Use
directly when mounting `<cds-aichat-prompt-line>` outside the chat shell.

## Signature

```ts
buildCarbonExtensions(configs: BuildCarbonExtensionsConfig): Extension<any, any>[]
```

## Related

- [InputConfig](./InputConfig.md)
