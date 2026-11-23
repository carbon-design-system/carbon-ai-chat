<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# ButtonItem

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html

This message item represents a button that can perform various actions such as sending messages, opening URLs, or showing panels.

## Signature

```ts
interface ButtonItem
```

## Members

### agent_message_type

`agent_message_type?: HumanAgentMessageType`

For messages that are sent between the user and a human agent, we assign an agent type to the message to distinguish what type it is.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#agent_message_type)

### alt_text

`alt_text?: string`

The alt text for labeling the item. Screen readers will announce this text when the user's virtual cursor
is focused on the item.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#alt_text)

### button_type

`button_type: ButtonItemType`

The type of button.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#button_type)

### custom_event_name

`custom_event_name?: string`

A custom event that can be listened to by Carbon AI Chat when the button item is clicked.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#custom_event_name)

### hide_label

`hide_label?: boolean`

When true, the button shows only its icon and hides its text. Screen readers still announce the text as the
button's name. That text is the ButtonItem.label. A `post_back` button without a label uses its
`value.input.text`, and a `url` button without a label uses its URL.

This applies only when the button shows an icon, either one set with ButtonItem.icon or the default for
its type. Without an icon the button keeps its text. It does not apply to a `url` button of kind `LINK` or to a
button with an ButtonItem.image_url.

## Examples

```ts
import ArrowRight from '@carbon/icons/es/arrow--right/16.js';
{
  response_type: 'button',
  button_type: 'post_back',
  kind: 'ghost',
  label: 'Learn what actions you can take',
  hide_label: true,
  icon: ArrowRight,
  icon_alignment: 'end',
  value: { input: { text: 'Which tools and actions do I have access to?' } },
}
```

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#hide_label)

### icon

`icon?: CarbonIcon | ComponentType<any>`

The icon to render inside the button. Accepts an icon from `@carbon/icons`, e.g.
`import ArrowRight from '@carbon/icons/es/arrow--right/16.js'`, or a component from `@carbon/icons-react`.

Supported on all button types. Overrides the default icon for `url` (`Launch`) and
the `image_url`-gated defaults for `post_back`, `custom_event`, and `show_panel`.
The icon is placed on the trailing side of the button label.

## Examples

```ts
import ArrowRight from '@carbon/icons/es/arrow--right/16.js';
{ response_type: 'button', button_type: 'post_back', label: 'Next', icon: ArrowRight }
```

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#icon)

### icon_alignment

`icon_alignment?: "end" | "start" | "center"`

Where the icon sits in the button when ButtonItem.hide_label is true. The `start` and `end` values follow
the reading direction, so `end` is the right edge in left-to-right languages. This has no effect while the button
shows its text.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#icon_alignment)

### image_url

`image_url?: string`

The URL pointing to an image.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#image_url)

### kind

`kind?: BUTTON_KIND | "LINK"`

The style of button to display.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#kind)

### label

`label?: string`

The text shown on the button. A `post_back` button also uses it for the user's message in the
transcript, and sends `value.input.text` to the assistant. A `post_back` button with no
`value.input.text` sends this text instead.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#label)

### message_item_options

`message_item_options?: GenericItemMessageOptions`

Options that control additional features available for a message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#message_item_options)

### panel

`panel?: MessageItemPanelInfo`

The panel options to display in a panel when the "show_panel" button type is clicked.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#panel)

### response_type

`response_type: MessageResponseTypes`

The response type of this message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#response_type)

### selection_display

`selection_display?: SelectionDisplay`

Controls the text shown in the generated user message for a `post_back` button. The default is
SelectionDisplay.LABEL. The preferred text falls back to the other available text. The resolved text is
stored in MessageRequest.history and remains there when ButtonItem.silent hides the message. Other
button types ignore this property.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#selection_display)

### silent

`silent?: boolean`

When true (post_back buttons only), the request generated by clicking this button is sent to
`customSendMessage` but not added to the visible chat transcript. Use this when the button's
`value.input.text` is a machine-readable trigger string that you don't want the user to see.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#silent)

### size

`size?: CHAT_BUTTON_SIZE | BUTTON_SIZE`

The button size.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#size)

### streaming_metadata

`streaming_metadata?: ItemStreamingMetadata`

Metadata used to identify a generic item within the context of a stream in order to correlate any updates meant
for a specific item.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#streaming_metadata)

### target

`target?: string`

Where to open the link. The default value is _self.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#target)

### url

`url?: string`

The URL for the user to visit when the button is clicked.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#url)

### user_defined

`user_defined?: TUserDefinedType`

An optional buckets of additional user defined properties for this item.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#user_defined)

### value

`value?: { input: MessageInput }`

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ButtonItem.html#value)
