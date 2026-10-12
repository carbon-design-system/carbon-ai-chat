/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  mergePublicConfig,
  initServiceManagerAndInstance,
  performInitialViewChange,
  attachUserDefinedResponseHandlers,
  attachCustomFooterHandler,
  attachCustomRequestFooterHandler,
} from '../../../src/chat/utils/chatBoot';

import { createBaseTestProps } from '../../test_helpers';
import { EventBus } from '../../../src/chat/events/EventBus';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { BusEventType } from '../../../src/types/events/eventBusTypes';

describe('chatBoot utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mergePublicConfig', () => {
    it('merges defaults with provided config', () => {
      const base = createBaseTestProps();
      const publicConfig = mergePublicConfig(base);

      // Defaults applied
      expect(publicConfig.openChatByDefault).toBe(false);
      expect(publicConfig.launcher?.isOn).toBe(true);
      expect(publicConfig.shouldTakeFocusIfOpensAutomatically).toBe(true);

      // Provided fields preserved
      expect(publicConfig.messaging?.customSendMessage).toBe(
        base.messaging?.customSendMessage
      );
      expect(publicConfig.exposeServiceManagerForTesting).toBe(true);
    });

    it("sets default assistantName to 'watsonx'", () => {
      const base = createBaseTestProps();
      const publicConfig = mergePublicConfig(base);

      // Default assistantName should be set
      expect(publicConfig.assistantName).toBe('watsonx');
    });

    it('preserves custom assistantName when provided', () => {
      const base = createBaseTestProps();
      base.assistantName = 'Custom Assistant';
      const publicConfig = mergePublicConfig(base);

      // Custom assistantName should be preserved
      expect(publicConfig.assistantName).toBe('Custom Assistant');
    });

    it('uses default assistantName when not provided', () => {
      const base = createBaseTestProps();
      // Explicitly not setting assistantName
      delete (base as any).assistantName;
      const publicConfig = mergePublicConfig(base);

      // Should fall back to default
      expect(publicConfig.assistantName).toBe('watsonx');
    });

    it('allows empty string as assistantName', () => {
      const base = createBaseTestProps();
      base.assistantName = '';
      const publicConfig = mergePublicConfig(base);

      // Empty string should be preserved
      expect(publicConfig.assistantName).toBe('');
    });
  });

  describe('initServiceManagerAndInstance', () => {
    it('initializes ServiceManager, sets container styles and creates instance (with host element)', async () => {
      const container = document.createElement('div');
      const host = document.createElement('div');

      const props = createBaseTestProps();
      const publicConfig = mergePublicConfig(props);

      const { serviceManager, instance } = await initServiceManagerAndInstance({
        publicConfig,
        container,
        customHostElement: host,
      });

      expect(serviceManager).toBeTruthy();
      expect(instance).toBeTruthy();
      expect(serviceManager.instance).toBe(instance);
      expect(serviceManager.container).toBe(container);
      expect(serviceManager.customHostElement).toBe(host);

      // Container should be tagged with the boot-container fill class. The
      // matching dynamic-stylesheet rule applies width/height: 100% !important.
      expect(
        container.classList.contains('cds-aichat--boot-container--filled')
      ).toBe(true);
      expect(
        container.classList.contains('cds-aichat--boot-container--collapsed')
      ).toBe(false);
    });

    it('initializes with default container styles when no host element provided', async () => {
      const container = document.createElement('div');

      const props = createBaseTestProps();
      const publicConfig = mergePublicConfig(props);

      const { serviceManager, instance } = await initServiceManagerAndInstance({
        publicConfig,
        container,
      });

      expect(serviceManager).toBeTruthy();
      expect(instance).toBeTruthy();
      expect(serviceManager.customHostElement).toBeUndefined();

      // Container should be tagged with the boot-container collapsed class.
      // The matching dynamic-stylesheet rule applies width/height: 0 !important.
      expect(
        container.classList.contains('cds-aichat--boot-container--collapsed')
      ).toBe(true);
      expect(
        container.classList.contains('cds-aichat--boot-container--filled')
      ).toBe(false);
    });
  });

  describe('performInitialViewChange', () => {
    it('opens main window with OPEN_BY_DEFAULT when configured and not from browser', async () => {
      const changeView = jest.fn().mockResolvedValue({ mainWindow: true });

      const fakeServiceManager: any = {
        actions: { changeView },
        store: {
          getState: () => ({
            persistedToBrowserStorage: {
              launcherState: { wasLoadedFromBrowser: false },
            },
            targetViewState: { mainWindow: true },
            config: { public: { openChatByDefault: true } },
          }),
        },
      };

      await performInitialViewChange(fakeServiceManager);
      expect(changeView).toHaveBeenCalledTimes(1);
      const [, options] = changeView.mock.calls[0];
      expect(options).toMatchObject({}); // options object exists
    });

    it('calls changeView with WEB_CHAT_LOADED when main window not targeted', async () => {
      const changeView = jest.fn().mockResolvedValue({ mainWindow: false });

      const fakeServiceManager: any = {
        actions: { changeView },
        store: {
          getState: () => ({
            persistedToBrowserStorage: {
              launcherState: { wasLoadedFromBrowser: true },
            },
            targetViewState: { mainWindow: false },
            config: { public: { openChatByDefault: false } },
          }),
        },
      };

      await performInitialViewChange(fakeServiceManager);
      expect(changeView).toHaveBeenCalledTimes(1);
      const [target, , tryHydrating] = changeView.mock.calls[0];
      expect(target).toEqual({ mainWindow: false });
      expect(tryHydrating).toBe(false);
    });
  });

  describe('attachUserDefinedResponseHandlers', () => {
    it('updates state on user-defined response and chunk events', () => {
      const eventBus = new EventBus();
      const instance = eventBus as unknown as ChatInstance;

      let bySlot: any = {};
      const setBySlot = (updater: any) => {
        bySlot = typeof updater === 'function' ? updater(bySlot) : updater;
      };

      attachUserDefinedResponseHandlers(instance, setBySlot as any);

      // Simulate full user-defined response
      eventBus.fireSync(
        {
          type: BusEventType.USER_DEFINED_RESPONSE,
          data: {
            slot: 's1',
            fullMessage: { id: 'm1' },
            message: { id: 'i1' },
          },
        },
        instance
      );

      expect(bySlot.s1.fullMessage).toEqual({ id: 'm1' });
      expect(bySlot.s1.messageItem).toEqual({ id: 'i1' });

      // Simulate partial chunk
      eventBus.fireSync(
        {
          type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
          data: { slot: 's1', chunk: { partial_item: { t: 'p1' } } },
        },
        instance
      );
      expect(bySlot.s1.partialItems).toEqual([{ t: 'p1' }]);

      // Simulate completion chunk
      eventBus.fireSync(
        {
          type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
          data: { slot: 's1', chunk: { complete_item: { id: 'i2' } } },
        },
        instance
      );
      expect(bySlot.s1.messageItem).toEqual({ id: 'i2' });

      // Simulate restart: state should reset
      eventBus.fireSync(
        {
          type: BusEventType.RESTART_CONVERSATION,
        },
        instance
      );
      expect(bySlot).toEqual({});
    });
  });
  describe('attachCustomFooterHandler', () => {
    it('updates state on custom footer slot events', () => {
      const eventBus = new EventBus();
      const instance = eventBus as unknown as ChatInstance;

      let bySlot: any = {};
      const setBySlot = (updater: any) => {
        bySlot = typeof updater === 'function' ? updater(bySlot) : updater;
      };

      attachCustomFooterHandler(instance, setBySlot as any);

      // Simulate custom footer slot event
      eventBus.fireSync(
        {
          type: BusEventType.CUSTOM_FOOTER_SLOT,
          data: {
            slotName: 'footer1',
            message: { id: 'msg1' },
            messageItem: { id: 'item1', text: 'Hello' },
            additionalData: { customKey: 'customValue', count: 42 },
          },
        },
        instance
      );

      expect(bySlot.footer1.slotName).toBe('footer1');
      expect(bySlot.footer1.message).toEqual({ id: 'msg1' });
      expect(bySlot.footer1.messageItem).toEqual({
        id: 'item1',
        text: 'Hello',
      });
      expect(bySlot.footer1.additionalData).toEqual({
        customKey: 'customValue',
        count: 42,
      });

      expect(Object.keys(bySlot)).toEqual(['footer1']);

      // Simulate restart: state should reset
      eventBus.fireSync(
        {
          type: BusEventType.RESTART_CONVERSATION,
        },
        instance
      );
      expect(bySlot).toEqual({});
    });
  });
  describe('attachCustomRequestFooterHandler', () => {
    it('accumulates one entry per slot and clears them on restart', () => {
      const eventBus = new EventBus();
      const instance = eventBus as unknown as ChatInstance;

      let bySlot: any = {};
      const setBySlot = (updater: any) => {
        bySlot = typeof updater === 'function' ? updater(bySlot) : updater;
      };

      attachCustomRequestFooterHandler(instance, setBySlot as any, () => true);

      eventBus.fireSync(
        {
          type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
          data: {
            slotName: 'request-footer-1',
            message: { id: 'm1', input: { text: 'first' } },
          },
        },
        instance
      );
      eventBus.fireSync(
        {
          type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
          data: {
            slotName: 'request-footer-2',
            message: { id: 'm2', input: { text: 'second' } },
          },
        },
        instance
      );

      expect(Object.keys(bySlot)).toEqual([
        'request-footer-1',
        'request-footer-2',
      ]);
      expect(bySlot['request-footer-1'].message.input.text).toBe('first');
      expect(bySlot['request-footer-2'].message.input.text).toBe('second');

      eventBus.fireSync(
        {
          type: BusEventType.RESTART_CONVERSATION,
        },
        instance
      );
      expect(bySlot).toEqual({});
    });

    it('accumulates nothing until the host has a render callback', () => {
      const eventBus = new EventBus();
      const instance = eventBus as unknown as ChatInstance;

      let bySlot: any = {};
      const setBySlot = (updater: any) => {
        bySlot = typeof updater === 'function' ? updater(bySlot) : updater;
      };

      // The prop the host has not passed yet. The handler asks on every event,
      // so it can arrive after the chat has booted.
      const host: { renderCustomRequestFooter?: () => null } = {};

      attachCustomRequestFooterHandler(instance, setBySlot as any, () =>
        Boolean(host.renderCustomRequestFooter)
      );

      eventBus.fireSync(
        {
          type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
          data: {
            slotName: 'request-footer-1',
            message: { id: 'm1', input: { text: 'before' } },
          },
        },
        instance
      );

      expect(bySlot).toEqual({});

      host.renderCustomRequestFooter = () => null;

      eventBus.fireSync(
        {
          type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
          data: {
            slotName: 'request-footer-2',
            message: { id: 'm2', input: { text: 'after' } },
          },
        },
        instance
      );

      expect(Object.keys(bySlot)).toEqual(['request-footer-2']);
    });
  });

  describe.each([
    {
      name: 'attachUserDefinedResponseHandlers',
      attach: attachUserDefinedResponseHandlers,
      events: [
        {
          type: BusEventType.USER_DEFINED_RESPONSE,
          data: {
            slot: 's1',
            fullMessage: { id: 'm1' },
            message: { id: 'i1' },
          },
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
      name: 'attachCustomFooterHandler',
      attach: attachCustomFooterHandler,
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
      name: 'attachCustomRequestFooterHandler',
      attach: attachCustomRequestFooterHandler,
      events: [
        {
          type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
          data: { slotName: 'request-footer-1', message: { id: 'm1' } },
        },
      ],
    },
  ])('$name cleanup', ({ attach, events }) => {
    it('stops state updates and preserves other subscribers to the same events', () => {
      const eventBus = new EventBus();
      const instance = eventBus as unknown as ChatInstance;
      const setBySlot = jest.fn();
      const restartEvent = { type: BusEventType.RESTART_CONVERSATION };
      const unrelatedListener = jest.fn();
      const eventTypes = new Set([
        ...events.map(({ type }) => type),
        restartEvent.type,
      ]);
      eventBus.on(
        Array.from(eventTypes, (type) => ({ type, handler: unrelatedListener }))
      );
      const cleanup = attach(instance, setBySlot, () => true);

      for (const event of [...events, restartEvent]) {
        setBySlot.mockClear();
        eventBus.fireSync(event, instance);
        expect(setBySlot).toHaveBeenCalledTimes(1);
      }

      cleanup();
      setBySlot.mockClear();
      unrelatedListener.mockClear();

      for (const event of [...events, restartEvent]) {
        eventBus.fireSync(event, instance);
        expect(setBySlot).not.toHaveBeenCalled();
        expect(unrelatedListener).toHaveBeenLastCalledWith(event, instance);
      }
      expect(unrelatedListener).toHaveBeenCalledTimes(events.length + 1);
    });
  });
});
