/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';

import { LoadedHistory } from '../schema/historyToMessages';
import actions from '../store/actions';
import {
  DEFAULT_PERSISTED_TO_BROWSER,
  VIEW_STATE_LAUNCHER_OPEN,
} from '../store/reducerUtils';
import { AppState } from '../../types/state/AppState';
import { createWelcomeRequest, isResponse } from '../utils/messageUtils';
import { consoleWarn, debugLog } from '../utils/miscUtils';
import { resetStopStreamingButton } from '../utils/streamingUtils';
import {
  BusEventType,
  MessageSendSource,
} from '../../types/events/eventBusTypes';
import { SendOptions } from '../../types/instance/ChatInstance';
import { MessageRequest } from '../../types/messaging/Messages';
import { OnErrorType } from '../../types/config/ErrorConfig';
import type { ServiceManager } from './ServiceManager';

/**
 * Options for restarting a conversation.
 */
interface RestartConversationOptions {
  /**
   * Indicates if restarting the conversation should skip the hydration of a new conversation.
   */
  skipHydration?: boolean;

  /**
   * Indicates if a conversation with a human agent should be ended. This defaults to true.
   */
  endHumanAgentConversation?: boolean;

  /**
   * Indicates if the "pre:restartConversation" and "restartConversation" events should be fired.
   * This defaults to true.
   */
  fireEvents?: boolean;
}

class HydrationService {
  private serviceManager: ServiceManager;

  /**
   * This Promise is used when hydrating the Carbon AI Chat. If this Promise is defined, then it
   * means that a hydration process has begun and any additional attempts to hydrate can wait for it
   * to resolve.
   */
  hydrationPromise: Promise<void>;

  /**
   * Indicates if we are currently hydrating (the Promise above is unresolved).
   */
  private hydrating = false;

  /**
   * Indicates if a restart is currently in progress.
   */
  private restarting = false;

