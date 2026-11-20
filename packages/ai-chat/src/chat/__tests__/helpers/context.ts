/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { type ReactNode, useMemo } from 'react';
import type { AppStore } from '../../../sdk/store/appStore';
import type { ServiceManager } from '../../../sdk/services/ServiceManager';
import { ChatMountState } from '../../services/chatMountState';
import type { AriaAnnouncerFunctionType } from '../../services/ariaAnnouncer';
import { ChatContext } from '../../contexts/ChatContext';
import type { IntlShape } from '../../../sdk/utils/i18n';
import { getWindowSize } from '../../utils/windowSize';

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
