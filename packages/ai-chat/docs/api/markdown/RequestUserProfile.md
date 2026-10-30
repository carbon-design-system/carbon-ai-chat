<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# RequestUserProfile

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.RequestUserProfile.html

Identifies the sender displayed for a user request.

## Signature

```ts
interface RequestUserProfile
```

## Members

### id

`id: string`

The sender's identifier in your application. The chat does not use it to identify the current viewer.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.RequestUserProfile.html#id)

### nickname

`nickname: string`

The sender's visible name, trimmed before display. Blank names use the default “You” label.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.RequestUserProfile.html#nickname)

### profile_picture_url

`profile_picture_url?: string`

A URL for the sender's square avatar image. The image is hidden when the name is blank or avatars are disabled.
If the image fails to load, the sender's name remains visible.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.RequestUserProfile.html#profile_picture_url)
