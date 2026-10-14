/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ConversationStatus } from '../../types/instance/PublicChatState';
import actions from '../store/actions';
import type { ServiceManager } from './ServiceManager';

class ConversationLifecycleService {
  private generation = 0;
  private hydrating = false;
  private activeRequests = new Map<string, { id?: string }>();
  private requestAliases = new Map<string, string>();
  private activeResponses = new Set<string>();
  private responseOwners = new Map<string, string | undefined>();
  private stoppedRequests = new Set<string>();
  private failure: { messageID?: string; generation: number } | null = null;
  private respondedRequests = new Set<string>();
  private stoppedResponses = new Set<string>();

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
    this.requestAliases.clear();
    this.activeResponses.clear();
    this.responseOwners.clear();
    this.stoppedRequests.clear();
    this.respondedRequests.clear();
    this.stoppedResponses.clear();
    this.failure = null;
    this.publish();
    return this.generation;
  }

  hydrationStarted() {
    this.hydrating = true;
    this.failure = null;
    this.publish();
    return this.generation;
  }

  hydrationFinished(generation: number) {
    if (this.isCurrent(generation)) {
      this.hydrating = false;
      this.publish();
    }
  }

  requestStarted(
    messageID: string,
    generation = this.generation,
    request: { id?: string } = { id: messageID }
  ) {
    if (this.isCurrent(generation)) {
      this.activeRequests.set(messageID, request);
      this.requestAliases.set(messageID, messageID);
      this.failure = null;
      this.publish();
    }
  }

  requestFinished(messageID: string, generation = this.generation) {
    if (this.isCurrent(generation)) {
      const requestID = this.resolveRequestID(messageID);
      this.activeRequests.delete(requestID);
      this.respondedRequests.delete(requestID);
      this.publish();
    }
  }

  requestStopped(messageID: string, generation = this.generation) {
    if (!this.isCurrent(generation)) {
      return;
    }
    const requestID = this.resolveRequestID(messageID);
    this.stoppedRequests.add(messageID);
    this.stoppedRequests.add(requestID);
    this.activeRequests.delete(requestID);
    this.respondedRequests.delete(requestID);
    for (const responseID of this.activeResponses) {
      if (this.responseOwners.get(responseID) === requestID) {
        this.activeResponses.delete(responseID);
        this.stoppedResponses.add(responseID);
      }
    }
    this.publish();
  }

  responseStreaming(
    messageID: string,
    generation = this.generation,
    requestID?: string
  ) {
    if (
      !messageID ||
      !this.isCurrent(generation) ||
      this.stoppedResponses.has(messageID)
    ) {
      return;
    }
    const owner = this.recordResponseOwner(messageID, requestID);
    if (this.stoppedRequests.has(owner)) {
      return;
    }
    this.activeResponses.add(messageID);
    this.responseReceived(messageID, generation, owner);
    this.publish();
  }

  responseReceived(
    messageID: string,
    generation = this.generation,
    requestID?: string
  ) {
    if (!this.isCurrent(generation) || this.stoppedResponses.has(messageID)) {
      return;
    }
    const owner = this.recordResponseOwner(messageID, requestID);
    if (this.activeRequests.has(owner) && !this.stoppedRequests.has(owner)) {
      this.respondedRequests.add(owner);
      this.publish();
    }
  }

  private resolveRequestID(messageID: string) {
    // PRE_SEND may change the ID while its handler is still awaiting.
    for (const [originalID, request] of this.activeRequests) {
      if (originalID === messageID || request.id === messageID) {
        this.requestAliases.set(messageID, originalID);
        return originalID;
      }
    }
    return this.requestAliases.get(messageID) ?? messageID;
  }

  private recordResponseOwner(messageID: string, requestID?: string) {
    if (!this.responseOwners.has(messageID)) {
      this.responseOwners.set(messageID, this.resolveRequestID(requestID));
    }
    return this.responseOwners.get(messageID);
  }

  responseStopped(messageID: string, generation = this.generation) {
    if (this.isCurrent(generation)) {
      this.stoppedResponses.add(messageID);
      this.activeResponses.delete(messageID);
      this.publish();
    }
  }

  responseFinished(messageID: string, generation = this.generation) {
    if (this.isCurrent(generation)) {
      this.activeResponses.delete(messageID);
      this.publish();
    }
  }

  fail(error: { messageID?: string }, generation = this.generation) {
    if (!this.isCurrent(generation)) {
      return null;
    }
    const failure = { messageID: error.messageID, generation };
    this.failure = failure;
    if (failure.messageID) {
      const requestID = this.resolveRequestID(failure.messageID);
      this.activeRequests.delete(requestID);
      this.respondedRequests.delete(requestID);
    }
    this.publish();
    return failure;
  }

  hasFailureForRequest(messageID: string) {
    return this.failure?.messageID === messageID;
  }

  clearFailure(failure: ReturnType<ConversationLifecycleService['fail']>) {
    if (
      failure &&
      this.failure === failure &&
      this.isCurrent(failure.generation)
    ) {
      this.failure = null;
      this.publish();
    }
  }

  private publish() {
    const status = this.getStatus();
    const state = this.serviceManager.store.getState();
    if (state.conversationStatus !== status) {
      this.serviceManager.store.dispatch(
        actions.setConversationLifecycle(status)
      );
    }
  }

  private getStatus(): ConversationStatus {
    if (this.failure) {
      return 'error';
    }
    if (this.hydrating) {
      return 'loading';
    }
    if (this.activeResponses.size) {
      return 'streaming';
    }
    if (this.activeRequests.size) {
      return [...this.activeRequests.keys()].some((id) =>
        this.respondedRequests.has(id)
      )
        ? 'streaming'
        : 'submitted';
    }
    return 'ready';
  }
}

export { ConversationLifecycleService };
