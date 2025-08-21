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
import {
  ThemeType,
  PublicConfig,
  CarbonTheme,
} from "../../../src/types/config/PublicConfig";
import { CornersType } from "../../../src/types/config/CornersType";
import { createBaseTestConfig } from "../../utils/testHelpers";
import { AppState } from "../../../src/types/state/AppState";
import { DEFAULT_THEME_STATE } from "../../../src/chat/shared/store/reducerUtils";

describe("Config Theme", () => {
  const createBaseConfig = (): PublicConfig => ({
    ...createBaseTestConfig(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("themeConfig", () => {
    it("should store complete themeConfig in Redux state", async () => {
      const themeConfig = {
        carbonTheme: CarbonTheme.G90,
        theme: ThemeType.CARBON_AI,
        corners: CornersType.SQUARE,
        whiteLabelTheme: {
          quickThemeHex: "#ff0000",
        },
      };

      const config: PublicConfig = {
        ...createBaseConfig(),
        themeConfig,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          config,
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
      expect(state.theme).toEqual(themeConfig);
    });

    it("should store partial themeConfig in Redux state", async () => {
      const themeConfig = {
        carbonTheme: CarbonTheme.WHITE,
      };

      const config: PublicConfig = {
        ...createBaseConfig(),
        themeConfig,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          config,
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
      expect(state.theme).toEqual({
        ...DEFAULT_THEME_STATE,
        ...themeConfig,
      });
    });

    it("should store themeConfig with only whiteLabelTheme in Redux state", async () => {
      const themeConfig = {
        whiteLabelTheme: {
          quickThemeHex: "#123456",
        },
      };

      const config: PublicConfig = {
        ...createBaseConfig(),
        themeConfig,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          config,
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
      expect(state.theme).toEqual({
        ...DEFAULT_THEME_STATE,
        ...themeConfig,
      });
    });

    it("should use default themeConfig when not specified", async () => {
      const config: PublicConfig = {
        ...createBaseConfig(),
        // themeConfig intentionally omitted
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          config,
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
      expect(state.theme.theme).toEqual(ThemeType.CARBON_AI); // default value
    });
  });
});
