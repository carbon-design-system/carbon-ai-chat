<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# getRawText

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0/docs/functions/Type_reference.getRawText.html

Project a Tiptap `JSONContent` doc to a plain-text string. Mirrors the
`rawValue` projection: text nodes contribute their text, mention/command
nodes contribute `attrs.value || attrs.label`, paragraph boundaries
become `"\n"`, and `hardBreak` nodes contribute `"\n"`.

## Signature

```ts
getRawText(json: JSONContent): string
```
