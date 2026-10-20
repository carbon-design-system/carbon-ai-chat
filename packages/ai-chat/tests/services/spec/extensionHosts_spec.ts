/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { EventBus } from '../../../src/chat/events/EventBus';
import { ExtensionHosts } from '../../../src/chat/services/extensionHosts';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { BusEventType } from '../../../src/types/events/eventBusTypes';

function setup(isRequestFooterEnabled: () => boolean = () => true) {
  const eventBus = new EventBus();
  const instance = eventBus as unknown as ChatInstance;
  const hosts = new ExtensionHosts(instance, isRequestFooterEnabled);
  hosts.connect();
  const fire = (event: unknown) => eventBus.fireSync(event as never, instance);
  return { eventBus, instance, hosts, fire };
}

const restart = { type: BusEventType.RESTART_CONVERSATION };

describe('extension host records', () => {
  it('tracks user-defined responses and their chunks', () => {
    const { hosts, fire } = setup();
    const records = () => hosts.getSnapshot().userDefinedResponse as any;

    fire({
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: { slot: 's1', fullMessage: { id: 'm1' }, message: { id: 'i1' } },
    });
    expect(records().s1.fullMessage).toEqual({ id: 'm1' });
    expect(records().s1.messageItem).toEqual({ id: 'i1' });

    fire({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      data: { slot: 's1', chunk: { partial_item: { t: 'p1' } } },
    });
    expect(records().s1.partialItems).toEqual([{ t: 'p1' }]);

    fire({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      data: { slot: 's1', chunk: { complete_item: { id: 'i2' } } },
    });
    expect(records().s1.messageItem).toEqual({ id: 'i2' });

    fire(restart);
    expect(records()).toEqual({});
  });

  it('tracks custom message footers', () => {
    const { hosts, fire } = setup();
    const records = () => hosts.getSnapshot().customFooter as any;

    fire({
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      data: {
        slotName: 'footer1',
        message: { id: 'msg1' },
        messageItem: { id: 'item1', text: 'Hello' },
        additionalData: { customKey: 'customValue', count: 42 },
      },
    });

    expect(records().footer1.slotName).toBe('footer1');
    expect(records().footer1.message).toEqual({ id: 'msg1' });
    expect(records().footer1.messageItem).toEqual({
      id: 'item1',
      text: 'Hello',
    });
    expect(records().footer1.additionalData).toEqual({
      customKey: 'customValue',
      count: 42,
    });
    expect(Object.keys(records())).toEqual(['footer1']);

    fire(restart);
    expect(records()).toEqual({});
  });

  it('accumulates one request footer per slot and clears them on restart', () => {
    const { hosts, fire } = setup();
    const records = () => hosts.getSnapshot().customRequestFooter as any;

    fire({
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      data: {
        slotName: 'request-footer-1',
        message: { id: 'm1', input: { text: 'first' } },
      },
    });
    fire({
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      data: {
        slotName: 'request-footer-2',
        message: { id: 'm2', input: { text: 'second' } },
      },
    });

    expect(Object.keys(records())).toEqual([
      'request-footer-1',
      'request-footer-2',
    ]);
    expect(records()['request-footer-1'].message.input.text).toBe('first');
    expect(records()['request-footer-2'].message.input.text).toBe('second');

    fire(restart);
    expect(records()).toEqual({});
  });

  it('accumulates no request footers until the host has a render callback', () => {
    // The prop the host has not passed yet. The service asks on every event,
    // so it can arrive after the chat has booted.
    const host: { renderCustomRequestFooter?: () => null } = {};
    const { hosts, fire } = setup(() =>
      Boolean(host.renderCustomRequestFooter)
    );
    const records = () => hosts.getSnapshot().customRequestFooter;

    fire({
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      data: {
        slotName: 'request-footer-1',
        message: { id: 'm1', input: { text: 'before' } },
      },
    });
    expect(records()).toEqual({});

    host.renderCustomRequestFooter = () => null;
    fire({
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      data: {
        slotName: 'request-footer-2',
        message: { id: 'm2', input: { text: 'after' } },
      },
    });
    expect(Object.keys(records())).toEqual(['request-footer-2']);
  });

  it('keeps each kind the same object until that kind changes', () => {
    const { hosts, fire } = setup();
    const before = hosts.getSnapshot();

    fire({
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      data: { slotName: 'f1', message: {}, messageItem: {} },
    });

    const after = hosts.getSnapshot();
    expect(after.customFooter).not.toBe(before.customFooter);
    expect(after.userDefinedResponse).toBe(before.userDefinedResponse);
    expect(after.customRequestFooter).toBe(before.customRequestFooter);
  });
});

describe.each([
  {
    name: 'user-defined responses',
    events: [
      {
        type: BusEventType.USER_DEFINED_RESPONSE,
        data: { slot: 's1', fullMessage: { id: 'm1' }, message: { id: 'i1' } },
      },
      {
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        data: { slot: 's1', chunk: { partial_item: { text: 'partial' } } },
      },
      {
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        data: { slot: 's1', chunk: { complete_item: { id: 'i1' } } },
      },
    ],
  },
  {
    name: 'custom message footers',
    events: [
      {
        type: BusEventType.CUSTOM_FOOTER_SLOT,
        data: {
          slotName: 'footer1',
          message: { id: 'm1' },
          messageItem: { id: 'i1' },
        },
      },
    ],
  },
  {
    name: 'custom request footers',
    events: [
      {
        type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
        data: { slotName: 'request-footer-1', message: { id: 'm1' } },
      },
    ],
  },
])('disconnecting from $name', ({ events }) => {
  it('stops record updates and preserves other subscribers to the same events', () => {
    const { eventBus, hosts, fire, instance } = setup();
    const onChange = jest.fn();
    hosts.subscribe(onChange);
    const unrelatedListener = jest.fn();
    const eventTypes = new Set([
      ...events.map(({ type }) => type),
      restart.type,
    ]);
    eventBus.on(
      Array.from(eventTypes, (type) => ({ type, handler: unrelatedListener }))
    );

    for (const event of [...events, restart]) {
      onChange.mockClear();
      fire(event);
      expect(onChange).toHaveBeenCalledTimes(1);
    }

    hosts.disconnect();
    hosts.disconnect();
    onChange.mockClear();
    unrelatedListener.mockClear();

    for (const event of [...events, restart]) {
      fire(event);
      expect(onChange).not.toHaveBeenCalled();
      expect(unrelatedListener).toHaveBeenLastCalledWith(event, instance);
    }
    expect(unrelatedListener).toHaveBeenCalledTimes(events.length + 1);
  });
});
