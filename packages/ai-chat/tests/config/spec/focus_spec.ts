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
import { PublicConfig } from "../../../src/types/config/PublicConfig";
import { createBaseTestConfig } from "../../utils/testHelpers";
import { AppState } from "../../../src/types/state/AppState";

describe("Config Focus", () => {
  const createBaseConfig = (): PublicConfig => ({
    ...createBaseTestConfig(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("shouldTakeFocusIfOpensAutomatically", () => {
    it("should store shouldTakeFocusIfOpensAutomatically: true in Redux state", async () => {
      const config: PublicConfig = {
        ...createBaseConfig(),
        shouldTakeFocusIfOpensAutomatically: true,
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
      expect(state.config.public.shouldTakeFocusIfOpensAutomatically).toBe(
        true,
      );
    });

    it("should store shouldTakeFocusIfOpensAutomatically: false in Redux state", async () => {
      const config: PublicConfig = {
        ...createBaseConfig(),
        shouldTakeFocusIfOpensAutomatically: false,
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
      expect(state.config.public.shouldTakeFocusIfOpensAutomatically).toBe(
        false,
      );
    });

    it("should use default shouldTakeFocusIfOpensAutomatically value when not specified", async () => {
      const config: PublicConfig = {
        ...createBaseConfig(),
        // shouldTakeFocusIfOpensAutomatically intentionally omitted
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
      expect(state.config.public.shouldTakeFocusIfOpensAutomatically).toBe(
        true,
      ); // default value
    });
  });

  describe("enableFocusTrap", () => {
    it("should store enableFocusTrap: true in Redux state", async () => {
      const config: PublicConfig = {
        ...createBaseConfig(),
        enableFocusTrap: true,
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
      expect(state.config.public.enableFocusTrap).toBe(true);
    });

    it("should store enableFocusTrap: false in Redux state", async () => {
      const config: PublicConfig = {
        ...createBaseConfig(),
        enableFocusTrap: false,
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
      expect(state.config.public.enableFocusTrap).toBe(false);
    });

    it("should handle undefined enableFocusTrap in Redux state", async () => {
      const config: PublicConfig = {
        ...createBaseConfig(),
        // enableFocusTrap intentionally omitted
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
      expect(state.config.public.enableFocusTrap).toBeUndefined();
    });
  });
});