  /**
   * Indicates if Carbon AI Chat has been hydrated at least once. This is used when a rehydration
   * occurs so that we avoid performing certain operations more than once.
   */
  private alreadyHydrated = false;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Fetch welcome node and (if applicable) history store.
   *
   * @param alternateWelcomeRequest Indicates if a different message should be used as a message
   * requesting the welcome node. This message behaves a little differently from the welcome node in
   * that it's assumed that this message is actively needed. It will bypass the home screen if it is
   * enabled and it was always append this message to the end of any session history that is
   * retrieved.
   * @param alternateOptions The send to send along with the alternate welcome request.
   */
  async hydrateChat(
    alternateWelcomeRequest?: MessageRequest,
    alternateOptions?: SendOptions
  ) {
    // Make sure we only fire this event once after the thread that actually does the hydration is finished.
    let fireReady = false;
    try {
      if (!this.hydrationPromise) {
        this.hydrating = true;
        const generation =
          this.serviceManager.conversationLifecycleService.hydrationStarted();
        this.serviceManager.store.dispatch(actions.addIsHydratingCounter(1));
        this.hydrationPromise = this.doHydrateChat(
          alternateWelcomeRequest,
          alternateOptions,
          generation
        )
          .catch((error) => {
            this.serviceManager.actions.conversationErrorOccurred(
              {
                errorType: OnErrorType.HYDRATION,
                message: 'An error occurred hydrating the conversation',
                otherData: error,
              },
              generation
            );
          })
          .finally(() => {
            if (
              this.serviceManager.conversationLifecycleService.isCurrent(
                generation
              )
            ) {
              this.serviceManager.store.dispatch(actions.chatWasHydrated());
              this.alreadyHydrated = true;
            }
            this.serviceManager.store.dispatch(
              actions.addIsHydratingCounter(-1)
            );
            this.serviceManager.conversationLifecycleService.hydrationFinished(
              generation
            );
          });
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
   * @param alternateWelcomeRequest Indicates if a different message should be used as a message
   * requesting the welcome node. This message behaves a little differently from the welcome node in
   * that it's assumed that this message is actively needed. It will bypass the home screen if it is
   * enabled and it was always append this message to the end of any session history that is
   * retrieved.
   * @param alternateOptions The options to send along with the alternate welcome request.
   */
  private async doHydrateChat(
    alternateWelcomeRequest?: MessageRequest,
    alternateOptions?: SendOptions,
    generation = this.serviceManager.conversationLifecycleService
      .currentGeneration
  ) {
    debugLog(
      'Hydrating Carbon AI Chat',
      alternateWelcomeRequest,
      alternateOptions
    );

    const { serviceManager } = this;
    const history = await this.loadInitialHistory(generation);
    if (!serviceManager.conversationLifecycleService.isCurrent(generation)) {
      return;
    }

    const { config } = serviceManager.store.getState();

    if (!history) {
      await this.applyEmptyHistory(alternateWelcomeRequest);
    } else {
      await this.applyLoadedHistory(history);
    }

    // Note, we're not waiting for the human agent service to handle the hydration. It may start an asynchronous
    // process to reconnect the user to an agent but that is considered separate from the main hydration.
    const allowReconnect = config.public.serviceDesk.allowReconnect ?? true;
    this.serviceManager?.humanAgentService?.handleHydration(
      allowReconnect,
      Boolean(history)
    );
  }

  private async loadInitialHistory(generation: number): Promise<LoadedHistory> {
    if (this.alreadyHydrated) {
      return null;
    }

    const { serviceManager } = this;
    const history = await serviceManager.historyService.loadHistory();
    if (!serviceManager.conversationLifecycleService.isCurrent(generation)) {
      return history;
    }

    const humanAgentService = serviceManager.humanAgentService;
    if (!humanAgentService || humanAgentService.hasInitialized) {
      debugLog('No service desk integrations present');
      return history;
    }

    debugLog('Initializing the human agent service');
    await humanAgentService.initialize();
    return history;
  }

  private async applyEmptyHistory(
    alternateWelcomeRequest?: MessageRequest
  ): Promise<void> {
    if (alternateWelcomeRequest) {
      return;
    }

    const { serviceManager } = this;
    const state = serviceManager.store.getState();
    if (state.config.public.homescreen?.isOn) {
      serviceManager.store.dispatch(actions.setHomeScreenIsOpen(true));
      return;
    }
    if (
      state.config.public.messaging?.skipWelcome ||
      this.shouldSkipWelcomeForAgentSession(state)
    ) {
      return;
    }

    const welcomeRequest = createWelcomeRequest();
    try {
      await serviceManager.actions.send(
        welcomeRequest,
        MessageSendSource.WELCOME_REQUEST,
        {},
        true
      );
    } catch (error) {
      if (
        serviceManager.store.getState().conversationError?.messageID !==
        welcomeRequest.id
      ) {
        throw error;
      }
    }
  }

  private async applyLoadedHistory(history: LoadedHistory): Promise<void> {
    const { serviceManager } = this;
    serviceManager.store.dispatch(
      actions.hydrateMessageHistory(history.messageHistory)
    );
    const { messageIDs } = history.messageHistory.assistantMessageState;
    const lastId = messageIDs[messageIDs.length - 1];
    const lastMessage = lastId
      ? history.messageHistory.allMessagesByID[lastId]
      : null;
    serviceManager.store.dispatch(
      actions.setActiveResponseId(
        lastMessage && isResponse(lastMessage) ? lastMessage.id : null
      )
    );
    await serviceManager.actions.createElementsForUserDefinedResponses(
      history.messageHistory
    );
    await serviceManager.actions.replayFooterSlots(history.messageHistory);

    if (history.latestPanelLocalMessageItem) {
      serviceManager.actions.openResponsePanel(
        history.latestPanelLocalMessageItem,
        true
      );
    }
  }

  /**
   * Restarts the conversation with the assistant. This does not make any changes to a conversation
   * with a human agent. This will clear all the current assistant messages from the main assistant
   * view and cancel any outstanding messages. Lastly, this will clear the current assistant session
   * which will force a new session to start on the next message.
   */
  async restartConversation(options: RestartConversationOptions = {}) {
    const {
      skipHydration = false,
      endHumanAgentConversation = true,
      fireEvents = true,
    } = options;

    debugLog('Restarting conversation');

    if (this.restarting) {
      consoleWarn(
        'You cannot restart a conversation while a previous restart is still pending.'
      );
      return;
    }

    this.restarting = true;
    this.serviceManager.messageUpsertCoordinator.clearAll();

    try {
      const { serviceManager } = this;
      const { store } = serviceManager;
      const state = store.getState();

      if (fireEvents) {
        await serviceManager.fire({
          type: BusEventType.PRE_RESTART_CONVERSATION,
        });
      }

      const restartGeneration =
        serviceManager.conversationLifecycleService.restart(skipHydration);

      // Increment the restart generation to filter out any chunks from the previous conversation
      this.serviceManager.chunkProcessingService.bumpRestartGeneration();

      this.serviceManager.streamAnnouncerService.clearAll();

      // Mark all existing messages as belonging to the OLD generation by keeping them in the map
      // (don't clear - this way we can detect stale chunks from old messages)

      // Set isRestarting to true to signal that we're in the middle of a restart
      store.dispatch(actions.setIsRestarting(true));

      serviceManager.restartCount++;

      if (
        state.config.public.messaging.messageLoadingIndicatorTimeoutSecs !== 0
      ) {
        store.dispatch(actions.resetIsLoadingCounter());
      }

      if (this.hydrating) {
        await this.hydrationPromise;
      }

      const currentState = store.getState();

      // If we're connected to an agent, we need to end the agent chat.
      const { isConnecting } = currentState.humanAgentState;
      const { isConnected } =
        currentState.persistedToBrowserStorage.humanAgentState;

      if ((isConnected || isConnecting) && endHumanAgentConversation) {
        await serviceManager.humanAgentService.endChat(true, false, false);
      }

      await this.serviceManager.messageService.cancelAllMessageRequests();

      // Hide the stop streaming button since we've canceled all streams. Unconditional
      // on purpose — everything was just canceled, so there is no other stream to keep
      // it visible for.
      resetStopStreamingButton(store);

      store.dispatch(actions.restartConversation());
      if (!skipHydration) {
        // Clear this promise in case the restart event below triggers another hydration.
        this.hydrationPromise = null;
      }

      if (fireEvents) {
        await serviceManager.fire({ type: BusEventType.RESTART_CONVERSATION });
      }

      if (this.hydrating) {
        await this.hydrationPromise;
      }

      let didHydrate = false;
      if (!skipHydration && !serviceManager.store.getState().isHydrated) {
        // Trigger re-hydration.
        this.hydrationPromise = null;
        if (store.getState().persistedToBrowserStorage.viewState.mainWindow) {
          didHydrate = true;
          await serviceManager.actions.hydrateChat();
        }
      } else {
        store.dispatch(actions.chatWasHydrated());
      }
      if (!didHydrate) {
        serviceManager.conversationLifecycleService.hydrationFinished(
          restartGeneration
        );
      }
    } finally {
      this.restarting = false;
      // Clear isRestarting flag to allow new messages and chunks to be processed
      this.serviceManager.store.dispatch(actions.setIsRestarting(false));
    }
  }

  /**
   * Remove any record of the current session from the browser's SessionStorage.
   *
   * @param keepOpenState We can optionally just keep around if the chat is currently open or not.
   */
  async destroySession(keepOpenState: boolean) {
    const { store } = this.serviceManager;
    const { persistedToBrowserStorage } = store.getState();
    const originalViewState = persistedToBrowserStorage.viewState;
    const newPersistedToBrowserStorage = cloneDeep(
      DEFAULT_PERSISTED_TO_BROWSER
    );

    if (keepOpenState) {
      // If we want to keep the open state then copy it from browser storage.
      newPersistedToBrowserStorage.viewState = originalViewState;
    } else {
      // If we don't want to keep the open state then set the launcher to be open.
      newPersistedToBrowserStorage.viewState = VIEW_STATE_LAUNCHER_OPEN;
    }
    this.serviceManager.messageService.cancelAllMessageRequests();

    this.serviceManager.messageUpsertCoordinator.clearAll();

    // When the host owns persistence there is no sessionStorage to clear; the state reset dispatched
    // below flows to its onStateChange callback like any other change.
    const { persistedState } = store.getState().config.public;
    if (!persistedState?.initialState && !persistedState?.onStateChange) {
      this.serviceManager.userSessionStorageService.clearSession();
    }

    this.serviceManager.store.dispatch(
      actions.setAppStateValue(
        'persistedToBrowserStorage',
        newPersistedToBrowserStorage
      )
    );
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
}

export { HydrationService };
