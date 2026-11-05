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
 * connection gets one. Attach before building a coordinator, so it starts in
 * mounted mode the way a coordinator given a port at construction did.
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
