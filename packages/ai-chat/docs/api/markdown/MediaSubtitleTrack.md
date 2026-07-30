# MediaSubtitleTrack

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaSubtitleTrack.html

Represents a single subtitle/caption track for video content.
Uses WebVTT format for accessibility. Rendered as native HTML5 track elements.

## Signature

```ts
interface MediaSubtitleTrack
```

## Members

### default

`default?: boolean`

Whether this track should be enabled by default.
Only one track should be default.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaSubtitleTrack.html#default)

### kind

`kind?: "subtitles" | "captions" | "descriptions"`

The kind of text track.
- "subtitles": Translation of dialogue (default)
- "captions": Transcription including sound effects
- "descriptions": Audio descriptions for visually impaired

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaSubtitleTrack.html#kind)

### label

`label: string`

Human-readable label for the track (e.g., "English", "Spanish").
Displayed in the browser's subtitle menu.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaSubtitleTrack.html#label)

### language

`language: string`

The language code (e.g., "en", "es", "fr").
Used for the track's srclang attribute.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaSubtitleTrack.html#language)

### src

`src: string`

URL pointing to the WebVTT subtitle file.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaSubtitleTrack.html#src)
