/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ServiceManager } from "./ServiceManager";
import actions from "../store/actions";
import { debugLog } from "../utils/miscUtils";
import { createWelcomeRequest } from "../utils/messageUtils";
import {
  BusEventType,
  MessageSendSource,
} from "../../types/events/eventBusTypes";
import { MessageRequest } from "../../types/messaging/Messages";
import { SendOptions } from "../../types/instance/ChatInstance";
import { AppState } from "../../types/state/AppState";
import { AppConfig } from "../../types/state/AppConfig";
import { LoadedHistory } from "../schema/historyToMessages";

/**
 * Service responsible for hydrating the chat application on initialization.
 * Handles loading history, welcome messages, and session restoration.
 */
export class HydrationService {
  private serviceManager: ServiceManager;

  /**
   * This Promise is used when hydrating the Carbon AI Chat. If this Promise is defined, then it means that a hydration
   * process has begun and any additional attempts to hydrate can wait for it to resolve.
   */
  private hydrationPromise: Promise<void>;

  /**
   * Indicates if we are currently hydrating (the Promise above is unresolved).
   */
  private hydrating = false;

  /**
   * Indicates if Carbon AI Chat has been hydrated at least once. This is used when a rehydration occurs so that we avoid
   * performing certain operations more than once.
   */
  private alreadyHydrated = false;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Returns true if hydration is currently in progress.
   */
  isHydrating() {
    return this.hydrating;
  }

  /**
   * Fetch welcome node and (if applicable) history store.
   *
   * @param alternateWelcomeRequest Indicates if a different message should be used as a message requesting the
   * welcome node. This message behaves a little differently from the welcome node in that it's assumed that this
   * message is actively needed. It will bypass the home screen if it is enabled and it was always append this
   * message to the end of any session history that is retrieved.
   * @param alternateWelcomeRequestSource The source of the alternate welcome message.
   * @param alternateOptions The send to send along with the alternate welcome request.
   */
  async hydrateChat(
    alternateWelcomeRequest?: MessageRequest,
    alternateWelcomeRequestSource?: MessageSendSource,
    alternateOptions?: SendOptions,
  ) {
    // Make sure we only fire this event once after the thread that actually does the hydration is finished.
    let fireReady = false;
    try {
      if (!this.hydrationPromise) {
        this.hydrating = true;
        this.hydrationPromise = this.doHydrateChat(
          alternateWelcomeRequest,
          alternateWelcomeRequestSource,
          alternateOptions,
        );
        fireReady = true;
      }

      await this.hydrationPromise;
    } finally {
      this.hydrating = false;
    }

    if (fireReady) {
      await this.serviceManager.fire({ type: BusEventType.CHAT_READY });
    }
  }

  /**
   * Fetch welcome node and (if applicable) history.
   *
   * @param alternateWelcomeRequest Indicates if a different message should be used as a message requesting the
   * welcome node. This message behaves a little differently from the welcome node in that it's assumed that this
   * message is actively needed. It will bypass the home screen if it is enabled and it was always append this
   * message to the end of any session history that is retrieved.
   * @param alternateWelcomeRequestSource The source of the alternate welcome message.
   * @param alternateOptions The options to send along with the alternate welcome request.
   */
  /**
   * Hydrates the chat application by loading history, initializing services, and optionally sending a welcome message.
   *
   * The hydration flow:
   * 1. Loads conversation history and initializes the human agent service (if first time hydrating)
   * 2. If no history exists, shows the home screen or sends a welcome request
   * 3. If history exists, populates the message history and creates user-defined response elements
   * 4. Marks the chat as hydrated and triggers human agent reconnection if configured
   *
   * @param alternateWelcomeRequest Optional alternate welcome request to use instead of the default welcome node.
   * @param alternateWelcomeRequestSource The source of the alternate welcome message.
   * @param alternateOptions The options to send along with the alternate welcome request.
   */
  private async doHydrateChat(
    alternateWelcomeRequest?: MessageRequest,
    alternateWelcomeRequestSource?: MessageSendSource,
    alternateOptions?: SendOptions,
  ) {
    debugLog(
      "Hydrating Carbon AI Chat",
      alternateWelcomeRequest,
      alternateWelcomeRequestSource,
      alternateOptions,
    );

    const { serviceManager } = this;
    serviceManager.store.dispatch(actions.addIsHydratingCounter(1));

    // Load the history and main config but only if it's the first time we are hydrating.
    const history = await this.loadAndProcessHistory();

    const { config } = serviceManager.store.getState();

    if (!history) {
      await this.handleWelcomeNode(alternateWelcomeRequest, config);
    } else {
      await this.processLoadedHistory(history);
    }

    await this.finalizeHydration(history, config);
  }

