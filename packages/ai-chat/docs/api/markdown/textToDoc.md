<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# textToDoc

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0/docs/functions/Type_reference.textToDoc.html

Build a Tiptap `JSONContent` doc from a plain-text string — one paragraph
per line. The inverse of getRawText for plain text, so
`getRawText(textToDoc(s)) === s`. Useful when migrating from the deprecated
ChatInstanceInput.updateRawValue to
ChatInstanceInput.updateContent:
`updateContent((prev) => textToDoc(updater(getRawText(prev))))`.

## Signature

```ts
textToDoc(text: string): JSONContent
```

## Related

- [ChatInstanceInput.updateContent](./ChatInstanceInput.md)
- [ChatInstanceInput.updateRawValue](./ChatInstanceInput.md)
- [getRawText](./getRawText.md)
