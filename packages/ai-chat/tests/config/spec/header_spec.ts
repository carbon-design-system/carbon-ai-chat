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
import { MinimizeButtonIconType } from "../../../src/types/config/PublicConfig";
import { ChatContainerProps } from "../../../src/types/component/ChatContainer";
import { createBaseTestProps } from "../../utils/testHelpers";
import { AppState } from "../../../src/types/state/AppState";
import { applyConfigChangesDynamically } from "../../../src/chat/utils/dynamicConfigUpdates";
import { detectConfigChanges } from "../../../src/chat/utils/configChangeDetection";
import { doCreateStore } from "../../../src/chat/store/doCreateStore";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";
import { NamespaceService } from "../../../src/chat/services/NamespaceService";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

describe("Config Header", () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("header", () => {
    it("should store complete header in Redux state", async () => {
      const header = {
        minimizeButtonIconType: MinimizeButtonIconType.SIDE_PANEL_LEFT,
        hideMinimizeButton: true,
        showRestartButton: false,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        header,
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
      expect(state.config.public.header).toEqual(header);
    });

    it("should store header with minimize icon type only", async () => {
      const header = {
        minimizeButtonIconType: MinimizeButtonIconType.CLOSE,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        header,
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
      expect(state.config.public.header).toEqual(header);
    });

    it("should store header with button visibility flags", async () => {
      const header = {
        hideMinimizeButton: false,
        showRestartButton: true,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        header,
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
      expect(state.config.public.header).toEqual(header);
    });

    it("should handle undefined header in Redux state", async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        // header intentionally omitted
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
      expect(state.config.public.header).toBeUndefined();
    });
  });

  describe("Dynamic Header Config Updates", () => {
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

    it("should handle header config changes dynamically", async () => {
      const previousConfig: PublicConfig = {
        header: {
          title: "Old Header",
          hideMinimizeButton: false,
        },
      };

      const newConfig: PublicConfig = {
        header: {
          title: "New Header",
          hideMinimizeButton: true,
          showRestartButton: true,
        },
      };

      const changes = detectConfigChanges(previousConfig, newConfig);
      expect(changes.headerChanged).toBe(true);

      await applyConfigChangesDynamically(changes, newConfig, serviceManager);

      const state: AppState = serviceManager.store.getState();
      expect(state.config.public.header?.title).toBe("New Header");
      expect(state.config.public.header?.hideMinimizeButton).toBe(true);
      expect(state.config.public.header?.showRestartButton).toBe(true);
    });

    it("should detect no changes when header config is identical", async () => {
      const config: PublicConfig = {
        header: {
          title: "Same Header",
          hideMinimizeButton: true,
        },
      };

      const changes = detectConfigChanges(config, config);
      expect(changes.headerChanged).toBe(false);
    });
  });
});
