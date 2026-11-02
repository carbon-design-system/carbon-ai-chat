/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ConversationLifecycleService } from '../../../src/chat/services/ConversationLifecycleService';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';

describe('ConversationLifecycleService', () => {
  let service: ConversationLifecycleService;
  let status: string;

  beforeEach(() => {
    status = 'ready';
    service = new ConversationLifecycleService({
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
