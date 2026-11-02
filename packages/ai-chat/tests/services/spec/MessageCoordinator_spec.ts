/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageCoordinator } from '../../../src/chat/services/messaging/MessageCoordinator';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';

describe('MessageCoordinator', () => {
  let service: MessageCoordinator;
  let status: string;

  beforeEach(() => {
    status = 'ready';
    service = new MessageCoordinator({
      store: {
        getState: () => ({ conversationStatus: status }),
        dispatch: (action: { status: string }) => {
          status = action.status;
        },
      },
    } as unknown as ServiceManager);
  });

  it('clears active responses and stopped requests when restarting', () => {
    const previousGeneration = service.currentGeneration;
    service.responseStreaming('response', previousGeneration, 'active-request');
    service.requestStopped('stopped-request');

    const generation = service.restart(true);

    expect(generation).toBe(previousGeneration + 1);
    expect(service.currentGeneration).toBe(generation);
    expect(service.isCurrent(previousGeneration)).toBe(false);
    expect(service.isCurrent(generation)).toBe(true);
    expect(service.responseRequestID('response')).toBeUndefined();
    expect(service.isRequestStopped('stopped-request')).toBe(false);

    service.responseStreaming('response', generation, 'stopped-request');
    expect(service.requestStopped('stopped-request')).toEqual(['response']);
  });

  it('ignores writes, finishes, and stops from a previous generation', () => {
    const previousGeneration = service.currentGeneration;
    const generation = service.restart(true);
    service.responseStreaming('response', generation, 'request');

    service.responseStreaming('stale-response', previousGeneration, 'request');
    service.responseFinished('response', previousGeneration);

    expect(service.requestStopped('request', previousGeneration)).toEqual([]);
    expect(service.isRequestStopped('request')).toBe(false);
    expect(service.responseRequestID('response')).toBe('request');
    expect(service.responseRequestID('stale-response')).toBeUndefined();
    expect(service.requestStopped('request', generation)).toEqual(['response']);
  });

  it('stops only the responses owned by the request and rejects late writes', () => {
    const generation = service.currentGeneration;
    service.responseStreaming('first-response', generation, 'request');
    service.responseStreaming('second-response', generation, 'request');
    service.responseStreaming('other-response', generation, 'other-request');

    expect(service.requestStopped('request')).toEqual([
      'first-response',
      'second-response',
    ]);
    expect(service.isRequestStopped('request')).toBe(true);
    expect(service.isRequestStopped('other-request')).toBe(false);
    expect(service.responseRequestID('first-response')).toBe('request');
    expect(service.responseRequestID('second-response')).toBe('request');
    expect(service.responseRequestID('other-response')).toBe('other-request');

    service.responseStreaming('first-response', generation, 'request');
    service.responseStreaming('late-response', generation, 'request');

    expect(service.responseRequestID('first-response')).toBe('request');
    expect(service.requestStopped('request')).toEqual([]);
    expect(service.requestStopped('other-request')).toEqual(['other-response']);
  });

  it('retains the original owner when later writes name another request', () => {
    const generation = service.currentGeneration;
    service.responseStreaming('response', generation, 'original-request');
    service.responseStreaming('response', generation, 'other-request');

    expect(service.responseRequestID('response')).toBe('original-request');
    expect(service.requestStopped('other-request')).toEqual([]);
    expect(service.requestStopped('original-request')).toEqual(['response']);
  });

  it('blocks responses when a request stops before its first response arrives', () => {
    expect(service.requestStopped('request')).toEqual([]);

    service.responseStreaming('response', service.currentGeneration, 'request');

    expect(service.isRequestStopped('request')).toBe(true);
    expect(status).toBe('ready');
    expect(service.requestStopped('request')).toEqual([]);
  });

  it('keeps an unowned response unowned when later writes name a request', () => {
    service.responseStreaming('response');
    service.responseStreaming('response', service.currentGeneration, 'request');

    expect(service.responseRequestID('response')).toBeUndefined();
    expect(service.requestStopped('request')).toEqual([]);
  });

  it('finishes only the named response and retains its ownership until removal', () => {
    const generation = service.currentGeneration;
    service.responseStreaming('response', generation, 'request');
    service.responseStreaming('other-response', generation, 'request');

    service.responseFinished('response');
    service.responseFinished('response');

    expect(service.responseRequestID('response')).toBe('request');
    expect(service.responseRequestID('other-response')).toBe('request');
    expect(service.isRequestStopped('request')).toBe(false);

    service.responseStreaming('response', generation, 'next-request');

    expect(service.responseRequestID('response')).toBe('request');
    expect(service.requestStopped('next-request')).toEqual([]);
    service.responseRemoved('response');
    service.responseStreaming('response', generation, 'fresh-request');

    expect(service.responseRequestID('response')).toBe('fresh-request');
    expect(service.requestStopped('request')).toEqual(['other-response']);
    expect(service.requestStopped('fresh-request')).toEqual(['response']);
  });

  it('allows a removed response ID under a new request without reviving its stopped owner', () => {
    service.responseStreaming('response', service.currentGeneration, 'request');
    expect(service.requestStopped('request')).toEqual(['response']);
    expect(status).toBe('ready');

    service.responseRemoved('response');
    expect(service.responseRequestID('response')).toBeUndefined();
    expect(service.isRequestStopped('request')).toBe(true);
    service.responseStreaming(
      'response',
      service.currentGeneration,
      'next-request'
    );

    expect(status).toBe('streaming');
    expect(service.responseRequestID('response')).toBe('next-request');
    expect(service.requestStopped('request')).toEqual([]);
    expect(service.requestStopped('next-request')).toEqual(['response']);
  });

  it('stops responses through a request ID changed by pre:send', () => {
    const request = { id: 'original' };
    service.requestStarted('original', service.currentGeneration, request);
    request.id = 'alias';
    service.responseStreaming('response', service.currentGeneration, 'alias');

    expect(service.requestStopped('alias')).toEqual(['response']);
    expect(service.isRequestStopped('original')).toBe(true);
    expect(service.isRequestStopped('alias')).toBe(true);
    expect(service.responseRequestID('response')).toBe('original');
    expect(status).toBe('ready');
  });

  it('ignores an empty response ID', () => {
    service.responseStreaming('', service.currentGeneration, 'request');

    expect(service.requestStopped('request')).toEqual([]);
  });
});

