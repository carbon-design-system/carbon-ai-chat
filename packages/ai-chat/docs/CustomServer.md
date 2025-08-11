---
title: Setting up your server
---

### Overview

The Carbon AI Chat provides your own server for the chat to interact with. It allows for both streaming and non-streamed results, or a mixture of both.

### Creating your custom messaging server

The Carbon AI Chat provides a {@link MessageRequest} when someone sends a message. The Carbon AI Chat expects a {@link MessageResponse} to be returned. You can stream the `MessageResponse`. See {@link ChatInstanceMessaging.addMessageChunk} for an explanation of the streaming format.

For more information, see [the examples page](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/basic/src/customSendMessage.ts).

Inside the `MessageResponse` the Carbon AI Chat can accept `response_types`. You can navigate to the properties for each `response_type` by visiting the base {@link GenericItem} type.

The Carbon AI Chat takes custom messaging server configuration part of its {@link PublicConfig}. You are required to provide a `messaging.customSendMessage` (see {@link PublicConfigMessaging.customSendMessage}) function that the Carbon AI Chat calls any time the user sends a message. It also gets called if you make use of the `send` function on {@link ChatInstance}.

In this function, the Carbon AI Chat passes three parameters:

1. {@link MessageRequest}: The message being sent.
2. {@link CustomSendMessageOptions}: Options about that message. This includes an abort signal to cancel the request.
3. {@link ChatInstance}: The Carbon AI Chat `instance` object.

This function can return nothing or it can return a promise object. If you return a promise object, the Carbon AI Chat does the following actions:

1. Set up a message queue and only pass the next message to your function when the message completes.
2. Show a loading indicator if the message is taking a while to return (or return its first chunk if streaming).
3. Throw a visible error and pass an abort signal if the waiting for the message crosses the `messaging.messageTimeoutSecs` timeout identified in your {@link PublicConfig} with {@link PublicConfigMessaging.messageTimeoutSecs}.

If you do not return a promise object, the Carbon AI Chat does not queue messages for you.

By default, the Carbon AI Chat sends a {@link MessageRequest} with `input.text` set to a blank string and `history.is_welcome_request` set to true when a user first opens the chat. It is to allow you to inject a hard coded greeting response to the user. If you do not wish to use this functionality, you can set `messaging.skipWelcome` to `false`. See {@link PublicConfigMessaging.skipWelcome}.

Once you call `messaging.customSendMessage`, you need to feed responses back into the chat. Use of the {@link ChatInstance} passed into the function is for this purpose.

#### Additional resources

For streaming operations see {@link ChatInstanceMessaging.addMessageChunk}. For non-streaming responses see {@link ChatInstanceMessaging.addMessage}. Your assistant can return responses in either format and can switch between.

### Creating your custom history store

Your history store returns an array of {@link HistoryItem} members. There is currently no recommended strategy for storing your LLM friendly history, if that is part of your use case.

The Carbon AI Chat allows you to define a `messaging.customLoadHistory` function in your {@link PublicConfig}. See {@link PublicConfigMessaging.customLoadHistory}. This method returns a promise that resolves when you have finished loading messages into the chat. During the Carbon AI Chat's hydration process, you can call this function with the Carbon AI Chat {@link ChatInstance} object as its only parameter. You can then call `instance.messaging.insertHistory` to load a conversation into the chat. See {@link ChatInstanceMessaging.insertHistory}.

Some use cases can have more the one conversation attached to the chat. You can optionally forgo by using `messaging.customLoadHistory` and directly call `instance.messaging.insertHistory` as needed. In a use case where a user can change between different conversations, you can to call `instance.messaging.clearConversation` to clear out the previous conversation before calling `instance.messaging.insertHistory`. See {@link ChatInstanceMessaging.clearConversation}.
