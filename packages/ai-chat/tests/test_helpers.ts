/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactNode, useMemo } from 'react';
import { cleanup, render, waitFor, act } from '@testing-library/react';
// Production defers this module for SSR. Load it here so cold Jest transforms
// finish before tests start timing mount readiness.
import '../src/chat/ChatAppEntry';
import { ChatContainer } from '../src/react/ChatContainer';
import { PublicConfig } from '../src/types/config/PublicConfig';
import { ChatContainerProps } from '../src/types/component/ChatContainer';
import { ChatInstance } from '../src/types/instance/ChatInstance';
import {
  createStoreFromReduction,
  type AppStore,
} from '../src/sdk/store/appStore';
import { enableMessageOwnership } from '../src/sdk/store/messageOwnership';
import { AppState } from '../src/types/state/AppState';
import { MessageResponseTypes } from '../src/types/messaging/Messages';
import { ServiceManager } from '../src/sdk/services/ServiceManager';
import { slotSource, type SlotSource } from '../src/sdk/services/slotTracking';
import { ChatMountState } from '../src/chat/services/chatMountState';
import type { AriaAnnouncerFunctionType } from '../src/chat/services/ariaAnnouncer';
import { ChatContext } from '../src/chat/contexts/ChatContext';
import type { IntlShape } from '../src/sdk/utils/i18n';
import { getWindowSize } from '../src/chat/utils/windowSize';
import { reduceWithMessageOwnership } from '../src/sdk/store/reducers';
import actions from '../src/sdk/store/actions';
import isEqual from 'lodash-es/isEqual.js';
import {
  buildLanguagePack,
  createInitialState,
} from '../src/sdk/store/doCreateStore';
import { createDerivedConfig } from '../src/chat/utils/appConfig';
import { viewActions } from '../src/chat/state';
import { reconcileAppConfigReferences } from '../src/sdk/utils/reconcileConfig';
import { chatStore } from '../src/chat/services/attachChatView';
import { attachStorePartition } from '../src/sdk/store/attachStorePartition';
import { PublicStateService } from '../src/sdk/services/PublicStateService';
import { EventBus } from '../src/sdk/events/EventBus';
import { viewReducer } from '../src/chat/state/reducer';
import { createInitialViewState } from '../src/chat/state/initialState';
import type { ConversationState } from '../src/types/state/AppState';
import {
  itemIDsByLocalID,
  planStateMessageItems,
} from '../src/sdk/utils/publicMessageItems';

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
  const store = chatStore(serviceManager);

  return {
    instance: capturedInstance,
    store,
    serviceManager,
  };
};

// ============================================================================
// Chat context helpers
// ============================================================================

export interface TestChatContextOptions {
  /** The store `useSelector` reads. Ignored when `serviceManager` has one. */
  store?: AppStore<any, any>;
  /** The formatter `useIntl` reads. Ignored when `serviceManager` has one. */
  intl?: IntlShape;
  /**
   * A stub service manager. It gains `store` and `intl` when it lacks them,
   * and must not already hold a different one.
   */
  serviceManager?: object;
  /** Replaces the announcer's `announce`, which `useAriaAnnouncer` returns. */
  announce?: AriaAnnouncerFunctionType;
}

/**
 * Builds a chat view state for a component or hook spec, the way the
 * container does for a mount. It is not connected, so formatter changes do
 * not reach it.
 */
export function createTestViewState({
  store,
  intl,
  serviceManager = {},
  announce,
}: TestChatContextOptions = {}): ChatMountState {
  const manager = serviceManager as ServiceManager;
  if (
    (store && manager.store && manager.store !== store) ||
    (intl && manager.intl && manager.intl !== intl)
  ) {
    throw new Error(
      'The stub service manager already holds a different store or intl.'
    );
  }
  manager.store ??= store;
  manager.intl ??= intl;
  const viewState = new ChatMountState(manager, getWindowSize());
  if (announce) {
    viewState.announcer.announce = announce;
  }
  return viewState;
}

/**
 * Provides a chat view state built from these options. It builds a new one
 * only when an option's identity changes, as a remount would.
 */
export function TestChatContext({
  store,
  intl,
  serviceManager,
  announce,
  children,
}: TestChatContextOptions & { children?: ReactNode }) {
  const viewState = useMemo(
    () => createTestViewState({ store, intl, serviceManager, announce }),
    [store, intl, serviceManager, announce]
  );
  return React.createElement(
    ChatContext.Provider,
    { value: viewState },
    children
  );
}

// ============================================================================
// Store / config-change re-render harness
// ============================================================================

/**
 * Runs one action through both partitions the way the store does: the
 * conversation reducer, then the view's with the conversation state after it
 * and before it.
 */
export function appRootReducer(
  state: AppState,
  action: { type: string; [key: string]: unknown }
): AppState {
  const conversation = reduceWithMessageOwnership(state, action)
    .state as AppState;
  const view = viewReducer(state.view, action, conversation, state);
  return Object.is(view, conversation.view)
    ? conversation
    : { ...conversation, view };
}

