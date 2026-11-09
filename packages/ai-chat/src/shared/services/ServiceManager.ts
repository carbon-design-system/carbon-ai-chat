/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { closeStore, type AppStore } from '../store/appStore';
import { consoleError } from '../utils/miscUtils';
import { IntlShape } from '../utils/i18n';

import { EventBus } from '../events/EventBus';
import { ConversationState } from '../../types/state/ConversationState';
import { HumanAgentService } from './haa/HumanAgentService';
import { HistoryService } from './HistoryService';
import { NamespaceService } from './NamespaceService';
import { ThemeWatcherService } from './ThemeWatcherService';
import { UserSessionStorageService } from './UserSessionStorageService';
import { ChatInstance } from '../../types/instance/ChatInstance';
import { WriteableElements } from '../../types/instance/WriteableElements';
import { BusEvent } from '../../types/events/eventBusTypes';
import { ChatInstanceService } from './ChatInstanceService';
import { HydrationService } from './HydrationService';
import { InputActionsService } from './InputActionsService';
import { PublicStateService } from './PublicStateService';
import { MessageCoordinator } from './messaging/MessageCoordinator';
import { SlotEventService } from './messaging/presentation/SlotEventService';
import { StreamAnnouncerService } from './messaging/presentation/StreamAnnouncerService';
import { ViewConnection } from './viewBindings';

interface UserDefinedElementRegistryItem {
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
   * The class used by the client to execute various chat actions.
   */
  actions: ChatInstanceService;

  /**
   * Service handling input field mutations and file uploads.
   */
  inputActionsService: InputActionsService;

  /**
   * Service that tracks and fires stream-start announcements for screen readers.
   */
  streamAnnouncerService: StreamAnnouncerService;

  /**
   * Service that wires user-defined response elements and fires footer-slot events.
   */
  slotEventService: SlotEventService;

  /**
   * Service that manages chat hydration, session restart, and session destruction.
   */
  hydrationService: HydrationService;

  /**
   * Service that projects store state into the public ChatState snapshot.
   */
  publicStateService: PublicStateService;

  /** Coordinates transient loading, send, stream, and error state. */
  messageCoordinator: MessageCoordinator;

  /**
   * The mounted view's bindings, if a view is attached. Conversation code
   * reaches the view only through them, looked up on each call.
   */
  readonly view = new ViewConnection();

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
  store: AppStore<ConversationState>;

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
   * Service that watches CSS variables and updates theme when CarbonTheme is not set.
   */
  themeWatcherService: ThemeWatcherService;

  /**
   * Indicates the number of times that a restart has occurred. This can be used by various asynchronous operations to
   * determine if a restart occurred during the operation and if the results should be ignored.
   */
  restartCount = 0;

  /**
   * An instance of the custom I18n formatter that can be used for formatting messages. Components read it through
   * the chat's view state with the useIntl() hook, which follows each new formatter. Set it only with `setIntl`.
   * This replaces the previous react-intl IntlShape.
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

  private shutdownPromise?: Promise<void>;

  /**
   * True once {@link shutdown} has started, including while its first steps
   * run, so an abort listener that calls back in sees it. Late async work
   * checks it.
   */
  isShutdown = false;

  /**
   * Stops this chat's service work for good. Removing the chat's element calls
   * it; hosts never do. The store closes first: its subscriptions go, and
   * later dispatches change nothing, so saved session state stays as it was
   * at removal. Then the bus drops every handler, and requests, streams,
   * uploads, and timers stop. Works for a chat still starting up. A repeat
   * call returns the first call's promise.
   */
  shutdown(): Promise<void> {
    if (!this.shutdownPromise) {
      this.isShutdown = true;
      this.shutdownPromise = this.stopServices();
    }
    return this.shutdownPromise;
  }

  private async stopServices() {
    // The steps run back to back, and each runs even if one before it throws.
    const run = (step: () => unknown) => {
      try {
        return step();
      } catch (error) {
        consoleError('A step of the chat shutdown failed.', error);
        return undefined;
      }
    };
    if (this.store) {
      run(() => closeStore(this.store));
    }
    run(() => this.eventBus?.clear());
    // Before anything aborts: an abort listener that ends the agent chat must
    // not reach the real desk.
    run(() => this.humanAgentService?.shutdown());
    run(() => this.publicStateService?.destroy());
    run(() => this.inputActionsService?.abortAllUploads());
    try {
      await run(() => this.messageCoordinator?.shutdown());
    } catch (error) {
      consoleError('A step of the chat shutdown failed.', error);
    }
  }

  /**
   * Convenience functions for firing events on the event bus.
   */
  async fire<T extends BusEvent>(busEvent: T, isCurrent?: () => boolean) {
    return this.eventBus.fire(busEvent, this.instance, isCurrent);
  }
}

export { ServiceManager, UserDefinedElementRegistryItem };
