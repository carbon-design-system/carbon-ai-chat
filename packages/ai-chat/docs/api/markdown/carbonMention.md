<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# carbonMention

- Kind: Function
- Category: Utilities
 The prompt-line extension surface is still settling; these
factory signatures can change in a minor release.
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/functions/Type_reference.carbonMention.html

Tiptap extension factory for `@`-style mention triggers. Wraps
`@tiptap/extension-mention` with Carbon-specific chip rendering, extended
schema attributes (`value`, `data`), and direct
`cds-aichat-trigger-change` dispatch. Each chat supports one mention
trigger.

## Signature

```ts
carbonMention(config: TriggerSuggestionConfig): Node<MentionOptions<any, MentionNodeAttrs>, any>
```