/**
 * Builds a real store seeded from a PublicConfig, exactly the way doCreateStore
 * does. Use with {@link applyConfigChange} to drive runtime config updates in
 * re-render tests.
 */
export function makeConfigStore(config: PublicConfig): AppStore<AppState> {
  const store = createStoreFromReduction<ConversationState>(
    reduceWithMessageOwnership,
    createInitialState({ public: config })
  );
  enableMessageOwnership(store);
  return withView(store, config);
}

/**
 * Gives a service manager made without boot the public state a booted chat
 * reads through `instance.state`, built from its store. It adds an event bus
 * when the manager has none, as boot always creates one; a spec about a
 * missing bus can't use it.
 */
export function withPublicState<Manager extends Pick<ServiceManager, 'store'>>(
  manager: Manager
): Manager {
  const { eventBus = new EventBus() } = manager as Partial<ServiceManager>;
  const service = new PublicStateService(
    Object.assign(manager, { eventBus }) as unknown as ServiceManager
  );
  Object.assign(manager, {
    publicStateService: service,
    instance: {
      ...(manager as Partial<ServiceManager>).instance,
      state: {
        get: service.get,
        subscribe: service.subscribe,
        select: service.select,
      },
    },
  });
  return manager;
}

/**
 * Attaches the view partition to a store made without the shell, as a mounted
 * chat does at boot, and returns the store typed for `chat/`.
 */
export function withView(
  store: AppStore<ConversationState>,
  config: PublicConfig = {}
): AppStore<AppState> {
  attachStorePartition(
    { store },
    'view',
    viewReducer,
    createInitialViewState(config, null)
  );
  return store as unknown as AppStore<AppState>;
}

/**
 * Applies a runtime config change the way `applyConfigChangesDynamically` does:
 * reconcile references against the stored config, dispatch the wholesale
 * `changeState({ config })`, then the view's derived values. Reference
 * reconciliation is what lets narrowed selectors skip re-rendering on
 * unrelated changes.
 */
export function applyConfigChange(
  store: AppStore<ConversationState>,
  nextConfig: PublicConfig
): void {
  const prevConfig = chatStore({ store }).getState().config;
  const reconciled = reconcileAppConfigReferences(prevConfig, {
    public: nextConfig,
  });
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
    store.dispatch(
      viewActions.setDerivedConfig(createDerivedConfig(nextConfig))
    );
  });
}

// ============================================================================
// Setup helpers
// ============================================================================

/**
 * Unmounts the rendered chats but keeps this one's services running, so a
 * spec can drive a chat with no view attached. Removing a host shuts its chat
 * down (#1681); until the SDK starts a chat without a host (#1732), this
 * stands in for one.
 */
export function unmountKeepingServices(instance: ChatInstance) {
  // `instance.serviceManager` is a plain copy; the coordinator holds the real one.
  const manager = (
    instance.serviceManager.messageCoordinator as unknown as {
      serviceManager: ServiceManager;
    }
  ).serviceManager;
  jest.spyOn(manager, 'shutdown').mockResolvedValue(undefined);
  cleanup();
}

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

/**
 * A slot source for an `ExtensionHosts` built outside a chat: the tracking
 * listens on `events`, the instance or event bus the spec fires through.
 */
export function slotSourceOf(events: unknown): SlotSource {
  const eventBus =
    events && typeof (events as { on?: unknown }).on === 'function'
      ? events
      : { on: (): void => undefined };
  return slotSource({ eventBus } as unknown as ServiceManager);
}

/**
 * The view's flags for the item a local item draws, which the view partition
 * keys by public item ID.
 */
export function itemFlagsFor(state: AppState, localItemID: string) {
  const itemID = itemIDsByLocalID(planStateMessageItems(state)).get(
    localItemID
  );
  return itemID === undefined ? undefined : state.view.messageItemFlags[itemID];
}

/** What the view records the item a local item draws as missing, if the chat can't draw it. */
export function cannotDrawOf(state: AppState, localItemID: string) {
  return itemFlagsFor(state, localItemID)?.cannotDraw;
}

/** Each drawn local item whose view flags record a choice, with the request it sent. */
export function itemsWithOptionSelected(state: AppState) {
  return planStateMessageItems(state).flatMap((plan) => {
    const optionSelected = state.view.messageItemFlags[plan.id]?.optionSelected;
    return optionSelected ? [{ local: plan.local, optionSelected }] : [];
  });
}

/**
 * Whether the view waits to announce the item a local item draws: `undefined`
 * when the list doesn't draw the local item, else whether its view flags ask
 * for an announcement.
 */
export function needsAnnouncementOf(
  state: AppState,
  localItemID: string
): boolean | undefined {
  const itemID = itemIDsByLocalID(planStateMessageItems(state)).get(
    localItemID
  );
  return itemID === undefined
    ? undefined
    : Boolean(state.view.messageItemFlags[itemID]?.needsAnnouncement);
}
