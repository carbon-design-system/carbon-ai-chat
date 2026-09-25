/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { cleanup, render, waitFor, act } from '@testing-library/react';
// Production defers this module for SSR. Load it here so cold Jest transforms
// finish before tests start timing mount readiness.
import '../src/chat/ChatAppEntry';
import { ChatContainer } from '../src/react/ChatContainer';
import { PublicConfig } from '../src/types/config/PublicConfig';
import { ChatContainerProps } from '../src/types/component/ChatContainer';
import { ChatInstance } from '../src/types/instance/ChatInstance';
import { createAppStore, type AppStore } from '../src/chat/store/appStore';
import { AppState } from '../src/types/state/AppState';
import { MessageResponseTypes } from '../src/types/messaging/Messages';
import { ServiceManager } from '../src/chat/services/ServiceManager';
import { reducers } from '../src/chat/store/reducers';
import actions from '../src/chat/store/actions';
import isEqual from 'lodash-es/isEqual.js';
import {
  buildLanguagePack,
  createAppConfig,
  createInitialState,
  reconcileAppConfigReferences,
} from '../src/chat/store/doCreateStore';

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
 * Adds a message holding one `user_defined` item, so a host's
 * `renderUserDefinedResponse` gets a slot to render into.
 */
export async function addUserDefinedResponse(
  instance: ChatInstance,
  id: string,
  userDefined: Record<string, unknown> = {}
) {
  await act(async () => {
    await instance.messaging.addMessage({
      id,
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: userDefined,
          },
        ],
      },
    });
  });
}

/**
 * The element that hosts the chat app. `ChatContainer` and
 * `ChatCustomElement` render `cds-aichat-container`, and the app lives in its
 * shadow root.
 *
 * @param root - Where to search. Defaults to the whole document.
 */
export function getChatHost(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>('cds-aichat-container');
}

/**
 * The shadow root the chat app renders into.
 *
 * @param root - Where to search for the host. Defaults to the whole document.
 */
export function getChatShadowRoot(
  root: ParentNode = document
): ShadowRoot | null {
  return getChatHost(root)?.shadowRoot ?? null;
}

/**
 * Interface for the return value when rendering chat with store access.
 */
export interface ChatInstanceWithStore {
  instance: ChatInstance;
  store: AppStore<AppState>;
  serviceManager: ServiceManager;
}

/**
 * Renders a ChatContainer and returns the ChatInstance once the chat has
 * rendered.
 *
 * @param config - The PublicConfig to use for rendering
 * @returns Promise that resolves to the ChatInstance
 */
export const renderChatAndGetInstance = async (
  config: PublicConfig
): Promise<ChatInstance> => {
  let capturedInstance: ChatInstance | null = null;
  let rendered = false;
  const onBeforeRender = jest.fn((instance) => {
    capturedInstance = instance;
  });
  // The chat hands the instance over before it renders, so callers that go on
  // to drive the UI have to wait for the render too.
  const onAfterRender = jest.fn(() => {
    rendered = true;
  });

  render(
    React.createElement(ChatContainer, {
      ...config,
      onBeforeRender,
      onAfterRender,
    })
  );

  await waitFor(
    () => {
      expect(capturedInstance).not.toBeNull();
      expect(rendered).toBe(true);
    },
    { timeout: 5000 }
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
  config: PublicConfig
): Promise<ChatInstanceWithStore> => {
  const capturedInstance = await renderChatAndGetInstance(config);
  const serviceManager = capturedInstance.serviceManager;
  const store = serviceManager.store;

  return {
    instance: capturedInstance,
    store,
    serviceManager,
  };
};

// ============================================================================
// Store / config-change re-render harness
// ============================================================================

/** The real root reducer (mirrors `reducerFunction` in doCreateStore). */
const rootReducer = (
  state: AppState,
  action: { type: string; [key: string]: unknown } | undefined
): AppState =>
  action && reducers[action.type]
    ? reducers[action.type](state, action)
    : state;

/**
 * Builds a real store seeded from a PublicConfig, exactly the way doCreateStore
 * does. Use with {@link applyConfigChange} to drive runtime config updates in
 * re-render tests.
 */
export function makeConfigStore(config: PublicConfig): AppStore<AppState> {
  return createAppStore<AppState>(
    rootReducer as never,
    createInitialState(createAppConfig(config))
  );
}

/**
 * Applies a runtime config change the way `applyConfigChangesDynamically` does:
 * rebuild the AppConfig, reconcile references against the stored config, then
 * dispatch the wholesale `changeState({ config })`. Reference reconciliation is
 * what lets narrowed selectors skip re-rendering on unrelated changes.
 */
export function applyConfigChange(
  store: AppStore<AppState>,
  nextConfig: PublicConfig
): void {
  const prevConfig = store.getState().config;
  const next = createAppConfig(nextConfig);
  const reconciled = reconcileAppConfigReferences(prevConfig, next);
  act(() => {
    store.dispatch(actions.changeState({ config: reconciled }));
    // Mirror applyConfigChangesDynamically: the language pack lives in its own
    // slice, so a config-provided `strings` change is synced separately (and
    // only when `strings` actually changed, so unrelated config edits don't
    // churn it).
    if (!isEqual(prevConfig.public.strings, nextConfig.strings)) {
      const nextLanguagePack = buildLanguagePack(nextConfig.strings);
      if (!isEqual(store.getState().languagePack, nextLanguagePack)) {
        store.dispatch(
          actions.setAppStateValue('languagePack', nextLanguagePack)
        );
      }
    }
  });
}

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
 * Unmounts rendered React trees (running effect/component cleanup) before
 * clearing the DOM, so jsdom/Lit/timer state does not accumulate across the
 * many specs sharing a Jest worker.
 */
export const setupAfterEach = () => {
  cleanup();
  document.body.innerHTML = '';
};
