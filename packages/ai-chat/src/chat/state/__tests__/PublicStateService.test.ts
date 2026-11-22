/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { EventBus } from '../../../sdk/events/EventBus';
import { PublicStateService } from '../../../sdk/services/PublicStateService';
import { ServiceManager } from '../../../sdk/services/ServiceManager';

import {
  createBaseConfig,
  makeConfigStore,
} from '../../__tests__/helpers/chat';
import { viewActions } from '..';
import { viewPublicFields } from '../publicFields';

function createService() {
  const counts = new Map<string, number>();
  const store = makeConfigStore(createBaseConfig());
  const eventBus = new EventBus();
  const serviceManager = {
    store,
    eventBus,
    instance: {},
  } as unknown as ServiceManager;
  const service = new PublicStateService(serviceManager, {
    onProject: (field) => counts.set(field, (counts.get(field) ?? 0) + 1),
  });
  // A mounted chat adds the view's fields when it attaches the view.
  service.addFields(viewPublicFields);
  serviceManager.publicStateService = service;
  return { counts, eventBus, service, store };
}

describe('PublicStateService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('projects fields lazily and does no projection without readers', () => {
    const { counts, service, store } = createService();

    store.dispatch(
      viewActions.setViewValue('announceMessage', {
        messageText: 'Private state update',
      })
    );
    expect(counts.size).toBe(0);

    const snapshot = service.get();
    expect(counts.size).toBe(0);

    expect(snapshot.version).toBe(
      store.getState().view.persistedToBrowserStorage.version
    );
    expect(counts.get('version')).toBe(1);
    expect(snapshot.version).toBe(
      store.getState().view.persistedToBrowserStorage.version
    );
    expect(counts.get('version')).toBe(1);
    expect(counts.has('input')).toBe(false);
  });
});
