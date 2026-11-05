/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import { OutgoingMessageService } from './outbound/OutgoingMessageService';
import actions from '../../store/actions';
import {
  selectInputState,
  selectIsInputToHumanAgent,
} from '../../store/selectors';
import { addDefaultsToMessage, THREAD_ID_MAIN } from '../../utils/messageUtils';
import { consoleError } from '../../utils/miscUtils';
import { deepFreeze } from '../../utils/lang/objectUtils';
import { assertNoInFlightUpload } from './assertNoInFlightUpload';
import type { MessagePresentationPort } from './presentationPort';
import { MessageSendSource } from '../../../types/events/eventBusTypes';
import {
  MessageInputType,
  MessageRequest,
  MessageResponseTypes,
} from '../../../types/messaging/Messages';
import { SendOptions } from '../../../types/instance/ChatInstance';
import type { ServiceManager } from '../ServiceManager';

const outgoing = new OutgoingMessageService();

async function coordinateSend(
  serviceManager: ServiceManager,
  presentation: MessagePresentationPort | undefined,
  message: MessageRequest | string,
  source: MessageSendSource,
  options: SendOptions = {},
  ignoreHydration = false
) {
  assertNoInFlightUpload(serviceManager.store.getState());
  const useBuiltInData = !(presentation?.hasCustomPromptLine() ?? false);

  const messageRequest =
    typeof message === 'string'
      ? outgoing.prepareTextRequest(
          message,
          uuid(),
          Date.now(),
          THREAD_ID_MAIN,
          MessageInputType.TEXT
        )
      : message;

  presentation?.announceSending();
  presentation?.requestComposerFocus();

  // Clear any currently active response while awaiting the next one (even before hydration).
  serviceManager.store.dispatch(actions.setActiveResponseId(null));

  presentation?.closeHomeScreenIfOpen();
  presentation?.closeResponsePanelIfOpen();

  if (serviceManager.hydrationService.hydrationPromise || ignoreHydration) {
    if (!ignoreHydration) {
      await serviceManager.hydrationService.hydrationPromise;
    }
  } else {
    // If no hydration has started, then we need to start the hydration and use this message as the alternate for
    // the welcome node.
    presentation?.closeHomeScreen();
    await serviceManager.hydrationService.hydrateChat(messageRequest, options);
  }

  // Re-check: an upload can begin while hydration is awaited above, and the
  // message would otherwise go out without that file's contributed data.
  assertNoInFlightUpload(serviceManager.store.getState());

  await doSend(serviceManager, messageRequest, source, options, useBuiltInData);
}

/**
 * Inner send: fires `pre:send` and `send`, then calls `customSendMessage` via
 * `MessageCoordinator`. Resolves when `customSendMessage` completes or the turn
 * is stopped; rejects when `customSendMessage` throws or the send path fails
 * terminally. Retries are handled upstream by `customSendMessage`.
 */
async function doSend(
  serviceManager: ServiceManager,
  message: MessageRequest,
  source: MessageSendSource,
  options: SendOptions,
  useBuiltInData: boolean
): Promise<void> {
  const { store } = serviceManager;

  addDefaultsToMessage(message);

  if (useBuiltInData) {
    const inputState = selectInputState(store.getState());
    const prepared = outgoing.prepareStructuredData(
      inputState.pendingStructuredData
        ? message.input.structured_data
        : undefined,
      inputState.pendingStructuredData
    );
    if (prepared.usedPendingData) {
      message.input.structured_data = prepared.structuredData;
    }
    store.dispatch(
      actions.clearStructuredData(selectIsInputToHumanAgent(store.getState()))
    );
  }

  // Grab the original text before it can be modified by a pre:send handler.
  const originalUserText = outgoing.originalText(message);

  // If the options object instructs us to create a silent message, update the history object to respect the silent
  // setting. This means that the message will not show in the UI, but will be sent to the API.
  if (options.silent) {
    message.history.silent = true;
  }

  const { localMessage } = outgoing.prepareLocalItem(
    message,
    originalUserText,
    uuid(),
    MessageResponseTypes.TEXT
  );

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

  // Preserve the caller's existing freeze after assigning defaults and adding the message.
  // MessageCoordinator receives a writable copy for pre:send handlers when this request leaves the queue;
  // their accepted edits replace the stored request.
  deepFreeze(message);

  // Fire after dispatch so the slot exists when a host reacts. The event wrapper remains writable,
  // while its message is the original, now-frozen caller object.
  //
  // Deliberately not awaited: the send does not depend on the footer's content, and awaiting would let a host
  // handler that throws, never settles, or sends a message of its own take the send down with it.
  serviceManager.slotEventService
    .handleCustomRequestFooterSlot(localMessage, message)
    .catch((error) => {
      consoleError('A customRequestFooterSlot handler failed.', error);
    });

  await serviceManager.messageCoordinator.enqueueMessage(
    outgoing.copyRequest(message),
    source,
    localMessage.ui_state.id,
    options
  );
}

export { coordinateSend };
