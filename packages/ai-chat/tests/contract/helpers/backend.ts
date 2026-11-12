/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  Message,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  TextItem,
} from '../../../src/aiChatEntry';

/** One call the chat made to `customSendMessage`. */
export interface SentRequest {
  request: MessageRequest;
  options: CustomSendMessageOptions;
  instance: ChatInstance;
  /** Settles the call's promise. */
  resolve: () => void;
  /** Rejects the call's promise. */
  reject: (error: unknown) => void;
}

/** A host's `customSendMessage` that a test answers by hand. */
export interface FakeBackend {
  /** Pass this as `messaging.customSendMessage`. */
  customSendMessage: (
    request: MessageRequest,
    options: CustomSendMessageOptions,
    instance: ChatInstance
  ) => Promise<void>;
  /** Every call so far, oldest first. */
  readonly requests: SentRequest[];
  /** Resolves with the next call, or the first one not yet taken. */
  next(): Promise<SentRequest>;
  /** Text of each request so far. */
  texts(): string[];
}

/**
 * A `customSendMessage` that records each call and leaves its promise open
 * until the test settles it. Set `autoResolve` to settle each call at once.
 */
export function fakeBackend({
  autoResolve = false,
}: { autoResolve?: boolean } = {}): FakeBackend {
  const requests: SentRequest[] = [];
  let taken = 0;
  const waiters: ((request: SentRequest) => void)[] = [];

  const customSendMessage: FakeBackend['customSendMessage'] = (
    request,
    options,
    instance
  ) =>
    new Promise<void>((resolve, reject) => {
      const sent: SentRequest = { request, options, instance, resolve, reject };
      requests.push(sent);
      if (autoResolve) {
        resolve();
      }
      const waiter = waiters.shift();
      if (waiter) {
        taken += 1;
        waiter(sent);
      }
    });

  return {
    customSendMessage,
    requests,
    next: () => {
      if (taken < requests.length) {
        const sent = requests[taken];
        taken += 1;
        return Promise.resolve(sent);
      }
      return new Promise((resolve) => waiters.push(resolve));
    },
    texts: () => requests.map((sent) => sent.request.input?.text),
  };
}

/** A complete text response. */
export function textResponse(
  text: string,
  id?: string,
  extra: Partial<MessageResponse> = {}
): MessageResponse {
  return {
    ...(id ? { id } : {}),
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text }],
    },
    ...extra,
  } as MessageResponse;
}

/** The text of every text item in a message's output (none for a request). */
export function outputTexts(message: Message | MessageResponse): string[] {
  const generic = 'output' in message ? (message.output?.generic ?? []) : [];
  return generic
    .filter((item) => item.response_type === MessageResponseTypes.TEXT)
    .map((item) => (item as TextItem).text);
}
