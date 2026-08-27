# StructuredFieldType

**Experimental.**

- Kind: TypeAlias
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/types/Type_reference.StructuredFieldType.html

The type of a structured field.

Only three values carry meaning to the chat itself:

- `"file"` — drives the upload merge logic and in-flight upload tracking.
- `"mention"` — produced by the mention input node.
- `"command"` — produced by the command input node.

Any other string is accepted and passed through untouched — a free-form hint
for your own PublicConfigMessaging.customSendMessage, which the chat
never inspects. The three named members exist only so they keep
autocompleting; describe every other backend widget type however your
backend already names it.

## Signature

```ts
type StructuredFieldType = "file" | "mention" | "command" | string & {}
```

## Related

- [PublicConfigMessaging.customSendMessage](./PublicConfigMessaging.md)
