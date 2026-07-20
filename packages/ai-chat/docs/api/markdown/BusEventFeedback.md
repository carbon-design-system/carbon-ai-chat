# BusEventFeedback

- Kind: Interface
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventFeedback.html

This event is fired when the user interacts with the feedback controls on a message. This includes both the feedback
buttons (thumbs up/down) as well as the details popup where the user can submit additional information.

## Signature

```ts
interface BusEventFeedback
```

## Members

### categories

`categories?: string[]`

When submitting feedback details, this is the list of categories the user selected (if visible).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventFeedback.html#categories)

### interactionType

`interactionType: FeedbackInteractionType`

The type of interaction the user had with the feedback.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventFeedback.html#interactiontype)

### isPositive

`isPositive: boolean`

Indicates if the user is providing positive or negative feedback.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventFeedback.html#ispositive)

### message

`message: MessageResponse`

The message for which feedback was provided.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventFeedback.html#message)

### messageItem

`messageItem: GenericItem`

The message item for which feedback was provided.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventFeedback.html#messageitem)

### text

`text?: string`

When submitting feedback details, this is the text the user entered into the text field (if visible).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventFeedback.html#text)

### type

`type: BusEventType`

The type of this event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventFeedback.html#type)
