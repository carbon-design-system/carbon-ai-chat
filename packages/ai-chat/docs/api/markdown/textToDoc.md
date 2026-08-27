# textToDoc

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/functions/Type_reference.textToDoc.html

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
