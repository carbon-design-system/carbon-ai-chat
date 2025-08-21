/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file contains the public interfaces that are needed by loadWatsonAssistantChat and Chat when
 * creating the chat widget. We define interface contracts instead of using the classes directly because we don't want
 * a build time dependency on the actually classes as that will pull that code into the bundle. These interfaces allow
 * us to maintain the contract without relying on the actual implementation.
 */

import { ServiceManager } from "./services/ServiceManager";
import { AdditionalChatParameters } from "../../types/component/AdditionalChatParameters";
import { ChatInstance } from "../../types/instance/ChatInstance";
import { PublicConfig } from "../../types/config/PublicConfig";

/**
 * This is the interface implemented by the Chat chat widget. This is separated from the class so we can
 * have a concrete contract between the "loadWatsonAssistantChat" code and the widget without depending on the actual
 * Chat class which would pull it into the bundle.
 */
interface ChatInterface {
  /**
   * Starts the chat widget. This will return a promise that resolves to an instance of the started widget that can
   * be used by the host page to interact with the widget.
   */
  start(): Promise<ChatInstance>;

  /**
   * Starts the chat widget. This will return a promise that resolves to an instance of the started widget that can
   * be used by the host page to interact with the widget. This internal version of the function also provides
   * access to helper objects that were constructed at the same time as the chat instance.
   */
  startInternal(): Promise<{
    instance: ChatInstance;
    serviceManager: ServiceManager;
  }>;
}

interface ConstructableChatInterface {
  new (
    publicConfigProvided: PublicConfig,
    hostElement?: Element,
    additionalChatParametersProvided?: AdditionalChatParameters,
  ): ChatInterface;
}

interface RenderFunctionArgs {
  serviceManager: ServiceManager;
  hostElement?: Element;
}

/**
 * The type of the "render" function that will be called by Chat.
 */
type RenderFunctionType = (args: RenderFunctionArgs) => Promise<void>;

export {
  ConstructableChatInterface,
  ChatInterface,
  RenderFunctionType,
  RenderFunctionArgs,
};
