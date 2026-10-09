/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';

import inputItemToLocalItem from '../schema/inputItemToLocalItem';
import actions from '../store/actions';
import {
  selectInputState,
  selectIsInputToHumanAgent,
} from '../store/selectors';
import {
  addDefaultsToMessage,
  createMessageRequestForText,
} from '../utils/messageUtils';
import { consoleError } from '../utils/miscUtils';
import { deepFreeze } from '../utils/lang/objectUtils';
import {
  hasCustomPromptLine,
  requestComposerFocus,
} from '../utils/customPromptLine';
import { MessageSendSource } from '../../types/events/eventBusTypes';
import { MessageRequest } from '../../types/messaging/Messages';
import { SendOptions } from '../../types/instance/ChatInstance';
import type { ServiceManager } from './ServiceManager';

class SendService {
  private serviceManager: ServiceManager;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Sends the given message to the assistant. Fires `pre:send` then `send` on
   * the event bus before delegating to `customSendMessage`. Resolves when
   * `customSendMessage` completes or when the turn is stopped; rejects when
   * `customSendMessage` throws, when the send path fails terminally, or when a
   * file upload is still in progress.
   *
   * @param message The message to send.
   * @param source The source of the message.
   * @param options Options for the sent message.
   * @param [ignoreHydration=false]
   */
  async send(
    message: MessageRequest | string,
    source: MessageSendSource,
    options: SendOptions = {},
    ignoreHydration = false
  ) {
    this.serviceManager.inputActionsService.assertNoInFlightUpload();
    const useBuiltInData = !hasCustomPromptLine(this.serviceManager);

    const messageRequest =
      typeof message === 'string'
        ? createMessageRequestForText(message)
        : message;

    // Announce that the message is being sent for screen reader users
    if (this.serviceManager.ariaAnnouncer) {
      const languagePack = this.serviceManager.store.getState().languagePack;
      this.serviceManager.ariaAnnouncer(languagePack.input_sendingMessage);
    }

    requestComposerFocus(this.serviceManager);

    // Clear any currently active response while awaiting the next one (even before hydration).
    this.serviceManager.store.dispatch(actions.setActiveResponseId(null));

    // If the home screen is open, we want to close it as soon as a message is sent. Note that this will also apply
    // if the Carbon AI Chat hasn't been opened yet.
    if (
      this.serviceManager.store.getState().persistedToBrowserStorage
        .homeScreenState.isHomeScreenOpen
    ) {
      this.serviceManager.store.dispatch(actions.setHomeScreenIsOpen(false));
    }

    // If the response panel is open, it should be closed on every message sent.
    if (this.serviceManager.store.getState().responsePanelState.isOpen) {
      this.serviceManager.store.dispatch(actions.setResponsePanelIsOpen(false));
    }

    if (
      this.serviceManager.hydrationService.hydrationPromise ||
      ignoreHydration
    ) {
      if (!ignoreHydration) {
        await this.serviceManager.hydrationService.hydrationPromise;
      }
    } else {
      // If no hydration has started, then we need to start the hydration and use this message as the alternate for
      // the welcome node.
      this.serviceManager.store.dispatch(actions.setHomeScreenIsOpen(false));
      await this.serviceManager.hydrationService.hydrateChat(
        messageRequest,
        options
      );
    }

    // Re-check: an upload can begin while hydration is awaited above, and the
    // message would otherwise go out without that file's contributed data.
    this.serviceManager.inputActionsService.assertNoInFlightUpload();

    await this.doSend(messageRequest, source, options, useBuiltInData);
  }

  /**
   * Inner send: fires `pre:send` and `send`, then calls `customSendMessage` via
   * `MessageService`. Resolves when `customSendMessage` completes or the turn
   * is stopped; rejects when `customSendMessage` throws or the send path fails
   * terminally. Retries are handled upstream by `customSendMessage`.
   *
   * @param message The message to send.
   * @param source The source of the message.
   * @param options Options for sending the message.
   */
  private async doSend(
    message: MessageRequest,
    source: MessageSendSource,
    options: SendOptions,
    useBuiltInData: boolean
  ): Promise<void> {
    const { store } = this.serviceManager;

    addDefaultsToMessage(message);

    if (useBuiltInData) {
      const inputState = selectInputState(store.getState());
      if (inputState.pendingStructuredData && !message.input.structured_data) {
        message.input.structured_data = cloneDeep(
          inputState.pendingStructuredData
        );
      }
      store.dispatch(
        actions.clearStructuredData(selectIsInputToHumanAgent(store.getState()))
      );
    }

    // Grab the original text before it can be modified by a pre:send handler.
    const originalUserText = message.history?.label || message.input.text;

    // If the options object instructs us to create a silent message, update the history object to respect the silent
    // setting. This means that the message will not show in the UI, but will be sent to the API.
    if (options.silent) {
      message.history.silent = true;
    }

    const localMessage = inputItemToLocalItem(message, originalUserText);

    // If history.silent is set to true, we don't add the message to the redux store as we do not want to show it.
    // Likewise, in schema/historyToMessages, if the message is coming from the history store, we do not add it to redux
    // either.
    if (!message.history.silent) {
      store.dispatch(actions.addLocalMessageItem(localMessage, message, true));
    } else {
      store.dispatch(actions.addMessage(message));
    }

    // This message is coming from an option/suggestion response type, and we need to let the previous message that
    // displayed the options which item should be marked in state as selected.
    if (options.setValueSelectedForMessageID) {
      store.dispatch(
        actions.messageSetOptionSelected(
          options.setValueSelectedForMessageID,
          message
        )
      );
    }

    // Now freeze the message so nobody can mess with it since that object came from outside. We'll then create a
    // clone of this message so that it may be modifiable by a pre:send listener when the message is ready to be
    // sent (which may happen later if other messages are in the queue). We'll have to replace our store object once
    // that happens.
    deepFreeze(message);

    // Fired after the dispatch above so the slot element exists by the time a host reacts, and after the freeze so
    // the host gets a read-only object rather than a live store reference.
    //
    // Deliberately not awaited: the send does not depend on the footer's content, and awaiting would let a host
    // handler that throws, never settles, or sends a message of its own take the send down with it.
    this.serviceManager.slotEventService
      .handleCustomRequestFooterSlot(localMessage, message)
      .catch((error) => {
        consoleError('A customRequestFooterSlot handler failed.', error);
      });

    await this.serviceManager.messageService.send(
      cloneDeep(message),
      source,
      localMessage.ui_state.id,
      options
    );
  }
}

export { SendService };
