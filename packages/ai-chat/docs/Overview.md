### Overview

The Carbon AI chat is a rich and extendable chat component that IBM products use to interact with AI.

This project enables the Carbon and watsonx teams to focus on core chat behaviors, allowing other teams to enhance their product's unique extensibility.

### Installing the Carbon AI chat

You can install the Carbon AI chat into your application in multiple ways. Internally, the Carbon AI chat uses dynamic imports to only load the pieces of the Carbon AI chat that you need.

#### Using as a React component

The React component allows you to use the AI chat in your React application. It offers helpful facades and helpers to use the core Chat API in a more friendly way for a React developer.

**This component does not support SSR, so if you are using Next.js or similar frameworks, make sure you render this component in client only modes.**

###### Basic example

You can render this component anywhere in your application and provide the Carbon AI chat configuration options object as a prop.

```javascript
import React from "react";
import { ChatContainer } from "@carbon/ai-chat";

const chatOptions = {
  // Your configuration object.
};

function App() {
  return <ChatContainer config={chatOptions} />;
}
```

For more information, see the [React component](React.md) documentation.

#### Using as a web component

The web component allows you to use the AI chat in your application. It offers helpful facades and helpers to use the core Chat API in a more friendly way for a web component developer.

###### Basic example

You can render this component anywhere in your application and provide the Carbon AI chat configuration options object as a prop.

```typescript
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container.js";

import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

const config = {
  // Your configuration object.
};

@customElement("my-app")
export class MyApp extends LitElement {
  render() {
    return html`<cds-aichat-container .config="{config}" />`;
  }
}
```

For more information, see the [web component](WebComponent.md) documentation.

### Using the API

#### Configuration

When use the React or web component version of the Carbon AI Chat, it passes in a configuration object that sets various immutable options as a `config` property. By editing the configuration object, you can control the appearance and behavior of the Carbon AI chat before your customers see it. The configuration options enable you to specify where the Carbon AI chat widget appears on your page, choose whether to use the IBM-provided launcher or your own, and more.

See the type documentation for {@link PublicConfig}.

#### Instance methods

Each instance of the Carbon AI chat provides a collection of runtime methods that your website can call any time after the instance is available on your website. You can apply these methods before or after the Carbon AI chat renders on the screen. You can open or close the Carbon AI chat widget from a custom control, send messages to your assistant from your own functions, theme the Carbon AI chat, dynamically update the Carbon AI chat text strings, and more.

See the type documentation for {@link ChatInstance}.

#### Events

Throughout its life cycle, the Carbon AI chat fires a variety of events your code can subscribe to. To use the event handler callbacks, do the following steps:

- Manipulate the message contents before sending, or after receiving.
- Change how your website renders when the Carbon AI chat opens or closes.
- Render your own custom response types inside the Carbon AI chat widget.

See the type documentation for {@link BusEvent}.

### Connecting to your server

The Carbon AI chat can send messages and retrieve conversations from your server. It supports both streamed and non-streamed responses.

For more information, see the [connecting to your server](CustomServer.md) documentation.

### Customizing the view

Carbon AI chat supplies multiple ways to customize the UI of the chat widget.

See [UI customization](Customization.md).

### Service desks

Carbon AI chat allows you to extend the Carbon AI chat with support for [various service desks](CustomServiceDesks.md).

### Accessibility

IBM strives to provide products with usable access for everyone, regardless of age or ability.

The Carbon AI chat integration complies with the [Web Content Accessibility 2.1 Level AA](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-21/) standard.

### Internationalization

#### Languages

Most of the content that displays in the Carbon AI chat originates from an assistant and displays the language that the content is written in. However, some content that displays in the Carbon AI chat is static text that is hard-coded inside of the Carbon AI chat. This includes items such as the "Type something..." message that appears as the placeholder text in the input field or the "Choose a date" text that appears on a date picker. By default, these texts display in English but you can change the language of the texts. The Carbon AI chat provides several translations for these texts and you can configure the Carbon AI chat to use those languages.

In addition, the individual texts can change if you want to use different text or if you want to provide your own translations for a language the Carbon AI chat does not have support for.

To change any text string, use the {@link ChatInstance.updateLanguagePack} instance method. The JSON object specifies the replacement strings. You can find the strings that the Carbon AI chat uses in the [languages folder](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/packages/ai-chat/src/languages).

These files are in the [ICU Message Format](http://userguide.icu-project.org/formatparse/messages).

**Note:** The provided JSON object does not need to contain all strings, just the strings you want to update. Your changes merge with the existing language strings.

#### Locales

In addition to languages, the Carbon AI chat supports locales with a more specific region code (e.g. `en-gb`). The region goes beyond the language and controls other things such as the format of dates and times shown by the Carbon AI chat. For example, date strings in UK English are in the `dd/mm/yyyy` format, while US English dates are in the `mm/dd/yyyy` format.

The Carbon AI chat supports the locales that the [dayjs library](https://github.com/iamkun/dayjs/tree/dev/src/locale) provide.

You can switch the locale by calling the {@link ChatInstance.updateLocale} instance method and by using the appropriate language code to get correct date formatting in the chat.

#### Bi-directional Support

Some languages are read from left to right (`ltr`), and others from right to left (`rtl`). The Carbon AI chat renders text in the same direction as the page based on the `dir` attribute on the `<html>` tag.

### Cookies and GDPR

The Carbon AI chat does not use any cookies. It uses the browser's transient session storage for required behavior to track the state of the Carbon AI chat as you navigate from page to page (e.g., should the home screen be visible, do you have an active tour open, and so on).
