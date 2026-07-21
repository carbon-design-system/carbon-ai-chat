# GenericItemMessageFeedbackOptions

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html

Controls the display of a feedback options (thumbs up/down) for a message item.

## Signature

```ts
interface GenericItemMessageFeedbackOptions
```

## Members

### categories

`categories?: string[] | GenericItemMessageFeedbackCategories`

An optional set of categories to allow the user to choose from. This can either be an array of strings for
both positive and negative feedback or a GenericItemMessageFeedbackCategories object to make different
configuration for both.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#categories)

### disclaimer

`disclaimer?: string`

The legal disclaimer text to show at the bottom of the popup. This text may contain rich markdown content. If this
value is not provided, no text will be shown.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#disclaimer)

### disclaimerCheckbox

`disclaimerCheckbox?: string`

The label text to display with the legal disclaimer checkbox. If this value is not provided, no disclaimer checkbox
or label text will be displayed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#disclaimercheckbox)

### id

`id?: string`

A unique identifier for this feedback. This is required for the feedback to be recorded in message history.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#id)

### is_on

`is_on?: boolean`

Indicates if a request for feedback should be displayed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#is_on)

### max_length

`max_length?: number`

The maximum number of characters allowed in the feedback text area.
defaults to 1000.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#max_length)

### placeholder

`placeholder?: string`

The placeholder to show in the text area. A default value will be used if no value is provided here.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#placeholder)

### prompt

`prompt?: string`

The prompt text to display to the user. A default value will be used if no value is provided here.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#prompt)

### show_negative_details

`show_negative_details?: boolean`

Indicates if the user should be asked for additional detailed information when providing negative feedback. This
defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#show_negative_details)

### show_positive_details

`show_positive_details?: boolean`

Indicates if the user should be asked for additional detailed information when providing positive feedback. This
defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#show_positive_details)

### show_prompt

`show_prompt?: boolean`

Indicates whether the prompt line should be shown. This defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#show_prompt)

### show_text_area

`show_text_area?: boolean`

Indicates whether the text area should be shown. This defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#show_text_area)

### title

`title?: string`

The title to display in the popup. A default value will be used if no value is provided here.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GenericItemMessageFeedbackOptions.html#title)
