---
title: Using with React
---

### Overview

Carbon AI Chat exports two React components.

If you want to use the `float` layout, use {@link ChatContainer}. Use the {@link ChatCustomElement} for custom sizes, such as a sidebar, full screen, or nested in your UI.

**Currently, this component does not support SSR, so if you are using Next.js or similar frameworks, make sure you render this component in client only modes.**

For more information, see [the examples page for more examples](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react).

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

Render this component in your application and provide the configuration options for the Carbon AI Chat as a prop. Refer to the following example.

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

### Using ChatContainer

The {@link ChatContainer} is a functional component that loads and renders an instance of the Carbon AI Chat when it mounts, and deletes the instance when unmounted. If the configuration for the Carbon AI Chat changes, it also deletes the previous Carbon AI Chat and creates a new one with the new configuration. It can also manage React portals for user-defined responses.

See {@link ChatContainerProps} for an explanation of the various accepted props.

### Using ChatCustomElement

This library provides the {@link ChatCustomElement} component, which can be used to render the Carbon AI Chat inside a custom element. Use it if you want to change the location where the Carbon AI Chat renders. This component renders an element in your React app and uses that element as the custom element for rendering the Carbon AI Chat. See {@link ChatCustomElementProps} for an explanation of the various accepted props.

This component requires a `className` prop that defines the size and positioning of the chat when open. The default behavior adds and removes a `cds-aichat--hidden` CSS class to manage visibility. When the Carbon AI Chat closes, the `cds-aichat--hidden` class is added to set the element's dimensions to 0x0, so that it doesn't take up space while keeping any fixed-positioned launcher visible.

**Note:** In the use case where you are using a custom element but also using the Carbon AI Chat's native launcher, the custom element must remain visible as it also contains the launcher. With that in mind, you should really provide your own launcher.

If you don't want these behaviors, provide your own `onViewChange` prop to {@link ChatCustomElementProps.onViewChange} and provide your logic for controlling the visibility of the Carbon AI Chat. If you want custom animations when the Carbon AI Chat opens and closes, this is the mechanism to do that.

**For advanced view change handling:** You can also listen for {@link BusEventType.VIEW_PRE_CHANGE} and {@link BusEventType.VIEW_CHANGE} events directly. These events fire in sequence (PRE_CHANGE -> view state update -> CHANGE), and both are awaited, making async handlers ideal for animations. See the event type documentation for complete details on timing and usage. Just be aware that the `onViewChange` default behavior will still run if you don't replace that function with your own.

See {@link ChatCustomElementProps} for an explanation of the various accepted props.

```javascript
import React from "react";
import { ChatCustomElement } from "@carbon/ai-chat";

import "./App.css";

function App() {
  return (
    <ChatCustomElement
      className="MyCustomElement"
      debug={true}
      aiEnabled={true}
      header={{ title: "My Assistant" }}
      launcher={{ isOn: true }}
      // ... other config properties as individual props
    />
  );
}
```

```css
.MyCustomElement {
  position: absolute;
  left: 100px;
  top: 100px;
  width: 500px;
  height: 500px;
}

/* Or use logical properties */
.MyCustomElement {
  position: absolute;
  inset-inline-start: 100px;
  inset-block-start: 100px;
  inline-size: 500px;
  block-size: 500px;
}
```

### Live config updates

The chat observes prop changes and applies them in place. Most configuration updates do not remount or discard the chat; instead, they are applied live. This simplifies integration with state and reactive frameworks.

Notes:

- Functions and objects are compared by identity. Rapidly creating new functions/objects every render can cause unnecessary updates. Prefer stable references where possible.
- Human‑agent integrations: Updating `serviceDeskFactory` or `serviceDesk` while a human‑agent chat is connecting/active ends that conversation and reinitializes the integration to apply the new settings. See CustomServiceDesks.md for guidance.

#### Stable callbacks (messaging)

Avoid re‑creating callbacks like {@link PublicConfigMessaging.customSendMessage} on every render.

Wrong (new function each render):

```javascript
function App() {
  const customSendMessage = (message: MessageRequest) => {
    console.log("Sending message", message);
  };
  return <ChatContainer messaging={{ customSendMessage }} />;
}
```

Better (hoist):

```javascript
const customSendMessage = (message: MessageRequest) => {
  console.log("Sending message", message);
};

function App() {
  return <ChatContainer messaging={{ customSendMessage }} />;
}
```

Best (needs props/state):