describe('lifecycle publication', () => {
  function setup() {
    let status = 'ready';
    const getState = jest.fn(() => ({ conversationStatus: status }));
    const dispatch = jest.fn((action: { status: string }) => {
      status = action.status;
    });
    const service = new MessageCoordinator({
      store: { getState, dispatch },
    } as unknown as ServiceManager);
    return {
      service,
      getState,
      dispatch,
      setStatus: (value: string) => {
        status = value;
      },
    };
  }

  it('skips unchanged status dispatches but still consults the store', () => {
    const { service, getState, dispatch } = setup();
    service.requestStarted('request');
    service.requestStarted('other');
    expect(getState).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0].status).toBe('submitted');
  });

  it('does not consult the store for stale or rejected operations', () => {
    const { service, getState, dispatch } = setup();
    const generation = service.currentGeneration;
    const token = service.fail({});
    service.restart(true);
    getState.mockClear();
    dispatch.mockClear();
    service.hydrationFinished(generation);
    service.requestStarted('request', generation);
    service.requestFinished('request', generation);
    expect(service.requestStopped('request', generation)).toEqual([]);
    service.responseStreaming('response', generation);
    service.responseStreaming('');
    service.responseReceived('response', generation);
    service.responseStopped('response', generation);
    service.responseFinished('response', generation);
    expect(service.fail({}, generation)).toBeNull();
    service.clearFailure(token);
    expect(getState).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each(['restart', 'hydrationStarted'] as const)(
    '%s returns the generation after a reentrant restart',
    (method) => {
      const { service, dispatch, setStatus } = setup();
      dispatch.mockImplementationOnce((action) => {
        setStatus(action.status);
        service.restart(true);
      });
      const returned =
        method === 'restart'
          ? service.restart(false)
          : service.hydrationStarted();
      expect(returned).toBe(method === 'restart' ? 2 : 1);
      expect(returned).toBe(service.currentGeneration);
      expect(dispatch.mock.calls.map(([action]) => action.status)).toEqual([
        'loading',
        'ready',
      ]);
    }
  );

  it('returns the captured failure token when a listener creates a newer failure', () => {
    const { service, dispatch, setStatus } = setup();
    let current: ReturnType<MessageCoordinator['fail']>;
    dispatch.mockImplementationOnce((action) => {
      setStatus(action.status);
      current = service.fail({ messageID: 'newer' });
    });
    const first = service.fail({ messageID: 'first' });
    expect(first.messageID).toBe('first');
    expect(first).not.toBe(current);
    service.clearFailure(first);
    expect(service.hasFailureForRequest('newer')).toBe(true);
    service.clearFailure(current);
    expect(dispatch.mock.calls.map(([action]) => action.status)).toEqual([
      'error',
      'ready',
    ]);
  });

  it('reads fresh model and store status for both streaming publication attempts', () => {
    const { service, getState, dispatch, setStatus } = setup();
    service.requestStarted('request');
    getState.mockClear();
    dispatch.mockClear();
    dispatch.mockImplementationOnce((action) => {
      setStatus(action.status);
      service.restart(true);
      // A subscriber may also replace public status before dispatch returns.
      setStatus('submitted');
    });
    service.responseStreaming('response', service.currentGeneration, 'request');
    expect(dispatch.mock.calls.map(([action]) => action.status)).toEqual([
      'streaming',
      'ready',
      'ready',
    ]);
    expect(getState).toHaveBeenCalledTimes(3);
    expect(service.currentGeneration).toBe(1);
  });

  it('publishes once for an unowned stream and not for receipt without an active owner', () => {
    const { service, getState, dispatch } = setup();
    service.responseReceived('response');
    expect(getState).not.toHaveBeenCalled();
    service.responseStreaming('response');
    expect(getState).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls.map(([action]) => action.status)).toEqual([
      'streaming',
    ]);
  });
});

it('creates loading state lazily before the message facade is wired', () => {
  const manager = {
    get messageService() {
      throw new Error('MessageService is not wired yet');
    },
  } as unknown as ServiceManager;
  const coordinator = new MessageCoordinator(manager);
  coordinator.configureMessageTimeout({ messaging: { messageTimeoutSecs: 0 } });
  expect(coordinator.timeoutMS).toBe(0);
  const loading = coordinator.messageLoadingManager;
  expect(coordinator.messageLoadingManager).toBe(loading);
});
