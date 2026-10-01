<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# carbonCommand

- Kind: Function
- Category: Utilities
 The prompt-line extension surface is still settling; these
factory signatures can change in a minor release.
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/functions/Type_reference.carbonCommand.html

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
