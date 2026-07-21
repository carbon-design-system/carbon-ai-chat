# FeedbackInteractionType

- Kind: Enum
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.FeedbackInteractionType.html

The ways the user may interact with the feedback controls.

## Signature

```ts
enum FeedbackInteractionType
```

## Members

### DETAILS_CLOSED

`DETAILS_CLOSED = "detailsClosed"`

Indicates the details popup was closed after the user clicked the "X" button to close it or if the user clicked the
feedback button that opened it.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.FeedbackInteractionType.html#details_closed)

### DETAILS_OPENED

`DETAILS_OPENED = "detailsOpened"`

Indicates the details popup was opened after the user clicked one of the feedback buttons.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.FeedbackInteractionType.html#details_opened)

### SUBMITTED

`SUBMITTED = "submitted"`

Indicates feedback was submitted. This includes both when the details panel is open and submitted as well as when
the user clicks a feedback button and the details are not shown.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.FeedbackInteractionType.html#submitted)
