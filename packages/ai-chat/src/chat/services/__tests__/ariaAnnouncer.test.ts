/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { AriaAnnouncer } from '../ariaAnnouncer';
import type { AnnounceMessage } from '../../../types/state/AnnounceMessage';

const mockAnnounce = vi.fn();
const mockDisconnect = vi.fn();
const mockMount = vi.fn();

vi.mock(
  '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js',
  () => ({
    mountAriaAnnouncer: (...args: unknown[]) => mockMount(...args),
  })
);

function createHarness() {
  let announceMessage: AnnounceMessage;
  const listeners = new Set<() => void>();
  const store = {
    getState: () => ({ view: { announceMessage } }),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const formatter = vi.fn(({ id }, values) => `${id}:${values?.name}`);
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

beforeEach(() => {
  vi.clearAllMocks();
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

  // Hosts' live-region tests can't reach the turn before the regions exist.
  it('delivers assertive text sent in the same turn as connect, just before it', async () => {
    const { announcer, container } = createHarness();
    announcer.announce({ messageText: 'Early alert', assertive: true });
    announcer.connect(container);
    await Promise.resolve();
    expect(mockAnnounce).toHaveBeenCalledWith('Early alert', 'assertive');
  });
});
