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
import { createBaseTestProps } from "../../utils/testHelpers";
import { ChatInstance } from "../../../src/types/instance/ChatInstance";
import type { AppStore } from "../../../src/chat/store/appStore";
import { AppState } from "../../../src/types/state/AppState";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";

export const createBaseConfig = (): PublicConfig => ({
  ...createBaseTestProps(),
});

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

export const setupBeforeEach = () => {
  jest.clearAllMocks();
};

export const setupAfterEach = () => {
  document.body.innerHTML = "";
};

export interface ChatInstanceWithStore {
  instance: ChatInstance;
  store: AppStore<AppState>;
  serviceManager: ServiceManager;
}

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
