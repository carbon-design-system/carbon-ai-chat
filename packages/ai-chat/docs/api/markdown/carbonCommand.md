# carbonCommand

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/functions/Type_reference.carbonCommand.html

Tiptap extension factory for `/`-style command triggers. Same shape as
carbonMention; the two differ only in the default schema-node name
(`"command"` vs `"mention"`), the dispatched trigger type, and the default
chip color.

## Signature

```ts
carbonCommand(config: TriggerSuggestionConfig): Node<MentionOptions<any, MentionNodeAttrs>, any>
```

## Related

- [carbonMention](./carbonMention.md)
