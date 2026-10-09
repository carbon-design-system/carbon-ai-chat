/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { EventBus } from '../../../src/chat/events/EventBus';
import { PublicStateService } from '../../../src/chat/services/PublicStateService';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import actions from '../../../src/chat/store/actions';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import { createBaseConfig, makeConfigStore } from '../../test_helpers';

function createService() {
  const counts = new Map<string, number>();
  const store = makeConfigStore(createBaseConfig());
  const eventBus = new EventBus();
  const serviceManager = {
    store,
    eventBus,
    instance: {},
  } as ServiceManager;
  const service = new PublicStateService(serviceManager, {
    onProject: (field) => counts.set(field, (counts.get(field) ?? 0) + 1),
  });
  serviceManager.publicStateService = service;
  return { counts, eventBus, service, store };
}

describe('PublicStateService', () => {
  it('projects fields lazily and does no projection without readers', () => {
    const { counts, service, store } = createService();

    store.dispatch(
      actions.setAppStateValue('announceMessage', {
        messageText: 'Private state update',
      })
    );
    expect(counts.size).toBe(0);

    const snapshot = service.get();
    expect(counts.size).toBe(0);

    expect(snapshot.version).toBe(
      store.getState().persistedToBrowserStorage.version
    );
    expect(counts.get('version')).toBe(1);
    expect(snapshot.version).toBe(
      store.getState().persistedToBrowserStorage.version
    );
    expect(counts.get('version')).toBe(1);
    expect(counts.has('input')).toBe(false);
  });

  it('retains the public root and unchanged field identities', () => {
    const { service, store } = createService();
    const first = service.get();
    const firstInput = first.input;

    store.dispatch(
      actions.setAppStateValue('announceMessage', {
        messageText: 'Private state update',
      })
    );
    expect(service.get()).toBe(first);

    store.dispatch(actions.updatePersistedState({ showUnreadIndicator: true }));
    const second = service.get();
    expect(second).not.toBe(first);
    expect(second.input).toBe(firstInput);
  });

  it('keeps unread fields on retained snapshots tied to their version', () => {
    const { service, store } = createService();
    const previous = service.get();

    store.dispatch(actions.updatePersistedState({ showUnreadIndicator: true }));
    const current = service.get();

    expect(previous.showUnreadIndicator).toBe(false);
    expect(current.showUnreadIndicator).toBe(true);
  });

  it('reuses newer field projections after an older snapshot is read late', () => {
    const { service, store } = createService();
    store.dispatch(
      actions.setWorkspacePanelData({ additionalData: { version: 1 } })
    );
    const previous = service.get();

    store.dispatch(
      actions.setWorkspacePanelData({ additionalData: { version: 2 } })
    );
    const current = service.get();
    const currentWorkspace = current.workspace;

    expect(previous.workspace.additionalData).toEqual({ version: 1 });
    store.dispatch(actions.updatePersistedState({ showUnreadIndicator: true }));
    expect(service.get().workspace).toBe(currentWorkspace);
  });

  it('clones and freezes public workspace data without freezing its source', () => {
    const { service, store } = createService();
    const additionalData = { nested: { value: 'source' } };
    const workspacePanelState = {
      ...store.getState().workspacePanelState,
      additionalData,
    };

    store.dispatch(
      actions.setAppStateValue('workspacePanelState', workspacePanelState)
    );
    const projected = service.get().workspace
      .additionalData as typeof additionalData;

    expect(projected).toEqual(additionalData);
    expect(projected).not.toBe(additionalData);
    expect(Object.isFrozen(projected)).toBe(true);
    expect(Object.isFrozen(projected.nested)).toBe(true);
    expect(Object.isFrozen(additionalData)).toBe(false);
  });

  it('owns workspace data before a lazy snapshot reads it', () => {
    const { service, store } = createService();
    const additionalData = { nested: { value: 'original' } };

    store.dispatch(actions.setWorkspacePanelData({ additionalData }));
    const snapshot = service.get();
    additionalData.nested.value = 'mutated';

    expect(snapshot.workspace.additionalData).toEqual({
      nested: { value: 'original' },
    });
    expect(store.getState().workspacePanelState.additionalData).not.toBe(
      additionalData
    );
  });

  it('ignores private-only message replacements', () => {
    const { service, store } = createService();
    const message = {
      id: 'response',
      output: {
        generic: [
          { response_type: MessageResponseTypes.TEXT, text: 'unchanged' },
        ],
      },
      ui_state_internal: { from_history: false },
    };
    store.dispatch(
      actions.setAppStateValue('allMessagesByID', { response: message })
    );
    store.dispatch(
      actions.setAppStateValue('assistantMessageState', {
        ...store.getState().assistantMessageState,
        messageIDs: ['response'],
      })
    );
    const first = service.get();
    const firstMessages = first.messages;

    store.dispatch(
      actions.setAppStateValue('allMessagesByID', {
        response: {
          ...message,
          ui_state_internal: { from_history: true },
        },
      })
    );

    expect(service.get()).toBe(first);
    expect(service.get().messages).toBe(firstMessages);
  });

  it('delivers reentrant changes in order and isolates registrations', () => {
    const { service, store } = createService();
    const seenBySecond: boolean[] = [];
    const duplicate = jest.fn();
    let nested = false;

    service.subscribe(() => {
      if (!nested) {
        nested = true;
        store.dispatch(
          actions.updatePersistedState({ showUnreadIndicator: false })
        );
      }
    });
    service.subscribe(() => {
      seenBySecond.push(service.get().showUnreadIndicator);
    });
    const unsubscribeFirstDuplicate = service.subscribe(duplicate);
    service.subscribe(duplicate);
    unsubscribeFirstDuplicate();

    store.dispatch(actions.updatePersistedState({ showUnreadIndicator: true }));

    expect(seenBySecond).toEqual([true, false]);
    expect(duplicate).toHaveBeenCalledTimes(2);
  });

  it('uses the listener registrations from the start of each transition', () => {
    const { eventBus, service, store } = createService();
    const existingListener = jest.fn();
    const addedDuringLegacyEvent = jest.fn();
    const unsubscribeExisting = service.subscribe(existingListener);
    let registered = false;

    eventBus.on({
      type: BusEventType.STATE_CHANGE,
      handler: () => {
        unsubscribeExisting();
        if (!registered) {
          registered = true;
          service.subscribe(addedDuringLegacyEvent);
        }
      },
    });

    store.dispatch(actions.updatePersistedState({ showUnreadIndicator: true }));

    expect(existingListener).not.toHaveBeenCalled();
    expect(addedDuringLegacyEvent).not.toHaveBeenCalled();

    store.dispatch(
      actions.updatePersistedState({ showUnreadIndicator: false })
    );

    expect(addedDuringLegacyEvent).toHaveBeenCalledTimes(1);
  });

  it('notifies only for public changes', () => {
    const { service, store } = createService();
    const listener = jest.fn();
    service.subscribe(listener);

    store.dispatch(
      actions.setAppStateValue('announceMessage', {
        messageText: 'Private state update',
      })
    );
    expect(listener).not.toHaveBeenCalled();

    store.dispatch(actions.updatePersistedState({ showUnreadIndicator: true }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
