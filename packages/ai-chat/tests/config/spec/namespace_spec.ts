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
import { applyConfigChangesDynamically } from "../../../src/chat/utils/dynamicConfigUpdates";
import { detectConfigChanges } from "../../../src/chat/utils/configChangeDetection";
import { doCreateStore } from "../../../src/chat/store/doCreateStore";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";
import { NamespaceService } from "../../../src/chat/services/NamespaceService";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

describe("Config Namespace", () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("namespace", () => {
    it("should store namespace string in Redux state", async () => {
      const testNamespace = "test-namespace";
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        namespace: testNamespace,
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
      expect(state.config.public.namespace).toBe(testNamespace);
    });

    it("should store namespace with special characters in Redux state", async () => {
      const testNamespace = "test-namespace_123";
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        namespace: testNamespace,
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
      expect(state.config.public.namespace).toBe(testNamespace);
    });

    it("should store empty string namespace in Redux state", async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        namespace: "",
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
      expect(state.config.public.namespace).toBe("");
    });

    it("should handle undefined namespace in Redux state", async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        // namespace intentionally omitted
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
      expect(state.config.public.namespace).toBeUndefined();
    });

    describe("Dynamic Namespace Config Updates", () => {
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

      it("should handle namespace changes dynamically", async () => {
        const previousConfig: PublicConfig = {
          namespace: "old-namespace",
        };

        const newConfig: PublicConfig = {
          namespace: "new-namespace",
        };

        serviceManager.namespace = new NamespaceService("new-namespace");

        const changes = detectConfigChanges(previousConfig, newConfig);
        expect(changes.namespaceChanged).toBe(true);

        await applyConfigChangesDynamically(changes, newConfig, serviceManager);

        const state: AppState = serviceManager.store.getState();
        expect(state.config.public.namespace).toBe("new-namespace");
      });
    });
  });
});
