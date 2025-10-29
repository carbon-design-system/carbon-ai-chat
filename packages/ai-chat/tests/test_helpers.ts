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
import { ChatContainer } from "../src/react/ChatContainer";
import { PublicConfig } from "../src/types/config/PublicConfig";
import { ChatContainerProps } from "../src/types/component/ChatContainer";
import { ChatInstance } from "../src/types/instance/ChatInstance";
import type { AppStore } from "../src/chat/store/appStore";
import { AppState } from "../src/types/state/AppState";
import { ServiceManager } from "../src/chat/services/ServiceManager";

// ============================================================================
// Configuration helpers
// ============================================================================

/**
 * Mock function for customSendMessage that can be used in tests
 */
export const mockCustomSendMessage = jest.fn();

/**
 * Creates base test props suitable for testing ChatContainer with required properties.
 * Includes exposeServiceManagerForTesting flag to enable access to internal state.
 */
export function createBaseTestProps(): Partial<ChatContainerProps> {
  return {
    messaging: {
      customSendMessage: mockCustomSendMessage,
    },
    exposeServiceManagerForTesting: true,
  };
}

/**
 * Creates a base PublicConfig object for tests with required properties.
 */
export const createBaseConfig = (): PublicConfig => ({
  ...createBaseTestProps(),
});

// ============================================================================
// Render helpers
// ============================================================================

/**
 * Interface for the return value when rendering chat with store access.
 */
export interface ChatInstanceWithStore {
  instance: ChatInstance;
  store: AppStore<AppState>;
  serviceManager: ServiceManager;
}

/**
 * Renders a ChatContainer and returns the ChatInstance.
 *
 * @param config - The PublicConfig to use for rendering
 * @returns Promise that resolves to the ChatInstance
 */
export const renderChatAndGetInstance = async (
  config: PublicConfig,
): Promise<ChatInstance> => {
  let capturedInstance: ChatInstance | null = null;
  const onBeforeRender = jest.fn((instance) => {
    capturedInstance = instance;
  });

  render(
    React.createElement(ChatContainer, {
      ...config,
      onBeforeRender,
    }),
  );

  await waitFor(
    () => {
      expect(capturedInstance).not.toBeNull();
    },
    { timeout: 5000 },
  );

  return capturedInstance;
};

/**
 * Renders a ChatContainer and returns the ChatInstance along with store and serviceManager.
 * This is useful for tests that need to inspect or manipulate internal state.
 *
 * @param config - The PublicConfig to use for rendering
 * @returns Promise that resolves to an object containing instance, store, and serviceManager
 */
export const renderChatAndGetInstanceWithStore = async (
  config: PublicConfig,
): Promise<ChatInstanceWithStore> => {
  let capturedInstance: ChatInstance | null = null;
  const onBeforeRender = jest.fn((instance) => {
    capturedInstance = instance;
  });

  render(
    React.createElement(ChatContainer, {
      ...config,
      onBeforeRender,
    }),
  );

  await waitFor(
    () => {
      expect(capturedInstance).not.toBeNull();
    },
    { timeout: 5000 },
  );

  const serviceManager = (capturedInstance as ChatInstance).serviceManager;
  const store = serviceManager.store;

  return {
    instance: capturedInstance,
    store,
    serviceManager,
  };
};

// ============================================================================
// Setup helpers
// ============================================================================

/**
 * Standard beforeEach setup for tests.
 * Clears all Jest mocks to ensure clean state between tests.
 */
export const setupBeforeEach = () => {
  jest.clearAllMocks();
};

/**
 * Standard afterEach cleanup for tests.
 * Clears the document body to ensure clean DOM between tests.
 */
export const setupAfterEach = () => {
  document.body.innerHTML = "";
};
