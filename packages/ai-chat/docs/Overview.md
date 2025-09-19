### Overview

The Carbon AI Chat is a rich and extendable chat component that IBM products use to interact with AI.

This project enables the Carbon and watsonx teams to focus on core chat behaviors, allowing other teams to enhance their product's unique extensibility.

### Installing the Carbon AI Chat

You can install the Carbon AI Chat into your application in multiple ways.

#### Using as a React component

The React component allows you to use the AI chat in your React application. It offers helpful facades and helpers to use the core Chat API in a more friendly way for a React developer.

**This component does not support SSR, so if you are using Next.js or similar frameworks, make sure you render this component in client only modes.**

###### Basic example

You can render this component anywhere in your application and provide the Carbon AI Chat configuration options object as a prop.

```javascript
import React from "react";
import { ChatContainer } from "@carbon/ai-chat";

function App() {
  return (
    <ChatContainer
      debug={true}
      aiEnabled={true}
      header={{ title: "My Assistant" }}
      launcher={{ isOn: true }}
      // ... other config properties as individual props
    />
  );
}
```

For more information, see the [React component](React.md) documentation.

#### Using as a web component

The web component allows you to use the AI chat in your application. It offers helpful facades and helpers to use the core Chat API in a more friendly way for a web component developer.

###### Basic example

You can render this component anywhere in your application and provide the Carbon AI Chat configuration options object as a prop.

```typescript
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("my-app")
export class MyApp extends LitElement {
  render() {
    return html`<cds-aichat-container
      .debug=${true}
      .aiEnabled=${true}
      .header=${{ title: "My Assistant" }}
      .launcher=${{ isOn: true }}
    />`;
  }
}
```

Note: The AI theme is enabled by default. To disable it in plain HTML, use `ai-disabled` or set `ai-enabled="false"`.

For more information, see the [web component](WebComponent.md) documentation.

### Using the API

#### Picking your component

This package provides both React and web component versions of Carbon AI Chat. There are two versions for each framework exported. One provides a "float" layout, the classic lower right hand corner with a launch icon chat widget. The other provides the ability for you to render the Carbon AI Chat into a containing element of your choice. The Carbon AI Chat will responsively grow to fill the size of the container you provide.

See [React](React.md) documentation and [web component](WebComponent.md) documentation.

Each of these components allow you to pass props to can control the appearance and behavior of the Carbon AI Chat before your users see it. The configuration options enable you to specify where the Carbon AI Chat widget appears on your page, choose whether to use the IBM-provided launcher or your own, and more.

#### Instance methods

Each instance of the Carbon AI Chat provides a collection of imperative runtime methods that your website can call any time after the instance is available on your website. You can apply these methods before or after the Carbon AI Chat renders on the screen. You can open or close the Carbon AI Chat widget from a custom control, send messages to your assistant from your own functions, dynamically update the Carbon AI Chat text strings, and more.

See the type documentation for {@link ChatInstance}.

#### Events

Throughout its life cycle, the Carbon AI Chat fires a variety of events your code can subscribe to.

See the type documentation for {@link BusEvent}.

### Connecting to your server

The Carbon AI Chat can send messages and retrieve conversations from your server. It supports both streamed and non-streamed responses.

For more information, see the [connecting to your server](CustomServer.md) documentation.

### Customizing the view

Carbon AI Chat supplies multiple ways to customize the UI of the chat widget.

See [UI customization](Customization.md).

### Service desks

Carbon AI Chat allows you to extend the Carbon AI Chat with support for [various service desks](CustomServiceDesks.md).

### Accessibility

IBM strives to provide products with usable access for everyone, regardless of age or ability.

The Carbon AI Chat integration complies with the [Web Content Accessibility 2.1 Level AA](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-21/) standard.

### Internationalization

#### Languages

Most of the content that displays in the Carbon AI Chat originates from an assistant and displays the language that the content is written in. However, some content that displays in the Carbon AI Chat is static text that is hard-coded inside of the Carbon AI Chat. This includes items such as the "Type something..." message that appears as the placeholder text in the input field or the "Choose a date" text that appears on a date picker. By default, these texts display in English but you can change the language of the texts.

To change any text string, pass a `strings` prop to the React or web component. Provide a partial language pack object and it will merge with the defaults. You can find the available string keys in the [languages folder](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/packages/ai-chat/src/languages).

These files are in the [ICU Message Format](http://userguide.icu-project.org/formatparse/messages).

Example (React):

```tsx
<ChatContainer strings={{ input_placeholder: "Ask me anything..." }} />
```

Example (web component):

```html
<cds-aichat-container
  .strings=${{ input_placeholder: "Ask me anything..." }}
>
</cds-aichat-container>
```

#### Locales

In addition to languages, the Carbon AI Chat supports locales with a more specific region code (e.g. `en-gb`). The region goes beyond the language and controls other things such as the format of dates and times shown by the Carbon AI Chat. For example, date strings in UK English are in the `dd/mm/yyyy` format, while US English dates are in the `mm/dd/yyyy` format.

The Carbon AI Chat supports the locales that the [dayjs library](https://github.com/iamkun/dayjs/tree/dev/src/locale) provide.

You can switch the locale by updating the {@link PublicConfig.locale} config using the appropriate language code to get correct date formatting in the chat.

#### Bi-directional Support

Some languages are read from left to right (`ltr`), and others from right to left (`rtl`). The Carbon AI Chat renders text in the same direction as the page based on the `dir` attribute on the `<html>` tag.

### Cookies and GDPR

The Carbon AI Chat does not use any cookies. It uses the browser's transient session storage for required behavior to track the state of the Carbon AI Chat as you navigate from page to page (e.g., should the home screen be visible, and so on).
