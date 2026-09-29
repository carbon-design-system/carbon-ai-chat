<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# buildCarbonExtensions

- Kind: Function
- Category: Utilities
 The prompt-line extension surface is still settling; these
factory signatures can change in a minor release.
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/functions/Type_reference.buildCarbonExtensions.html

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
