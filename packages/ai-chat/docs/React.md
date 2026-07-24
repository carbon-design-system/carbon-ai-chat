---
title: Using with React
---

## Overview

Carbon AI Chat exports two React components.

{@link ChatCustomElement} renders the chat into an element you size and place — a sidebar, full screen, or nested in your UI — and is the most common choice. {@link ChatContainer} is a convenience component that renders the classic floating widget — a corner launcher and a window that opens on click — by applying the [float layout classes](./Layout.md#floating-layout) for you.

You don't need {@link ChatContainer} for a float layout. The classes are exported, so you can apply them to {@link ChatCustomElement} yourself and get the same floating widget — see [Float layout](#float-layout). Reach for {@link ChatContainer} only when you'd rather skip that wiring.

> **Note**: This page covers only what's specific to React. For theming, layout, slots, and the rest of the configuration shared across every framework, see [UI customization](./Customization.md).

For more information, see [the examples page](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react).

> **Note**: This component doesn't support SSR. In Next.js or similar frameworks, render it client-side only.

## Installation

Install with npm:

```
npm install @carbon/ai-chat
```

Or with yarn:

```
yarn add @carbon/ai-chat
```

> **Note**: Install the required `peerDependencies`. See the [peer dependency changes](https://github.com/carbon-design-system/carbon-ai-chat/blob/main/docs/peer-dependency-changes.md) for a history of additions, removals, and version updates across releases.

### Basic example

Render this component in your application and pass the Carbon AI Chat configuration as individual props. Give it a `className` that sizes it.

```tsx
import React from "react";
import { ChatCustomElement } from "@carbon/ai-chat";

import "./App.css";

function App() {
  return (
    <ChatCustomElement
      className="MyChat"
      // ... other config properties as individual props
    />
  );
}
```

```css
.MyChat {
  block-size: 100vh;
  inline-size: 100%;
}
```

## Using ChatCustomElement

Use {@link ChatCustomElement} to render Carbon AI Chat inside a custom element you size and place. This component renders an element in your React app and uses it as the custom element for the chat. See {@link ChatCustomElementProps} for the accepted props.

This component requires a `className` prop that sets the size and position of the chat when open. By default, the element's dimensions are 0x0, so it takes up no space while keeping any fixed-position launcher visible.

To change the open/close behavior — say, to animate the chat in and out — provide the {@link ChatCustomElementProps.onViewPreChange | onViewPreChange} and {@link ChatCustomElementProps.onViewChange | onViewChange} props. `onViewPreChange` runs before the view changes and the chat awaits it, so you can update your `className` and let an animation finish before the chat shell hides. `onViewChange` runs once the change completes; provide it to replace the default 0x0 sizing.

```tsx
import React from "react";
import { ChatCustomElement } from "@carbon/ai-chat";

import "./App.css";

const ChatOptions = {
  messaging: {
    customSendMessage: () => {},
  },
};

function App() {
  return (
    <ChatCustomElement
      className="MyCustomElement"
      messaging={chatOptions.messaging}
      // ... other config properties
    />
  );
}
```

```css
.MyCustomElement {
  position: absolute;
  inset-inline-start: 100px;
  inset-block-start: 100px;
  inline-size: 500px;
  block-size: 500px;
}
```

### Float layout

The float layout pins the chat to a corner of the page as a launcher button that opens a floating window — the same widget {@link ChatContainer} renders for you. To get that layout on your own {@link ChatCustomElement}, import `@carbon/ai-chat/css/chat-float-layout.css` and apply the `cds-aichat-float--*` classes through `className`, driven by the chat's view-change events. See [Float layout classes](./Layout.md#floating-layout) for the class list, and the [custom-element-as-float example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/custom-element-as-float) for the full pattern. To skip this wiring, use {@link ChatContainer}.

## Using ChatContainer

{@link ChatContainer} renders the floating widget for you — it applies the [float layout classes](./Layout.md#floating-layout) and has no element to size. Reach for it when you want the classic corner launcher and pop-over window with no layout work.

See {@link ChatContainerProps} for the accepted props.

## Accessing instance methods

To call instance methods later, capture the {@link ChatInstance} from {@link ChatContainerProps.onBeforeRender | onBeforeRender} or {@link ChatContainerProps.onAfterRender | onAfterRender}. See those props for an example.

## User-defined responses

This component can also manage `user_defined` responses (see {@link UserDefinedItem}). To learn what they are and how they're styled, see [Customizing responses](./Responses.md). You must pass a {@link ChatContainerProps.renderUserDefinedResponse | renderUserDefinedResponse} function as a render prop, which returns a React component that renders content for the message tied to that response.

Treat `renderUserDefinedResponse` like any typical React render prop. It runs on every app rerender and on every new `user_defined` message, so don't call functions inside it that you don't want run on every render. Put those calls inside the React component you render, with a `useEffect`.

```tsx
import React from "react";
import {
  ChatContainer,
  RenderUserDefinedState,
  ChatInstance,
} from "@carbon/ai-chat";
import { AISkeletonPlaceholder } from "@carbon/react";
import { Chart } from "./Chart";
import { UserDefinedResponseExample } from "./Example";

const ChatOptions = {
  messaging: {
    customSendMessage: () => {},
  },
};

function App() {
  return (
    <ChatContainer
      renderUserDefinedResponse={renderUserDefinedResponse}
      messaging={chatOptions.messaging}
    />
  );
}

function someFunction() {}

function renderUserDefinedResponse(
  state: RenderUserDefinedState,
  instance: ChatInstance,
) {
  const { messageItem } = state;
  // The state contains details for each user defined response that needs to be rendered.
  // You can also pass information from your component's props or state into the component you return.
  if (messageItem) {
    switch (messageItem.user_defined?.user_defined_type) {
      case "chart":
        someFunction(); // If you do this, this function gets called on every render!
        return (
          <div className="padding">
            {/* Instead, pass someFunction as a prop and run it when the component first mounts with a useEffect(() => { someFunction() }, []). If you are using Strict mode in developement, refer to https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development  */}
            <Chart
              content={messageItem.user_defined.chart_data as string}
              onMount={someFunction}
            />
          </div>
        );
      case "green":
        return (
          <UserDefinedResponseExample
            text={messageItem.user_defined.text as string}
          />
        );
      default:
        return null;
    }
    // Show a skeleton state while waiting for a stream. You can add another switch
    // statement here that does something more specific depending on the component.
    return <AISkeletonPlaceholder className="fullSkeleton" />;
  }
  return null;
}
```

The renderer can also read your app's state, or drive streaming. Wrap the prop in `useCallback` so it changes only when your state does, and read {@link RenderUserDefinedState.partialItems | partialItems} for streaming — see [the streaming model](./Responses.md#streaming-and-updates) for how `partialItems` and chunk correlation work. For runnable versions, see the [basic](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/basic) and [streaming](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/reasoning-with-streaming-generic-items) examples.

## Slots

The chat has several elements you can add content to with a slot. The {@link ChatContainerProps.renderWriteableElements | renderWriteableElements} prop is an object whose key is the area to render into and whose value is the component to render there. See [Slots](./WriteableElements.md) for the available slots and the corner-alignment attributes (`data-rounded`/`data-stacked`).

Like `renderUserDefinedResponse`, this object is re-created on every render if you define it inside your component. To avoid that, wrap `renderWriteableElements` in `useMemo` or define it outside your component. With `useMemo`, you can also pass values from your component into the slots.

```tsx
import React, { useMemo, useState } from "react";
import { ChatContainer } from "@carbon/ai-chat";
import { AIExplanationTooltipContent } from "./AIExplanationTooltipContent";

const chatOptions = {
  // Your configuration object.
};

function App() {
  const [modelsInUse, setModelsInUse] = useState(["granite-13b-instruct-v2"]);

  const renderWriteableElements = useMemo(
    () => ({
      aiTooltipAfterDescriptionElement: (
        <AIExplanationTooltipContent
          location="aiTooltipAfterDescriptionElement"
          modelsUsed={modelsInUse}
        />
      ),
    }),
    [modelsInUse],
  );

  return <ChatContainer renderWriteableElements={renderWriteableElements} />;
}
```

For a runnable version, see the [workspace example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/workspace).

## Testing with Jest

Carbon AI Chat ships as an ES module, with no CJS build. See the [Jest documentation](https://jestjs.io/docs/code-transformation) for how to transform ESM to CJS with `babel-jest` or `ts-jest`.

See [jsdom examples](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/tests-jest-jsdom) and [happydom examples](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/tests-jest-happydom).

## Custom message footer

Insert a `custom_footer_slot` in assistant messages to render your own content beneath them — copy and share actions, ratings, or links. See [Custom message footer](./CustomMessageFooter.md) for the concept. In React, pass a {@link ChatContainerProps.renderCustomMessageFooter | renderCustomMessageFooter} render prop that returns the footer component:

```tsx
<ChatContainer
  renderCustomMessageFooter={(
    slotName,
    message,
    messageItem,
    instance,
    additionalData,
  ) => (
    <CustomFooterExample
      messageItem={messageItem}
      additionalData={additionalData}
    />
  )}
  messaging={messaging}
/>
```

Like `renderUserDefinedResponse`, it runs on every render, so keep per-render work out of it. For the full footer component and the mock backend that attaches the slot, see the [custom message footer example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/messages-custom-footer).

## Related

- [UI customization](./Customization.md) — theme the chat, control its layout, and inject your own content into slots, panels, responses, and footers.
