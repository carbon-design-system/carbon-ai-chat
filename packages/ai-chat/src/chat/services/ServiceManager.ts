/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { IntlShape } from "react-intl";
import type { AppStore } from "../store/appStore";

import { AppWindowFunctions } from "../components-legacy/AppWindowFunctions";
import { MainWindowFunctions } from "../components-legacy/main/MainWindowFunctions";
import { MessageLifecycleService } from "./MessageLifecycleService";
import { EventBus } from "../events/EventBus";
import { AppState } from "../../types/state/AppState";
import { HumanAgentService } from "./haa/HumanAgentService";
import {
  createCustomPanelManager,
  CustomPanelManager,
} from "./createCustomPanelManager";
import { HistoryService } from "./HistoryService";
import { HydrationService } from "./HydrationService";
import MessageOutboundService from "./MessageOutboundService";
import { MessageInboundService } from "./MessageInboundService";
import { UserDefinedResponseService } from "./UserDefinedResponseService";
import { ViewStateService } from "./ViewStateService";
import { NamespaceService } from "./NamespaceService";
import { ThemeWatcherService } from "./ThemeWatcherService";
import { UserSessionStorageService } from "./UserSessionStorageService";
import {
  ChatInstance,
  WriteableElements,
} from "../../types/instance/ChatInstance";
import { BusEvent } from "../../types/events/eventBusTypes";
import { doCreateStore } from "../store/doCreateStore";
import {
  copyToSessionStorage,
  fireStateChangeEvent,
} from "../store/subscriptions";
import { AppConfig } from "../../types/state/AppConfig";
import { WriteableElementName } from "../utils/constants";
import { assertType, setEnableDebugLog } from "../utils/miscUtils";
import { setIntl } from "../utils/intlUtils";
import { isBrowser } from "../utils/browserUtils";

export interface UserDefinedElementRegistryItem {
  slotName: string;
}

/**
 * This is a global class responsible for managing and providing access to references of "services" in the application.
 * Services should not hold references to each other but rather should always use the service manager to access
 * other services. This will allow for services to be created lazily and to support circular dependencies.
 */

class ServiceManager {
  /**
   * The current instance of the Carbon AI Chat.
   */
  instance: ChatInstance;

  /**
   * The current instance of the {@link MainWindow} component. This value is not set until the window is mounted.
   */
  mainWindow: MainWindowFunctions;

  /**
   * The current instance of the {@link App} component. This value is not set until app is mounted.
   */
  appWindow: AppWindowFunctions;

  /**
   * Coordinates the complete message lifecycle including sending, receiving, and session management.
   */
  actions: MessageLifecycleService;

  /**
   * The optional custom element for rendering provided in the publicConfig.
   */
  customHostElement: HTMLElement;

  /**
   * The entire wrapping element for the chat that includes styles and render. This is the element that
   * is either appended to the body or the custom element. It includes the main window, and the launcher.
   */
  container: HTMLElement;

  /**
   * The event bus on which events can be fired.
   */
  eventBus: EventBus;

  /**
   * The redux store holding the application state.
   */
  store: AppStore<AppState>;

  /**
   * The outbound message service used to send messages to the backend.
   */
  messageOutboundService: MessageOutboundService;

  /**
   * The service responsible for receiving and processing streaming chunks.
   */
  messageInboundService: MessageInboundService;

  /**
   * The service to use to connect to a human agent. Note that this value will not be defined if no service desk is
   * enabled.
   */
  humanAgentService: HumanAgentService | undefined;

  /**
   * The service to use to handle conversation history.
   */
  historyService: HistoryService;

  /**
   * The service responsible for hydrating the chat application on initialization.
   */
  hydrationService: HydrationService;

  /**
   * The service responsible for handling user-defined custom responses.
   */
  userDefinedResponseService: UserDefinedResponseService;

  /**
   * The service responsible for managing view state transitions.
   */
  viewStateService: ViewStateService;