  /**
   * Loads conversation history and initializes the human agent service if this is the first hydration.
   *
   * @returns The loaded history, or undefined if already hydrated or no history exists
   */
  private async loadAndProcessHistory(): Promise<LoadedHistory | undefined> {
    if (this.alreadyHydrated) {
      return undefined;
    }

    const { serviceManager } = this;
    const history = await serviceManager.historyService.loadHistory();

    if (serviceManager.humanAgentService) {
      // Once we've got the main config which contains the details for connecting to a service desk, we can
      // initialize the human agent service.
      debugLog("Initializing the human agent service");
      await serviceManager.humanAgentService.initialize();
    } else {
      debugLog("No service desk integrations present");
    }

    return history;
  }

  /**
   * Handles the welcome node logic when no history is loaded.
   * Shows the home screen if configured, otherwise sends a welcome request if not skipped.
   *
   * @param alternateWelcomeRequest Optional alternate welcome request
   * @param config The application configuration
   */
  private async handleWelcomeNode(
    alternateWelcomeRequest: MessageRequest | undefined,
    config: AppConfig,
  ): Promise<void> {
    if (alternateWelcomeRequest) {
      return;
    }

    const { serviceManager } = this;
    const state = serviceManager.store.getState();

    if (state.config.public.homescreen?.isOn) {
      // If no history was loaded, there are no messages already sent, and there is a home screen,
      // then we need to show the home screen.
      serviceManager.store.dispatch(actions.setHomeScreenIsOpen(true));
    } else if (
      !config.public.messaging?.skipWelcome &&
      !this.shouldSkipWelcomeForAgentSession(state)
    ) {
      // If no history was loaded, there are no messages already sent, there is no home screen, and the user is not
      // currently or previously in an agent session, then we need to fetch the welcome node.
      await serviceManager.actions.send(
        createWelcomeRequest(),
        MessageSendSource.WELCOME_REQUEST,
        {},
        true,
      );
    }
  }

  /**
   * Processes loaded history by populating the message history in the store
   * and creating elements for user-defined responses.
   *
   * @param history The loaded conversation history
   */
  private async processLoadedHistory(history: LoadedHistory): Promise<void> {
    const { serviceManager } = this;

    // Need to populate the history in the store (specifically botMessageState) before creating elements for custom
    // responses. createElementsForUserDefinedResponse() fires a userDefinedResponse event.
    serviceManager.store.dispatch(
      actions.hydrateMessageHistory(history.messageHistory),
    );
    await serviceManager.userDefinedResponseService.createElementsForUserDefinedResponses(
      history.messageHistory,
    );
  }

  /**
   * Finalizes the hydration process by marking the chat as hydrated,
   * decrementing the hydration counter, and triggering human agent reconnection.
   *
   * @param history The loaded history (if any)
   * @param config The application configuration
   */
  private async finalizeHydration(
    history: LoadedHistory | undefined,
    config: AppConfig,
  ): Promise<void> {
    const { serviceManager } = this;

    // After both history and welcome are loaded indicate we've got everything.
    serviceManager.store.dispatch(actions.chatWasHydrated());
    serviceManager.store.dispatch(actions.addIsHydratingCounter(-1));

    // Note, we're not waiting for the human agent service to handle the hydration. It may start an asynchronous
    // process to reconnect the user to an agent but that is considered separate from the main hydration.
    const allowReconnect = config.public.serviceDesk.allowReconnect ?? true;
    this.serviceManager?.humanAgentService?.handleHydration(
      allowReconnect,
      Boolean(history),
    );

    this.alreadyHydrated = true;
  }

  /**
   * Determines if welcome messages should be skipped due to current or previous agent sessions.
   * This prevents welcome messages when:
   * 1. User is currently connected to an agent
   * 2. User was previously connected to an agent (even if reconnection failed)
   *
   * @param state The current application state
   * @returns true if welcome messages should be skipped, false otherwise
   */
  private shouldSkipWelcomeForAgentSession(state: AppState): boolean {
    const { humanAgentState } = state.persistedToBrowserStorage;

    // Skip welcome if currently connected to an agent
    if (humanAgentState.isConnected) {
      return true;
    }

    // Skip welcome if there was a previous agent session (indicated by having a responseUserProfile)
    // This handles cases where reconnection failed or isn't supported
    if (humanAgentState.responseUserProfile) {
      return true;
    }

    // Skip welcome if there's persisted service desk state, indicating a previous session
    if (humanAgentState.serviceDeskState) {
      return true;
    }

    return false;
  }

  /**
   * Clears the hydration promise to allow re-hydration.
   */
  clearHydrationPromise() {
    this.hydrationPromise = null;
  }

  /**
   * Returns the current hydration promise if one exists.
   */
  getHydrationPromise() {
    return this.hydrationPromise;
  }
}
