/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from "lodash-es/isEqual.js";
import { PublicConfig } from "../../types/config/PublicConfig";
import { ServiceManager } from "../services/ServiceManager";

/**
 * Describes the types of config changes detected between two config objects.
 */
export interface ConfigChanges {
  /**
   * True if human agent configuration has changed (serviceDeskFactory or serviceDesk)
   */
  humanAgentConfigChanged: boolean;

  /**
   * True if theme configuration has changed
   */
  themingChanged: boolean;

  /**
   * True if messaging configuration has changed
   */
  messagingChanged: boolean;

  /**
   * True if namespace has changed
   */
  namespaceChanged: boolean;

  /**
   * True if disclaimer configuration has changed
   */
  disclaimerChanged: boolean;

  /**
   * True if layout configuration has changed
   */
  layoutChanged: boolean;

  /**
   * True if header configuration has changed
   */
  headerChanged: boolean;

  /**
   * True is homescreen configuration has changed
   */
  homescreenChanged: boolean;

  /**
   * True if any lightweight UI configuration has changed
   */
  lightweightUIChanged: boolean;
}

/**
 * Detects what types of changes occurred between two config objects.
 */
export function detectConfigChanges(
  previousConfig: PublicConfig | null,
  newConfig: PublicConfig,
): ConfigChanges {
  if (!previousConfig) {
    // First config load - everything is "changed"
    return {
      humanAgentConfigChanged: Boolean(
        newConfig.serviceDeskFactory || newConfig.serviceDesk,
      ),
      themingChanged: Boolean(
        newConfig.aiEnabled !== undefined ||
          newConfig.injectCarbonTheme !== undefined,
      ),
      messagingChanged: Boolean(newConfig.messaging),
      namespaceChanged: Boolean(newConfig.namespace),
      disclaimerChanged: Boolean(newConfig.disclaimer),
      layoutChanged: Boolean(newConfig.layout),
      headerChanged: Boolean(newConfig.header),
      homescreenChanged: Boolean(newConfig.homescreen),
      lightweightUIChanged: true,
    };
  }

  const humanAgentConfigChanged =
    previousConfig.serviceDeskFactory !== newConfig.serviceDeskFactory ||
    !isEqual(previousConfig.serviceDesk, newConfig.serviceDesk);

  const themingChanged =
    previousConfig.aiEnabled !== newConfig.aiEnabled ||
    previousConfig.injectCarbonTheme !== newConfig.injectCarbonTheme;
  const messagingChanged = !isEqual(
    previousConfig.messaging,
    newConfig.messaging,
  );
  const namespaceChanged = previousConfig.namespace !== newConfig.namespace;
  const disclaimerChanged = !isEqual(
    previousConfig.disclaimer,
    newConfig.disclaimer,
  );
  const layoutChanged = !isEqual(previousConfig.layout, newConfig.layout);
  const headerChanged = !isEqual(previousConfig.header, newConfig.header);
  const homescreenChanged = !isEqual(
    previousConfig.homescreen,
    newConfig.homescreen,
  );
  const lightweightUIChanged =
    !isEqual(previousConfig.launcher, newConfig.launcher) ||
    previousConfig.openChatByDefault !== newConfig.openChatByDefault ||
    previousConfig.shouldSanitizeHTML !== newConfig.shouldSanitizeHTML ||
    previousConfig.debug !== newConfig.debug ||
    previousConfig.enableFocusTrap !== newConfig.enableFocusTrap ||
    previousConfig.shouldTakeFocusIfOpensAutomatically !==
      newConfig.shouldTakeFocusIfOpensAutomatically ||
    previousConfig.assistantName !== newConfig.assistantName ||
    previousConfig.isReadonly !== newConfig.isReadonly ||
    previousConfig.locale !== newConfig.locale ||
    previousConfig.disableCustomElementMobileEnhancements !==
      newConfig.disableCustomElementMobileEnhancements ||
    previousConfig.input?.isVisible !== newConfig.input?.isVisible ||
    previousConfig.input?.isDisabled !== newConfig.input?.isDisabled ||
    previousConfig.launcher?.showUnreadIndicator !==
      newConfig.launcher?.showUnreadIndicator;

  return {
    humanAgentConfigChanged,
    themingChanged,
    messagingChanged,
    namespaceChanged,
    disclaimerChanged,
    layoutChanged,
    headerChanged,
    homescreenChanged,
    lightweightUIChanged,
  };
}

/**
 * Determines if a human agent conversation is currently active.
 */
export function isHumanAgentChatActive(
  serviceManager: ServiceManager,
): boolean {
  const state = serviceManager.store.getState();
  return (
    state.persistedToBrowserStorage.humanAgentState.isConnected ||
    state.humanAgentState.isConnecting
  );
}
