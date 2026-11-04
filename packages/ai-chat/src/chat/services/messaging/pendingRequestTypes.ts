/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { MessageRequest } from '../../../types/messaging/Messages';
import type { MessageSendSource } from '../../../types/events/eventBusTypes';
import type { SendOptions } from '../../../types/instance/ChatInstance';
import type { ResolvablePromise } from '../../utils/resolvablePromise';

/**
 * Extra data about a message response that we want included in the track event when the response is received.
 */
interface ResponseTrackData {
  /**
   * The amount of time the last request took.
   */
  lastRequestTime: number;

  /**
   * The number of errors that occurred. This does not include JWT errors or session expired errors.
   */
  numErrors: number;

  /**
   * The total time that all the requests took, in milliseconds.
   */
  totalRequestTime: number;
}

interface SendMessageRequest {
  /**
   * The message being sent.
   */
  message: MessageRequest<any>;

  /**
   * The promise to resolve once the send is complete.
   */
  sendMessagePromise: ResolvablePromise<void>;
}

// In order to be able to resolve the correct message in the queue, we pass along the promise we will return with the
// message and call resolve/reject on "resolvablePromise".
export interface PendingMessageRequest extends SendMessageRequest {
  /** Conversation generation in which this request was accepted. */
  generation?: number;

  restartGeneration: number;

  /**
   * The ID of the {@link LocalMessageItem} created from the current request.
   */
  localMessageID: string;

  /**
   * The time the message started the send process. This occurs after the message was in the queue and is now the
   * next message to be sent.
   */
  timeFirstRequest: number;

  /**
   * The time the most recent request started.
   */
  timeLastRequest: number;

  /**
   * The AbortController for when using customSendMessage.
   */
  sendMessageController?: AbortController;

  /**
   * The options that were included when the request was sent.
   */
  requestOptions: SendOptions;

  /**
   * The source of the message.
   */
  source: MessageSendSource;

  /**
   * The tracking data for this message.
   */
  trackData: ResponseTrackData;

  /**
   * Indicates if the response has been processed.
   */
  isProcessed: boolean;

  /**
   * Indicates if this message is streaming and we should wait for FinalResponseChunk before clearing from queue.
   */
  isStreaming?: boolean;
}
