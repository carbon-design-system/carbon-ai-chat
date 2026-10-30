/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { MinimizeButtonIconType } from '../../../src/types/config/HeaderConfig';
import { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import { createBaseTestProps } from '../../test_helpers';
import { AppState } from '../../../src/types/state/AppState';
import { applyConfigChangesDynamically } from '../../../src/chat/utils/dynamicConfigUpdates';
import { doCreateStore } from '../../../src/chat/store/doCreateStore';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { NamespaceService } from '../../../src/chat/services/NamespaceService';
import { PublicConfig } from '../../../src/types/config/PublicConfig';
import actions from '../../../src/chat/store/actions';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { BusEventType } from '../../../src/types/events/eventBusTypes';

describe('Config Header', () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('header', () => {
    it('should store complete header in state', async () => {
      const header = {
        minimizeButtonIconType: MinimizeButtonIconType.SIDE_PANEL_LEFT,
        hideMinimizeButton: true,
        showRestartButton: false,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        header,
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
        { timeout: 5000 }
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.header).toEqual(header);
    });

    it('should store header with minimize icon type only', async () => {
      const header = {
        minimizeButtonIconType: MinimizeButtonIconType.CLOSE,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        header,
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
        { timeout: 5000 }
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.header).toEqual(header);
    });

    it('should store header with button visibility flags', async () => {
      const header = {
        hideMinimizeButton: false,
        showRestartButton: true,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        header,
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
        { timeout: 5000 }
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.header).toEqual(header);
    });

    it('should store header with showAiLabel flag', async () => {
      const header = {
        showAiLabel: false,
        showRestartButton: true,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        header,
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
        { timeout: 5000 }
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.header).toEqual(header);
    });

    it('should handle undefined header in state', async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        // header intentionally omitted
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
        { timeout: 5000 }
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.header).toBeUndefined();
    });
  });

  describe('Dynamic Header Config Updates', () => {
    let serviceManager: ServiceManager;

    beforeEach(() => {
      const initialConfig: PublicConfig = {
        assistantName: 'Test Assistant',
      };

      const store = doCreateStore(initialConfig, {} as ServiceManager);
      serviceManager = {
        store,
        namespace: new NamespaceService('test'),
        messageService: { timeoutMS: 30000 } as any,
        humanAgentService: null,
      } as ServiceManager;
    });

    it('should handle header config changes dynamically', async () => {
      const previousConfig: PublicConfig = {
        header: {
          title: 'Old Header',
          hideMinimizeButton: false,
        },
      };

      const newConfig: PublicConfig = {
        header: {
          title: 'New Header',
          hideMinimizeButton: true,
          showRestartButton: true,
          showAiLabel: false,
        },
      };

      await applyConfigChangesDynamically(
        previousConfig,
        newConfig,
        serviceManager
      );

      const state: AppState = serviceManager.store.getState();
      expect(state.config.public.header?.title).toBe('New Header');
      expect(state.config.public.header?.hideMinimizeButton).toBe(true);
      expect(state.config.public.header?.showRestartButton).toBe(true);
      expect(state.config.public.header?.showAiLabel).toBe(false);
    });
  });
});

/**
 * PLAN-3 O1: the assistant, agent, home and mobile-history views keep their
 * header controls through the real `ChatContainer` and its `Header` wrapper.
 * The store-state cases above render no header, so these mount the chat.
 */
describe('header controls through the ChatContainer wrapper', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    // Each case starts from a fresh home-screen and view state.
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  async function mountChat(props: Partial<ChatContainerProps>) {
    let instance: ChatInstance;
    const after = jest.fn();
    render(
      React.createElement(ChatContainer, {
        ...createBaseTestProps(),
        openChatByDefault: true,
        shouldTakeFocusIfOpensAutomatically: false,
        ...props,
        onBeforeRender: (chat: ChatInstance) => {
          instance = chat;
        },
        onAfterRender: after,
      })
    );
    await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    const store = (instance as any).serviceManager.store;
    const base = () =>
      document.querySelector('cds-aichat-container')?.shadowRoot?.querySelector<
        HTMLElement & {
          headerTitle?: string;
          navigationType?: string;
          navigationOverflowItems?: { text: string; onClick?: () => void }[];
          actions?: { text: string }[];
        }
      >('cds-aichat-header-view cds-aichat-chat-header');
    await waitFor(() => expect(base()).toBeTruthy());
    return { instance, store, base };
  }

  it('keeps the assistant view title and actions', async () => {
    const { base } = await mountChat({
      homescreen: { isOn: false },
      header: { title: 'Assistant header', showRestartButton: true },
    });
    await waitFor(() => expect(base().headerTitle).toBe('Assistant header'));
    expect(base().navigationType).toBe('none');
    expect(base().actions.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the home view controls and the back control after leaving home', async () => {
    const { store, base } = await mountChat({
      homescreen: { isOn: true, greeting: 'Welcome' },
      header: { title: 'Home header' },
    });
    await waitFor(() => expect(base().headerTitle).toBe('Home header'));
    await waitFor(() => expect(base().navigationType).toBe('none'));
    act(() => {
      store.dispatch(actions.toggleHomeScreen());
    });
    await waitFor(() => expect(base().navigationType).toBe('back'));
  });

  it('hides the home control while an agent is connecting', async () => {
    const { store, base } = await mountChat({
      homescreen: { isOn: true, greeting: 'Welcome' },
    });
    act(() => {
      store.dispatch(actions.toggleHomeScreen());
    });
    await waitFor(() => expect(base().navigationType).toBe('back'));
    act(() => {
      store.dispatch(
        actions.setAppStateValue('humanAgentState', {
          ...store.getState().humanAgentState,
          isConnecting: true,
        })
      );
    });
    await waitFor(() => expect(base().navigationType).toBe('none'));
  });

  it('keeps the mobile history menu and fires its new-chat event', async () => {
    const { instance, store, base } = await mountChat({
      homescreen: { isOn: false },
      history: { isOn: true },
    });
    const newChat = jest.fn();
    instance.on({
      type: BusEventType.HISTORY_PANEL_NEW_CHAT,
      handler: newChat,
    });
    act(() => {
      store.dispatch({
        type: 'SET_HISTORY_PANEL_OPTIONS',
        isMobile: true,
        isOpen: false,
      });
    });
    const { languagePack } = store.getState();
    await waitFor(() => expect(base().navigationType).toBe('overflow'));
    const items = base().navigationOverflowItems;
    expect(items.map((item) => item.text)).toEqual(
      expect.arrayContaining([
        languagePack.history_new_chat,
        languagePack.history_view_chats,
      ])
    );
    act(() => {
      items
        .find((item) => item.text === languagePack.history_new_chat)
        .onClick();
    });
    expect(newChat).toHaveBeenCalledTimes(1);
  });
});
