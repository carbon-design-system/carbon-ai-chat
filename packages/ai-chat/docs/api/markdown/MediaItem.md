# MediaItem

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html

A reusable media object that may need to display a title and description with an alt_text to label the item for
accessibility purposes. This is used by the Audio, Video and Image response types.

## Signature

```ts
interface MediaItem
```

## Members

### agent_message_type

`agent_message_type?: HumanAgentMessageType`

For messages that are sent between the user and a human agent, we assign an agent type to the message to distinguish what type it is.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html#agent_message_type)

### alt_text

`alt_text?: string`

The alt text for labeling the item. Screen readers will announce this text when the user's virtual cursor
is focused on the item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html#alt_text)

### description

`description?: string`

The description for the item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html#description)

### dimensions

`dimensions?: MediaItemDimensions`

Settings that control the dimensions for the media item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html#dimensions)

### file_accessibility

`file_accessibility?: MediaFileAccessibility`

Accessibility features for raw media files.
Only applies to direct file URLs (e.g., .mp4, .mp3), not embedded platforms.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html#file_accessibility)

### message_item_options

`message_item_options?: GenericItemMessageOptions`

Options that control additional features available for a message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html#message_item_options)

### response_type

`response_type: MessageResponseTypes`

The response type of this message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html#response_type)

### source

`source: string`

The url pointing to a media source, whether audio, video, or image.

For video this can be a file like an .mp4 or a YouTube, Facebook, Vimeo, Twitch, Streamable, Wistia, or Vidyard url.

For audio this can be a file like an .mp3 or a SoundCloud url.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html#source)

### streaming_metadata

`streaming_metadata?: ItemStreamingMetadata`

Metadata used to identify a generic item within the context of a stream in order to correlate any updates meant
for a specific item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html#streaming_metadata)

### title

`title?: string`

The title for the item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html#title)

### user_defined

`user_defined?: TUserDefinedType`

An optional buckets of additional user defined properties for this item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaItem.html#user_defined)
