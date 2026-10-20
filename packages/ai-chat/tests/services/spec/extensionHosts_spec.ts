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
import { LIGHT_DOM_PORTAL_EVENT } from '@carbon/ai-chat-components/es/components/prompt-line/src/tiptap/render-in-light-dom.js';

const noMessages = {
  getState: () => ({ allMessagesByID: {} }),
  subscribe: () => () => {},
};

function setup(isRequestFooterEnabled: () => boolean = () => true) {
  const eventBus = new EventBus();
  const instance = eventBus as unknown as ChatInstance;
  const chatWrapper = document.createElement('div');
  document.body.append(chatWrapper);
  const hosts = new ExtensionHosts(
    instance,
    chatWrapper,
    noMessages,
    isRequestFooterEnabled
  );
  hosts.connect();
  const fire = (event: unknown) => eventBus.fireSync(event as never, instance);
  return { eventBus, instance, chatWrapper, hosts, fire };
}

const restartEvent = { type: BusEventType.RESTART_CONVERSATION };

function response(slot: string) {
  return {
    type: BusEventType.USER_DEFINED_RESPONSE,
    data: { slot, fullMessage: { id: slot }, message: { id: slot } },
  };
}

function footer(slotName: string) {
  return {
    type: BusEventType.CUSTOM_FOOTER_SLOT,
    data: { slotName, message: {}, messageItem: {} },
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

const restart = restartEvent;

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

describe('extension slot hosts', () => {
  function attached(chatWrapper: HTMLElement) {
    return Array.from(chatWrapper.children);
  }

  it('keeps one detached host per slot until it should attach', () => {
    const { hosts, chatWrapper, fire } = setup();
    fire(response('r1'));

    const host = hosts.hostFor('userDefinedResponse', 'r1');
    expect(hosts.hostFor('userDefinedResponse', 'r1')).toBe(host);
    expect(host.getAttribute('slot')).toBe('r1');
    expect(host.isConnected).toBe(false);

    hosts.setHasContent('userDefinedResponse', 'r1', true);
    expect(host.isConnected).toBe(false);

    hosts.setRendererPresent('userDefinedResponse', true);
    expect(attached(chatWrapper)).toEqual([host]);
  });

  it('detaches a host without content and reattaches the same element', () => {
    const { hosts, chatWrapper, fire } = setup();
    fire(response('r1'));
    hosts.setRendererPresent('userDefinedResponse', true);
    const host = hosts.hostFor('userDefinedResponse', 'r1');
    hosts.setHasContent('userDefinedResponse', 'r1', true);

    hosts.setHasContent('userDefinedResponse', 'r1', false);
    expect(host.isConnected).toBe(false);
    hosts.setHasContent('userDefinedResponse', 'r1', true);
    expect(attached(chatWrapper)).toEqual([host]);
  });

  it('attaches hosts again after disconnect without duplicating them', () => {
    const { hosts, chatWrapper, fire } = setup();
    fire(response('r1'));
    hosts.setRendererPresent('userDefinedResponse', true);
    const host = hosts.hostFor('userDefinedResponse', 'r1');
    hosts.setHasContent('userDefinedResponse', 'r1', true);

    hosts.connect();
    expect(attached(chatWrapper)).toEqual([host]);
    hosts.disconnect();
    hosts.disconnect();
    expect(attached(chatWrapper)).toEqual([]);
    hosts.connect();
    expect(attached(chatWrapper)).toEqual([host]);
  });

  it('releases only the removed renderer kind and nodes it created', () => {
    const { hosts, chatWrapper, fire } = setup();
    const callerNode = document.createElement('p');
    chatWrapper.append(callerNode);
    fire(response('r1'));
    fire(footer('f1'));
    hosts.setRendererPresent('userDefinedResponse', true);
    hosts.setRendererPresent('customFooter', true);
    const responseHost = hosts.hostFor('userDefinedResponse', 'r1');
    const footerHost = hosts.hostFor('customFooter', 'f1');
    hosts.setHasContent('userDefinedResponse', 'r1', true);
    hosts.setHasContent('customFooter', 'f1', true);

    hosts.setRendererPresent('customFooter', false);

    expect(attached(chatWrapper)).toEqual([callerNode, responseHost]);
    expect(footerHost.isConnected).toBe(false);
  });

  it('releases every kind on restart and creates fresh hosts after it', () => {
    const { hosts, chatWrapper, fire } = setup();
    fire(response('r1'));
    fire(footer('f1'));
    hosts.setRendererPresent('userDefinedResponse', true);
    hosts.setRendererPresent('customFooter', true);
    const responseHost = hosts.hostFor('userDefinedResponse', 'r1');
    hosts.setHasContent('userDefinedResponse', 'r1', true);
    hosts.hostFor('customFooter', 'f1');
    hosts.setHasContent('customFooter', 'f1', true);

    fire(restartEvent);

    expect(attached(chatWrapper)).toEqual([]);
    fire(response('r1'));
    expect(hosts.hostFor('userDefinedResponse', 'r1')).not.toBe(responseHost);
  });

  it('leaves a host that was moved out of the chat element', () => {
    const { hosts, fire } = setup();
    fire(response('r1'));
    hosts.setRendererPresent('userDefinedResponse', true);
    const host = hosts.hostFor('userDefinedResponse', 'r1');
    hosts.setHasContent('userDefinedResponse', 'r1', true);
    const elsewhere = document.createElement('section');
    document.body.append(elsewhere);
    elsewhere.append(host);

    hosts.disconnect();

    expect(host.parentNode).toBe(elsewhere);
  });

  it('collects request footers for a renderer reported after boot', () => {
    const { hosts, fire } = setup(() => false);
    const event = (slotName: string) => ({
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      data: { slotName, message: { id: slotName } },
    });

    fire(event('before'));
    hosts.setRendererPresent('customRequestFooter', true);
    fire(event('after'));

    expect(Object.keys(hosts.getSnapshot().customRequestFooter)).toEqual([
      'after',
    ]);
  });
});

describe('editor light-DOM hosts', () => {
  function setupEditor() {
    const result = setup();
    const shadowRoot = result.chatWrapper.attachShadow({ mode: 'open' });
    const editor = document.createElement('div');
    shadowRoot.append(editor);
    const place = (htmlElement?: HTMLElement) => {
      const container = document.createElement('span');
      editor.append(container);
      result.chatWrapper.dispatchEvent(
        new CustomEvent(LIGHT_DOM_PORTAL_EVENT, {
          detail: { container, hostTag: 'span', htmlElement },
        })
      );
      return container;
    };
    const lightHosts = () =>
      Array.from(result.chatWrapper.children).filter((node) =>
        node.getAttribute('slot')?.startsWith('cds-aichat-light-dom-')
      );
    return { ...result, editor, place, lightHosts };
  }

  it('keeps one host per node and removes it when the node leaves the editor', async () => {
    const { hosts, place, lightHosts } = setupEditor();
    const chip = document.createElement('b');

    const container = place(chip);

    expect(lightHosts()).toHaveLength(1);
    expect(lightHosts()[0].firstChild).toBe(chip);
    const slot = container.querySelector('slot');
    expect(slot.getAttribute('name')).toBe(
      lightHosts()[0].getAttribute('slot')
    );
    expect(hosts.getSnapshot().lightDom).toHaveLength(1);

    container.remove();
    await Promise.resolve();

    expect(lightHosts()).toHaveLength(0);
    expect(hosts.getSnapshot().lightDom).toHaveLength(0);
  });

  it('keeps editor entries through a restart', () => {
    const { hosts, place, fire } = setupEditor();
    place(document.createElement('b'));
    fire(response('r1'));

    fire(restartEvent);

    expect(hosts.getSnapshot().lightDom).toHaveLength(1);
  });

  it('releases its listener and observer on disconnect', async () => {
    const { hosts, place, lightHosts } = setupEditor();
    const container = place(document.createElement('b'));
    const observerDisconnect = jest.spyOn(
      MutationObserver.prototype,
      'disconnect'
    );

    hosts.disconnect();

    expect(observerDisconnect).toHaveBeenCalled();
    expect(lightHosts()).toHaveLength(0);
    place(document.createElement('i'));
    expect(lightHosts()).toHaveLength(0);
    expect(hosts.getSnapshot().lightDom).toHaveLength(1);

    // A node deleted while disconnected is pruned on reconnect.
    container.remove();
    hosts.connect();
    expect(lightHosts()).toHaveLength(0);
    expect(hosts.getSnapshot().lightDom).toHaveLength(0);
    observerDisconnect.mockRestore();
  });

  it('restores the host of a live node on reconnect', () => {
    const { hosts, place, lightHosts } = setupEditor();
    place(document.createElement('b'));
    const [host] = lightHosts();

    hosts.disconnect();
    hosts.connect();

    expect(lightHosts()).toEqual([host]);
  });
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
    new EventBus() as unknown as ChatInstance,
    document.createElement('div'),
    store,
    () => false
  );

  hosts.connect();
  expect(listeners.size).toBe(1);
  hosts.disconnect();
  expect(listeners.size).toBe(0);
});

describe('input-node hosts', () => {
  function messageWith(node: { type: string }) {
    return {
      id: 'm',
      input: {
        text: 'x',
        display_content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [node] }],
        },
      },
    };
  }

  function setupMessages() {
    const listeners = new Set<() => void>();
    let allMessagesByID: Record<string, unknown> = {
      m: messageWith({ type: 'taskCard' }),
    };
    const store = {
      getState: () => ({ allMessagesByID }) as never,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    const eventBus = new EventBus();
    const instance = eventBus as unknown as ChatInstance;
    const hosts = new ExtensionHosts(
      instance,
      document.createElement('div'),
      store,
      () => false
    );
    hosts.connect();
    const setMessages = (next: Record<string, unknown>) => {
      allMessagesByID = next;
      listeners.forEach((listener) => listener());
    };
    const fire = (event: unknown) =>
      eventBus.fireSync(event as never, instance);
    return { hosts, setMessages, fire };
  }

  it('replaces a host whose node changes between token and other kinds', () => {
    const { hosts, setMessages } = setupMessages();
    const [entry] = hosts.getSnapshot().inputNode;
    const first = hosts.inputNodeHostFor(entry);
    expect(hosts.inputNodeHostFor(entry)).toBe(first);

    setMessages({ m: messageWith({ type: 'mention' }) });

    const [next] = hosts.getSnapshot().inputNode;
    expect(next.slotKey).toBe(entry.slotKey);
    expect(hosts.inputNodeHostFor(next)).not.toBe(first);
  });

  function blockMessage(id: string) {
    return {
      id,
      input: {
        text: 'x',
        display_content: { type: 'doc', content: [{ type: 'taskCard' }] },
      },
    };
  }

  /** Reports a renderer and content for each entry, as the adapter does. */
  function attachAll(hosts: ExtensionHosts) {
    hosts.setRendererPresent('inputNode', true);
    return hosts.getSnapshot().inputNode.map((entry) => {
      const host = hosts.inputNodeHostFor(entry);
      hosts.setHasContent('inputNode', entry.slotKey, true);
      return host;
    });
  }

  it('keeps the other host attached when one of two messages leaves', () => {
    const { hosts, setMessages } = setupMessages();
    const kept = blockMessage('b');
    setMessages({ a: blockMessage('a'), b: kept });
    const [removedHost, keptHost] = attachAll(hosts);
    const chatWrapper = keptHost.parentElement;
    expect(chatWrapper).not.toBeNull();
    expect(removedHost.parentElement).toBe(chatWrapper);

    setMessages({ b: kept });

    const [entry] = hosts.getSnapshot().inputNode;
    expect(entry.slotKey).toBe('b::0');
    expect(removedHost.parentElement).toBeNull();
    expect(keptHost.parentElement).toBe(chatWrapper);
    expect(hosts.inputNodeHostFor(entry)).toBe(keptHost);
  });

  it('detaches input-node hosts on disconnect and reattaches them on reconnect', () => {
    const { hosts, setMessages } = setupMessages();
    setMessages({ a: blockMessage('a') });
    const [host] = attachAll(hosts);
    const chatWrapper = host.parentElement;
    expect(chatWrapper).not.toBeNull();

    hosts.disconnect();
    expect(host.parentElement).toBeNull();

    hosts.connect();
    expect(host.parentElement).toBe(chatWrapper);
    expect(chatWrapper.children).toHaveLength(1);
  });

  it('keeps input-node hosts through a restart and releases them with their message', () => {
    const { hosts, setMessages, fire } = setupMessages();
    const [entry] = hosts.getSnapshot().inputNode;
    const host = hosts.inputNodeHostFor(entry);

    fire(restartEvent);
    expect(hosts.getSnapshot().inputNode).toEqual([entry]);
    expect(hosts.inputNodeHostFor(entry)).toBe(host);

    setMessages({});
    expect(hosts.getSnapshot().inputNode).toEqual([]);
    expect(hosts.inputNodeHostFor(entry)).not.toBe(host);
  });
});
