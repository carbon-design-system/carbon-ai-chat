/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';

import type { PublicStateFieldDefinition } from '../../sdk/internal';
import { deepFreeze } from '../../shared/utils/lang/objectUtils';
import type { AppState } from '../../types/state/AppState';

function freezeClone<T>(value: T): T {
  return deepFreeze(cloneDeep(value));
}

/**
 * The `PublicChatState` fields the view partition holds. They aren't on
 * `ChatSDKState`, so only the prebuilt chat's `getState()` and
 * `instance.state` have them.
 */
const viewPublicFields: readonly PublicStateFieldDefinition<AppState>[] = [
  {
    name: 'wasLoadedFromBrowser',
    sources: (state) => [
      state.view.persistedToBrowserStorage.wasLoadedFromBrowser,
    ],
    project: ([value]) => value,
  },
  {
    name: 'version',
    sources: (state) => [state.view.persistedToBrowserStorage.version],
    project: ([value]) => value,
  },
  {
    name: 'viewState',
    sources: (state) => [state.view.persistedToBrowserStorage.viewState],
    project: ([value]) => freezeClone(value),
  },
  {
    name: 'showUnreadIndicator',
    sources: (state) => [
      state.view.persistedToBrowserStorage.showUnreadIndicator,
    ],
    project: ([value]) => value,
  },
  {
    name: 'launcherIsExpanded',
    sources: (state) => [
      state.view.persistedToBrowserStorage.launcherIsExpanded,
    ],
    project: ([value]) => value,
  },
  {
    name: 'launcherShouldStartCallToActionCounterIfEnabled',
    sources: (state) => [
      state.view.persistedToBrowserStorage
        .launcherShouldStartCallToActionCounterIfEnabled,
    ],
    project: ([value]) => value,
  },
  {
    name: 'disclaimersAccepted',
    sources: (state) => [
      state.view.persistedToBrowserStorage.disclaimersAccepted,
    ],
    project: ([value]) => freezeClone(value),
  },
  {
    name: 'homeScreenState',
    sources: (state) => [state.view.persistedToBrowserStorage.homeScreenState],
    project: ([value]) => freezeClone(value),
  },
  {
    name: 'isMessageLoadingCounter',
    sources: (state) => [state.view.isMessageLoadingCounter],
    project: ([value]) => value,
  },
  {
    name: 'isMessageLoadingText',
    sources: (state) => [state.view.isMessageLoadingText],
    project: ([value]) => value,
  },
  {
    name: 'isHydratingCounter',
    sources: (state) => [state.view.isHydratingCounter],
    project: ([value]) => value,
  },
  {
    name: 'customPanels',
    sources: (state) => [
      Boolean(state.view.customPanelState.isOpen),
      Boolean(state.view.workspacePanelState.isOpen),
      state.view.workspacePanelState.options.preferredLocation,
      state.view.workspacePanelState.workspaceID,
      state.view.workspacePanelState.additionalData,
      Boolean(state.view.historyPanelState.isOpen),
      Boolean(state.view.historyPanelState.isMobile),
    ],
    project: ([
      defaultOpen,
      workspaceOpen,
      preferredLocation,
      workspaceID,
      additionalData,
      historyOpen,
      historyMobile,
    ]) =>
      freezeClone({
        default: { isOpen: defaultOpen },
        workspace: {
          isOpen: workspaceOpen,
          options: { preferredLocation },
          workspaceID,
          additionalData,
        },
        history: { isOpen: historyOpen, isMobile: historyMobile },
      }),
  },
  {
    name: 'workspace',
    sources: (state) => [
      Boolean(state.view.workspacePanelState.isOpen),
      state.view.workspacePanelState.options.preferredLocation,
      state.view.workspacePanelState.workspaceID,
      state.view.workspacePanelState.additionalData,
    ],
    project: ([isOpen, preferredLocation, workspaceID, additionalData]) =>
      freezeClone({
        isOpen,
        options: { preferredLocation },
        workspaceID,
        additionalData,
      }),
  },
  {
    name: 'history',
    sources: (state) => [
      Boolean(state.view.historyPanelState.isOpen),
      Boolean(state.view.historyPanelState.isMobile),
    ],
    project: ([isOpen, isMobile]) => freezeClone({ isOpen, isMobile }),
  },
];

export { viewPublicFields };
