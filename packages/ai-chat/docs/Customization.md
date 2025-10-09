---
title: UI customization
---

### Overview

There are a few ways to customize the UI either by configuration, supplying css custom properties and styles, making use of slots, or rendering responses from the assistant.

### Customizing responses from the assistant

The Carbon AI Chat can accept many `response_types` like carousels, buttons, etc. You can navigate to the properties for each `response_type` by visiting the base {@link GenericItem} type.

#### Rich text responses

The Carbon AI Chat supports styling inside `text` responses to match the theme of your Carbon AI Chat, both with Markdown or HTML content returned from your assistant. For more information on supported Markdown syntax and HTML content handling, see the documentation for {@link TextItem}.

#### User-defined responses

In addition to rendering HTML content in responses, the Carbon AI Chat can render content from your own HTML, CSS, or JavaScript on your page by using a `user_defined` {@link UserDefinedItem}. It allows for a better authoring experience for development and enables you to change responses without editing your assistant. You can even use portals in advanced frameworks like React to render content from your main application.

To show custom content, you return the following from your server. Refer to the following example.

```json
{
  "response_type": "user_defined",
  "user_defined": {
    // A unique name for each UI component.
    "type": "my-unique-name",
    // Any other custom metadata you need for rendering.
    "foo": "bar",
    "baz": {
      "boz": true
    }
  }
}
```

The `user_defined` response injects into a slot within the Carbon AI Chat's shadow DOM. This means that it can be styled from global CSS and have a small amount of the CSS inherited from the Carbon AI Chat (font styling, and so on) styles. You can use Carbon components in addition to your own custom components.

When streaming `user_defined` responses, the API only supports sending chunks of strings, not partially completed JSON. You can stringify JSON and then have your user defined handler that responds to it deal with try/catch based parsing or an optimistic parsing library.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

### Layout

Both the web component and React versions of Carbon AI Chat provide a version of the chat with a defined "floating" size (standard launcher in the corner and a window the pops up when you click on it) and a version where you provide the size by passing in a CSS class name(s) and the chat is rendered in place where you put it in your DOM tree. In the latter scenario, the chat will automatically grow to the size of the CSS you have provided for the container and will responsively re-adjust as that size changes.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

### Theming

You can customize the Carbon theme of the Carbon AI Chat. By default, it will inherit a Carbon theme from the host page. If the rest of your site does not use Carbon, you may choose one of four Carbon themes by using the {@link PublicConfig.injectCarbonTheme} property:

- White
- Gray 10
- Gray 90
- Gray 100

This will inject the correct CSS custom properties into the Carbon AI Chat's shadow DOM.

Alternatively, if you want to pick your own colors, you can inject the Carbon theme on your own and then override specific colors.

For more information, see [@carbon/themes](https://github.com/carbon-design-system/carbon/tree/main/packages/themes) and the documentation for {@link PublicConfig}.

### Assistant name

By default, the name of the assistant that the chat uses is "watsonx". You can override this default using {@link PublicConfig.assistantName} or you can do it on a per message basis with {@link MessageResponse.message_options}.

### Homescreen

The Carbon AI Chat displays an optional home screen featuring content presented to users during their initial interaction and accessible later in the conversation. Many use it to provide sample prompts for their assistant, but there is considerable freedom on this page to introduce your particular assistant.

For more information, see the documentation for {@link PublicConfig.homescreen}.

### Header

The Carbon AI Chat header can be configured to add an overflow menu, update icons and add title text.

For more information, see the documentation for {@link PublicConfig.header}.

### Launcher

The Carbon AI Chat launcher welcomes and engages customers so they know where to find help if they need it. You can also provide your own launcher.

For more information, see the documentation for {@link PublicConfig.launcher}.

### Writeable elements (slotted content)

The Carbon AI Chat strategically provides access to various slots around the Carbon AI Chat. You can directly write to them as portals from your application with frameworks like React, Angular, Vue, or a web component. The writeable elements available are defined at {@link WriteableElementName}.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

### Custom Panel

The Carbon AI Chat can open an overlay panel with custom content at any time. Panels are effective for use cases that range from pre‑chat content forms, post‑chat feedback forms, or multi‑step processes. You can open the panel at any time, whether from an event, a `user_defined` response, or even an action a user takes on your website.

Custom panels are controlled via {@link ChatInstance.customPanels}. Use `instance.customPanels.getPanel()` to obtain the panel, then call `open(options)` and `close()` as needed. Supported options are described by {@link CustomPanelConfigOptions}.

Example:

```ts
const panel = instance.customPanels.getPanel();
panel.open({
  title: "My Custom Panel",
  hideCloseButton: true,
  disableAnimation: true,
});
// ... later
panel.close();
```

The custom panel renders content through the {@link WriteableElementName.CUSTOM_PANEL_ELEMENT} writeable element. For more on rendering writeable elements, see the documentation for [React](React.md) and [web components](WebComponent.md).
