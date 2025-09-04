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

describe("Config Debug", () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset any Redux DevTools extension mock
    delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
  });

  afterEach(() => {
    // Clean up any created DOM elements
    document.body.innerHTML = "";
  });

  describe("debug: true", () => {
    it("should enable Redux DevTools when debug is true", async () => {
      // Mock Redux DevTools extension
      const mockReduxDevTools = jest.fn((): undefined => undefined);
      (window as any).__REDUX_DEVTOOLS_EXTENSION__ = mockReduxDevTools;

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        debug: true,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(React.createElement(ChatContainer, { ...props, onBeforeRender }));

      // Wait for the chat to be instantiated
      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      // Verify Redux DevTools was called
      expect(mockReduxDevTools).toHaveBeenCalledWith({
        name: "CarbonAIChat",
        instanceId: expect.stringMatching(/^Chat/),
      });

      // Verify the config is stored correctly in the Redux store
      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.debug).toBe(true);
    });

    it("should handle missing Redux DevTools extension gracefully", async () => {
      // Ensure no Redux DevTools extension is available
      delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        debug: true,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(React.createElement(ChatContainer, { ...props, onBeforeRender }));

      // Wait for the chat to be instantiated
      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      // Verify the config is still stored correctly
      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.debug).toBe(true);
    });
  });

  describe("debug: false", () => {
    it("should not enable Redux DevTools when debug is false", async () => {
      // Mock Redux DevTools extension
      const mockReduxDevTools = jest.fn((): undefined => undefined);
      (window as any).__REDUX_DEVTOOLS_EXTENSION__ = mockReduxDevTools;

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        debug: false,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(React.createElement(ChatContainer, { ...props, onBeforeRender }));

      // Wait for the chat to be instantiated
      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      // Verify Redux DevTools was not called
      expect(mockReduxDevTools).not.toHaveBeenCalled();

      // Verify the config is stored correctly in the Redux store
      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.debug).toBe(false);
    });
  });

  describe("debug: undefined", () => {
    it("should not enable Redux DevTools when debug is undefined", async () => {
      // Mock Redux DevTools extension
      const mockReduxDevTools = jest.fn((): undefined => undefined);
      (window as any).__REDUX_DEVTOOLS_EXTENSION__ = mockReduxDevTools;

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        // debug property is intentionally omitted
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

      // Wait for the chat to be instantiated
      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      // Verify Redux DevTools was not called
      expect(mockReduxDevTools).not.toHaveBeenCalled();

      // Verify the config is stored correctly in the Redux store
      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.debug).toBeUndefined();
    });
  });
});
