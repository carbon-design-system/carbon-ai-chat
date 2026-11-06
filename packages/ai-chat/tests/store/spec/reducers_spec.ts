/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createAppStore } from '../../../src/shared/store/appStore';

import { buildLanguagePack } from '../../../src/shared/store/doCreateStore';
import { createAppConfig } from '../../../src/chat/utils/appConfig';

import actions from '../../../src/shared/store/actions';
import { AppState } from '../../../src/types/state/AppState';

import {
  HeaderConfig,
  MinimizeButtonIconType,
} from '../../../src/types/config/HeaderConfig';

import {
  DEFAULT_INPUT_STATE,
  DEFAULT_CHAT_MESSAGES_STATE,
  DEFAULT_PERSISTED_TO_BROWSER,
  DEFAULT_HUMAN_AGENT_STATE,
} from '../../../src/shared/store/reducerUtils';

import {
  DEFAULT_HISTORY_PANEL_STATE,
  DEFAULT_WORKSPACE_PANEL_STATE,
  viewActions,
} from '../../../src/view/state';
import { appRootReducer } from '../../test_helpers';

import { createInitialViewState } from '../../../src/view/state/initialState';

import { VIEW_STATE_ALL_CLOSED, viewHalfOf } from '../../../src/view/state';
import type { AppConfig } from '../../../src/types/state/AppConfig';
import type { ConversationState } from '../../../src/types/state/ConversationState';
import type { DeepPartial } from '../../../src/types/utilities/DeepPartial';

/** `changeState` as the shell calls it, with part of its whole `AppConfig`. */
function changeAppState(
  partialState: Omit<DeepPartial<ConversationState>, 'config'> & {
    config: DeepPartial<AppConfig>;
  }
) {
  return actions.changeState(partialState as DeepPartial<ConversationState>);
}

// Helper to create initial state like doCreateStore does
function createInitialAppState(): AppState {
  const config = createAppConfig({});

  return {
    config,
    languagePack: buildLanguagePack(config.public.strings),
    allMessageItemsByID: {},
    allMessagesByID: {},
    assistantMessageState: DEFAULT_CHAT_MESSAGES_STATE,
    isHydrated: false,
    isRestarting: false,
    conversationStatus: 'ready',
    assistantInputState: DEFAULT_INPUT_STATE,
    humanAgentState: DEFAULT_HUMAN_AGENT_STATE,
    persistedToBrowserStorage: {
      hasSentNonWelcomeMessage:
        DEFAULT_PERSISTED_TO_BROWSER.hasSentNonWelcomeMessage,
      humanAgentState: DEFAULT_PERSISTED_TO_BROWSER.humanAgentState,
    },
    view: {
      ...createInitialViewState(config.public, null),
      targetViewState: VIEW_STATE_ALL_CLOSED,
      historyPanelState: DEFAULT_HISTORY_PANEL_STATE,
      persistedToBrowserStorage: {
        ...viewHalfOf(DEFAULT_PERSISTED_TO_BROWSER),
        homeScreenState: {
          isHomeScreenOpen: false,
          showBackToAssistant: false,
        },
      },
    },
  };
}

