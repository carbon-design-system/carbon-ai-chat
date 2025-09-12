---
title: Using as a Web component
---

### Overview

Carbon AI chat exports two web components.

To use the `float` layout, refer to [cds-aichat-container](#chat-container). If you want to use a custom size, such as rendering in a sidebar, full-screen mode, or nested within your UI, refer to [cds-aichat-custom-element](#chat-custom-element).

Be sure to review [Using the API](Overview.md#using-the-api) to fully understand the references in this document.

### Installation

Install by using `npm`:

```bash
npm install @carbon/ai-chat
```

Or using `yarn`:

```bash
yarn add @carbon/ai-chat
```

_Be sure to check for required peerDependencies._

#### Basic example

Render this component in your application, and provide the configuration options for the Carbon AI Chat as a prop.

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

### Using `cds-aichat-container`

The `cds-aichat-container` component loads and renders an instance of the Carbon AI Chat when it mounts and deletes that instance when unmounted. If option changes occur in the Carbon AI Chat configuration, it also deletes the previous Carbon AI Chat and creates a new one with the new configuration.

See {@link CdsAiChatContainerAttributes} for an explanation of the various accepted properties and attributes.

#### AI theme toggle

`ai-enabled` is on by default when not specified. To disable the AI theme in plain HTML, either:

- Use `ai-disabled`:
  `<cds-aichat-container ai-disabled></cds-aichat-container>`
- Or set a falsey string on `ai-enabled`:
  `<cds-aichat-container ai-enabled="false"></cds-aichat-container>`

Accepted falsey strings for `ai-enabled` are `"false"`, `"0"`, `"off"`, and `"no"` (case‑insensitive). If present and not one of those values, the AI theme is enabled.

#### Using `cds-aichat-custom-element`

This library provides the component `cds-aichat-custom-element`, which you can use to render the Carbon AI Chat inside a custom element. Use this if you need to change the location where the Carbon AI Chat renders.

This component's default behavior adds and removes a class from the main window of the Carbon AI Chat. It also applies the same behavior to your custom element to manage the visibility of the Carbon AI Chat when it opens or closes. When the Carbon AI Chat closes, it adds a classname to the Carbon AI Chat main window to hide the element. Another classname is added to your custom element to set its width and height to 0, so that it doesn't take up space.

**Note:** The custom element must remain visible if you want to use the built-in Carbon AI Chat launcher, which is also contained in your custom element.

If you don't want these behaviors, then provide your own `onViewChange` prop to `cds-aichat-custom-element` and provide your own logic for controlling the visibility of the Carbon AI Chat. If you want custom animations when the Carbon AI Chat opens and closes, use this mechanism to do that. Refer to the following example.

See {@link CdsAiChatCustomElementAttributes} for an explanation of the various accepted properties and attributes.

```typescript
import "@carbon/ai-chat/dist/es/cds-aichat-custom-element/index.js";

import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("my-app")
export class MyApp extends LitElement {
  static styles = css`
    .fullscreen {
      height: 100vh;
      width: 100vw;
    }
  `;
  render() {
    return html`<cds-aichat-custom-element
      class="fullscreen"
      .debug=${true}
      .aiEnabled=${true}
      .header=${{ title: "My Assistant" }}
      .launcher=${{ isOn: true }}
    />`;
  }
}
```

### Accessing instance methods

You can use the {@link CdsAiChatContainerAttributes.onBeforeRender} or {@link CdsAiChatContainerAttributes.onAfterRender} props to access the Carbon AI Chat's instance if you need to call instance methods later. This example renders a button that toggles the Carbon AI Chat open and only renders after the instance becomes available. Refer to the following example.

```typescript
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { type ChatInstance } from "@carbon/ai-chat";

const config = {
  // Your configuration object.
};

@customElement("my-app")
export class MyApp extends LitElement {
  @state()
  _instance: ChatInstance;

  onBeforeRender = (instance: ChatInstance) => {
    this._instance = instance;
    // Do whatever you want to do with the instance.
  };

  render() {
    return html`<cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .header=${{ title: "My Assistant" }}
        .launcher=${{ isOn: true }}
      />${this._instance ? "<span>Instance loaded</span>" : ""}`;
  }
}
```

### User defined responses

This component is also capable of managing `user defined` responses. The Carbon AI Chat throws events when it receives a `user_defined` response from your custom backend. These events come with the name of a dynamically generated slot.

Then, you dynamically generate these slots to pass into the Carbon AI Chat's web component and pass in your custom content to be displayed in the correct slot inside the Carbon AI Chat. Refer to the following example.

```typescript
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import {
  BusEventType,
  type ChatInstance,
  type GenericItem,
  type MessageResponse,
  type PublicConfig,
  type UserDefinedItem,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

interface UserDefinedSlotsMap {
  [key: string]: UserDefinedSlot;
}

interface UserDefinedSlot {
  message: GenericItem;
  fullMessage: MessageResponse;
}

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
};

@customElement("my-app")
export class Demo extends LitElement {
  @state()
  accessor instance!: ChatInstance;

  @state()
  accessor userDefinedSlotsMap: UserDefinedSlotsMap = {};

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: this.userDefinedHandler,
    });
  };

  /**
   * Each user defined event is tied to a slot deeply rendered with-in AI chat that is generated at runtime.
   * Here we make sure we store all these slots along with their relevant data in order to be able to dynamically
   * render the content to be slotted when this.renderUserDefinedSlots() is called in the render function.
   */
  userDefinedHandler = (event: any) => {
    const { data } = event;
    this.userDefinedSlotsMap[data.slot] = {
      message: data.message,
      fullMessage: data.fullMessage,
    };
    this.requestUpdate();
  };

  /**
   * This renders each of the dynamically generated slots that were generated by the AI chat by calling
   * this.renderUserDefinedResponse on each one.
   */
  renderUserDefinedSlots() {
    const userDefinedSlotsKeyArray = Object.keys(this.userDefinedSlotsMap);
    return userDefinedSlotsKeyArray.map((slot) => {
      return this.renderUserDefinedResponse(slot);
    });
  }

  /**
   * Here we process a single item from this.userDefinedSlotsMap. We go ahead and use a switch statement to decide
   * which element we should be rendering.
   */
  renderUserDefinedResponse(slot: keyof UserDefinedSlotsMap) {
    const { message, fullMessage } = this.userDefinedSlotsMap[slot];

    const userDefinedMessage = message as UserDefinedItem;

    // Check the "type" we have used as our key.
    switch (userDefinedMessage.user_defined?.user_defined_type) {
      case "my_unique_identifier":
        // And here is an example using your own component.
        return html`<div slot=${slot}>
          ${userDefinedMessage.user_defined.text as string}
        </div>`;
      default:
        return null;
    }
  }

  render() {
    return html`
      <h1>Welcome!</h1>
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        >${this.renderUserDefinedSlots()}</cds-aichat-container
      >
    `;
  }
}
```

### Writeable Elements

The web components will also take elements with a slot attribute matching {@link WriteableElementName} as slot items.

```typescript
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

const config = {
  // Your configuration object.
};

@customElement("my-app")
export class MyApp extends LitElement {
  render() {
    return html`<cds-aichat-container>
      <div slot="customPanelElement">Hello world!</div>
    </cds-aichat-container>`;
  }
}
```

### Testing with Jest

Carbon AI Chat exports as an ES module and does not include a CJS build. Please refer to the [Jest documentation](https://jestjs.io/docs/code-transformation) for information about transforming ESM to CJS for Jest using `babel-jest` or `ts-jest`.

You may need to add configuration similar to the following to your Jest configuration.

```
"transform": {
  "\\.[jt]sx?$": "babel-jest",
},
{
  transformIgnorePatterns: [
    '/node_modules/(?!(@?lit.*|@carbon/.+)/)'
  ],
}
```
