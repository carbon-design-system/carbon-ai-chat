/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { WriteableElementName } from '../../sdk/utils/constants';
import type { ServiceManager } from '../../sdk/services/ServiceManager';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import type { WriteableElements } from '../../types/instance/WriteableElements';

/**
 * Creates the page elements a host writes into, one set per chat. The shell
 * makes them when it builds the chat's `ChatInstance`, which holds them as
 * `writeableElements` for the chat's lifetime. A chat `createChatSDK` starts
 * on its own has none.
 */
function createWriteableElements(): WriteableElements {
  return {
    [WriteableElementName.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT]:
      document.createElement('div'),
    [WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT]:
      document.createElement('div'),
    [WriteableElementName.EXPLAINABILITY_POPOVER_ACTIONS]:
      document.createElement('div'),
    [WriteableElementName.WELCOME_NODE_BEFORE_ELEMENT]:
      document.createElement('div'),
    [WriteableElementName.HEADER_BOTTOM_ELEMENT]: document.createElement('div'),
    [WriteableElementName.HEADER_FIXED_ACTIONS_ELEMENT]:
      document.createElement('div'),
    [WriteableElementName.BEFORE_INPUT_ELEMENT]: document.createElement('div'),
    [WriteableElementName.AFTER_INPUT_ELEMENT]: document.createElement('div'),
    [WriteableElementName.PROMPT_LINE_ACTIONS_END]:
      document.createElement('div'),
    [WriteableElementName.PROMPT_LINE_SEND_BUTTON_START]:
      document.createElement('div'),
    [WriteableElementName.FOOTER_ELEMENT]: document.createElement('div'),
    [WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT]:
      document.createElement('div'),
    [WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT]:
      document.createElement('div'),
    [WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT]:
      document.createElement('div'),
    [WriteableElementName.CUSTOM_PANEL_ELEMENT]: document.createElement('div'),
    [WriteableElementName.WORKSPACE_PANEL_ELEMENT]:
      document.createElement('div'),
    [WriteableElementName.HISTORY_PANEL_ELEMENT]: document.createElement('div'),
    [WriteableElementName.CUSTOM_HEADER]: document.createElement('div'),
    [WriteableElementName.CUSTOM_PROMPT_LINE]: document.createElement('div'),
  };
}

/** The chat's writeable elements, or none before its instance exists. */
function writeableElementsOf(
  serviceManager: ServiceManager
): Partial<WriteableElements> {
  return (
    (serviceManager.instance as ChatInstance | undefined)?.writeableElements ??
    {}
  );
}

export { createWriteableElements, writeableElementsOf };