describe('Store Reducers', () => {
  let store: ReturnType<typeof createAppStore<AppState>>;
  let initialState: AppState;

  beforeEach(() => {
    initialState = createInitialAppState();
    store = createAppStore(appRootReducer, initialState);
  });

  it('keeps metadata disablement separate from a pending stop click', () => {
    store.dispatch(actions.setStopStreamingButtonVisible(true));
    store.dispatch(actions.setStopStreamingButtonDisabled(true));
    store.dispatch(actions.setStopStreamingButtonMetadataDisabled(true));
    expect(
      store.getState().assistantInputState.stopStreamingButtonState
    ).toMatchObject({
      isVisible: true,
      isDisabled: true,
      isMetadataDisabled: true,
    });
    store.dispatch(actions.setStopStreamingButtonMetadataDisabled(false));
    expect(
      store.getState().assistantInputState.stopStreamingButtonState
    ).toMatchObject({
      isVisible: true,
      isDisabled: true,
      isMetadataDisabled: false,
    });
  });

  describe('CHANGE_STATE action', () => {
    it('should merge partial state updates correctly', () => {
      const currentState = store.getState();
      const newConfig = {
        config: {
          public: {
            debug: true,
            namespace: 'test-namespace',
          },
        },
      };

      store.dispatch(actions.changeState(newConfig));
      const updatedState = store.getState();

      expect((updatedState as AppState).config.public.debug).toBe(true);
      expect((updatedState as AppState).config.public.namespace).toBe(
        'test-namespace'
      );
      // Other config properties should remain unchanged
      expect((updatedState as AppState).config.public.aiEnabled).toBe(
        (currentState as AppState).config.public.aiEnabled
      );
    });

    it('should handle deep nested property updates', () => {
      const headerConfig: HeaderConfig = {
        title: 'Test Chat',
        name: 'Assistant',
        showRestartButton: true,
        minimizeButtonIconType: MinimizeButtonIconType.CLOSE,
      };

      store.dispatch(
        changeAppState({
          config: {
            public: {
              header: headerConfig,
            },
          },
        })
      );

      const state = store.getState() as AppState;
      expect(state.config.public.header?.title).toBe('Test Chat');
      expect(state.config.public.header?.name).toBe('Assistant');
      expect(state.config.public.header?.showRestartButton).toBe(true);
      expect(state.config.public.header?.minimizeButtonIconType).toBe(
        MinimizeButtonIconType.CLOSE
      );
    });

    describe('Property deletion behavior', () => {
      beforeEach(() => {
        // Set up initial state with header properties
        const initialHeaderConfig: HeaderConfig = {
          title: 'Initial Title',
          name: 'Initial Name',
          showRestartButton: true,
          hideMinimizeButton: false,
          minimizeButtonIconType: MinimizeButtonIconType.MINIMIZE,
          menuOptions: [
            { text: 'Help', handler: () => {} },
            { text: 'Settings', handler: () => {} },
          ],
        };

        store.dispatch(
          changeAppState({
            config: {
              public: {
                header: initialHeaderConfig,
              },
            },
          })
        );
      });

      it('should delete properties when they are explicitly set to undefined', () => {
        // Update with some properties explicitly undefined (deleted)
        const updatedHeaderConfig: HeaderConfig = {
          title: undefined, // Delete title
          name: 'Updated Name', // Keep name but change value
          showRestartButton: undefined, // Delete showRestartButton
          hideMinimizeButton: false, // Keep hideMinimizeButton
          // minimizeButtonIconType and menuOptions not included = should be deleted
        };

        store.dispatch(
          changeAppState({
            config: {
              public: {
                header: updatedHeaderConfig,
              },
            },
          })
        );

        const state = store.getState() as AppState;
        const header = state.config.public.header;

        // Properties explicitly set to undefined should be deleted
        expect(header?.title).toBeUndefined();
        expect(header?.showRestartButton).toBeUndefined();

        // Properties with values should be updated
        expect(header?.name).toBe('Updated Name');
        expect(header?.hideMinimizeButton).toBe(false);

        // Properties not included in the update should be deleted (replaced by new object)
        expect(header?.minimizeButtonIconType).toBeUndefined();
        expect(header?.menuOptions).toBeUndefined();
      });

      it('should completely replace nested objects when provided', () => {
        const newHeaderConfig: HeaderConfig = {
          title: 'New Title Only',
          // All other properties should be gone
        };

        store.dispatch(
          changeAppState({
            config: {
              public: {
                header: newHeaderConfig,
              },
            },
          })
        );

        const state = store.getState() as AppState;
        const header = state.config.public.header;

        expect(header?.title).toBe('New Title Only');
        expect(header?.name).toBeUndefined();
        expect(header?.showRestartButton).toBeUndefined();
        expect(header?.hideMinimizeButton).toBeUndefined();
        expect(header?.minimizeButtonIconType).toBeUndefined();
        expect(header?.menuOptions).toBeUndefined();
      });

      it('should handle empty objects (delete all properties)', () => {
        store.dispatch(
          changeAppState({
            config: {
              public: {
                header: {},
              },
            },
          })
        );

        const state = store.getState() as AppState;
        const header = state.config.public.header;

        expect(header).toEqual({});
        expect(header?.title).toBeUndefined();
        expect(header?.name).toBeUndefined();
        expect(header?.showRestartButton).toBeUndefined();
        expect(header?.hideMinimizeButton).toBeUndefined();
        expect(header?.minimizeButtonIconType).toBeUndefined();
        expect(header?.menuOptions).toBeUndefined();
      });

      it('should preserve other config properties when updating nested objects', () => {
        const originalDebug = (store.getState() as AppState).config.public
          .debug;
        const originalNamespace = (store.getState() as AppState).config.public
          .namespace;

        store.dispatch(
          changeAppState({
            config: {
              public: {
                header: {
                  title: 'Updated Title',
                },
              },
            },
          })
        );

        const state = store.getState() as AppState;

        // Header should be updated
        expect(state.config.public.header?.title).toBe('Updated Title');

        // Other config properties should be preserved
        expect(state.config.public.debug).toBe(originalDebug);
        expect(state.config.public.namespace).toBe(originalNamespace);
      });
    });

    it('should handle multiple nested property updates simultaneously', () => {
      store.dispatch(
        changeAppState({
          config: {
            public: {
              debug: true,
              header: {
                title: 'Multi Update Title',
                showRestartButton: false,
              },
              homescreen: {
                isOn: true,
                greeting: 'Hello World',
              },
            },
          },
          isHydrated: true,
        })
      );

      const state = store.getState() as AppState;

      expect(state.config.public.debug).toBe(true);
      expect(state.config.public.header?.title).toBe('Multi Update Title');
      expect(state.config.public.header?.showRestartButton).toBe(false);
      expect(state.config.public.homescreen?.isOn).toBe(true);
      expect(state.config.public.homescreen?.greeting).toBe('Hello World');
      expect(state.isHydrated).toBe(true);
    });

    it('should maintain reference equality when no actual changes occur', () => {
      const initialState = store.getState();

      // Dispatch the same state
      store.dispatch(actions.changeState(initialState));

      const afterEmptyUpdate = store.getState();
      expect(afterEmptyUpdate).toBe(initialState); // Should be same reference
    });

    it('should create new references when actual changes occur', () => {
      const initialState = store.getState();

      store.dispatch(
        actions.changeState({
          config: {
            public: {
              debug: !(initialState as AppState).config.public.debug,
            },
          },
        })
      );

      const updatedState = store.getState() as AppState;
      expect(updatedState).not.toBe(initialState); // Should be different reference
      expect(updatedState.config).not.toBe((initialState as AppState).config);
      expect(updatedState.config.public).not.toBe(
        (initialState as AppState).config.public
      );
    });

    it('preserves every non-config slice reference when only config changes', () => {
      const before = store.getState() as AppState;

      // A config-only dispatch must keep unrelated slice references stable.
      store.dispatch(
        actions.changeState({
          config: {
            public: {
              debug: !before.config.public.debug,
            },
          },
        })
      );

      const after = store.getState() as AppState;

      // Config changed...
      expect(after.config).not.toBe(before.config);

      // ...but every non-config slice keeps its identity.
      expect(after.assistantInputState).toBe(before.assistantInputState);
      expect(after.humanAgentState).toBe(before.humanAgentState);
      expect(after.persistedToBrowserStorage).toBe(
        before.persistedToBrowserStorage
      );
      expect(after.assistantMessageState).toBe(before.assistantMessageState);
      expect(after.allMessagesByID).toBe(before.allMessagesByID);
      expect(after.allMessageItemsByID).toBe(before.allMessageItemsByID);
      expect(after.view.customPanelState).toBe(before.view.customPanelState);
      expect(after.view.responsePanelState).toBe(
        before.view.responsePanelState
      );
    });

    it('still deep-merges a non-config slice update', () => {
      const before = store.getState() as AppState;

      store.dispatch(
        actions.changeState({
          assistantInputState: { isReadonly: true },
        })
      );

      const after = store.getState() as AppState;
      // The targeted slice is updated while unrelated slices stay stable.
      expect(after.assistantInputState).not.toBe(before.assistantInputState);
      expect(after.assistantInputState.isReadonly).toBe(true);
      expect(after.assistantInputState.stopStreamingButtonState).toBe(
        before.assistantInputState.stopStreamingButtonState
      );
      expect(after.allMessagesByID).toBe(before.allMessagesByID);
    });

    it('preserves nested branches outside a non-config deep patch', () => {
      const before = store.getState() as AppState;

      store.dispatch(
        actions.changeState({
          assistantInputState: {
            stopStreamingButtonState: { isDisabled: true },
          },
        })
      );

      const after = store.getState() as AppState;
      expect(after.assistantInputState).not.toBe(before.assistantInputState);
      expect(after.assistantInputState.stopStreamingButtonState).not.toBe(
        before.assistantInputState.stopStreamingButtonState
      );
      expect(after.assistantInputState.stopStreamingButtonState).toEqual({
        ...before.assistantInputState.stopStreamingButtonState,
        isDisabled: true,
      });
      expect(after.assistantInputState.content).toBe(
        before.assistantInputState.content
      );
      expect(after.assistantInputState.files).toBe(
        before.assistantInputState.files
      );
    });

    it('returns the current state for empty and equivalent patches', () => {
      const before = store.getState() as AppState;

      store.dispatch(actions.changeState({}));
      expect(store.getState()).toBe(before);

      store.dispatch(
        actions.changeState({
          assistantInputState: {
            isReadonly: before.assistantInputState.isReadonly,
            stopStreamingButtonState: {
              isDisabled:
                before.assistantInputState.stopStreamingButtonState.isDisabled,
            },
          },
        })
      );
      expect(store.getState()).toBe(before);
    });
  });

  describe('Other reducer actions', () => {
    it('should toggle the isRestarting flag', () => {
      expect((store.getState() as AppState).isRestarting).toBe(false);
      store.dispatch(actions.setIsRestarting(true));
      expect((store.getState() as AppState).isRestarting).toBe(true);
      store.dispatch(actions.setIsRestarting(false));
      expect((store.getState() as AppState).isRestarting).toBe(false);
    });

    it('should handle HYDRATE_CHAT action', () => {
      expect((store.getState() as AppState).isHydrated).toBe(false);

      store.dispatch({ type: 'HYDRATE_CHAT' });

      expect((store.getState() as AppState).isHydrated).toBe(true);
    });

    it('should handle SET_HOME_SCREEN_IS_OPEN action', () => {
      store.dispatch(viewActions.setHomeScreenIsOpen(true));
      expect(
        (store.getState() as AppState).view.persistedToBrowserStorage
          .homeScreenState.isHomeScreenOpen
      ).toBe(true);

      store.dispatch(viewActions.setHomeScreenIsOpen(false));
      expect(
        (store.getState() as AppState).view.persistedToBrowserStorage
          .homeScreenState.isHomeScreenOpen
      ).toBe(false);
    });

    it('should handle multiple action types in sequence', () => {
      // Test that multiple different actions work correctly together
      store.dispatch(
        changeAppState({
          config: {
            public: {
              header: { title: 'Test Title' },
            },
          },
        })
      );

      store.dispatch({ type: 'HYDRATE_CHAT' });
      store.dispatch(viewActions.setHomeScreenIsOpen(true));

      const state = store.getState() as AppState;
      expect(state.config.public.header?.title).toBe('Test Title');
      expect(state.isHydrated).toBe(true);
      expect(
        state.view.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen
      ).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null and undefined values gracefully', () => {
      expect(() => {
        store.dispatch(
          changeAppState({
            config: {
              public: {
                header: null as any,
              },
            },
          })
        );
      }).not.toThrow();

      const state = store.getState() as AppState;
      expect(state.config.public.header).toBeNull();
    });

    it('should handle deeply nested undefined values', () => {
      expect(() => {
        store.dispatch(
          changeAppState({
            config: {
              public: {
                header: {
                  title: undefined,
                  menuOptions: undefined,
                },
              },
            },
          })
        );
      }).not.toThrow();

      const state = store.getState() as AppState;
      expect(state.config.public.header?.title).toBeUndefined();
      expect(state.config.public.header?.menuOptions).toBeUndefined();
    });

    describe('Workspace Panel Data Management', () => {
      describe('SET_WORKSPACE_PANEL_DATA action', () => {
        it('should store workspace panel data correctly', () => {
          const mockLocalMessageItem = {
            id: 'msg-123',
            item: { type: 'preview_card', title: 'Test Card' },
          } as any;
          const mockFullMessage = {
            id: 'full-msg-123',
            output: { generic: [] },
          } as any;

          store.dispatch(
            viewActions.setWorkspacePanelData({
              workspaceID: 'workspace-456',
              localMessageItem: mockLocalMessageItem,
              fullMessage: mockFullMessage,
              additionalData: { userId: 'user-789', context: 'test' },
            })
          );

          const state = store.getState() as AppState;
          expect(state.view.workspacePanelState.workspaceID).toBe(
            'workspace-456'
          );
          expect(state.view.workspacePanelState.localMessageItem).toBe(
            mockLocalMessageItem
          );
          expect(state.view.workspacePanelState.fullMessage).toBe(
            mockFullMessage
          );
          expect(state.view.workspacePanelState.additionalData).toEqual({
            userId: 'user-789',
            context: 'test',
          });
        });

        it('should own additional data passed by the caller', () => {
          const additionalData = { nested: { value: 'original' } };

          store.dispatch(viewActions.setWorkspacePanelData({ additionalData }));
          additionalData.nested.value = 'mutated';

          const state = store.getState() as AppState;
          expect(state.view.workspacePanelState.additionalData).toEqual({
            nested: { value: 'original' },
          });
          expect(state.view.workspacePanelState.additionalData).not.toBe(
            additionalData
          );
        });

        it('should handle partial workspace data updates', () => {
          // First set some data
          store.dispatch(
            viewActions.setWorkspacePanelData({
              workspaceID: 'workspace-1',
              additionalData: { initial: 'data' },
            })
          );

          // Then update with different data
          store.dispatch(
            viewActions.setWorkspacePanelData({
              workspaceID: 'workspace-2',
              additionalData: { updated: 'data' },
            })
          );

          const state = store.getState() as AppState;
          expect(state.view.workspacePanelState.workspaceID).toBe(
            'workspace-2'
          );
          expect(state.view.workspacePanelState.additionalData).toEqual({
            updated: 'data',
          });
          expect(
            state.view.workspacePanelState.localMessageItem
          ).toBeUndefined();
          expect(state.view.workspacePanelState.fullMessage).toBeUndefined();
        });

        it('should handle undefined values in workspace data', () => {
          store.dispatch(
            viewActions.setWorkspacePanelData({
              workspaceID: undefined,
              localMessageItem: undefined,
              fullMessage: undefined,
              additionalData: undefined,
            })
          );

          const state = store.getState() as AppState;
          expect(state.view.workspacePanelState.workspaceID).toBeUndefined();
          expect(
            state.view.workspacePanelState.localMessageItem
          ).toBeUndefined();
          expect(state.view.workspacePanelState.fullMessage).toBeUndefined();
          expect(state.view.workspacePanelState.additionalData).toBeUndefined();
        });

        it('should preserve other workspace panel state properties', () => {
          // Set initial state with options
          store.dispatch(
            viewActions.setWorkspaceCustomPanelConfigOptions({
              preferredLocation: 'start',
            })
          );

          // Set workspace data
          store.dispatch(
            viewActions.setWorkspacePanelData({
              workspaceID: 'workspace-123',
            })
          );

          const state = store.getState() as AppState;
          expect(state.view.workspacePanelState.workspaceID).toBe(
            'workspace-123'
          );
          expect(state.view.workspacePanelState.options.preferredLocation).toBe(
            'start'
          );
          expect(state.view.workspacePanelState.isOpen).toBe(false);
        });
      });

      describe('SET_WORKSPACE_PANEL_OPEN action with cleanup', () => {
        beforeEach(() => {
          // Set up workspace data before each test
          const mockLocalMessageItem = {
            id: 'msg-123',
            item: { type: 'preview_card', title: 'Test Card' },
          } as any;
          const mockFullMessage = {
            id: 'full-msg-123',
            output: { generic: [] },
          } as any;

          store.dispatch(
            viewActions.setWorkspacePanelData({
              workspaceID: 'workspace-456',
              localMessageItem: mockLocalMessageItem,
              fullMessage: mockFullMessage,
              additionalData: { userId: 'user-789' },
            })
          );
        });

        it('should open workspace panel without clearing data', () => {
          store.dispatch(viewActions.setWorkspaceCustomPanelOpen(true));

          const state = store.getState() as AppState;
          expect(state.view.workspacePanelState.isOpen).toBe(true);
          expect(state.view.workspacePanelState.workspaceID).toBe(
            'workspace-456'
          );
          expect(state.view.workspacePanelState.localMessageItem).toBeDefined();
          expect(state.view.workspacePanelState.fullMessage).toBeDefined();
          expect(state.view.workspacePanelState.additionalData).toEqual({
            userId: 'user-789',
          });
        });

        it('should reset workspace panel state when closing', () => {
          // Open first
          store.dispatch(viewActions.setWorkspaceCustomPanelOpen(true));
          expect(
            (store.getState() as AppState).view.workspacePanelState.isOpen
          ).toBe(true);

          // Close and verify reset
          store.dispatch(viewActions.setWorkspaceCustomPanelOpen(false));

          const state = store.getState() as AppState;
          expect(state.view.workspacePanelState.isOpen).toBe(false);
          expect(state.view.workspacePanelState.workspaceID).toBeUndefined();
          expect(
            state.view.workspacePanelState.localMessageItem
          ).toBeUndefined();
          expect(state.view.workspacePanelState.fullMessage).toBeUndefined();
          expect(state.view.workspacePanelState.additionalData).toBeUndefined();
          expect(state.view.workspacePanelState).toEqual({
            ...DEFAULT_WORKSPACE_PANEL_STATE,
            isOpen: false,
          });
        });

        it('should handle multiple open/close cycles correctly', () => {
          // First cycle
          store.dispatch(viewActions.setWorkspaceCustomPanelOpen(true));
          store.dispatch(viewActions.setWorkspaceCustomPanelOpen(false));

          let state = store.getState() as AppState;
          expect(state.view.workspacePanelState.workspaceID).toBeUndefined();

          // Set new data
          store.dispatch(
            viewActions.setWorkspacePanelData({
              workspaceID: 'workspace-new',
              additionalData: { new: 'data' },
            })
          );

          // Second cycle
          store.dispatch(viewActions.setWorkspaceCustomPanelOpen(true));
          state = store.getState() as AppState;
          expect(state.view.workspacePanelState.workspaceID).toBe(
            'workspace-new'
          );

          store.dispatch(viewActions.setWorkspaceCustomPanelOpen(false));
          state = store.getState() as AppState;
          expect(state.view.workspacePanelState.workspaceID).toBeUndefined();
        });
      });

      describe('Workspace panel data lifecycle', () => {
        it('should maintain data through open state', () => {
          const mockData = {
            workspaceID: 'ws-123',
            additionalData: { test: 'data' },
          };

          // Set data
          store.dispatch(viewActions.setWorkspacePanelData(mockData));

          // Open panel
          store.dispatch(viewActions.setWorkspaceCustomPanelOpen(true));

          // Data should still be there
          let state = store.getState() as AppState;
          expect(state.view.workspacePanelState.workspaceID).toBe('ws-123');
          expect(state.view.workspacePanelState.additionalData).toEqual({
            test: 'data',
          });

          // Update options while open
          store.dispatch(
            viewActions.setWorkspaceCustomPanelConfigOptions({
              preferredLocation: 'end',
            })
          );

          // Data should still be preserved
          state = store.getState() as AppState;
          expect(state.view.workspacePanelState.workspaceID).toBe('ws-123');
          expect(state.view.workspacePanelState.options.preferredLocation).toBe(
            'end'
          );
        });

        it('should allow updating data while panel is open', () => {
          // Set initial data and open
          store.dispatch(
            viewActions.setWorkspacePanelData({
              workspaceID: 'ws-1',
              additionalData: { version: 1 },
            })
          );
          store.dispatch(viewActions.setWorkspaceCustomPanelOpen(true));

          // Update data while open
          store.dispatch(
            viewActions.setWorkspacePanelData({
              workspaceID: 'ws-2',
              additionalData: { version: 2 },
            })
          );

          const state = store.getState() as AppState;
          expect(state.view.workspacePanelState.isOpen).toBe(true);
          expect(state.view.workspacePanelState.workspaceID).toBe('ws-2');
          expect(state.view.workspacePanelState.additionalData).toEqual({
            version: 2,
          });
        });
      });

      describe('Integration with other actions', () => {
        it('should not affect workspace data when other panel states change', () => {
          store.dispatch(
            viewActions.setWorkspacePanelData({
              workspaceID: 'ws-123',
              additionalData: { preserved: true },
            })
          );

          // Change custom panel state
          store.dispatch(viewActions.setCustomPanelOpen(true));
          store.dispatch(viewActions.setCustomPanelOpen(false));

          const state = store.getState() as AppState;
          expect(state.view.workspacePanelState.workspaceID).toBe('ws-123');
          expect(state.view.workspacePanelState.additionalData).toEqual({
            preserved: true,
          });
        });

        it('should maintain workspace data through state changes', () => {
          store.dispatch(
            viewActions.setWorkspacePanelData({
              workspaceID: 'ws-persistent',
            })
          );

          // Perform various state changes
          store.dispatch(viewActions.setHomeScreenIsOpen(true));
          store.dispatch(actions.setIsRestarting(true));
          store.dispatch(actions.setIsRestarting(false));

          const state = store.getState() as AppState;
          expect(state.view.workspacePanelState.workspaceID).toBe(
            'ws-persistent'
          );
        });
      });
    });
  });
});
