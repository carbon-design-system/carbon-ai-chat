/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessagePresentationAdapter } from '../../../src/chat/services/messaging/presentation/MessagePresentationAdapter';
import { StreamAnnouncerService } from '../../../src/chat/services/messaging/presentation/StreamAnnouncerService';

function capabilities() {
  return {
    hasCustomPromptLine: () => false,
    announceSending: jest.fn(),
    requestComposerFocus: () => false,
    isHomeScreenOpen: () => false,
    closeHomeScreen: jest.fn(),
    isResponsePanelOpen: () => false,
    closeResponsePanel: jest.fn(),
  };
}

it('resolves the current scroll handle separately for capture and restore', () => {
  let handle:
    | {
        getMessagesScrollBottom(): number;
        doAutoScroll(value: { scrollToBottom: number | undefined }): void;
      }
    | undefined;
  const adapter = new MessagePresentationAdapter({
    ...capabilities(),
    getMessagesScrollBottom: () => handle?.getMessagesScrollBottom(),
    restoreMessagesScroll: (scrollBottom) =>
      handle?.doAutoScroll({ scrollToBottom: scrollBottom }),
  });
  expect(adapter.getMessagesScrollBottom()).toBeUndefined();
  adapter.restoreMessagesScroll(undefined);
  const oldRestore = jest.fn();
  handle = { getMessagesScrollBottom: () => 12, doAutoScroll: oldRestore };
  const bottom = adapter.getMessagesScrollBottom();
  const newRestore = jest.fn();
  handle = { getMessagesScrollBottom: () => 99, doAutoScroll: newRestore };
  adapter.restoreMessagesScroll(bottom);
  expect(oldRestore).not.toHaveBeenCalled();
  expect(newRestore).toHaveBeenCalledWith({ scrollToBottom: 12 });
  handle = undefined;
  adapter.restoreMessagesScroll(bottom);
  expect(newRestore).toHaveBeenCalledTimes(1);
});

it('deduplicates shared stream announcements and preserves reentrant ordering', () => {
  const events: string[] = [];
  let speaker = 'first';
  const service = new StreamAnnouncerService({
    announceStreamStart: (id, key) => {
      events.push(`${id}:${key}:${speaker}`);
      if (key === 'messages_reasoningStart') {
        speaker = 'second';
        service.announceStreamStarts(id, {
          hasReasoning: true,
          hasDisplayableContent: true,
        });
      }
    },
  });
  const adapter = new MessagePresentationAdapter({
    ...capabilities(),
    announceStreamStarts: (id, content) =>
      service.announceStreamStarts(id, content),
  });
  adapter.announceStreamStarts('message', {
    hasReasoning: true,
    hasDisplayableContent: true,
  });
  expect(events).toEqual([
    'message:messages_reasoningStart:first',
    'message:messages_streamingStart:second',
  ]);
  service.announceStreamStarts('message', {
    hasReasoning: true,
    hasDisplayableContent: true,
  });
  expect(events).toHaveLength(2);
  service.clearAll();
  adapter.announceStreamStarts('message', {
    hasReasoning: false,
    hasDisplayableContent: true,
  });
  expect(events).toHaveLength(3);
});

it('keeps view operations optional and forwards send failure without message access', () => {
  const absent = new MessagePresentationAdapter(capabilities());
  absent.announceSendFailure();
  absent.announceStreamStarts('message', {
    hasReasoning: true,
    hasDisplayableContent: true,
  });
  const announce = jest.fn();
  const adapter = new MessagePresentationAdapter({
    ...capabilities(),
    announceSendFailure: announce,
  });
  adapter.announceSendFailure();
  expect(announce).toHaveBeenCalledTimes(1);
  expect(announce).toHaveBeenCalledWith();
});
