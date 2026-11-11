/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  InstanceViewPort,
  ViewBindings,
  ViewConnection,
} from '../../../src/shared/services/viewBindings';
import type { MessagePresentationPort } from '../../../src/shared/services/messaging/presentationPort';
import type { AppStore } from '../../../src/shared/store/appStore';
import type { AppState } from '../../../src/types/state/AppState';
import { viewActions } from '../../../src/chat/state';
import { createLoadingCounters } from '../../../src/chat/services/loadingCounters';

/** An instance port whose view members do nothing, like a view not yet drawn. */
export function idleInstancePort(): InstanceViewPort {
  return {
    changeView: async () => {
      throw new Error('This test view does not change views.');
    },
    requestFocus: () => false,
    doAutoScroll: () => undefined,
    scrollToMessage: () => undefined,
    input: () => null,
    hasCustomPromptLine: () => false,
  };
}

/**
 * Attaches a view with this messaging port to a real or stub manager, as the
 * container does at boot, and returns the manager. A stub without a view
 * connection gets one. Attaching before building a coordinator skips its
 * headless observer, as a port given at construction did; production builds
 * the coordinator first, so its observer always exists.
 */
export function withMessagingView<T extends object>(
  manager: T,
  messaging: MessagePresentationPort,
  bindings: Partial<Omit<ViewBindings, 'messaging'>> = {}
): T {
  const target = manager as T & { view?: ViewConnection };
  if (!target.view) {
    Object.assign(target, { view: new ViewConnection() });
  }
  target.view.attach({
    messaging,
    humanAgent: { requestFocus: () => undefined },
    instance: idleInstancePort(),
    ...bindings,
  });
  return manager;
}

/**
 * Attaches a view that has the chat's real loading counters and announcements
 * and nothing else, for specs that build a manager by hand and check those
 * values in its store. A mounted chat always has them.
 */
export function withViewCounters<T extends { store: unknown }>(manager: T): T {
  const store = manager.store as AppStore<AppState>;
  const counters = createLoadingCounters(store);
  const announce = (message: { messageID: string }) =>
    store.dispatch(viewActions.announceMessage(message as never));
  return withMessagingView(
    manager,
    {
      hasCustomPromptLine: () => false,
      announceSending: () => undefined,
      requestComposerFocus: () => undefined,
      closeHomeScreenIfOpen: () => undefined,
      closeResponsePanelIfOpen: () => undefined,
      closeHomeScreen: () => undefined,
      announce,
      ...counters,
    },
    {
      humanAgent: {
        requestFocus: () => undefined,
        announce,
        changeMessageLoadingCounter: counters.changeMessageLoadingCounter,
      },
    }
  );
}
