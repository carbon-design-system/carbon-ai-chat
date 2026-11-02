<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# carbonCommand

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/functions/Type_reference.carbonCommand.html

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
