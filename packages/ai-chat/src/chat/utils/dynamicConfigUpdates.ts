/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PublicConfig } from "../../types/config/PublicConfig";
import { ServiceManager } from "../services/ServiceManager";
import { NamespaceService } from "../services/NamespaceService";
import { ConfigChanges, isHumanAgentChatActive } from "./configChangeDetection";
import actions from "../store/actions";
import createHumanAgentService from "../services/haa/HumanAgentServiceImpl";
import { consoleDebug, consoleError } from "./miscUtils";
import { createAppConfig } from "../store/doCreateStore";
import { isBrowser } from "./browserUtils";

/**
 * Applies config changes dynamically without requiring a full reboot.
 * This handles all lightweight changes that can be applied to an existing service manager.
 */
export async function applyConfigChangesDynamically(
  changes: ConfigChanges,
  newConfig: PublicConfig,
  serviceManager: ServiceManager,
): Promise<void> {
  const { store } = serviceManager;

  // Create new AppConfig with recomputed derived values
  const currentState = store.getState();
  const newAppConfig = createAppConfig(newConfig);

  // Preserve derivedCarbonTheme when in inherit mode (originalCarbonTheme is null)
  if (newAppConfig.derived.themeWithDefaults.originalCarbonTheme === null) {
    newAppConfig.derived.themeWithDefaults.derivedCarbonTheme =
      currentState.config.derived.themeWithDefaults.derivedCarbonTheme;
  }

  // Update Redux store with complete config (public + derived)
  store.dispatch(actions.changeState({ config: newAppConfig }));

  if (changes.homescreenChanged) {
    // If homescreen is going from off to on, make it open as long as there are not any messages in the message list.
    if (
      newConfig.homescreen?.isOn &&
      !currentState.config.public.homescreen?.isOn &&
      currentState.assistantMessageState.messageIDs.length === 0
    ) {
      store.dispatch(actions.setHomeScreenIsOpen(true));
    }
    // If homescreen if going from on to off, make sure we aren't trying to show it. If its moving to "splash" and there are active messages, hide it.
    if (
      (!newConfig.homescreen?.isOn &&
        currentState.config.public.homescreen?.isOn) ||
      (newConfig.homescreen?.disableReturn &&
        currentState.assistantMessageState.messageIDs.length > 0)
    ) {
      store.dispatch(actions.setHomeScreenIsOpen(false));
    }
  }

  // Custom panel is driven by ChatInstance; no dynamic updates needed

  // Handle namespace changes
  if (changes.namespaceChanged) {
    serviceManager.namespace = new NamespaceService(newConfig.namespace);
    // Session storage will adapt automatically on next access
  }

  // Handle messaging changes
  if (changes.messagingChanged && newConfig.messaging) {
    // Update message service timeout value held internally
    if (
      serviceManager.messageService &&
      newConfig.messaging.messageTimeoutSecs
    ) {
      serviceManager.messageService.timeoutMS =
        newConfig.messaging.messageTimeoutSecs * 1000;
    }
  }

  // Handle human agent config changes
  if (changes.humanAgentFactoryChanged) {
    try {
      // If an existing service is present and a chat is in progress/connecting, end it quietly.
      if (
        serviceManager.humanAgentService &&
        isHumanAgentChatActive(serviceManager)
      ) {
        consoleDebug("Tearing down existing service desk");
        // Align with restart behavior: end as if user ended.
        await serviceManager.humanAgentService.endChat(true, true, false);
      }

      const wasInitialized = Boolean(
        serviceManager.humanAgentService?.hasInitialized,
      );

      consoleDebug("Recreating human agent service");
      // Recreate and initialize the human agent service using the new config.
      serviceManager.humanAgentService =
        createHumanAgentService(serviceManager);

      // If the human agent service was already started, start it up again.
      if (wasInitialized) {
        consoleDebug("Human agent service restarting");
        await serviceManager.humanAgentService.initialize();
      }
    } catch (error) {
      // If human agent service update fails, allow caller to decide on fallback.
      consoleError("Failed to update human agent service dynamically:", error);
      throw error;
    }
  }

  // Handle disclaimer changes
  if (changes.disclaimerChanged) {
    // Clear the disclaimer accepted state for current hostname when disclaimer content changes
    const currentState = store.getState();
    const hostname = isBrowser() ? window.location.hostname : "";
    const updatedDisclaimersAccepted = {
      ...currentState.persistedToBrowserStorage.disclaimersAccepted,
    };
    delete updatedDisclaimersAccepted[hostname];

    store.dispatch(
      actions.changeState({
        persistedToBrowserStorage: {
          ...currentState.persistedToBrowserStorage,
          disclaimersAccepted: updatedDisclaimersAccepted,
        },
      }),
    );
  }

  // Layout, header, and other lightweight changes are handled
  // automatically by the Redux store update and React re-rendering

  // Handle lightweight UI changes coming from public config
  if (changes.lightweightUIChanged) {
    const current = store.getState().assistantInputState;
    const nextState = {
      ...current,
    };

    if (typeof newConfig.input?.isVisible === "boolean") {
      if (current.fieldVisible !== newConfig.input.isVisible) {
        nextState.fieldVisible = newConfig.input.isVisible;
      }
    }

    if (typeof newConfig.input?.isDisabled === "boolean") {
      nextState.isDisabled = newConfig.input.isDisabled;
    }

    if (typeof newConfig.isReadonly === "boolean") {
      nextState.isReadonly = newConfig.isReadonly;
    }

    if (nextState !== current) {
      store.dispatch(actions.changeState({ assistantInputState: nextState }));
    }

    if (typeof newConfig.launcher?.showUnreadIndicator === "boolean") {
      const currentValue =
        store.getState().persistedToBrowserStorage.showUnreadIndicator;
      if (currentValue !== newConfig.launcher.showUnreadIndicator) {
        store.dispatch(
          actions.setLauncherProperty(
            "showUnreadIndicator",
            newConfig.launcher.showUnreadIndicator,
          ),
        );
      }
    }
  }
}
