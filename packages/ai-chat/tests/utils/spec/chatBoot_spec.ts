/*
 *  Copyright IBM Corp. 2025
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
} from "../../../src/chat/utils/chatBoot";

import { createBaseTestProps } from "../../utils/testHelpers";
import type { ChatInstance } from "../../../src/types/instance/ChatInstance";
import {
  BusEventType,
  BusEvent,
} from "../../../src/types/events/eventBusTypes";

describe("chatBoot utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("mergePublicConfig", () => {
    it("merges defaults with provided config", () => {
      const base = createBaseTestProps();
      const publicConfig = mergePublicConfig(base);

      // Defaults applied
      expect(publicConfig.openChatByDefault).toBe(false);
      expect(publicConfig.launcher?.isOn).toBe(true);
      expect(publicConfig.shouldTakeFocusIfOpensAutomatically).toBe(true);

      // Provided fields preserved
      expect(publicConfig.messaging?.customSendMessage).toBe(
        base.messaging?.customSendMessage,
      );
      expect(publicConfig.exposeServiceManagerForTesting).toBe(true);
    });
  });

  describe("initServiceManagerAndInstance", () => {
    it("initializes ServiceManager, sets container styles and creates instance (with host element)", async () => {
      const container = document.createElement("div");
      const host = document.createElement("div");

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

      // Container styles should be set to 100% when hosted element provided
      expect(container.style.getPropertyValue("width")).toBe("100%");
      expect(container.style.getPropertyValue("height")).toBe("100%");
    });

    it("initializes with default container styles when no host element provided", async () => {
      const container = document.createElement("div");

      const props = createBaseTestProps();
      const publicConfig = mergePublicConfig(props);

      const { serviceManager, instance } = await initServiceManagerAndInstance({
        publicConfig,
        container,
      });

      expect(serviceManager).toBeTruthy();
      expect(instance).toBeTruthy();
      expect(serviceManager.customHostElement).toBeUndefined();

      // Container styles should be 0 when no custom host is used
      expect(container.style.getPropertyValue("width")).toBe("0px");
      expect(container.style.getPropertyValue("height")).toBe("0px");
    });
  });

  describe("performInitialViewChange", () => {
    it("opens main window with OPEN_BY_DEFAULT when configured and not from browser", async () => {
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

    it("calls changeView with WEB_CHAT_LOADED when main window not targeted", async () => {
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

  describe("attachUserDefinedResponseHandlers", () => {
    it("updates state on user-defined response and chunk events", () => {
      const handlers: Record<
        string | number,
        (event: BusEvent & { data?: any }) => void
      > = {};
      const fakeInstance: any = {
        on: ({ type, handler }: any) => {
          handlers[type] = handler;
        },
      };

      let bySlot: any = {};
      const setBySlot = (updater: any) => {
        bySlot = typeof updater === "function" ? updater(bySlot) : updater;
      };

      attachUserDefinedResponseHandlers(
        fakeInstance as unknown as ChatInstance,
        setBySlot as any,
      );

      // Simulate full user-defined response
      handlers[BusEventType.USER_DEFINED_RESPONSE]({
        type: BusEventType.USER_DEFINED_RESPONSE,
        data: { slot: "s1", fullMessage: { id: "m1" }, message: { id: "i1" } },
      });

      expect(bySlot.s1.fullMessage).toEqual({ id: "m1" });
      expect(bySlot.s1.messageItem).toEqual({ id: "i1" });

      // Simulate partial chunk
      handlers[BusEventType.CHUNK_USER_DEFINED_RESPONSE]({
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        data: { slot: "s1", chunk: { partial_item: { t: "p1" } } },
      });
      expect(bySlot.s1.partialItems).toEqual([{ t: "p1" }]);

      // Simulate completion chunk
      handlers[BusEventType.CHUNK_USER_DEFINED_RESPONSE]({
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        data: { slot: "s1", chunk: { complete_item: { id: "i2" } } },
      });
      expect(bySlot.s1.messageItem).toEqual({ id: "i2" });

      // Simulate restart: state should reset
      handlers[BusEventType.RESTART_CONVERSATION]({
        type: BusEventType.RESTART_CONVERSATION,
      });
      expect(bySlot).toEqual({});
    });
  });
});
