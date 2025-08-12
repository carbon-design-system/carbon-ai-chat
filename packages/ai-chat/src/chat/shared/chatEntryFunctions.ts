/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from "lodash-es/cloneDeep.js";

import {
  ConstructableChatInterface,
  RenderFunctionType,
} from "./ChatInterface";
import { AdditionalChatParameters } from "../../types/component/AdditionalChatParameters";
import { assertType, consoleDebug, consoleWarn } from "./utils/miscUtils";
import { PublicConfig } from "../../types/config/PublicConfig";
import { isBrowser } from "./utils/browserUtils";

const DEFAULT_PUBLIC_CONFIG: Partial<PublicConfig> = {
  openChatByDefault: false,
  showLauncher: true,
  shouldTakeFocusIfOpensAutomatically: true,
  serviceDesk: {},
  messaging: {},
  themeConfig: {},
};
type ChatConstructorPromise = (
  publicConfig?: PublicConfig,
) => Promise<ConstructableChatInterface>;

/**
 * Create new Carbon AI Chat instance.
 *
 * @param pagePublicConfig The public config options object that came from the page.
 * @param chatConstructorPromise A promise that resolves with the WatsonAssistantChat class. This can either be a
 * script tab with some onload handlers, or could be an import() statement. Because of our use of MFEs, we are
 * currently limited to the former.
 * @param render Function to pass into Chat class to call instead of render function.
 * @returns Promise object that resolves with your new instance. See [./instance.md](./instance.md).
 */
async function instantiateWidget(
  pagePublicConfig: PublicConfig,
  chatConstructorPromise: ChatConstructorPromise,
  render?: Promise<RenderFunctionType>,
  element?: HTMLElement,
) {
  const config = cloneDeep(pagePublicConfig);

  if (!config.messaging?.customSendMessage) {
    throw new Error(
      `You must set messaging.customSendMessage in your configuration object.`,
    );
  }

  if (config?.debug) {
    consoleDebug("[ChatEntry] Called instantiateWidget", config);
  }

  if (isBrowser) {
    if (document.location.protocol !== "https:") {
      consoleWarn(
        'Your page is not running with "https"; your data will not be sent  securely.',
      );
    }

    if (document.compatMode !== "CSS1Compat") {
      consoleWarn(
        'Your page is running in quirks mode; you may experience layout issues with the chat. Add "<!DOCTYPE html>" to the page to run in standards mode.',
      );
    }
  }

  // Extract the extra properties from the page config we don't want to put in to the redux store.
  const { onError, ...publicConfig } = config;

  assertType<PublicConfig>(publicConfig);

  const Chat = await chatConstructorPromise(publicConfig);

  const additionalChatParameters: AdditionalChatParameters = {
    onError,
    render,
  };

  return new Chat(publicConfig, element, additionalChatParameters);
}

export { instantiateWidget, DEFAULT_PUBLIC_CONFIG };
