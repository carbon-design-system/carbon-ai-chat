# TextItem

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.TextItem.html

A text item returned in a message response from an assistant.

The Carbon AI Chat supports basic styling inside text responses to match the theme of your Carbon AI Chat,
both with Markdown or HTML content returned from your assistant. Using Markdown and `user_defined`
(UserDefinedItem) responses instead of HTML in your text responses is the recommendation. It allows
adding channels that do not support HTML (such as Facebook, Slack, or WhatsApp) without having to rewrite
your content.

## Markdown

The Carbon AI Chat supports the following Markdown syntax in the text response type:

**Text formatting:**

- `**bold text**` or `__bold text__`
- `*italic text*` or `_italic text_`
- `~~strikethrough~~`
- `==highlighted text==`
- `^superscript^`
- `~subscript~`

**Code:**

- `` `inline code` `` or fenced code blocks with syntax highlighting.

**Headers:**

- `# H1`, `## H2`, `### H3`, `#### H4`, `##### H5`, `###### H6`

**Lists:**

- Unordered lists using `*`, `+`, or `-`
- Ordered lists using `1.`, `2.`, etc.
- Nested lists are supported

**Links and images:**

- `[link text](URL)` for links (opens in new tab by default)
- `![alt text](image URL)` for images

**Other elements:**

- `> blockquote text` for blockquotes
- Tables using pipe syntax with automatic pagination and sorting
- Horizontal rules using `---` or `***`
- Line breaks are preserved (breaks: true)
- Automatic URL detection and conversion to links

**Attributes:**

- Custom attributes using `{{class="my-class" id="my-id"}}` syntax
- Supported attributes: `target`, `rel`, `class`, `id`

**HTML support:**

- Raw HTML is supported when enabled
- Custom elements and web components are allowed
- Content is sanitized for security when sanitization is enabled

The Carbon AI Chat follows CommonMark rules with these extensions and enhancements.

## HTML content

If you include HTML (including `style` and `script` tags) in your text response from your assistant, the
Carbon AI Chat renders those elements as provided, unless you set PublicConfig.shouldSanitizeHTML
to `true`. A better approach is to use a `user_defined` response instead of adding HTML directly to your
responses to make adding support for channels that do not support HTML easier.

## Signature

```ts
interface TextItem
```

## Members

### agent_message_type

`agent_message_type?: HumanAgentMessageType`

For messages that are sent between the user and a human agent, we assign an agent type to the message to distinguish what type it is.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.TextItem.html#agent_message_type)

### message_item_options

`message_item_options?: GenericItemMessageOptions`

Options that control additional features available for a message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.TextItem.html#message_item_options)

### response_type

`response_type: MessageResponseTypes`

The response type of this message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.TextItem.html#response_type)

### streaming_metadata

`streaming_metadata?: ItemStreamingMetadata`

Metadata used to identify a generic item within the context of a stream in order to correlate any updates meant
for a specific item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.TextItem.html#streaming_metadata)

### text

`text?: string`

The text of the response.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.TextItem.html#text)

### user_defined

`user_defined?: TUserDefinedType`

An optional buckets of additional user defined properties for this item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.TextItem.html#user_defined)

## Related

- [PublicConfig.shouldSanitizeHTML](./PublicConfig.md)
- [UserDefinedItem](./UserDefinedItem.md)
