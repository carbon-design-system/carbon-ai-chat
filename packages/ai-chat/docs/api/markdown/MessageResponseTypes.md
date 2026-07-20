# MessageResponseTypes

- Kind: Enum
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html

The set of possible message types in a response.

## Signature

```ts
enum MessageResponseTypes
```

## Members

### AUDIO

`AUDIO = "audio"`

Displays an audio clip to the user using an audio player.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#audio)

### BUTTON

`BUTTON = "button"`

Displays a button that can either send a message back to the backend, open a url, or throw a client side event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#button)

### CARD

`CARD = "card"`

Displays a card that can contain other response types.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#card)

### CAROUSEL

`CAROUSEL = "carousel"`

Displays a carousel of cards that can contain other response types.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#carousel)

### CONNECT_TO_HUMAN_AGENT

`CONNECT_TO_HUMAN_AGENT = "connect_to_agent"`

Indicates that the conversation should be escalated to a human agent and offers that opportunity to the user.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#connect_to_human_agent)

### CONVERSATIONAL_SEARCH

`CONVERSATIONAL_SEARCH = "conversational_search"`

Ability to show citations on your RAG result.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#conversational_search)

### DATE

`DATE = "date"`

Asks the user to provide a date. This may result in a date picker being presented to the user.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#date)

### GRID

`GRID = "grid"`

Ability to layout response types inside a grid.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#grid)

### IFRAME

`IFRAME = "iframe"`

Displays the contents of an iframe to the user.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#iframe)

### IMAGE

`IMAGE = "image"`

Displays an image to the user.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#image)

### INLINE_ERROR

`INLINE_ERROR = "inline_error"`

Displays a general error message to the user and include developer info to be logged and to debug.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#inline_error)

### OPTION

`OPTION = "option"`

A response that requests the user choose an option from a list. The list of options may be presented as a list
of buttons or it may be from a drop-down.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#option)

### PAUSE

`PAUSE = "pause"`

Indicates that the chat should display a pause at this point in the conversation before displaying additional
items.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#pause)

### PREVIEW_CARD

`PREVIEW_CARD = "preview_card"`

Displays a preview card that can take the user flow to a workspace view.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#preview_card)

### SYSTEM

`SYSTEM = "system"`

Displays a system message to the user. System messages appear centered between other messages
and are styled differently to indicate they are not from the user or assistant.

If a response contains ONLY system messages, they render standalone (no avatar, no bubble).
If mixed with other response types, system messages render inline within the message bubble.

## Examples

```typescript
// Standalone system message
{
  output: {
    generic: [{
      response_type: "system",
      text: "Processing your request...",
    }]
  }
}

// Inline system message (mixed with other content)
{
  output: {
    generic: [
      { response_type: "text", text: "Starting analysis..." },
      { response_type: "system", text: "Processing 1000 records" },
      { response_type: "text", text: "Analysis complete!" }
    ]
  }
}
```

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#system)

### TEXT

`TEXT = "text"`

Represents a basic text response. The given text may contain rich content such as markdown.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#text)

### USER_DEFINED

`USER_DEFINED = "user_defined"`

A user defined response will be displayed according to custom logic in the client.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#user_defined)

### VIDEO

`VIDEO = "video"`

Displays a video to the user using a video player.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageResponseTypes.html#video)
