/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatMountState } from '../chatMountState';
import type { ServiceManager } from '../../../sdk/services/ServiceManager';
import { createIntl } from '../../../sdk/utils/i18n';

const mockAnnounce = vi.fn();

vi.mock(
  '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js',
  () => ({
    mountAriaAnnouncer: () => ({
      announce: mockAnnounce,
      disconnect: vi.fn(),
    }),
  })
);

function createManager() {
  return {
    store: { getState: () => ({}), subscribe: () => () => {} },
    intl: createIntl({ locale: 'en', messages: { greeting: 'Hello' } }),
  } as unknown as ServiceManager;
}

function createViewState(manager = createManager()) {
  return new ChatMountState(manager, { width: 800, height: 600 });
}

beforeEach(() => mockAnnounce.mockClear());

it('waits for every retained React commit without notifying view subscribers', async () => {
  const state = createViewState();
  const changed = vi.fn();
  state.subscribe(changed);
  const first = state.holdInitialReactCommit();
  const second = state.holdInitialReactCommit();
  const committed = vi.fn();
  state.whenInitialReactCommitReady(committed);
  first();
  first();
  await Promise.resolve();
  expect(committed).not.toHaveBeenCalled();
  second();
  await Promise.resolve();
  expect(committed).toHaveBeenCalledTimes(1);
  expect(changed).not.toHaveBeenCalled();
});

it('rechecks a hold acquired during effect replay before acknowledging a commit', async () => {
  const state = createViewState();
  const retired = vi.fn();
  const first = state.holdInitialReactCommit();
  const cancel = state.whenInitialReactCommitReady(retired);
  first();
  cancel();
  const second = state.holdInitialReactCommit();
  const committed = vi.fn();
  state.whenInitialReactCommitReady(committed);
  first();
  await Promise.resolve();
  expect(retired).not.toHaveBeenCalled();
  expect(committed).not.toHaveBeenCalled();
  second();
  await Promise.resolve();
  expect(committed).toHaveBeenCalledTimes(1);
});
