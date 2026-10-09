/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';

import type { OnErrorData } from '../../types/config/ErrorConfig';
import type { ConversationStatus } from '../../types/instance/PublicChatState';
import actions from '../store/actions';
import { deepFreeze } from '../utils/lang/objectUtils';
import type { ServiceManager } from './ServiceManager';

class ConversationLifecycleService {
  private generation = 0;
  private hydrating = false;
  private activeRequests = new Set<string>();
  private activeResponses = new Set<string>();
  private error: Readonly<OnErrorData> | null = null;

  constructor(private serviceManager: ServiceManager) {}

  get currentGeneration() {
    return this.generation;
  }

  isCurrent(generation: number) {
    return generation === this.generation;
  }

  restart(skipHydration: boolean) {
    this.generation++;
    this.hydrating = !skipHydration;
    this.activeRequests.clear();
    this.activeResponses.clear();
    this.error = null;
    this.publish();
    return this.generation;
  }

  hydrationStarted() {
    this.hydrating = true;
    this.error = null;
    this.publish();
    return this.generation;
  }

  hydrationFinished(generation: number) {
    if (this.isCurrent(generation)) {
      this.hydrating = false;
      this.publish();
    }
  }

  requestStarted(messageID: string, generation = this.generation) {
    if (this.isCurrent(generation)) {
      this.activeRequests.add(messageID);
      this.error = null;
      this.publish();
    }
  }

  requestFinished(messageID: string, generation = this.generation) {
    if (this.isCurrent(generation)) {
      this.activeRequests.delete(messageID);
      this.publish();
    }
  }

  responseStreaming(messageID: string, generation = this.generation) {
    if (messageID && this.isCurrent(generation)) {
      this.activeResponses.add(messageID);
      this.publish();
    }
  }

  responseFinished(messageID: string, generation = this.generation) {
    if (this.isCurrent(generation)) {
      this.activeResponses.delete(messageID);
      this.publish();
    }
  }

  fail(error: OnErrorData, generation = this.generation) {
    if (!this.isCurrent(generation)) {
      return null;
    }
    const publicError = deepFreeze(cloneDeep(error));
    this.error = publicError;
    if (publicError.messageID) {
      this.activeRequests.delete(publicError.messageID);
    }
    this.publish();
    return publicError;
  }

  private publish() {
    const status = this.getStatus();
    const state = this.serviceManager.store.getState();
    if (
      state.conversationStatus !== status ||
      state.conversationError !== this.error
    ) {
      this.serviceManager.store.dispatch(
        actions.setConversationLifecycle(status, this.error)
      );
    }
  }

  private getStatus(): ConversationStatus {
    if (this.error) {
      return 'error';
    }
    if (this.hydrating) {
      return 'loading';
    }
    if (this.activeResponses.size) {
      return 'streaming';
    }
    if (this.activeRequests.size) {
      return 'submitted';
    }
    return 'ready';
  }
}

export { ConversationLifecycleService };
