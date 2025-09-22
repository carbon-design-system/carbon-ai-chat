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
import { ChatActionsImpl } from "../events/ChatActionsImpl";
import { EventBus } from "../events/EventBus";
import { AppState } from "../../types/state/AppState";
import { HumanAgentService } from "./haa/HumanAgentService";
import { CustomPanelManager } from "./CustomPanelManager";
import { HistoryService } from "./HistoryService";
import MessageService from "./MessageService";
import { NamespaceService } from "./NamespaceService";
import { ThemeWatcherService } from "./ThemeWatcherService";
import { UserSessionStorageService } from "./UserSessionStorageService";
import {
  ChatInstance,
  WriteableElements,
} from "../../types/instance/ChatInstance";
import { BusEvent } from "../../types/events/eventBusTypes";

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
   * The class used by the client to execute various chat actions.
   */
  actions: ChatActionsImpl;

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
   * The message service used to send and receive messages.
   */
  messageService: MessageService;

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

export { ServiceManager };
