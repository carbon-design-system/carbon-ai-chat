/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from '../../services/ServiceManager';
import { PublicStateService } from '../../services/PublicStateService';
import { EventBus } from '../../events/EventBus';
import { createStoreFromReduction, type AppStore } from '../../store/appStore';
import { createInitialState } from '../../store/doCreateStore';
import { enableMessageOwnership } from '../../store/messageOwnership';
import { reduceWithMessageOwnership } from '../../store/reducers';
import type { ConversationState } from '../../../types/state/AppState';
import { mockCustomSendMessage } from './config';

/**
 * Builds the conversation store the SDK boots with, without the prebuilt
 * chat's view partition, from a config that sends through
 * {@link mockCustomSendMessage}.
 */
export function sdkTestStore(): AppStore<ConversationState> {
  const store = createStoreFromReduction<ConversationState>(
    reduceWithMessageOwnership,
    createInitialState({
      public: { messaging: { customSendMessage: mockCustomSendMessage } },
    })
  );
  enableMessageOwnership(store);
  return store;
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
