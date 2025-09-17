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

const chatOptions = {
  // Your configuration object.
};

function App() {
  return <ChatContainer config={chatOptions} />;
}
```

### Using ChatContainer

The {@link ChatContainer} is a functional component that loads and renders an instance of the Carbon AI Chat when it mounts, and deletes the instance when unmounted. If the configuration for the Carbon AI Chat changes, it also deletes the previous Carbon AI Chat and creates a new one with the new configuration. It can also manage React portals for user-defined responses.

See {@link ChatContainerProps} for an explanation of the various accepted props.

### Using ChatCustomElement

This library provides the {@link ChatCustomElement} component, which can be used to render the Carbon AI Chat inside a custom element. Use it if you want to change the location where the Carbon AI Chat renders. This component renders an element in your React app and uses that element as the custom element for rendering the Carbon AI Chat. See {@link ChatCustomElementProps} for an explanation of the various accepted props.

This component requires a `className` prop that defines the size and positioning of the chat when open. The default behavior adds and removes a `cds-aichat--hidden` CSS class to manage visibility. When the Carbon AI Chat closes, the `cds-aichat--hidden` class is added to set the element's dimensions to 0x0, so that it doesn't take up space while keeping any fixed-positioned launcher visible.

**Note:** In the use case where you are using a custom element but also using the Carbon AI Chat's native launcher, the custom element must remain visible as it also contains the launcher. With that in mind, you should really provide your own launcher.

If you don't want these behaviors, provide your own `onViewChange` prop to {@link ChatCustomElementProps.onViewChange} and provide your logic for controlling the visibility of the Carbon AI Chat. If you want custom animations when the Carbon AI Chat opens and closes, this is the mechanism to do that. Refer to the following example.

See {@link ChatCustomElementProps} for an explanation of the various accepted props.

```javascript
import React from "react";
import { ChatCustomElement } from "@carbon/ai-chat";

import "./App.css";

const chatOptions = {
  /* Carbon AI Chat options */
};

function App() {
  return <ChatCustomElement className="MyCustomElement" config={chatOptions} />;
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

### Config object changes

The chat is not capable of handling in-place changes to the config object. If any of the properties in the config object are changed, then the existing chat will be discarded and a whole new chat will be created using the new config properties. A deep equal comparison of the config object is done to detect changes. Note that DOM elements and functions are compared using a strict `===` comparison.

Of note, the above means that if you are creating a new callback function for something like {@link PublicConfigMessaging.customSendMessage} on each render of your component, this would cause the chat to be discarded and recreated each time your component is rendered.

Below is an example of bad code where a new {@link PublicConfigMessaging.customSendMessage} function causes the chat to get recreated each time `App` is rendered.

#### Wrong example

```javascript
// DO NOT DO THIS!

function App() {
  // This is bad because it creates a new customSendMessage function every time App is rendered which will cause the
  // ChatContainer to create a new chat every time.
  const customSendMessage = (message: MessageRequest) => {
    console.log("Sending message", message);
  };

  const config: PublicConfig = { messaging: { customSendMessage } };

  return <ChatContainer config={config} />;
}
```

The quickest solution to this is to move the config object outside of your render function.

#### Correct example #1

```javascript
const customSendMessage = (message: MessageRequest) => {
  console.log("Sending message", message);
};

const config: PublicConfig = { messaging: { customSendMessage } };

function App() {
  return <ChatContainer config={config} />;
}
```

However this does not work if your {@link PublicConfigMessaging.customSendMessage} function requires access to state or props from your application. If you need that, you can use `useCallback` to ensure only a single instance is created from the dependencies. Note in this example that if the instance of the `messageService` prop changes, the whole chat will get recreated. If you don't expect that to happen, this will work for you. Otherwise, you may need to use a ref.

#### Correct example #2

```javascript
function App({ messageService }: any) {
  // Creates a new customSendMessage for each instance of messageService.
  const customSendMessage = useCallback(
    (message: MessageRequest) => {
      messageService(message);
    },
    [messageService] // If messageService changes, the chat will be recreated.
  );

  const config: PublicConfig = { messaging: { customSendMessage } };

  return <ChatContainer config={config} />;
}
```

If you have dependencies that shouldn't recreate the chat, you can store them in a ref. In this example, the chat will not be recreated.

#### Correct example #3

```javascript
function App({ messageService }: any) {
  const messageServiceRef = useRef(messageService);
  messageServiceRef.current = messageService;

  const customSendMessage = useCallback((message: MessageRequest) => {
    messageServiceRef.current(message);
  }, []);

  const config: PublicConfig = { messaging: { customSendMessage } };

  return <ChatContainer config={config} />;
}
```

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
      <ChatContainer config={chatOptions} onBeforeRender={onBeforeRender} />
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
  return <ChatContainer renderUserDefinedResponse={renderUserDefinedResponse} config={chatOptions} />;
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

  return <ChatContainer renderUserDefinedResponse={renderUserDefinedResponse} config={chatOptions} />;
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

  return (
    <ChatContainer
      renderWriteableElements={renderWriteableElements}
      config={chatOptions}
    />
  );
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
