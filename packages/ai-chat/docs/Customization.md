---
title: UI customization
---

### Customizing responses from the assistant

#### Rich text responses

The Carbon AI chat also supports basic styling inside `text` responses to match the theme of your Carbon AI chat, both with Markdown or HTML content returned from the Assistant. Using Markdown instead of HTML in your text responses is the recommendation. It allows adding channels that do not support HTML (such as Facebook, Slack, or WhatsApp) without having to rewrite your content.

##### Markdown

The Carbon AI chat supports common Markdown syntax (bold, italics, lists, images, tables, code blocks, headings, blockquotes, and so on) in the `text` response type. The Carbon AI chat follows standard CommonMark rules.

##### HTML content

If you include HTML (including `style` and `script` tags) in your text response from your assistant, the Carbon AI chat renders those elements as provided. A better approach is to use a `user_defined` response instead of adding HTML directly to your responses to make adding support for channels that do not support HTML easier.

#### User-defined responses

In addition to rendering HTML content in responses, the Carbon AI chat can render content from your own HTML, CSS, or JavaScript on your page by using a `user_defined` {@link UserDefinedItem}. It allows for a better authoring experience for development and enables you to change responses without editing your assistant. You can even use portals in advanced frameworks like React to render content from your main application.

To show custom content, you return the following from your server as a [GenericItem]. Refer to the following example.

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

The `user_defined` response injects into a slot within the Carbon AI chat's ShadowRoot. This means that it can be styled from global CSS and have a small amount of the CSS inherited from the Carbon AI chat (font styling, and so on) styles. You can use Carbon components in addition to your own custom components.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

### Customizing the Carbon AI chat container

#### Layout

By default, the Carbon AI chat adds an element just before the </body> tag and displays it as a floating widget in the lower right or left corner, based on your page's directional settings. This position is customizable and includes a replaceable launcher button.

Alternatively, you can specify a custom element for the Carbon AI chat to render into. The Carbon AI chat adapts to the container's dimensions and adjusts its layout responsively to suit the rendered size:

- For tall and narrow elements, such as sidebars, the Carbon AI chat renders its layout to fit seamlessly.
- For large, central elements, the Carbon AI chat expands to fill the space following the best practices for larger formats.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

#### Theming

You can customize the Carbon theme of the Carbon AI chat. Choose one of four Carbon themes by using the `carbonTheme` property:

- White
- Gray 10
- Gray 90
- Gray 100

The light themes include White and Gray 10, while Gray 90 and Gray 100 provide dark grays and blacks.

For more information, see the documentation for {@link PublicConfig.themeConfig}.

#### Homescreen

The Carbon AI chat displays an optional home screen featuring content presented to users during their initial interaction and accessible later in the conversation. Many use it to give people sample prompts for their assistant.

For more information, see the documentation for {@link ChatInstance.updateHomeScreenConfig}.

#### Launcher

The Carbon AI chat launcher welcomes and engages customers so they know where to find help if they need it.

For more information, see the documentation for {@link ChatInstance.updateLauncherConfig}.

#### Writeable elements

The Carbon AI chat strategically provides access to various elements around the Carbon AI chat. You can directly write to these elements or write to them as portals from your application if you use advanced frameworks like React, Angular, Vue, or a web component. The writeable elements available are defined at {@link WriteableElementName}.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

#### Custom Panel

The Carbon AI chat opens an overlay panel with custom content anytime. Panels are effective for use cases that range from pre-chat content forms, post-chat feedback forms, or multistep processes. You can open the panel at any time, whether from an event, a `user_defined` response, or even an action a user takes on your website.

For more information, see {@link ChatInstance.customPanels}. The custom panel is just another {@link WriteableElementName}. For more information on displaying a writeable element, see the documentation for [React](React.md) and [web components](WebComponent.md).

### White labeling

Coming soon.
