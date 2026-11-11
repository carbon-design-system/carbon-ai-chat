/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import { inputItemData } from '../../../schema/inputItemData';
import { outputItemData } from '../../../schema/outputItemData';
import type {
  GenericItem,
  MessageInputType,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  StructuredData,
} from '../../../../types/messaging/Messages';

class OutgoingMessageService {
  prepareTextRequest(
    text: string,
    id: string,
    timestamp: number,
    threadID: string,
    messageType: MessageInputType.TEXT
  ): MessageRequest {
    return {
      input: { text, message_type: messageType },
      id,
      thread_id: threadID,
      history: { timestamp },
      ui_state_internal: { from_history: false },
    };
  }

  prepareStructuredData(existing: StructuredData, pending: StructuredData) {
    const usedPendingData = Boolean(pending && !existing);
    return {
      usedPendingData,
      structuredData: usedPendingData ? cloneDeep(pending) : undefined,
    };
  }

  originalText(message: MessageRequest): string {
    return message.history?.label || message.input.text;
  }

  prepareLocalItem(
    message: MessageRequest,
    originalUserText: string,
    id: string,
    responseType: MessageResponseTypes.TEXT
  ) {
    const localMessage = inputItemData(
      message,
      originalUserText,
      id,
      responseType
    );
    return { localMessage };
  }

  prepareCancellation(
    title: string,
    id: string,
    timestamp: number,
    threadID: string,
    responseType: MessageResponseTypes.SYSTEM
  ): MessageResponse {
    return this.prepareResponse(
      { response_type: responseType, title },
      id,
      timestamp,
      threadID
    );
  }

  prepareInlineError(
    text: string,
    id: string,
    timestamp: number,
    localID: string,
    threadID: string,
    responseType: MessageResponseTypes.INLINE_ERROR
  ) {
    const originalMessage = this.prepareResponse(
      { response_type: responseType, text },
      id,
      timestamp,
      threadID
    );
    const localMessage = outputItemData(
      originalMessage.output.generic[0],
      originalMessage,
      localID
    );
    return { originalMessage, localMessage };
  }

  prepareResponseItem(
    item: GenericItem,
    message: MessageResponse,
    localID: string
  ) {
    return outputItemData(item, message, localID);
  }

  private prepareResponse(
    item: GenericItem,
    id: string,
    timestamp: number,
    threadID: string
  ): MessageResponse {
    return {
      output: { generic: [item] },
      id,
      thread_id: threadID,
      history: { timestamp },
      ui_state_internal: { from_history: false },
    };
  }

  copyRequest(message: MessageRequest): MessageRequest {
    return cloneDeep(message);
  }
}

export { OutgoingMessageService };
