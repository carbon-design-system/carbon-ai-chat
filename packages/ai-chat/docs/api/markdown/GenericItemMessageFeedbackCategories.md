<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# GenericItemMessageFeedbackCategories

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackCategories.html

If you want to have different categories for positive and negative feedback, you can provide two different arrays.

You may not provide one of the arrays. e.g. you want negative categories but don't care about positive categories.

## Signature

```ts
interface GenericItemMessageFeedbackCategories
```

## Members

### negative

`negative?: string[]`

List of strings for negative feedback categories.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackCategories.html#negative)

### positive

`positive?: string[]`

List of strings for positive feedback categories.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackCategories.html#positive)