  /**
   * This is a registry of the elements that act as the hosts for custom responses. The key of the map is the ID of
   * the message and the value is an object with the Element created by the widget that was provided to event listeners that they
   * can attach their own elements to. These elements are attached to the appropriate React component when rendered. Optionally, this
   * object can also include a slotName for when rendering the element into a slot when shadowRoot is enabled.
   */
  userDefinedElementRegistry: Map<string, UserDefinedElementRegistryItem> =
    new Map();

  /**
   * An object of elements we expose to developers to write to.
   */
  writeableElements: Partial<WriteableElements>;

  /**
   * A service to write and read items in browser storage related to the session.
   */
  userSessionStorageService: UserSessionStorageService;

  /**
   * An object defining the namespace of this Carbon AI Chat and derived properties from that namespace name.
   */
  namespace: NamespaceService;

  /**
   * This is a custom panel manager that currently only fetches 1 custom panel.
   */
  customPanelManager: CustomPanelManager;

  /**
   * Service that watches CSS variables and updates theme when CarbonTheme is not set.
   */
  themeWatcherService: ThemeWatcherService;

  /**
   * Indicates the number of times that a restart has occurred. This can be used by various asynchronous operations to
   * determine if a restart occurred during the operation and if the results should be ignored.
   */
  restartCount = 0;

  /**
   * An instance of the react-intl Intl object that can be used for formatting messages. This instance is available
   * both here and through the React RawIntlProvider that makes it available to react-intl components.
   */
  intl: IntlShape;

  /**
   * As part of the view change work a bug was exposed where someone calling openWindow, closeWindow, or toggleOpen,
   * immediately after calling instance.render(), without waiting for render to finish, would trigger viewChange to
   * throw an error because it was in the middle of changing the view to set the view to the targetViewState and
   * couldn't accept another view change request at that time. The solution is to force the instance.openWindow,
   * instance.closeWindow, and instance.toggleOpen functions to wait for this renderPromise to complete before allowing
   * them to try and trigger a view change. This can be removed from the service manager when the deprecated window
   * methods and events are removed.
   */
  renderPromise: Promise<ChatInstance>;

  /**
   * Convenience functions for firing events on the event bus.
   */
  async fire<T extends BusEvent>(busEvent: T) {
    return this.eventBus.fire(busEvent, this.instance);
  }
}

type CreateServiceManagerFunction = (appConfig: AppConfig) => ServiceManager;

/**
 * Creates and initializes a ServiceManager instance with all required services.
 * This function bootstraps all the shared services in Carbon AI Chat. Services are used to hold
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
  serviceManager.actions = new MessageLifecycleService(serviceManager);
  serviceManager.eventBus = new EventBus();
  serviceManager.store = doCreateStore(publicConfig, serviceManager);
  serviceManager.historyService = new HistoryService(serviceManager);
  serviceManager.hydrationService = new HydrationService(serviceManager);
  serviceManager.messageOutboundService = new MessageOutboundService(
    serviceManager,
    publicConfig,
  );
  serviceManager.messageInboundService = new MessageInboundService(
    serviceManager,
  );
  serviceManager.userDefinedResponseService = new UserDefinedResponseService(
    serviceManager,
  );
  serviceManager.viewStateService = new ViewStateService(serviceManager);
  serviceManager.store.subscribe(copyToSessionStorage(serviceManager));
  serviceManager.store.subscribe(fireStateChangeEvent(serviceManager));

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
    serviceManager.container,
  );

  // Start theme watching if initially inheriting tokens
  // If later we make the theme mutable, we will have to consider that here.
  serviceManager.themeWatcherService.onThemeChange(currentOriginalTheme);

  setIntl(
    serviceManager,
    serviceManager.store.getState().config.public.locale || "en",
    serviceManager.store.getState().config.derived.languagePack,
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

export { ServiceManager, createServiceManager };
