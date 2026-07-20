# ResponseUserProfile

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ResponseUserProfile.html

Profile information about a specific agent that can be used to display information to the user. This may
represent a human agent or a virtual assistant agent.

## Signature

```ts
interface ResponseUserProfile
```

## Members

### id

`id: string`

A unique identifier for this agent.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ResponseUserProfile.html#id)

### nickname

`nickname: string`

The visible name for the response author. Can be the full name or just a first name for a human.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ResponseUserProfile.html#nickname)

### profile_picture_url

`profile_picture_url?: string`

A URL pointing to an avatar for the response author. This image should be a square.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ResponseUserProfile.html#profile_picture_url)

### user_type

`user_type: UserType`

The type of user. If its a "human" there is more protection against code injection attacks, where as assistant responses
are trusted by default unless PublicConfig.shouldSanitizeHTML is set to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ResponseUserProfile.html#user_type)
