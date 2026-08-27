# getRawText

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/functions/Type_reference.getRawText.html

Project a Tiptap `JSONContent` doc to a plain-text string. Mirrors the
`rawValue` projection: text nodes contribute their text, mention/command
nodes contribute `attrs.value || attrs.label`, paragraph boundaries
become `"\n"`, and `hardBreak` nodes contribute `"\n"`.

## Signature

```ts
getRawText(json: JSONContent): string
```
