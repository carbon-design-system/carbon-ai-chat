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
import {
  createBaseTestConfig,
  mockCustomSendMessage,
} from "../../utils/testHelpers";
import { AppState } from "../../../src/types/state/AppState";

describe("Config Messaging", () => {
  const createBaseConfig = (): PublicConfig => ({
    ...createBaseTestConfig(),
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

      const config: PublicConfig = {
        ...createBaseConfig(),
        messaging,
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
      expect(state.config.public.messaging).toEqual(messaging);
    });

    it("should store messaging with skipWelcome only", async () => {
      const messaging = {
        skipWelcome: false,
        customSendMessage: mockCustomSendMessage,
      };

      const config: PublicConfig = {
        ...createBaseConfig(),
        messaging,
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
      expect(state.config.public.messaging).toEqual(messaging);
    });

    it("should store messaging with timeout settings", async () => {
      const messaging = {
        messageTimeoutSecs: 180,
        messageLoadingIndicatorTimeoutSecs: 10,
        customSendMessage: mockCustomSendMessage,
      };

      const config: PublicConfig = {
        ...createBaseConfig(),
        messaging,
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
      expect(state.config.public.messaging).toEqual(messaging);
    });

    it("should store messaging with custom functions", async () => {
      const mockCustomLoadHistory = jest.fn();
      const messaging = {
        customSendMessage: mockCustomSendMessage,
        customLoadHistory: mockCustomLoadHistory,
      };

      const config: PublicConfig = {
        ...createBaseConfig(),
        messaging,
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
      expect(state.config.public.messaging).toEqual(messaging);
    });
  });
});
