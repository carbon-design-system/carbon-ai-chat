# MediaFileAccessibility

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaFileAccessibility.html

Accessibility features for raw media files (not embedded platforms).
These features only apply when using direct file URLs (e.g., .mp4, .mp3).

For embedded platforms (YouTube, Vimeo, SoundCloud, etc.),
rely on the platform's built-in accessibility features instead.

## Signature

```ts
interface MediaFileAccessibility
```

## Members

### subtitle_tracks

`subtitle_tracks?: MediaSubtitleTrack[]`

Subtitle/caption tracks for video files.
Supports WebVTT format rendered as native HTML5 track elements.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaFileAccessibility.html#subtitle_tracks)

### transcript

`transcript?: MediaTranscript`

Text transcript for audio files.
Displayed as expandable text below the audio player.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MediaFileAccessibility.html#transcript)
