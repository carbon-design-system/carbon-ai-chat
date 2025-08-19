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
import { ChatInstance } from "../../../src/types/instance/ChatInstance";
import { ServiceManager } from "../../../src/chat/shared/services/ServiceManager";
import { Store } from "redux";
import { AppState } from "../../../src/types/state/AppState";

export const createBaseConfig = (): PublicConfig => ({
  ...createBaseTestConfig(),
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
  store: Store<AppState>;
  serviceManager: ServiceManager;
}

export const renderChatAndGetInstanceWithStore = async (
  config: PublicConfig,
): Promise<ChatInstanceWithStore> => {
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

  const serviceManager = (capturedInstance as ChatInstance).serviceManager;
  const store = serviceManager.store;

  return {
    instance: capturedInstance,
    store,
    serviceManager,
  };
};
