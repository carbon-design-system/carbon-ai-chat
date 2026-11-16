/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { requestStopFromInput } from '../../../src/chat/services/assistantInputCommands';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import actions from '../../../src/chat/store/actions';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import * as miscUtils from '../../../src/chat/utils/miscUtils';

function commandHost(isVisible: boolean) {
  const order: string[] = [];
  const button = { isVisible };
  const event = resolvablePromise();
  const getState = jest.fn(() => {
    order.push('read');
    return { assistantInputState: { stopStreamingButtonState: button } };
  });
  const dispatch = jest.fn(
    (action: ReturnType<typeof actions.setStopStreamingButtonDisabled>) => {
      order.push(action.isDisabled ? 'disable' : 'reset');
    }
  );
  const fire = jest.fn(() => {
    order.push('event');
    return event;
  });
  const cancelCurrentMessageRequest = jest.fn(async () => {
    order.push('cancel');
  });
  const markPending = jest.fn(() => {
    order.push('pending');
  });
  const manager = {
    store: { getState, dispatch },
    fire,
    messageService: { cancelCurrentMessageRequest },
  } as unknown as ServiceManager;
  return {
    manager,
    button,
    event,
    order,
    getState,
    dispatch,
    fire,
    cancelCurrentMessageRequest,
    markPending,
  };
}

describe('requestStopFromInput without a mounted view', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(miscUtils, 'consoleError').mockImplementation(() => {});
  });
  afterEach(() => {
    log.mockRestore();
  });

  it.each([true, false])(
    'captures chat visibility %s before pending can change it',
    async (visible) => {
      const host = commandHost(visible);
      host.markPending.mockImplementation(() => {
        host.order.push('pending');
        host.button.isVisible = !visible;
      });
      let settled = false;
      const stop = requestStopFromInput(host.manager, host.markPending).then(
        () => {
          settled = true;
        }
      );

      expect(host.order).toEqual(
        visible
          ? ['read', 'pending', 'disable', 'event']
          : ['read', 'pending', 'event']
      );
      expect(host.dispatch.mock.calls.map(([action]) => action)).toEqual(
        visible ? [actions.setStopStreamingButtonDisabled(true)] : []
      );
      expect(host.fire).toHaveBeenCalledWith({
        type: BusEventType.STOP_STREAMING,
      });
      expect(host.cancelCurrentMessageRequest).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(settled).toBe(false);

      host.event.doResolve();
      await stop;
      expect(host.order).toEqual(
        visible
          ? ['read', 'pending', 'disable', 'event', 'cancel']
          : ['read', 'pending', 'event']
      );
      expect(host.getState).toHaveBeenCalledTimes(1);
      expect(host.markPending).toHaveBeenCalledTimes(1);
      expect(log).not.toHaveBeenCalled();
    }
  );

  it.each([true, false])(
    'retains visibility %s while the Stop event waits',
    async (visible) => {
      const host = commandHost(visible);
      const stop = requestStopFromInput(host.manager, host.markPending);
      host.button.isVisible = !visible;
      host.event.doResolve();
      await stop;

      expect(host.cancelCurrentMessageRequest).toHaveBeenCalledTimes(
        visible ? 1 : 0
      );
      expect(host.dispatch).toHaveBeenCalledTimes(visible ? 1 : 0);
      expect(host.getState).toHaveBeenCalledTimes(1);
      expect(log).not.toHaveBeenCalled();
    }
  );

  it('awaits cancellation after the Stop event has finished', async () => {
    const host = commandHost(true);
    const cancellation = resolvablePromise();
    host.cancelCurrentMessageRequest.mockReturnValueOnce(cancellation);
    let settled = false;
    const stop = requestStopFromInput(host.manager, host.markPending).then(
      () => {
        settled = true;
      }
    );
    host.event.doResolve();
    await Promise.resolve();
    expect(host.cancelCurrentMessageRequest).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    cancellation.doResolve();
    await stop;
    expect(settled).toBe(true);
    expect(host.dispatch).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])(
    'logs, resets, and swallows a rejected event for chat visibility %s',
    async (visible) => {
      const host = commandHost(visible);
      const failure = new Error('Stop handler failed');
      const stop = requestStopFromInput(host.manager, host.markPending);
      host.event.doReject(failure);
      await expect(stop).resolves.toBeUndefined();

      expect(host.cancelCurrentMessageRequest).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith('Error stopping stream:', failure);
      expect(host.dispatch).toHaveBeenLastCalledWith(
        actions.setStopStreamingButtonDisabled(false)
      );
      expect(host.order).toEqual(
        visible
          ? ['read', 'pending', 'disable', 'event', 'reset']
          : ['read', 'pending', 'event', 'reset']
      );
    }
  );

  it('logs, resets, and swallows a cancellation error', async () => {
    const host = commandHost(true);
    const failure = new Error('Cancellation failed');
    host.cancelCurrentMessageRequest.mockRejectedValueOnce(failure);
    const stop = requestStopFromInput(host.manager, host.markPending);
    host.event.doResolve();
    await expect(stop).resolves.toBeUndefined();

    expect(log).toHaveBeenCalledWith('Error stopping stream:', failure);
    expect(host.dispatch).toHaveBeenLastCalledWith(
      actions.setStopStreamingButtonDisabled(false)
    );
  });

  it('leaves a pending callback failure outside the Stop error boundary', async () => {
    const host = commandHost(true);
    const failure = new Error('Pending UI failed');
    host.markPending.mockImplementationOnce(() => {
      throw failure;
    });
    await expect(
      requestStopFromInput(host.manager, host.markPending)
    ).rejects.toBe(failure);

    expect(host.dispatch).not.toHaveBeenCalled();
    expect(host.fire).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('leaves a conditional-disable failure outside the Stop error boundary', async () => {
    const host = commandHost(true);
    const failure = new Error('Disable failed');
    host.dispatch.mockImplementationOnce(() => {
      throw failure;
    });
    await expect(
      requestStopFromInput(host.manager, host.markPending)
    ).rejects.toBe(failure);

    expect(host.markPending).toHaveBeenCalledTimes(1);
    expect(host.dispatch).toHaveBeenCalledTimes(1);
    expect(host.fire).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
