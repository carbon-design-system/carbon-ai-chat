/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Compiled under `strict: true` by sdkTypes_spec.ts and never run. Every line must compile, and every
 * `@ts-expect-error` must fail to, so each case is a proof for #2350.
 */

import {
  BusEventType,
  MessageState,
  ViewType,
  type BusEventReceive,
  type ChatInstance,
  type ChatSDKEventType,
  type ChatSDKHandlers,
  type ChatSDKInstance,
  type ChatSDKInstanceMessaging,
  type ChatSDKState,
  type ChatSDKStateAccess,
  type EventBusHandler,
  type MessageResponse,
  type PublicChatState,
  type StreamChunk,
  type TypeAndHandler,
} from '../../../src/serverEntry';

declare const sdk: ChatSDKInstance;
declare const chat: ChatInstance;
declare const message: MessageResponse;
declare const chunk: StreamChunk;

// The SDK instance has exactly messaging, service-desk actions, state, and the event bus.
export const sdkMembers: Record<keyof ChatSDKInstance, true> = {
  messaging: true,
  serviceDesk: true,
  state: true,
  on: true,
  off: true,
  once: true,
};

// @ts-expect-error The SDK instance has no view members.
sdk.requestFocus();
// @ts-expect-error The SDK instance has no view members.
export const sdkChangeView = sdk.changeView;

// ChatInstance extends it, so prebuilt-chat instances work wherever SDK code expects one.
export const prebuiltAsSdk: ChatSDKInstance = chat;

// SDK handlers accept exactly the 18 conversation events.
export const sdkEvents: Record<ChatSDKEventType, true> = {
  [BusEventType.PRE_SEND]: true,
  [BusEventType.SEND]: true,
  [BusEventType.PRE_RECEIVE]: true,
  [BusEventType.RECEIVE]: true,
  [BusEventType.USER_DEFINED_RESPONSE]: true,
  [BusEventType.STOP_STREAMING]: true,
  [BusEventType.HISTORY_BEGIN]: true,
  [BusEventType.HISTORY_END]: true,
  [BusEventType.PRE_RESTART_CONVERSATION]: true,
  [BusEventType.RESTART_CONVERSATION]: true,
  [BusEventType.HUMAN_AGENT_PRE_RECEIVE]: true,
  [BusEventType.HUMAN_AGENT_RECEIVE]: true,
  [BusEventType.HUMAN_AGENT_PRE_SEND]: true,
  [BusEventType.HUMAN_AGENT_SEND]: true,
  [BusEventType.HUMAN_AGENT_PRE_START_CHAT]: true,
  [BusEventType.HUMAN_AGENT_PRE_END_CHAT]: true,
  [BusEventType.HUMAN_AGENT_END_CHAT]: true,
  [BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE]: true,
};

export const sdkHandlers: ChatSDKHandlers = [
  {
    type: BusEventType.RECEIVE,
    handler: (_event, instance) => {
      const conversation: ChatSDKInstance = instance;
      // @ts-expect-error SDK handlers receive the conversation without view members.
      instance.requestFocus();
      return conversation;
    },
  },
  { type: BusEventType.USER_DEFINED_RESPONSE, handler: () => undefined },
];

sdk.on({
  // @ts-expect-error chat:ready fires only from the prebuilt chat.
  type: BusEventType.CHAT_READY,
  handler: () => undefined,
});
sdk.once({
  // @ts-expect-error chunk:userDefinedResponse fires only from addMessageChunk.
  type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
  handler: () => undefined,
});
sdk.off({
  // @ts-expect-error Interface events are not conversation events.
  type: BusEventType.VIEW_CHANGE,
  handler: () => undefined,
});
export const sdkChained: ChatSDKInstance = sdk.on(sdkHandlers).off(sdkHandlers);

// sdkTypes_spec.ts checks these probes: a handler typed for the prebuilt chat (an EventBusHandler with
// its ChatInstance default, or an arrow annotated with ChatInstance) is not an SDK handler under
// strictFunctionTypes. Assignability is checked there, not here, because the package tsconfig
// compiles this fixture with that flag off.
export type PrebuiltReceiveHandlerProbe = TypeAndHandler<
  ChatInstance,
  BusEventType.RECEIVE
>;
export type SDKReceiveHandlerProbe = TypeAndHandler<
  ChatSDKInstance,
  BusEventType.RECEIVE
>;
export type ChatSDKHandlersProbe = ChatSDKHandlers;

