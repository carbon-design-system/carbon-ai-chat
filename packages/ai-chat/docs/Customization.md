---
title: UI customization
---

### Customizing responses from the assistant

#### Rich text responses

The Carbon AI Chat also supports basic styling inside `text` responses to match the theme of your Carbon AI Chat, both with Markdown or HTML content returned from your assistant. Using Markdown and `user_defined` {@link UserDefinedItem} responses instead of HTML in your text responses is the recommendation. It allows adding channels that do not support HTML (such as Facebook, Slack, or WhatsApp) without having to rewrite your content.

##### Markdown

The Carbon AI Chat supports the following Markdown syntax in the `text` response type:

**Text formatting:**

- `**bold text**` or `__bold text__` for **bold text**
- `*italic text*` or `_italic text_` for _italic text_
- `~~strikethrough~~` for ~~strikethrough text~~
- `==highlighted text==` for ==highlighted text==
- `^superscript^` for superscript text
- `~subscript~` for subscript text

**Code:**

- `` `inline code` `` for `inline code`
- Fenced code blocks with syntax highlighting:

  ````
  ```javascript
  console.log('Hello, world!');
  ````

  ```

  ```

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

##### HTML content

If you include HTML (including `style` and `script` tags) in your text response from your assistant, the Carbon AI Chat renders those elements as provided. A better approach is to use a `user_defined` response instead of adding HTML directly to your responses to make adding support for channels that do not support HTML easier.

#### User-defined responses

In addition to rendering HTML content in responses, the Carbon AI Chat can render content from your own HTML, CSS, or JavaScript on your page by using a `user_defined` {@link UserDefinedItem}. It allows for a better authoring experience for development and enables you to change responses without editing your assistant. You can even use portals in advanced frameworks like React to render content from your main application.

To show custom content, you return the following from your server. Refer to the following example.

```
{
  response_type: 'user_defined',
  user_defined: {
    // A unique name for each UI component.
    type: 'my-unique-name',
    // Any other custom metadata you need for rendering.
    foo: 'bar',
    baz: {
      boz: true
    }
  }
}

```

The `user_defined` response injects into a slot within the Carbon AI Chat's ShadowRoot. This means that it can be styled from global CSS and have a small amount of the CSS inherited from the Carbon AI Chat (font styling, and so on) styles. You can use Carbon components in addition to your own custom components.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

### Customizing the Carbon AI Chat container

#### Layout

By default, the Carbon AI Chat adds an element just before the `</body>` tag and displays it as a floating widget in the lower right or left corner, based on your page's directional settings. This position is customizable and includes a replaceable launcher button.

Alternatively, you can specify a custom element for the Carbon AI Chat to render into. The Carbon AI Chat adapts to the container's dimensions and adjusts its layout responsively to suit the rendered size:

- For tall and narrow elements, such as sidebars, the Carbon AI Chat renders its layout to fit seamlessly.
- For large, central elements, the Carbon AI Chat expands to fill the space following the best practices for larger formats.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

#### Theming

You can customize the Carbon theme of the Carbon AI Chat. Choose one of four Carbon themes by using the `carbonTheme` property:

- White
- Gray 10
- Gray 90
- Gray 100

For more information, see the documentation for {@link PublicConfig.themeConfig}.

#### Homescreen

The Carbon AI Chat displays an optional home screen featuring content presented to users during their initial interaction and accessible later in the conversation. Many use it to provide sample prompts for their assistant, but there is considerable freedom on this page to introduce your particular assistant.

For more information, see the documentation for {@link ChatInstance.updateHomeScreenConfig}.

#### Launcher

The Carbon AI Chat launcher welcomes and engages customers so they know where to find help if they need it. You can also provide your own launcher.

For more information, see the documentation for {@link ChatInstance.updateLauncherConfig}.

#### Writeable elements

The Carbon AI Chat strategically provides access to various elements around the Carbon AI Chat. You can directly write to them as portals from your application with frameworks like React, Angular, Vue, or a web component. The writeable elements available are defined at {@link WriteableElementName}.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

#### Custom Panel

The Carbon AI Chat can open an overlay panel with custom content at any time. Panels are effective for use cases that range from pre-chat content forms, post-chat feedback forms, or multi-step processes. You can open the panel at any time, whether from an event, a `user_defined` response, or even an action a user takes on your website.

For more information, see {@link ChatInstance.customPanels}. The custom panel is just another {@link WriteableElementName}. For more information on displaying a writeable element, see the documentation for [React](React.md) and [web components](WebComponent.md).
