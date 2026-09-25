/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { AriaAnnouncer } from '../../../src/chat/services/ariaAnnouncer';
import type { AnnounceMessage } from '../../../src/types/state/AnnounceMessage';

const mockAnnounce = jest.fn();
const mockDisconnect = jest.fn();
const mockMount = jest.fn();

jest.mock(
  '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js',
  () => ({
    mountAriaAnnouncer: (...args: unknown[]) => mockMount(...args),
  })
);

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

function createHarness() {
  let announceMessage: AnnounceMessage;
  const listeners = new Set<() => void>();
  const store = {
    getState: () => ({ announceMessage }),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const formatter = jest.fn(({ id }, values) => `${id}:${values?.name}`);
  const announcer = new AriaAnnouncer(store, formatter);
  const container = document.createElement('div');
  return {
    announcer,
    container,
    formatter,
    listeners,
    publish(message: AnnounceMessage) {
      announceMessage = message;
      listeners.forEach((listener) => listener());
    },
  };
}

function createPendingMarkdown() {
  const node = document.createElement('cds-aichat-markdown');
  let resolve: () => void;
  Object.defineProperty(node, 'updateComplete', {
    value: new Promise<void>((done) => {
      resolve = done;
    }),
  });
  return { node, finish: () => resolve() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMount.mockReturnValue({
    announce: mockAnnounce,
    disconnect: mockDisconnect,
  });
});

describe('AriaAnnouncer', () => {
  it('connects once and releases its regions and store subscription', () => {
    const { announcer, container, listeners } = createHarness();
    expect(mockMount).not.toHaveBeenCalled();
    expect(listeners.size).toBe(0);
    announcer.connect(container);
    announcer.connect(container);
    expect(mockMount).toHaveBeenCalledTimes(1);
    expect(mockMount).toHaveBeenCalledWith(container, {
      politeCount: 3,
      assertiveCount: 2,
    });
    expect(listeners.size).toBe(1);
    announcer.disconnect();
    announcer.disconnect();
    expect(listeners.size).toBe(0);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('batches polite calls made before the initial connection', async () => {
    const { announcer, container } = createHarness();
    announcer.announce('first');
    announcer.announce('second');
    announcer.connect(container);
    await flushMicrotasks();
    expect(mockAnnounce).toHaveBeenCalledTimes(1);
    expect(mockAnnounce).toHaveBeenCalledWith('first second', 'polite');
    announcer.disconnect();
  });

  it('formats localized messages and keeps assertive batching separate', async () => {
    const { announcer, container, formatter } = createHarness();
    announcer.connect(container);
    announcer.announce('polite');
    announcer.announce({
      messageID: 'messages_assistantSaid',
      messageValues: { name: 'Watson' },
      assertive: true,
    });
    announcer.announce({ messageText: 'error', assertive: true });
    await flushMicrotasks();
    expect(formatter).toHaveBeenCalledWith(
      { id: 'messages_assistantSaid' },
      { name: 'Watson' }
    );
    expect(mockAnnounce).toHaveBeenCalledWith(
      'messages_assistantSaid:Watson error',
      'assertive'
    );
    expect(mockAnnounce).toHaveBeenCalledWith('polite', 'polite');
    announcer.setFormatter(() => 'translated');
    announcer.announce({ messageID: 'messages_assistantSaid' });
    await flushMicrotasks();
    expect(mockAnnounce).toHaveBeenLastCalledWith('translated', 'polite');
    expect(mockMount).toHaveBeenCalledTimes(1);
    announcer.disconnect();
  });

  it('deduplicates store messages across unrelated changes and reconnects', async () => {
    const { announcer, container, publish } = createHarness();
    const message = { messageText: 'stored message' };
    announcer.connect(container);
    publish(message);
    await flushMicrotasks();
    publish(message);
    announcer.disconnect();
    announcer.connect(container);
    publish(message);
    await flushMicrotasks();
    expect(mockAnnounce).toHaveBeenCalledTimes(1);
    publish({ ...message });
    await flushMicrotasks();
    expect(mockAnnounce).toHaveBeenCalledTimes(2);
    announcer.disconnect();
  });

  it('waits for markdown before extracting the rendered text', async () => {
    const { announcer, container } = createHarness();
    const { node, finish } = createPendingMarkdown();
    announcer.connect(container);
    announcer.announce(node);
    await flushMicrotasks();
    expect(mockAnnounce).not.toHaveBeenCalled();
    node.textContent = 'rendered markdown';
    finish();
    await flushMicrotasks();
    expect(mockAnnounce).toHaveBeenCalledWith('rendered markdown', 'polite');
    announcer.disconnect();
  });

  it('discards queued microtasks without consuming the new connection queue', async () => {
    const { announcer, container } = createHarness();
    announcer.connect(container);
    announcer.announce('old polite');
    announcer.announce({ messageText: 'old assertive', assertive: true });
    announcer.disconnect();
    announcer.connect(container);
    announcer.announce('new polite');
    announcer.announce({ messageText: 'new assertive', assertive: true });
    await flushMicrotasks();
    expect(mockAnnounce).toHaveBeenCalledTimes(2);
    expect(mockAnnounce).toHaveBeenCalledWith('new polite', 'polite');
    expect(mockAnnounce).toHaveBeenCalledWith('new assertive', 'assertive');
    announcer.disconnect();
  });

  it('discards markdown work that completes after disconnect and reconnect', async () => {
    const { announcer, container } = createHarness();
    const { node, finish } = createPendingMarkdown();
    announcer.connect(container);
    announcer.announce(node);
    await flushMicrotasks();
    announcer.disconnect();
    announcer.connect(container);
    announcer.announce('new connection');
    node.textContent = 'stale markdown';
    finish();
    await flushMicrotasks();
    expect(mockAnnounce).toHaveBeenCalledTimes(1);
    expect(mockAnnounce).toHaveBeenCalledWith('new connection', 'polite');
    announcer.disconnect();
  });
});
