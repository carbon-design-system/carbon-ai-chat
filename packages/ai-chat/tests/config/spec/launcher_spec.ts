/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

import { ChatContainer } from '../../../src/react/ChatContainer';

import { ChatContainerProps } from '../../../src/types/component/ChatContainer';

import { createBaseTestProps } from '../../test_helpers';

import { applyConfigChangesDynamically } from '../../../src/chat/utils/dynamicConfigUpdates';

import { doCreateStore } from '../../../src/sdk/store/doCreateStore';

import { ServiceManager } from '../../../src/sdk/services/ServiceManager';

import { NamespaceService } from '../../../src/sdk/services/NamespaceService';

import { PublicConfig } from '../../../src/types/config/PublicConfig';

import { chatStore } from '../../../src/chat/services/attachChatView';

import { withView } from '../../test_helpers';

describe('Config Launcher', () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('launcher', () => {
    it('should store launcher.isOn: true in Redux state', async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        launcher: { isOn: true },
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
      const state = store.getState();
      expect(state.view.derivedConfig.launcher.isOn).toBe(true);
    });

    it('should store launcher.isOn: false in Redux state', async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        launcher: { isOn: false },
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
      const state = store.getState();
      expect(state.view.derivedConfig.launcher.isOn).toBe(false);
    });

    it('should use default launcher.isOn value when not specified', async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        // launcher intentionally omitted
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
      const state = store.getState();
      expect(state.view.derivedConfig.launcher.isOn).toBe(true); // default value
    });

    it('should set launcher.showUnreadIndicator in persisted state', async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        launcher: { showUnreadIndicator: true },
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
      const state = store.getState();
      expect(state.view.persistedToBrowserStorage.showUnreadIndicator).toBe(
        true
      );
      expect(state.config.public.launcher?.showUnreadIndicator).toBe(true);
    });
  });

  describe('openChatByDefault', () => {
    it('should store openChatByDefault: true in Redux state', async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        openChatByDefault: true,
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
      const state = store.getState();
      expect(state.config.public.openChatByDefault).toBe(true);
    });

    it('should store openChatByDefault: false in Redux state', async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        openChatByDefault: false,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          ...props,
          onBeforeRender,
        })
      );

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 }
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state = store.getState();
      expect(state.config.public.openChatByDefault).toBe(false);
    });

    it('should use default openChatByDefault value when not specified', async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        // openChatByDefault intentionally omitted
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          ...props,
          onBeforeRender,
        })
      );

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 }
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state = store.getState();
      expect(state.config.public.openChatByDefault).toBe(false); // default value
    });
  });

  describe('Dynamic Launcher Config Updates', () => {
    let serviceManager: ServiceManager;

    beforeEach(() => {
      const initialConfig: PublicConfig = {
        assistantName: 'Test Assistant',
      };

      const store = withView(
        doCreateStore({ public: initialConfig }, {} as ServiceManager),
        initialConfig
      );
      serviceManager = {
        store,
        namespace: new NamespaceService('test'),
        messageCoordinator: { timeoutMS: 30000 } as any,
        humanAgentService: null,
      } as unknown as ServiceManager;
    });

    it('should handle launcher config changes dynamically', async () => {
      const previousConfig: PublicConfig = {
        launcher: {
          isOn: true,
          desktop: { title: 'Old Desktop Title' },
          mobile: { title: 'Old Mobile Title' },
        },
      };

      const newConfig: PublicConfig = {
        launcher: {
          isOn: false,
          desktop: { title: 'New Desktop Title' },
          mobile: { title: 'New Mobile Title' },
        },
      };

      await applyConfigChangesDynamically(
        previousConfig,
        newConfig,
        serviceManager
      );

      const state = chatStore(serviceManager).getState();
      expect(state.config.public.launcher?.isOn).toBe(false);
      expect(state.config.public.launcher?.desktop?.title).toBe(
        'New Desktop Title'
      );
      expect(state.config.public.launcher?.mobile?.title).toBe(
        'New Mobile Title'
      );
    });

    it('should handle showUnreadIndicator changes dynamically', async () => {
      const previousConfig: PublicConfig = {
        launcher: {
          showUnreadIndicator: false,
        },
      };

      const newConfig: PublicConfig = {
        launcher: {
          showUnreadIndicator: true,
        },
      };

      await applyConfigChangesDynamically(
        previousConfig,
        newConfig,
        serviceManager
      );

      const state = chatStore(serviceManager).getState();
      expect(state.view.persistedToBrowserStorage.showUnreadIndicator).toBe(
        true
      );
      expect(state.config.public.launcher?.showUnreadIndicator).toBe(true);
    });
  });
});
