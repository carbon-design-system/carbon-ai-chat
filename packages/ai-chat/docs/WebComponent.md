---
title: Using as a web component
---

## Overview

Carbon AI Chat exports two web components.

{@link CdsAiChatCustomElementAttributes | cds-aichat-custom-element} renders the chat into an element you size and place — a sidebar, full-screen mode, or content nested in your UI — and it's the most common choice. {@link CdsAiChatContainerAttributes | cds-aichat-container} renders the classic floating widget for you — a corner launcher and a window that opens on click — by applying the [float layout classes](./Layout.md#floating-layout) so you don't have to.

You don't need {@link CdsAiChatContainerAttributes | cds-aichat-container} for a float layout: the classes are exported, so you can apply them to {@link CdsAiChatCustomElementAttributes | cds-aichat-custom-element} yourself and get the same widget — see [Float layout](#float-layout). Reach for {@link CdsAiChatContainerAttributes | cds-aichat-container} only when you'd rather skip that wiring.

You get the {@link ChatInstance} from {@link CdsAiChatContainerAttributes.onBeforeRender}, which you need before any slotted content.

> **Note**: This page covers only what's specific to web components. For theming, layout, slotting your own content, and the rest of the configuration shared across every framework, see [UI customization](./Customization.md).

## Installation

Install with `npm`:

```
npm install @carbon/ai-chat
```

Or with `yarn`:

```
yarn add @carbon/ai-chat
```

