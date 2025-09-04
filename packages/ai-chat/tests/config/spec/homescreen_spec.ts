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
import { createBaseTestProps } from "../../utils/testHelpers";
import { AppState } from "../../../src/types/state/AppState";
import { HomeScreenConfig } from "../../../src/types/config/HomeScreenConfig";
import { applyConfigChangesDynamically } from "../../../src/chat/shared/utils/dynamicConfigUpdates";
import { detectConfigChanges } from "../../../src/chat/shared/utils/configChangeDetection";
import { doCreateStore } from "../../../src/chat/shared/store/doCreateStore";
import { ServiceManager } from "../../../src/chat/shared/services/ServiceManager";
import { NamespaceService } from "../../../src/chat/shared/services/NamespaceService";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

describe("Config Homescreen", () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("homescreen", () => {
    it("should store complete homescreen config in Redux state", async () => {
      const homescreen: HomeScreenConfig = {
        is_on: true,
        greeting: "Welcome to the assistant!",
        starters: {
          is_on: true,
          buttons: [
            { label: "Get started", isSelected: true },
            { label: "What can you do?" },
          ],
        },
        custom_content_only: false,
        disable_return: false,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        homescreen,
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
      expect(state.config.public.homescreen).toEqual(homescreen);
    });

    it("should store partial homescreen config (is_on + greeting)", async () => {
      const homescreen: HomeScreenConfig = {
        is_on: true,
        greeting: "Hello!",
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        homescreen,
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
      expect(state.config.public.homescreen).toEqual(homescreen);
    });

    it("should handle undefined homescreen in Redux state", async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        // homescreen intentionally omitted
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
      expect(state.config.public.homescreen).toBeUndefined();
    });

    describe("Dynamic Homescreen Config Updates", () => {
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

      it("should handle homescreen config changes dynamically", async () => {
        const previousConfig: PublicConfig = {
          homescreen: {
            is_on: true,
            greeting: "Old greeting",
          },
        };

        const newConfig: PublicConfig = {
          homescreen: {
            is_on: false,
            greeting: "New greeting",
            custom_content_only: true,
          },
        };

        const changes = detectConfigChanges(previousConfig, newConfig);
        expect(changes.lightweightUIChanged).toBe(true);

        await applyConfigChangesDynamically(changes, newConfig, serviceManager);

        const state: AppState = serviceManager.store.getState();
        expect(state.config.public.homescreen?.is_on).toBe(false);
        expect(state.config.public.homescreen?.greeting).toBe("New greeting");
        expect(state.config.public.homescreen?.custom_content_only).toBe(true);
      });
    });
  });
});
