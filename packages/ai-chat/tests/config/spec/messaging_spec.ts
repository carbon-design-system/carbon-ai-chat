/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { ChatContainer } from "../../../src/react/ChatContainer";
import { ChatContainerProps } from "../../../src/types/component/ChatContainer";
import { createBaseTestProps, mockCustomSendMessage } from "../../test_helpers";
import { AppState } from "../../../src/types/state/AppState";
import { applyConfigChangesDynamically } from "../../../src/chat/utils/dynamicConfigUpdates";
import { detectConfigChanges } from "../../../src/chat/utils/configChangeDetection";
import { doCreateStore } from "../../../src/chat/store/doCreateStore";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";
import { NamespaceService } from "../../../src/chat/services/NamespaceService";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

describe("Config Messaging", () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("messaging", () => {
    it("should store complete messaging config in Redux state", async () => {
      const mockCustomLoadHistory = jest.fn();
      const messaging = {
        skipWelcome: true,
        messageTimeoutSecs: 120,
        messageLoadingIndicatorTimeoutSecs: 5,
        customSendMessage: mockCustomSendMessage,
        customLoadHistory: mockCustomLoadHistory,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        messaging,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(React.createElement(ChatContainer, { ...props, onBeforeRender }));

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.messaging).toEqual(messaging);
    });

    it("should store messaging with skipWelcome only", async () => {
      const messaging = {
        skipWelcome: false,
        customSendMessage: mockCustomSendMessage,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        messaging,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(React.createElement(ChatContainer, { ...props, onBeforeRender }));

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.messaging).toEqual(messaging);
    });

    it("should store messaging with timeout settings", async () => {
      const messaging = {
        messageTimeoutSecs: 180,
        messageLoadingIndicatorTimeoutSecs: 10,
        customSendMessage: mockCustomSendMessage,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        messaging,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          ...props,
          onBeforeRender,
        }),
      );

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.messaging).toEqual(messaging);
    });

    it("should store messaging with custom functions", async () => {
      const mockCustomLoadHistory = jest.fn();
      const messaging = {
        customSendMessage: mockCustomSendMessage,
        customLoadHistory: mockCustomLoadHistory,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        messaging,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          ...props,
          onBeforeRender,
        }),
      );

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.messaging).toEqual(messaging);
    });

    describe("Dynamic Messaging Config Updates", () => {
      let serviceManager: ServiceManager;

      beforeEach(() => {
        const initialConfig: PublicConfig = {
          assistantName: "Test Assistant",
        };

        const store = doCreateStore(initialConfig, {} as ServiceManager);
        serviceManager = {
          store,
          namespace: new NamespaceService("test"),
          messageService: { timeoutMS: 30000 } as any,
          humanAgentService: null,
        } as ServiceManager;
      });

      it("should handle messaging config changes and update message service", async () => {
        const previousConfig: PublicConfig = {
          messaging: {
            messageTimeoutSecs: 30,
          },
        };

        const newConfig: PublicConfig = {
          messaging: {
            messageTimeoutSecs: 60,
          },
        };

        const changes = detectConfigChanges(previousConfig, newConfig);
        expect(changes.messagingChanged).toBe(true);

        await applyConfigChangesDynamically(changes, newConfig, serviceManager);

        const state: AppState = serviceManager.store.getState();
        expect(state.config.public.messaging?.messageTimeoutSecs).toBe(60);
        expect(serviceManager.messageService?.timeoutMS).toBe(60000);
      });
    });
  });
});