// Prebuilt-chat handlers still accept every event with the full chat instance.
export const prebuiltChained: ChatInstance = chat
  .on({
    type: BusEventType.CHAT_READY,
    handler: (_event, instance) => instance.requestFocus(),
  })
  .once({
    type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
    handler: (_event, instance) => instance.changeView(ViewType.MAIN_WINDOW),
  })
  .on(sdkHandlers);

// Existing handler annotations keep their meaning.
export const receiveHandler: EventBusHandler<BusEventReceive> = (
  event,
  instance
) => {
  const prebuilt: ChatInstance = instance;
  prebuilt.scrollToMessage(event.data.id ?? '');
};
export const typedHandler: TypeAndHandler = {
  type: BusEventType.VIEW_CHANGE,
  handler: (_event, instance) => instance.requestFocus(),
};
chat.off(typedHandler);

// SDK messaging has exactly these methods.
export const sdkMessagingMembers: Record<keyof ChatSDKInstanceMessaging, true> =
  {
    send: true,
    stop: true,
    failTurn: true,
    clearError: true,
    addFile: true,
    removeFile: true,
    upsertMessage: true,
    removeMessages: true,
    clearConversation: true,
    insertHistory: true,
    restartConversation: true,
  };

// SDK messaging writes through upsertMessage only.
sdk.messaging.upsertMessage('message-1', MessageState.COMPLETE, () => message);
sdk.messaging.restartConversation();
// @ts-expect-error addMessage stays on the prebuilt chat.
sdk.messaging.addMessage(message);
// @ts-expect-error addMessageChunk stays on the prebuilt chat.
sdk.messaging.addMessageChunk(chunk);

// SDK messaging sends with the root send's signature (#1826 O1), so either one stands in for the other.
export const sent: Promise<void> = sdk.messaging.send('Hello', {
  silent: true,
});
sdk.messaging.send({ input: { text: 'Hello' } });
export const sdkSendAsRoot: ChatInstance['send'] = sdk.messaging.send;
export const rootSendAsSdk: ChatSDKInstanceMessaging['send'] = chat.send;
// @ts-expect-error A message is required.
sdk.messaging.send();

// Stop takes nothing and never needs a result (#1816 O3).
export const stopped: Promise<void> = sdk.messaging.stop();

// Failing a turn needs no options; clearing returns nothing (#2354).
export const failed: Promise<void> = sdk.messaging.failTurn();
export const failedWith: Promise<void> = chat.messaging.failTurn({
  messageID: 'request-1',
  error: { message: 'The stream closed.', otherData: new Error('closed') },
});
export const cleared: void = sdk.messaging.clearError();

// Files: addFile resolves with the ID removeFile takes (#2351).
export const attached: Promise<{ id: string }> = sdk.messaging.addFile(
  new File(['x'], 'x.txt')
);
sdk.messaging.removeFile('upload-1');
// Optional in 1.x (D13), so strict code reads it with `?.`.
export const uploadStatus: 'uploading' | 'complete' | 'error' | undefined =
  sdk.state.get().pendingUploads?.[0]?.status;
// @ts-expect-error A file is required.
sdk.messaging.addFile();
// @ts-expect-error The error's type is always MESSAGE_COMMUNICATION.
sdk.messaging.failTurn({ error: { errorType: 'other' } });

// Prebuilt-chat callers keep both older message methods.
chat.messaging.addMessage(message);
chat.messaging.addMessageChunk(chunk);
chat.messaging.upsertMessage(
  'message-1',
  MessageState.STREAMING,
  () => message
);

// SDK state is the conversation alone.
export const sdkStateFields: Record<keyof ChatSDKState, true> = {
  messages: true,
  status: true,
  error: true,
  pendingUploads: true,
  hasInFlightUploads: true,
  isRestarting: true,
  humanAgent: true,
  activeResponseId: true,
};
export const sdkState: ChatSDKState = sdk.state.get();
// @ts-expect-error View state is not part of the SDK state.
export const sdkViewState = sdk.state.get().viewState;
export const unsubscribe: () => void = sdk.state.select(
  (state) => state.humanAgent.isConnected,
  (isConnected: boolean) => isConnected
);

// The prebuilt chat reads the wider state through the same primitive.
export const prebuiltState: PublicChatState = chat.state.get();
export const prebuiltStateAsSdk: ChatSDKState = chat.state.get();
export const prebuiltStateAccess: ChatSDKStateAccess<PublicChatState> =
  chat.state;
export const isMainWindowOpen = chat.state.get().viewState.mainWindow;
chat.state.select(
  (state) => state.input.rawValue,
  (rawValue: string) => rawValue
);