```javascript
function App({ messageService }: { messageService: (message: MessageRequest) => void }) {
  const customSendMessage = useCallback(
    (message: MessageRequest) => messageService(message),
    [messageService]
  );
  return <ChatContainer messaging={{ customSendMessage }} />;
}
```

No‑churn variant using a ref:

```javascript
function App({ messageService }: { messageService: (message: MessageRequest) => void }) {
  const messageServiceRef = useRef(messageService);
  messageServiceRef.current = messageService;

  const customSendMessage = useCallback(
    (message: MessageRequest) => messageServiceRef.current(message),
    []
  );

  return <ChatContainer messaging={{ customSendMessage }} />;
}
```

#### Stable service desk factory

Keep `serviceDeskFactory` identity stable to avoid unintended integration resets. When you must change it, be aware that any active or connecting human‑agent session will end and the integration will be reinitialized.

Examples and deeper guidance are in CustomServiceDesks.md, including patterns using `useCallback` in React and stable class fields in web components/Lit.

### Accessing instance methods

You can use the {@link ChatContainerProps.onBeforeRender} or {@link ChatContainerProps.onAfterRender} props to access the Carbon AI Chat's instance if you need to call instance methods later. This example renders a button that toggles the Carbon AI Chat open and only renders after the instance becomes available. Refer to the following example.

```javascript
import React, { useCallback, useState } from "react";
import { ChatContainer } from "@carbon/ai-chat";

const chatOptions = {
  // Your configuration object.
};

function App() {
  const [instance, setInstance] = useState(null);

  const toggleWebChat = useCallback(() => {
    instance.toggleOpen();
  }, [instance]);

  function onBeforeRender(instance) {
    // Make the instance available to the React components.
    setInstance(instance);
  }

  return (
    <>
      {instance && (
        <button type="button" onClick={toggleWebChat}>
          Toggle Carbon AI Chat
        </button>
      )}
      <ChatContainer
        debug
        aiEnabled
        // ...other flattened config props
        onBeforeRender={onBeforeRender}
      />
    </>
  );
}
```

### User-defined responses

This component can also manage `user_defined` responses. (See {@link UserDefinedItem}). You must pass a {@link ChatContainerProps.renderUserDefinedResponse} function as a render prop. This function returns a React component that renders content for the specific message that relates to that response. Be sure to review [UI customization](Customization.md).

Treat the {@link ChatContainerProps.renderUserDefinedResponse} prop like any typical React render prop. It is called every time the App rerenders and every time a new `user_defined` message is received. This means you don't want to be calling functions from inside {@link ChatContainerProps.renderUserDefinedResponse} that you don't want called on every render. Consider putting those function calls inside the React component you render with a `useEffect`.

Refer to the following example.

```javascript
import React from 'react';
import { ChatContainer } from '@carbon/ai-chat';
import { Chart } from './Chart';
import { UserDefinedResponseExample } from './Example';

const chatOptions = {
  // Your configuration object.
};

function App() {
  return (
    <ChatContainer
      renderUserDefinedResponse={renderUserDefinedResponse}
      messaging={chatOptions.messaging}
      header={chatOptions.header}
      launcher={chatOptions.launcher}
    />
  );
}

function someFunction() {}

function renderUserDefinedResponse(state, instance) {
  const { messageItem } = state;
  // The event here contains details for each user defined response that needs to be rendered.
  // You can also pass information from your components props or state into the component your are returning.
  if (messageItem) {
    switch (messageItem.user_defined?.user_defined_type) {
      case 'chart':
        someFunction(); // If you do this, this function will get called on every render!
        return (
          <div className="padding">
            {/* Instead, pass someFunction as a prop and run it when the component first mounts with a useEffect(() => { someFunction() }, []). If you are using Strict mode in developement, refer to https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development  */}
            <Chart content={messageItem.user_defined.chart_data as string} onMount={someFunction}/>
          </div>
        );
      case 'green':
        return <UserDefinedResponseExample text={messageItem.user_defined.text as string} />;
      default:
        return null;
    }
    // We are just going to show a skeleton state here if we are waiting for a stream, but you can instead have another
    // switch statement here that does something more specific depending on the component.
    return <AISkeletonPlaceholder className="fullSkeleton" />;
  }
  return null;
}

```

You may also want your `user_defined` responses to inherit props from your application state. In that case, you will want to bring {@link ChatContainerProps.renderUserDefinedResponse} into your component and wrap it in `useCallback`.

