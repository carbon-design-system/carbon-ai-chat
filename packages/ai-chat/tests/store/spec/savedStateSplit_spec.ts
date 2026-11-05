/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from '../../../src/shared/store/actions';
import { createServiceManager } from '../../../src/shared/services/loadServices';
import { createAppConfig } from '../../../src/shared/store/doCreateStore';
import { toPersistableState } from '../../../src/shared/store/persistenceUtils';
import type { ChatSDKConfig } from '../../../src/types/config/ChatSDKConfig';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { PersistableState } from '../../../src/types/config/PersistedStateConfig';
import type { PersistedState } from '../../../src/types/state/PersistedState';
import { VERSION } from '../../../src/shared/utils/environmentVariables';
import { UserType } from '../../../src/types/messaging/Messages';
import {
  joinPersistedState,
  viewActions,
  viewHalfOf,
} from '../../../src/view/state';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
  withView,
} from '../../test_helpers';

const agent = { id: 'agent', nickname: 'Agent', user_type: UserType.HUMAN };

/** A saved session with every field set away from its default. */
const everyField: PersistedState = {
  disclaimersAccepted: { localhost: true, 'other.example': false },
  homeScreenState: { isHomeScreenOpen: true, showBackToAssistant: true },
  humanAgentState: {
    isConnected: true,
    isSuspended: true,
    responseUserProfiles: { agent },
    responseUserProfile: agent,
  },
  hasSentNonWelcomeMessage: true,
  wasLoadedFromBrowser: true,
  version: VERSION,
  viewState: { launcher: true, mainWindow: false },
  showUnreadIndicator: true,
  launcherIsExpanded: true,
  launcherShouldStartCallToActionCounterIfEnabled: false,
};

const agentConnected = {
  isConnected: true,
  isSuspended: false,
  responseUserProfiles: {},
  responseUserProfile: null as null,
};

/** A chat booted by its services alone, given the SDK's agent config. */
function sdkChat(humanAgentState: ChatSDKConfig['humanAgentState']) {
  const config = { humanAgentState } as PublicConfig;
  const serviceManager = createServiceManager(createAppConfig(config));
  const store = withView(serviceManager.store, config);
  return { serviceManager, store };
}

describe('saved state', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('splits into halves that join back to the same wire shape and key order', () => {
    const { humanAgentState, hasSentNonWelcomeMessage } = everyField;
    const joined = joinPersistedState(
      { humanAgentState, hasSentNonWelcomeMessage },
      viewHalfOf(everyField)
    );

    expect(JSON.stringify(joined)).toBe(JSON.stringify(everyField));
    expect(JSON.stringify(toPersistableState(joined))).toBe(
      JSON.stringify(toPersistableState(everyField))
    );
  });

  it('gives the shell persistence callback every field it got before', async () => {
    const onStateChange = jest.fn();
    const config = {
      ...createBaseConfig(),
      persistedState: {
        initialState: toPersistableState(everyField),
        onStateChange,
      },
    };
    const { store } = await renderChatAndGetInstanceWithStore(config);
    onStateChange.mockClear();
    const before = joinPersistedState(
      store.getState().persistedToBrowserStorage,
      store.getState().view.persistedToBrowserStorage
    );

    store.dispatch(
      actions.updatePersistedState({ humanAgentState: agentConnected })
    );

    expect(onStateChange).toHaveBeenCalledTimes(1);
    const reported: PersistableState = onStateChange.mock.calls[0][0];
    expect(Object.keys(reported)).toEqual(
      Object.keys(toPersistableState(everyField))
    );
    expect(reported).toEqual({
      ...toPersistableState(before),
      humanAgentState: agentConnected,
    });
  });

  it('reports only the agent connection through humanAgentState.onStateChange', () => {
    const onStateChange = jest.fn();
    const { store } = sdkChat({ onStateChange });

    store.dispatch(
      viewActions.setLauncherProperty('showUnreadIndicator', true)
    );
    store.dispatch(viewActions.setHomeScreenIsOpen(true));
    store.dispatch(actions.updateHasSentNonWelcomeMessage(true));
    expect(onStateChange).not.toHaveBeenCalled();

    store.dispatch(
      actions.updatePersistedState({ humanAgentState: agentConnected })
    );
    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange).toHaveBeenCalledWith(agentConnected);
  });

  it('restores only the agent connection from humanAgentState.initialState', () => {
    const initialState = {
      ...everyField.humanAgentState,
      // A host that saved view state beside the connection can't restore it here.
      viewState: { launcher: false, mainWindow: true },
    } as ChatSDKConfig['humanAgentState']['initialState'];
    const { store } = sdkChat({ initialState });

    const state = store.getState();
    expect(state.persistedToBrowserStorage.humanAgentState).toEqual(
      everyField.humanAgentState
    );
    expect(state.persistedToBrowserStorage.hasSentNonWelcomeMessage).toBe(
      false
    );
    expect(state.view.persistedToBrowserStorage.viewState).toEqual({
      launcher: false,
      mainWindow: false,
    });
  });
});
