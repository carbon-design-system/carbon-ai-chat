<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# MarkdownRendererChecklistToggleArgs

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererChecklistToggleArgs.html

Payload passed to `checklist.onToggle` when a task-list checkbox is toggled
(item identity + new checked state).

## Signature

```ts
interface MarkdownRendererChecklistToggleArgs
```

## Members

### checked

`checked: boolean`

The new checkbox state after the toggle.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererChecklistToggleArgs.html#checked)

### id

`id: string`

Same identity as MarkdownRendererChecklistItemArgs.id.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererChecklistToggleArgs.html#id)

### label

`label: string`

The item's text.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererChecklistToggleArgs.html#label)