```javascript
import React, { useCallback, useEffect, useState } from 'react';
import { ChatContainer } from '@carbon/ai-chat';

const chatOptions = {
  // Your configuration object.
};

function App() {

  const [stateText, setStateText] = useState<string>('Initial text');

  useEffect(() => {
    // This just updates the stateText every two seconds with Date.now()
    setInterval(() => setStateText(Date.now().toString()), 2000);
  }, []);

  const renderUserDefinedResponse = useCallback(
    (state: RenderUserDefinedState, instance: ChatInstance) => {
      const { messageItem } = state;
      // The event here will contain details for each user defined response that needs to be rendered.
      if (messageItem) {
        switch (messageItem.user_defined?.user_defined_type) {
          case 'green':
            // Pass in the new state as a prop!
            return (
              <UserDefinedResponseExample text={messageItem.user_defined.text as string} parentStateText={stateText} />
            );
          default:
            return null;
        }
      }

      // We are just going to show a skeleton state here if we are waiting for a stream, but you can instead have another
      // switch statement here that does something more specific depending on the component.
      return <AISkeletonPlaceholder className="fullSkeleton" />;
    },
    [stateText], // Only update if stateText changes.
  );

  return (
    <ChatContainer
      renderUserDefinedResponse={renderUserDefinedResponse}
      messaging={chatOptions.messaging}
      header={chatOptions.header}
      launcher={chatOptions.launcher}
    />
  );
}
```

You may also want your `user_defined` responses to stream. In that case, you will want to make use of {@link RenderUserDefinedState.partialItems}. The partialItems come back as an array of every chunk we have received.
They are _not_ concatenated for you. Some folks pass in stringified JSON or JSON that needs to be passed through
an optimistic JSON parser (one that auto fixes up partial JSON), so unlike the text response_type, we leave that concatenation to your use case.

```javascript
import React, { useCallback, useEffect, useState } from 'react';
import { ChatContainer } from '@carbon/ai-chat';

const chatOptions = {
  // Your configuration object.
};

function App() {

  const [stateText, setStateText] = useState<string>('Initial text');

  useEffect(() => {
    // This just updates the stateText every two seconds with Date.now()
    setInterval(() => setStateText(Date.now().toString()), 2000);
  }, []);

  const renderUserDefinedResponse = useCallback(
    (state: RenderUserDefinedState, instance: ChatInstance) => {
      const { messageItem } = state;
      // The event here will contain details for each user defined response that needs to be rendered.
      if (messageItem) {
        switch (messageItem.user_defined?.user_defined_type) {
          case 'green':
            // Pass in the new state as a prop!
            return (
              <UserDefinedResponseExample text={messageItem.user_defined.text as string} parentStateText={stateText} />
            );
          default:
            return null;
        }
      }

      if (partialItems) {
        switch(partialItems[0].user_defined?.user_defined_type) {
          case "green": {
            // The partial members are not concatenated, you get a whole array of chunks so you can special handle
            // concatenation as you want.
            const text = partialItems.map(item => item.user_defined?.text).join("");
            return (
              <UserDefinedResponseExample
                text={text}
                parentStateText={stateText}
              />
            )
          }
          default: {
            // Default to just showing a skeleton state for user_defined responses types we don't want to have special
            // streaming behavior for.
            return <AISkeletonPlaceholder className="fullSkeleton" />;
          }
        }
      }

      // We are just going to show a skeleton state here if we are waiting for a stream, but you can instead have another
      // switch statement here that does something more specific depending on the component.
      return <AISkeletonPlaceholder className="fullSkeleton" />;
    },
    [stateText], // Only update if stateText changes.
  );

  return (
    <ChatContainer
      renderUserDefinedResponse={renderUserDefinedResponse}
      messaging={chatOptions.messaging}
      header={chatOptions.header}
      launcher={chatOptions.launcher}
    />
  );
}
```

### Writable Elements

This component also has several elements inside the chat that you can add extra content to with a writeable element. The {@link ChatContainerProps.renderWriteableElements} prop is an object with the key as the area you want to render a component to and the value being the component to render there. Be sure to review [UI customization](Customization.md).

Similarly to the {@link ChatContainerProps.renderUserDefinedResponse} prop, if you define your {@link ChatContainerProps.renderWriteableElements} object inside your component, it will be re-created every time your component renders. To avoid this, consider wrapping `renderWriteableElements` in `useMemo` or defining it outside your component. When wrapping with `useMemo` you can also pass values from your component into the writeable elements.

Refer to the following example.

```javascript
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
