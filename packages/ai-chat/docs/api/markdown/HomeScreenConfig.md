# HomeScreenConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HomeScreenConfig.html

Configuration for the optional home screen that appears before the assistant chat window.

## Signature

```ts
interface HomeScreenConfig
```

## Members

### customContentOnly

`customContentOnly?: boolean`

Do not show the greeting or starters.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HomeScreenConfig.html#customcontentonly)

### disableReturn

`disableReturn?: boolean`

Defaults to false. If enabled, a user can not navigate back to the home screen after they have sent a message to the
assistant. If false, the home screen is navigatable after an initial message is sent.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HomeScreenConfig.html#disablereturn)

### greeting

`greeting?: string`

The greeting to show to the user to prompt them to start a conversation.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HomeScreenConfig.html#greeting)

### isOn

`isOn?: boolean`

If the home page is turned on via config or remote config.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HomeScreenConfig.html#ison)

### starters

`starters?: HomeScreenStarterButtons`

Optional conversation starter utterances that are displayed as buttons.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HomeScreenConfig.html#starters)
