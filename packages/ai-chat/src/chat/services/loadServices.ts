/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatActionsImpl } from "../events/ChatActionsImpl";
import { EventBus } from "../events/EventBus";
import { createCustomPanelManager } from "./CustomPanelManager";
import { HistoryService } from "./HistoryService";
import MessageService from "./MessageService";
import { NamespaceService } from "./NamespaceService";
import { ServiceManager } from "./ServiceManager";
import { ThemeWatcherService } from "./ThemeWatcherService";
import { UserSessionStorageService } from "./UserSessionStorageService";
import { doCreateStore } from "../store/doCreateStore";
import { copyToSessionStorage } from "../store/subscriptions";
import { AppConfig } from "../../types/state/AppConfig";
import { WriteableElementName } from "../utils/constants";
import {
  assertType,
  setEnableDebugLog,
  setEnableDebugStackTracesLog,
} from "../utils/miscUtils";
import { setIntl } from "../utils/intlUtils";
import { isBrowser } from "../utils/browserUtils";

type CreateServiceManagerFunction = (appConfig: AppConfig) => ServiceManager;

/**
 * This file contains the code needed to bootstrap all the shared services in Carbon AI Chat. Services are used to hold
 * functions that are used throughout the application that need access to the current instance of the Carbon AI Chat.
 */
function createServiceManager(appConfig: AppConfig) {
  const publicConfig = appConfig.public;

  const serviceManager = new ServiceManager();

  // Create all the services we will be using.
  serviceManager.namespace = new NamespaceService(publicConfig.namespace);
  serviceManager.userSessionStorageService = new UserSessionStorageService(
    serviceManager,
  );
  serviceManager.actions = new ChatActionsImpl(serviceManager);
  serviceManager.eventBus = new EventBus();
  serviceManager.store = doCreateStore(publicConfig, serviceManager);
  serviceManager.historyService = new HistoryService(serviceManager);
  serviceManager.messageService = new MessageService(
    serviceManager,
    publicConfig,
  );
  serviceManager.store.subscribe(copyToSessionStorage(serviceManager));

  // Subscribe to theme changes to start/stop the theme watcher as needed
  let currentOriginalTheme =
    serviceManager.store.getState().config.derived.themeWithDefaults
      .originalCarbonTheme;

  serviceManager.store.subscribe(() => {
    const newOriginalTheme =
      serviceManager.store.getState().config.derived.themeWithDefaults
        .originalCarbonTheme;
    if (newOriginalTheme !== currentOriginalTheme) {
      serviceManager.themeWatcherService.onThemeChange(newOriginalTheme);
      currentOriginalTheme = newOriginalTheme;
    }
  });
  serviceManager.customPanelManager = createCustomPanelManager(serviceManager);
  serviceManager.themeWatcherService = new ThemeWatcherService(
    serviceManager.store,
  );

  // Start theme watching if initially inheriting tokens
  // If later we make the theme mutable, we will have to consider that here.
  serviceManager.themeWatcherService.onThemeChange(currentOriginalTheme);

  setIntl(
    serviceManager,
    serviceManager.store.getState().config.public.locale || "en",
    serviceManager.store.getState().languagePack,
  );

  // Create all custom elements for Deb.
  serviceManager.writeableElements = {};
  if (isBrowser) {
    serviceManager.writeableElements = {
      [WriteableElementName.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT]:
        document.createElement("div"),
      [WriteableElementName.WELCOME_NODE_BEFORE_ELEMENT]:
        document.createElement("div"),
      [WriteableElementName.HEADER_BOTTOM_ELEMENT]:
        document.createElement("div"),
      [WriteableElementName.BEFORE_INPUT_ELEMENT]:
        document.createElement("div"),
      [WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT]:
        document.createElement("div"),
      [WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT]:
        document.createElement("div"),
      [WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT]:
        document.createElement("div"),
      [WriteableElementName.CUSTOM_PANEL_ELEMENT]:
        document.createElement("div"),
    };
  }

  if (publicConfig.debug) {
    setEnableDebugLog(true);
  }

  if (publicConfig.debug) {
    setEnableDebugStackTracesLog(true);
  }

  return serviceManager;
}
assertType<CreateServiceManagerFunction>(createServiceManager);

export { createServiceManager };
