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
import { CarbonTheme } from "../../../src/types/config/PublicConfig";
import { CornersType } from "../../../src/types/config/CornersType";
import { createBaseTestProps } from "../../test_helpers";
import { AppState } from "../../../src/types/state/AppState";
import { applyConfigChangesDynamically } from "../../../src/chat/utils/dynamicConfigUpdates";

describe("Config Theme", () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("theme", () => {
    it("should store complete theme in Redux state", async () => {
      const layout = {
        corners: CornersType.SQUARE,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        injectCarbonTheme: CarbonTheme.G90,
        aiEnabled: true,
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
      expect(state.config.derived.themeWithDefaults).toEqual({
        originalCarbonTheme: CarbonTheme.G90,
        derivedCarbonTheme: CarbonTheme.G90,
        aiEnabled: true,
        corners: {
          startStart: CornersType.SQUARE,
          startEnd: CornersType.SQUARE,
          endStart: CornersType.SQUARE,
          endEnd: CornersType.SQUARE,
        },
        whiteLabelTheme: undefined,
      });
    });

    it("should store partial theme in Redux state", async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        injectCarbonTheme: CarbonTheme.WHITE,
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
      expect(state.config.derived.themeWithDefaults).toEqual({
        derivedCarbonTheme: "white",
        originalCarbonTheme: "white",
        corners: {
          startStart: CornersType.ROUND,
          startEnd: CornersType.ROUND,
          endStart: CornersType.ROUND,
          endEnd: CornersType.ROUND,
        },
        aiEnabled: true,
        whiteLabelTheme: undefined,
      });
    });

    it("should store theme with default values in Redux state", async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
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
      expect(state.config.derived.themeWithDefaults).toEqual({
        derivedCarbonTheme: "white",
        originalCarbonTheme: null,
        corners: {
          startStart: CornersType.ROUND,
          startEnd: CornersType.ROUND,
          endStart: CornersType.ROUND,
          endEnd: CornersType.ROUND,
        },
        aiEnabled: true,
        whiteLabelTheme: undefined,
      });
    });

    it("should use default theme when not specified", async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        // theme intentionally omitted
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
      expect(state.config.derived.themeWithDefaults.aiEnabled).toEqual(true);
      expect(state.config.derived.themeWithDefaults.derivedCarbonTheme).toEqual(
        "white",
      );
      expect(
        state.config.derived.themeWithDefaults.originalCarbonTheme,
      ).toEqual(null);
    });

    // When injectCarbonTheme is unset, it inherits tokens from host

    it("should properly set derivedCarbonTheme and originalCarbonTheme in Redux state", async () => {
      const layout = {
        corners: CornersType.SQUARE,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        injectCarbonTheme: CarbonTheme.G90,
        aiEnabled: true,
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
      expect(state.config.derived.themeWithDefaults.derivedCarbonTheme).toEqual(
        CarbonTheme.G90,
      );
      expect(
        state.config.derived.themeWithDefaults.originalCarbonTheme,
      ).toEqual(CarbonTheme.G90);
      expect(state.config.derived.themeWithDefaults.aiEnabled).toEqual(true);
      expect(state.config.derived.themeWithDefaults.corners).toEqual({
        startStart: CornersType.SQUARE,
        startEnd: CornersType.SQUARE,
        endStart: CornersType.SQUARE,
        endEnd: CornersType.SQUARE,
      });
    });

    it("should preserve derivedCarbonTheme during dynamic config updates in inherit mode", async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        // No injectCarbonTheme - inherit mode
        aiEnabled: true,
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

      const serviceManager = (capturedInstance as any).serviceManager;
      const store = serviceManager.store;

      // Simulate ThemeWatcherService setting a detected theme
      store.dispatch({
        type: "UPDATE_THEME_STATE",
        themeState: {
          originalCarbonTheme: null,
          derivedCarbonTheme: "g10",
          aiEnabled: true,
          corners: {
            startStart: CornersType.ROUND,
            startEnd: CornersType.ROUND,
            endStart: CornersType.ROUND,
            endEnd: CornersType.ROUND,
          },
        },
      });

      let state: AppState = store.getState();
      expect(state.config.derived.themeWithDefaults.derivedCarbonTheme).toEqual(
        "g10",
      );

      // Simulate dynamic config update (e.g., toggling aiEnabled)
      await applyConfigChangesDynamically(
        {
          themingChanged: true,
          namespaceChanged: false,
          messagingChanged: false,
          layoutChanged: false,
          humanAgentFactoryChanged: false,
          headerChanged: false,
          disclaimerChanged: false,
          homescreenChanged: false,
          lightweightUIChanged: false,
        },
        { aiEnabled: false }, // New config
        serviceManager,
      );

      // Check that derivedCarbonTheme was preserved
      state = store.getState();
      expect(
        state.config.derived.themeWithDefaults.originalCarbonTheme,
      ).toEqual(null);
      expect(state.config.derived.themeWithDefaults.derivedCarbonTheme).toEqual(
        "g10",
      ); // Should be preserved
      expect(state.config.derived.themeWithDefaults.aiEnabled).toEqual(false); // Should be updated
    });
  });
});

it("should store per-corner config in Redux state", async () => {
  const layout = {
    corners: {
      startStart: CornersType.ROUND,
      startEnd: CornersType.SQUARE,
      endStart: CornersType.SQUARE,
      endEnd: CornersType.ROUND,
    },
  };

  const props: Partial<ChatContainerProps> = {
    ...createBaseTestProps(),
    injectCarbonTheme: CarbonTheme.G90,
    aiEnabled: true,
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
  expect(state.config.derived.themeWithDefaults.corners).toEqual({
    startStart: CornersType.ROUND,
    startEnd: CornersType.SQUARE,
    endStart: CornersType.SQUARE,
    endEnd: CornersType.ROUND,
  });
});

it("should handle partial per-corner config with defaults", async () => {
  const layout = {
    corners: {
      startStart: CornersType.SQUARE,
      endEnd: CornersType.SQUARE,
      // startEnd and endStart should default to ROUND
    },
  };

  const props: Partial<ChatContainerProps> = {
    ...createBaseTestProps(),
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
  expect(state.config.derived.themeWithDefaults.corners).toEqual({
    startStart: CornersType.SQUARE,
    startEnd: CornersType.ROUND, // defaulted
    endStart: CornersType.ROUND, // defaulted
    endEnd: CornersType.SQUARE,
  });
});

it("should force all corners to square when showFrame is false", async () => {
  const layout = {
    showFrame: false,
    corners: {
      startStart: CornersType.ROUND,
      startEnd: CornersType.ROUND,
      endStart: CornersType.ROUND,
      endEnd: CornersType.ROUND,
    },
  };

  const props: Partial<ChatContainerProps> = {
    ...createBaseTestProps(),
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
  // All corners should be forced to square when showFrame is false
  expect(state.config.derived.themeWithDefaults.corners).toEqual({
    startStart: CornersType.SQUARE,
    startEnd: CornersType.SQUARE,
    endStart: CornersType.SQUARE,
    endEnd: CornersType.SQUARE,
  });
});
