# carbonMention

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/functions/Type_reference.carbonMention.html

Tiptap extension factory for `@`-style mention triggers. Wraps
`@tiptap/extension-mention` with Carbon-specific chip rendering, extended
schema attributes (`value`, `data`), and direct
`cds-aichat-trigger-change` dispatch. Each chat supports one mention
trigger.

## Signature

```ts
carbonMention(config: TriggerSuggestionConfig): Node<MentionOptions<any, MentionNodeAttrs>, any>
```
