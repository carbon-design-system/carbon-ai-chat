/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { EventBus } from '../../../sdk/events/EventBus';
import { ExtensionHosts } from '../extensionHosts';

import { slotSourceOf } from '../../__tests__/helpers/chat';

afterEach(() => {
  document.body.innerHTML = '';
});

it('stops following the store after disconnect', () => {
  const listeners = new Set<() => void>();
  const store = {
    getState: () => ({ allMessagesByID: {} }),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const hosts = new ExtensionHosts(
    slotSourceOf(new EventBus()),
    document.createElement('div'),
    store,
    () => false
  );

  hosts.connect();
  expect(listeners.size).toBe(1);
  hosts.disconnect();
  expect(listeners.size).toBe(0);
});
