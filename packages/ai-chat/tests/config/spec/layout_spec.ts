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
import { createBaseTestProps } from "../../test_helpers";
import { AppState } from "../../../src/types/state/AppState";
import { applyConfigChangesDynamically } from "../../../src/chat/utils/dynamicConfigUpdates";
import { detectConfigChanges } from "../../../src/chat/utils/configChangeDetection";
import { doCreateStore } from "../../../src/chat/store/doCreateStore";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";
import { NamespaceService } from "../../../src/chat/services/NamespaceService";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

describe("Config Layout", () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("layout", () => {
    it("should store complete layout config in Redux state", async () => {
      const layout = {
        showFrame: true,
        hasContentMaxWidth: false,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        layout,
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
      expect(state.config.public.layout).toEqual(layout);
    });

    it("should store layout with showFrame only", async () => {
      const layout = {
        showFrame: false,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        layout,
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
      expect(state.config.public.layout).toEqual(layout);
    });

    it("should store layout with hasContentMaxWidth only", async () => {
      const layout = {
        hasContentMaxWidth: true,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        layout,
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
      expect(state.config.public.layout).toEqual(layout);
    });

    it("should handle undefined layout in Redux state", async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        // layout intentionally omitted
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
      expect(state.config.public.layout).toBeUndefined();
    });

    describe("Dynamic Layout Config Updates", () => {
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

      it("should handle layout config changes dynamically", async () => {
        const previousConfig: PublicConfig = {
          layout: {
            showFrame: true,
            hasContentMaxWidth: false,
          },
        };

        const newConfig: PublicConfig = {
          layout: {
            showFrame: false,
            hasContentMaxWidth: true,
            corners: "square" as any,
          },
        };

        const changes = detectConfigChanges(previousConfig, newConfig);
        expect(changes.layoutChanged).toBe(true);

        await applyConfigChangesDynamically(changes, newConfig, serviceManager);

        const state: AppState = serviceManager.store.getState();
        expect(state.config.public.layout?.showFrame).toBe(false);
        expect(state.config.public.layout?.hasContentMaxWidth).toBe(true);
        expect(state.config.public.layout?.corners).toBe("square");
      });
    });
  });
});
