/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { BusEventType } from '../../types/events/eventBusTypes';
import { PublicChatState } from '../../types/instance/PublicChatState';
import { AppState } from '../../types/state/AppState';
import {
  PublicStateProjectionObserver,
  PublicStateSnapshotCache,
} from '../utils/publicState';
import { consoleError } from '../utils/miscUtils';
import type { ServiceManager } from './ServiceManager';

type PublicStateListener = () => void;

interface PublicStateListenerRegistration {
  active: boolean;
  listener: PublicStateListener;
}

export class PublicStateService {
  private cache: PublicStateSnapshotCache;
  private currentSnapshot: PublicChatState;
  private currentSnapshotState: AppState;
  private publishedState: AppState;
  private listeners = new Set<PublicStateListenerRegistration>();
  private queuedStates: AppState[] = [];
  private isPublishing = false;
  private unsubscribeStore: () => void;

  constructor(
    private serviceManager: ServiceManager,
    observer?: PublicStateProjectionObserver
  ) {
    this.cache = new PublicStateSnapshotCache(observer);
    this.publishedState = serviceManager.store.getState();
    this.unsubscribeStore = serviceManager.store.subscribe(
      this.handleStoreChange
    );
  }

  get = (): PublicChatState => {
    if (this.isPublishing && this.currentSnapshot) {
      return this.currentSnapshot;
    }

    const state = this.serviceManager.store.getState();
    if (
      !this.currentSnapshot ||
      !this.cache.haveSamePublicSources(this.currentSnapshotState, state)
    ) {
      this.currentSnapshot = this.cache.createSnapshot(state);
    }
    this.currentSnapshotState = state;
    return this.currentSnapshot;
  };

  getPublicChatState = this.get;

  subscribe = (listener: PublicStateListener): (() => void) => {
    const registration = { active: true, listener };
    this.listeners.add(registration);
    return () => {
      if (registration.active) {
        registration.active = false;
        this.listeners.delete(registration);
      }
    };
  };

  select = <Selected>(
    selector: (state: PublicChatState) => Selected,
    listener: (value: Selected) => void,
    options?: { isEqual?: (left: Selected, right: Selected) => boolean }
  ): (() => void) => {
    let selected = selector(this.get());
    const isEqual = options?.isEqual ?? Object.is;

    return this.subscribe(() => {
      try {
        const nextSelected = selector(this.get());
        if (!isEqual(selected, nextSelected)) {
          selected = nextSelected;
          listener(nextSelected);
        }
      } catch (error) {
        consoleError(
          'A state selector or comparison function threw, so the chat skipped this update and continued.',
          error
        );
      }
    });
  };

  destroy(): void {
    this.unsubscribeStore?.();
    this.listeners.clear();
    this.queuedStates = [];
  }

  private handleStoreChange = (): void => {
    this.queuedStates.push(this.serviceManager.store.getState());
    if (this.isPublishing) {
      return;
    }

    this.isPublishing = true;
    try {
      while (this.queuedStates.length) {
        this.publish(this.queuedStates.shift());
      }
    } finally {
      this.isPublishing = false;
    }
  };

  private publish(nextState: AppState): void {
    const previousState = this.publishedState;
    this.publishedState = nextState;

    const eventBus = this.serviceManager.eventBus;
    const hasLegacyListeners = eventBus.hasListeners(BusEventType.STATE_CHANGE);
    if (!this.listeners.size && !hasLegacyListeners) {
      return;
    }
    if (this.cache.haveSamePublicSources(previousState, nextState)) {
      return;
    }

    const previousSnapshot = this.snapshotFor(previousState);
    const nextSnapshot = this.snapshotFor(nextState);
    const listenerRegistrations = [...this.listeners];
    this.currentSnapshot = nextSnapshot;
    this.currentSnapshotState = nextState;

    if (hasLegacyListeners) {
      eventBus.fireSync(
        {
          type: BusEventType.STATE_CHANGE,
          previousState: previousSnapshot,
          newState: nextSnapshot,
        },
        this.serviceManager.instance
      );
    }

    listenerRegistrations.forEach((registration) => {
      if (!registration.active) {
        return;
      }
      try {
        registration.listener();
      } catch (error) {
        consoleError(
          'A state subscriber threw, so the chat ignored the error and continued.',
          error
        );
      }
    });
  }

  private snapshotFor(state: AppState): PublicChatState {
    if (
      this.currentSnapshot &&
      this.cache.haveSamePublicSources(this.currentSnapshotState, state)
    ) {
      return this.currentSnapshot;
    }
    return this.cache.createSnapshot(state);
  }
}
