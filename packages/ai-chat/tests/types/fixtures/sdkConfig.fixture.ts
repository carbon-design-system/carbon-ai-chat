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
 * `@ts-expect-error` must fail to. The spec also reads the `*Probe` aliases to check that
 * `PublicConfig` is not assignable to `ChatSDKConfig`.
 */

import {
  OnErrorType,
  ViewType,
  type ChatInstance,
  type ChatSDKConfig,
  type ChatSDKConfigMessaging,
  type ChatSDKErrorData,
  type ChatSDKInstance,
  type ChatSDKPersistedStateConfig,
  type ChatSDKServiceDeskConfig,
  type OnErrorData,
  type PersistedHumanAgentState,
  type PersistableState,
  type PersistedStateConfig,
  type PublicConfig,
  type PublicConfigMessaging,
  type ServiceDesk,
  type ServiceDeskFactoryParameters,
  type ServiceDeskPublicConfig,
} from '../../../src/serverEntry';

declare const serviceDesk: ServiceDesk;

// ChatSDKConfig holds exactly the conversation settings that have a runtime in 1.x.
export const sdkConfigFields: Record<keyof ChatSDKConfig, true> = {
  onError: true,
  debug: true,
  serviceDeskFactory: true,
  serviceDesk: true,
  namespace: true,
  messaging: true,
  isReadonly: true,
  humanAgentState: true,
};
export const sdkMessagingFields: Record<keyof ChatSDKConfigMessaging, true> = {
  skipWelcome: true,
  messageTimeoutSecs: true,
  customSendMessage: true,
  customLoadHistory: true,
};
export const sdkServiceDeskFields: Record<
  keyof ChatSDKServiceDeskConfig,
  true
> = {
  availabilityTimeoutSeconds: true,
  agentJoinTimeoutSeconds: true,
  allowReconnect: true,
};
export const sdkErrorFields: Record<keyof ChatSDKErrorData, true> = {
  errorType: true,
  message: true,
  otherData: true,
};

// SDK callbacks receive the conversation; a view member fails to compile.
export const sdkMessaging: ChatSDKConfigMessaging = {
  customSendMessage: (_request, options, instance) => {
    const conversation: ChatSDKInstance = instance;
    // @ts-expect-error SDK callbacks receive no view members.
    instance.changeView(ViewType.MAIN_WINDOW);
    return conversation.messaging.restartConversation().then(() => {
      options.signal.throwIfAborted();
    });
  },
  customLoadHistory: async (instance) => {
    // @ts-expect-error SDK callbacks receive no view members.
    instance.requestFocus();
    return [];
  },
};
export const sdkFactory: ChatSDKConfig['serviceDeskFactory'] = async (
  parameters
) => {
  // @ts-expect-error A factory on the SDK config receives no view members.
  parameters.instance.scrollToMessage('message-1');
  return serviceDesk;
};
export const sdkOnError: ChatSDKConfig['onError'] = (data) => {
  // @ts-expect-error The catastrophic-error flag belongs to the prebuilt chat.
  const catastrophic = data.catastrophicErrorType;
  return catastrophic ?? data.errorType === OnErrorType.HYDRATION;
};

// SDK callbacks work unchanged on the full config.
export const prebuiltFromSdk: PublicConfig = {
  messaging: sdkMessaging,
  serviceDeskFactory: sdkFactory,
  onError: sdkOnError,
  namespace: 'support',
  isReadonly: false,
  debug: true,
  serviceDesk: { allowReconnect: false, skipConnectHumanAgentCard: true },
};

// Callbacks on the full config still receive ChatInstance, and onError still receives OnErrorData.
export const prebuilt: PublicConfig = {
  messaging: {
    customSendMessage: (_request, _options, instance) => {
      const full: ChatInstance = instance;
      full.requestFocus();
    },
    customLoadHistory: async (instance) => {
      await instance.changeView(ViewType.MAIN_WINDOW);
      return [];
    },
    messageLoadingIndicatorTimeoutSecs: 0,
    showStopButtonImmediately: true,
  },
  serviceDeskFactory: async (parameters) => {
    parameters.instance.scrollToMessage('message-1');
    return serviceDesk;
  },
  onError: (data: OnErrorData) => data.catastrophicErrorType,
};
export const prebuiltMessaging: ChatSDKConfigMessaging<ChatInstance> =
  {} as PublicConfigMessaging;
export const prebuiltServiceDesk: ChatSDKServiceDeskConfig =
  {} as ServiceDeskPublicConfig;
export const prebuiltError: ChatSDKErrorData = {} as OnErrorData;
export const defaultFactoryInstance = (
  parameters: ServiceDeskFactoryParameters
) => parameters.instance.requestFocus();

// The SDK saves the human agent connection; the full config keeps persistedState instead.
export const sdkSaved: ChatSDKConfig = {
  humanAgentState: {
    initialState: {
      isConnected: true,
      isSuspended: false,
      responseUserProfiles: {},
    },
    onStateChange: (state: PersistedHumanAgentState) => state.isConnected,
  },
};
export const savedConnection: ChatSDKPersistedStateConfig<PersistedHumanAgentState> =
  sdkSaved.humanAgentState!;
export const prebuiltSaved: PublicConfig = {
  persistedState: {
    onStateChange: (state) => state.humanAgentState.isConnected,
  },
};
export const prebuiltSavedBase: ChatSDKPersistedStateConfig<PersistableState> =
  {} as PersistedStateConfig;
export const noHumanAgentState: PublicConfig = {
  // @ts-expect-error The full config saves the connection through persistedState.
  humanAgentState: {},
};

export type PublicConfigProbe = PublicConfig;
export type ChatSDKConfigProbe = ChatSDKConfig;
export type ChatSDKConfigForChatInstanceProbe = ChatSDKConfig<ChatInstance>;
