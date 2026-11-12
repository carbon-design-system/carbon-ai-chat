/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';

import { closeStore, type AppStore } from '../store/appStore';
import { humanAgentStateConfig } from '../store/humanAgentStatePersistence';
import { toPersistableState } from '../store/persistenceUtils';
import { DEFAULT_PERSISTED_TO_BROWSER } from '../store/reducerUtils';
import { consoleError } from '../utils/miscUtils';
import { IntlShape } from '../utils/i18n';

import { EventBus } from '../events/EventBus';
import { ConversationState } from '../../types/state/ConversationState';
import { HumanAgentService } from './haa/HumanAgentService';
import { HistoryService } from './HistoryService';
import { NamespaceService } from './NamespaceService';
import { UserSessionStorageService } from './UserSessionStorageService';
import { ChatInstance } from '../../types/instance/ChatInstance';
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

/** Runs one shutdown step, logging what it throws so the next step still runs. */
function runStep<T>(step: () => T): T | undefined {
  try {
    return step();
  } catch (error) {
    consoleError('A step of the chat shutdown failed.', error);
    return undefined;
  }
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
   * A service to write and read items in browser storage related to the session. Only the
   * prebuilt chat has one; a chat `createChatSDK` starts uses no storage.
   */
  userSessionStorageService: UserSessionStorageService | undefined;

  /**
   * An object defining the namespace of this Carbon AI Chat and derived properties from that namespace name.
   */
  namespace: NamespaceService;

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

  private shutdownPromise?: Promise<void>;

  /**
   * True once {@link shutdown} has started, including while its first steps
   * run, so an abort listener that calls back in sees it. Late async work
   * checks it.
   */
  isShutdown = false;

  /**
   * True once {@link destroy} has started. A handle that didn't destroy the
   * chat reads it to stop reaching the chat.
   */
  isDestroyed = false;

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

  /**
   * Shuts this chat down as {@link shutdown} does, and ends the conversation
   * for good (ADR-0003). Stores stop notifying at once. A live agent chat then
   * ends as a restart ends one: handlers get the end-of-chat events but can't
   * cancel them. Last, saved session state is cleared, or, when the host owns
   * storage, its `onStateChange` gets the cleared value once.
   *
   * Once the chat has started shutting down, it returns that shutdown and
   * does nothing more.
   */
  destroy(): Promise<void> {
    if (!this.shutdownPromise) {
      this.isShutdown = true;
      this.isDestroyed = true;
      this.shutdownPromise = this.endForGood();
    }
    return this.shutdownPromise;
  }

  private async endForGood() {
    // First, so neither the agent chat's end nor anything later reaches a
    // subscriber or saved state.
    if (this.store) {
      runStep(() => closeStore(this.store));
    }
    runStep(() => this.publicStateService?.destroy());
    // Only a live agent chat waits here; otherwise the rest starts now.
    const ending = runStep(() => this.humanAgentService?.endChatOnDestroy());
    if (ending) {
      try {
        await ending;
      } catch (error) {
        consoleError('A step of the chat shutdown failed.', error);
      }
    }
    await this.stopServices();
    runStep(() => this.clearSavedState());
  }

  /**
   * Clears the namespace's saved session. Storage the host owns is out of
   * reach, so its `onStateChange` gets the cleared value instead.
   */
  private clearSavedState() {
    const { config } = this.store.getState();
    const { persistedState } = config.public;
    const cleared = cloneDeep(DEFAULT_PERSISTED_TO_BROWSER);
    if (persistedState?.initialState || persistedState?.onStateChange) {
      runStep(() =>
        persistedState.onStateChange?.(toPersistableState(cleared))
      );
    } else {
      runStep(() => this.userSessionStorageService?.clearSession());
    }
    runStep(() =>
      humanAgentStateConfig(config.public)?.onStateChange?.(
        cleared.humanAgentState
      )
    );
  }

  private async stopServices() {
    // The steps run back to back, and each runs even if one before it throws.
    if (this.store) {
      runStep(() => closeStore(this.store));
    }
    runStep(() => this.eventBus?.clear());
    // Before anything aborts: an abort listener that ends the agent chat must
    // not reach the real desk.
    runStep(() => this.humanAgentService?.shutdown());
    runStep(() => this.publicStateService?.destroy());
    runStep(() => this.inputActionsService?.abortAllUploads());
    try {
      await runStep(() => this.messageCoordinator?.shutdown());
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
