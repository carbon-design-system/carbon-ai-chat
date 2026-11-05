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

import { createBaseTestProps, mockCustomSendMessage } from '../../test_helpers';

import { applyConfigChangesDynamically } from '../../../src/chat/utils/dynamicConfigUpdates';

import { doCreateStore } from '../../../src/shared/store/doCreateStore';

import { ServiceManager } from '../../../src/shared/services/ServiceManager';

import { NamespaceService } from '../../../src/shared/services/NamespaceService';

import { PublicConfig } from '../../../src/types/config/PublicConfig';

import { withView } from '../../test_helpers';

describe('Config Messaging', () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('messaging', () => {
    it('should store complete messaging config in Redux state', async () => {
      const mockCustomLoadHistory = jest.fn();
      const messaging = {
        skipWelcome: true,
        messageTimeoutSecs: 120,
        messageLoadingIndicatorTimeoutSecs: 5,
        customSendMessage: mockCustomSendMessage,
        customLoadHistory: mockCustomLoadHistory,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        messaging,
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
      expect(state.config.public.messaging).toEqual(messaging);
    });

    it('should store messaging with skipWelcome only', async () => {
      const messaging = {
        skipWelcome: false,
        customSendMessage: mockCustomSendMessage,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        messaging,
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
      expect(state.config.public.messaging).toEqual(messaging);
    });

    it('should store messaging with timeout settings', async () => {
      const messaging = {
        messageTimeoutSecs: 180,
        messageLoadingIndicatorTimeoutSecs: 10,
        customSendMessage: mockCustomSendMessage,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        messaging,
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
      expect(state.config.public.messaging).toEqual(messaging);
    });

    it('should store messaging with custom functions', async () => {
      const mockCustomLoadHistory = jest.fn();
      const messaging = {
        customSendMessage: mockCustomSendMessage,
        customLoadHistory: mockCustomLoadHistory,
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        messaging,
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
      expect(state.config.public.messaging).toEqual(messaging);
    });

    describe('Dynamic Messaging Config Updates', () => {
      let serviceManager: ServiceManager;

      beforeEach(() => {
        const initialConfig: PublicConfig = {
          assistantName: 'Test Assistant',
        };

        const store = withView(
          doCreateStore(initialConfig, {} as ServiceManager),
          initialConfig
        );
        serviceManager = {
          store,
          namespace: new NamespaceService('test'),
          messageCoordinator: { timeoutMS: 30000 } as any,
          humanAgentService: null,
        } as unknown as ServiceManager;
      });

      it('should handle messaging config changes and update message service', async () => {
        const previousConfig: PublicConfig = {
          messaging: {
            messageTimeoutSecs: 30,
          },
        };

        const newConfig: PublicConfig = {
          messaging: {
            messageTimeoutSecs: 60,
          },
        };

        await applyConfigChangesDynamically(
          previousConfig,
          newConfig,
          serviceManager
        );

        const state = serviceManager.store.getState();
        expect(state.config.public.messaging?.messageTimeoutSecs).toBe(60);
        expect(serviceManager.messageCoordinator?.timeoutMS).toBe(60000);
      });

      describe('showStopButtonImmediately config', () => {
        it('should store showStopButtonImmediately when set to true', async () => {
          const messaging = {
            customSendMessage: mockCustomSendMessage,
            showStopButtonImmediately: true,
          };

          const props: Partial<ChatContainerProps> = {
            ...createBaseProps(),
            messaging,
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
          expect(state.config.public.messaging?.showStopButtonImmediately).toBe(
            true
          );
        });

        it('should store showStopButtonImmediately when set to false', async () => {
          const messaging = {
            customSendMessage: mockCustomSendMessage,
            showStopButtonImmediately: false,
          };

          const props: Partial<ChatContainerProps> = {
            ...createBaseProps(),
            messaging,
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
          expect(state.config.public.messaging?.showStopButtonImmediately).toBe(
            false
          );
        });

        it('should default showStopButtonImmediately to undefined when not provided', async () => {
          const messaging = {
            customSendMessage: mockCustomSendMessage,
          };

          const props: Partial<ChatContainerProps> = {
            ...createBaseProps(),
            messaging,
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
          expect(
            state.config.public.messaging?.showStopButtonImmediately
          ).toBeUndefined();
        });
      });
    });
  });
});
