<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# UserType

- Kind: Enum
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/enums/Type_reference.UserType.html

Types of users we accept messages from.

## Signature

```ts
enum UserType
```

## Members

### BOT

`BOT = "bot"`

A message from a non-watsonx assistant, used for interacting with assistants that are not backed by watsonx.

Official guidance is to not use this for IBM products without explicit exception.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/enums/Type_reference.UserType.html#bot)

### HUMAN

`HUMAN = "human"`

A message from a human.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/enums/Type_reference.UserType.html#human)

### WATSONX

`WATSONX = "watsonx"`

A message from watsonx.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/enums/Type_reference.UserType.html#watsonx)
