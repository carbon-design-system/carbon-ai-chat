/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageCoordinator } from '../../../src/shared/services/messaging/MessageCoordinator';
import * as events from '../../../src/shared/services/messaging/coordinateMessageEvents';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import type { MessagePresentationPort } from '../../../src/shared/services/messaging/presentationPort';
import { withMessagingView } from '../helpers/viewBindings';

it('returns the exact response-tree workflow Promise from the coordinator facade', () => {
  const result = Promise.resolve();
  const invoke = jest
    .spyOn(events, 'coordinateUserDefinedResponseItems')
    .mockReturnValue(result);
  try {
    const manager = {} as ServiceManager;
    const presentation = {} as MessagePresentationPort;
    const core = new MessageCoordinator(
      withMessagingView(manager, presentation)
    );
    const local = {} as Parameters<
      typeof events.coordinateUserDefinedResponseItems
    >[2];
    const message = {} as Parameters<
      typeof events.coordinateUserDefinedResponseItems
    >[3];
    expect(core.handleUserDefinedResponseItems(local, message)).toBe(result);
    expect(invoke).toHaveBeenCalledWith(
      manager,
      presentation,
      local,
      message,
      undefined,
      undefined,
      undefined
    );
  } finally {
    invoke.mockRestore();
  }
});

it('returns each remaining event workflow Promise without wrapping it', () => {
  const core = new MessageCoordinator(
    withMessagingView({} as ServiceManager, {} as MessagePresentationPort)
  );
  const result = Promise.resolve();
  const specs: ReadonlyArray<
    readonly [
      keyof Pick<
        typeof events,
        | 'handleUserDefinedResponseItemsChunk'
        | 'handleCustomFooterSlot'
        | 'handleCustomRequestFooterSlot'
        | 'createElementsForUserDefinedResponses'
        | 'replayFooterSlots'
      >,
      readonly unknown[],
    ]
  > = [
    ['handleUserDefinedResponseItemsChunk', ['id', {}, {}, undefined]],
    ['handleCustomFooterSlot', [{}, {}, undefined]],
    ['handleCustomRequestFooterSlot', [{}, {}]],
    ['createElementsForUserDefinedResponses', [{}]],
    ['replayFooterSlots', [{}]],
  ] as const;
  for (const [name, args] of specs) {
    const invoke = jest.spyOn(events, name).mockReturnValue(result);
    try {
      expect(
        (core[name] as (...values: unknown[]) => Promise<void>)(...args)
      ).toBe(result);
    } finally {
      invoke.mockRestore();
    }
  }
});
