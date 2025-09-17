/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatActionsImpl } from "./events/ChatActionsImpl";
import { EventBus } from "./events/EventBus";
import { createCustomPanelManager } from "./services/CustomPanelManager";
import { HistoryService } from "./services/HistoryService";
import MessageService from "./services/MessageService";
import { NamespaceService } from "./services/NamespaceService";
import { ServiceManager } from "./services/ServiceManager";
import { UserSessionStorageService } from "./services/UserSessionStorageService";
import { doCreateStore } from "./store/doCreateStore";
import {
  copyToSessionStorage,
  createHandleWindowTitle,
} from "./store/subscriptions";
import { AdditionalChatParameters } from "../../types/component/AdditionalChatParameters";
import { AppConfig } from "../../types/state/AppConfig";
import { WriteableElementName } from "./utils/constants";
import { assertType, setEnableDebugLog } from "./utils/miscUtils";
import { setIntl } from "./utils/intlUtils";
import { isBrowser } from "./utils/browserUtils";

type CreateServiceManagerFunction = (
  appConfig: AppConfig,
  additionalChatParameters: AdditionalChatParameters,
) => Promise<ServiceManager>;

/**
 * This file contains the code needed to bootstrap all the shared services in Carbon AI Chat. Services are used to hold
 * functions that are used throughout the application that need access to the current instance of the Carbon AI Chat.
 */
async function createServiceManager(
  appConfig: AppConfig,
  additionalChatParameters: AdditionalChatParameters,
) {
  const publicConfig = appConfig.public;

  const serviceManager = new ServiceManager();

  // Create all the services we will be using.
  serviceManager.additionalChatParameters = additionalChatParameters;
  serviceManager.namespace = new NamespaceService(publicConfig.namespace);
  serviceManager.userSessionStorageService = new UserSessionStorageService(
    serviceManager,
  );
  serviceManager.actions = new ChatActionsImpl(serviceManager);
  serviceManager.eventBus = new EventBus();
  serviceManager.store = doCreateStore(appConfig, serviceManager);
  serviceManager.historyService = new HistoryService(serviceManager);
  serviceManager.messageService = new MessageService(
    serviceManager,
    publicConfig,
  );
  serviceManager.store.subscribe(copyToSessionStorage(serviceManager));
  if (!publicConfig.disableWindowTitleChanges) {
    serviceManager.store.subscribe(createHandleWindowTitle(serviceManager));
  }
  serviceManager.customPanelManager = createCustomPanelManager(serviceManager);

  setIntl(
    serviceManager,
    serviceManager.store.getState().locale,
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

  return serviceManager;
}
assertType<CreateServiceManagerFunction>(createServiceManager);

export { createServiceManager };