> **Note**: Install the required `peerDependencies`. The [peer dependency changes](https://github.com/carbon-design-system/carbon-ai-chat/blob/main/docs/peer-dependency-changes.md) log lists additions, removals, and version updates across releases.

### Basic example

Render the component, give it a class that sizes it, and pass your configuration as props.

```typescript
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("my-app")
export class MyApp extends LitElement {
  static styles = css`
    .fullscreen {
      block-size: 100vh;
      inline-size: 100%;
    }
  `;
  render() {
    return html`<cds-aichat-custom-element
      class="fullscreen"
      .header=${{ title: "My Assistant" }}
    />`;
  }
}
```

## Using cds-aichat-custom-element

Use `cds-aichat-custom-element` to render Carbon AI Chat inside a custom element when you need to control where the chat renders.

Size the custom element with external CSS (see the example below). By default, the element is 0x0, so it takes up no space but keeps any fixed-positioned launcher visible.

> **Note:** The custom element must stay visible to use the built-in Carbon AI Chat launcher, since that launcher lives inside your custom element.

For different open/close behavior — say, animating the chat in and out — provide the {@link CdsAiChatCustomElementAttributes.onViewPreChange | onViewPreChange} and {@link CdsAiChatCustomElementAttributes.onViewChange | onViewChange} properties. {@link CdsAiChatCustomElementAttributes.onViewPreChange | onViewPreChange} runs before the view changes, and the chat awaits it, so you can update your CSS classes and finish an animation before the chat shell hides. {@link CdsAiChatCustomElementAttributes.onViewChange | onViewChange} runs once the change completes; provide it to replace the default 0x0 sizing.

See {@link CdsAiChatCustomElementAttributes} for the properties and attributes it accepts.

```typescript
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

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

### Float layout

The float layout pins the chat to a corner of the page as a launcher button that opens a floating window — the same widget {@link CdsAiChatContainerAttributes | cds-aichat-container} renders for you. To get that layout on your own `cds-aichat-custom-element` instead, import `@carbon/ai-chat/css/chat-float-layout.css` and apply the `cds-aichat-float--*` classes to the element, driven by the chat's view-change events. See [Float layout classes](./Layout.md#floating-layout) for the class list, and the [custom-element-as-float example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/custom-element-as-float) for the full pattern. To skip this wiring, use {@link CdsAiChatContainerAttributes | cds-aichat-container}.

## Using cds-aichat-container

{@link CdsAiChatContainerAttributes | cds-aichat-container} renders the floating widget for you — it applies the [float layout classes](./Layout.md#floating-layout) and has no element to size. Reach for it when you want the classic corner launcher and pop-over window with no layout work.

The `cds-aichat-container` component creates the chat instance when it mounts and destroys it when it unmounts. Configuration changes apply in place — the chat watches property changes and updates without recreating the instance.

`onViewChange` and `onViewPreChange` also work on `cds-aichat-container` as opt-in observation hooks — use them for analytics or to mirror the chat's open state into your own UI. Because the float container has no wrapping element to size, it has no default visibility behavior: the callbacks fire when you provide them.

See {@link CdsAiChatContainerAttributes} for the properties and attributes it accepts.

## Accessing instance methods

Capture the {@link ChatInstance} from {@link CdsAiChatContainerAttributes.onBeforeRender} or {@link CdsAiChatContainerAttributes.onAfterRender} when you need to call instance methods later. See those props for an example.

## User defined responses

For what `user_defined` responses are and how they're styled, see [Customizing responses](./Responses.md).

Render `user_defined` responses with the {@link CdsAiChatContainerAttributes.renderUserDefinedResponse | renderUserDefinedResponse} callback property. It handles event listening, slot tracking, streaming state, and element lifecycle for you.

### Using the renderUserDefinedResponse callback

Provide a callback that receives the accumulated {@link RenderUserDefinedState} for a `user_defined` response and returns an `HTMLElement` or `null`. The callback reads the {@link UserDefinedItem} from that state, and the library manages everything else.

```typescript
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import {
  type ChatInstance,
  type PublicConfig,
  type RenderUserDefinedState,
  type UserDefinedItem,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
};

@customElement("my-app")
export class Demo extends LitElement {
  @state()
  accessor instance!: ChatInstance;

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  renderUserDefinedCallback = (
    state: RenderUserDefinedState,
    instance: ChatInstance,
  ): HTMLElement | null => {
    const messageItem = state.messageItem as UserDefinedItem | undefined;

    switch (messageItem?.user_defined?.user_defined_type) {
      case "my_unique_identifier": {
        const el = document.createElement("div");
        el.textContent = messageItem.user_defined.text as string;
        return el;
      }
      default:
        return null;
    }
  };

  render() {
    return html`
      <h1>Welcome!</h1>
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .renderUserDefinedResponse=${this.renderUserDefinedCallback}
      ></cds-aichat-container>
    `;
  }
}
```

### Streaming with the callback

The callback runs on every state update: a new chunk, a complete item, or a full message. Use `partialItems` to render streaming content, and `messageItem` for the final response.

```typescript
renderUserDefinedCallback = (
  state: RenderUserDefinedState,
): HTMLElement | null => {
  // Streaming — show partial content as it arrives
  if (state.partialItems?.length) {
    const text = state.partialItems
      .map((item) => item.user_defined?.text)
      .join("");
    const el = document.createElement("div");
    el.textContent = text;
    return el;
  }

  // Complete — show final content
  if (state.messageItem) {
    const messageItem = state.messageItem as UserDefinedItem;
    const el = document.createElement("div");
    el.textContent = messageItem.user_defined?.text as string;
    return el;
  }

  return null;
};
```

See [the streaming model](./Responses.md#streaming-and-updates) for how `partialItems` and chunk correlation work.

For fine-grained control, subscribe to the {@link BusEventType.USER_DEFINED_RESPONSE | USER_DEFINED_RESPONSE} and {@link BusEventType.CHUNK_USER_DEFINED_RESPONSE | CHUNK_USER_DEFINED_RESPONSE} events directly and manage the slots yourself. The [chat-history-float example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/chat-history-float) uses this approach.

## Slots

See [Slots](./WriteableElements.md) for the slot concept and the available {@link WriteableElementName} slots.

The web components also take any element whose slot attribute matches a {@link WriteableElementName} as a slot item.

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

## Custom message footer

See [Custom message footer](./CustomMessageFooter.md) for the footer concept: the `custom_footer_slot`, the {@link BusEventType.CUSTOM_FOOTER_SLOT | CUSTOM_FOOTER_SLOT} event, and `additionalData`.

Render a footer with the {@link CdsAiChatContainerAttributes.renderCustomMessageFooter | renderCustomMessageFooter} callback, also available on `cds-aichat-custom-element`. It receives the {@link RenderCustomMessageFooterState} and returns an `HTMLElement`:

```typescript
renderCustomMessageFooter = (state, instance) => {
  const footer = document.createElement("custom-footer-example");
  footer.messageItem = state.messageItem;
  footer.additionalData = state.additionalData;
  return footer;
};
```

For the full footer element and the mock backend that attaches the slot, see the [custom message footer example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/messages-custom-footer). For fine-grained control, subscribe to the {@link BusEventType.CUSTOM_FOOTER_SLOT | CUSTOM_FOOTER_SLOT} event directly and manage slots yourself.

## Related

- [UI customization](./Customization.md) — theme the chat, control its layout, and inject your own content into slots, panels, responses, and footers.
