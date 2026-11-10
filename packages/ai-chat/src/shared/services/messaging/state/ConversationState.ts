/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ConversationStatus } from '../../../../types/instance/PublicChatState';

class ConversationState {
  private generation = 0;
  private hydrating = false;
  private activeRequests = new Map<string, { id?: string }>();
  /** Every request started in this generation, finished or not, so a renamed ID still resolves. */
  private startedRequests = new Map<string, { id?: string }>();
  private requestAliases = new Map<string, string>();
  private activeResponses = new Set<string>();
  private responseOwners = new Map<string, string | undefined>();
  private stoppedRequests = new Set<string>();
  private failure: { messageID?: string; generation: number } | null = null;
  private respondedRequests = new Set<string>();
  private stoppedResponses = new Set<string>();

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
    this.startedRequests.clear();
    this.requestAliases.clear();
    this.activeResponses.clear();
    this.responseOwners.clear();
    this.stoppedRequests.clear();
    this.respondedRequests.clear();
    this.stoppedResponses.clear();
    this.failure = null;
    return this.generation;
  }

  hydrationStarted() {
    this.hydrating = true;
    this.failure = null;
    return this.generation;
  }

  hydrationFinished(generation: number) {
    if (this.isCurrent(generation)) {
      this.hydrating = false;
      return true;
    }
    return false;
  }

  requestStarted(
    messageID: string,
    generation = this.generation,
    request: { id?: string } = { id: messageID }
  ) {
    if (this.isCurrent(generation)) {
      this.activeRequests.set(messageID, request);
      this.startedRequests.set(messageID, request);
      this.requestAliases.set(messageID, messageID);
      this.failure = null;
      return true;
    }
    return false;
  }

  requestFinished(messageID: string, generation = this.generation) {
    if (this.isCurrent(generation)) {
      const requestID = this.resolveRequestID(messageID);
      this.activeRequests.delete(requestID);
      this.respondedRequests.delete(requestID);
      return true;
    }
    return false;
  }

  requestStopped(messageID: string, generation = this.generation) {
    if (!this.isCurrent(generation)) {
      return undefined;
    }
    const requestID = this.resolveRequestID(messageID);
    this.stoppedRequests.add(messageID);
    this.stoppedRequests.add(requestID);
    this.activeRequests.delete(requestID);
    this.respondedRequests.delete(requestID);
    const responseIDs: string[] = [];
    for (const responseID of this.activeResponses) {
      if (this.responseOwners.get(responseID) === requestID) {
        responseIDs.push(responseID);
        this.activeResponses.delete(responseID);
        this.stoppedResponses.add(responseID);
      }
    }
    return responseIDs;
  }

  /**
   * The key this state tracks a request under, for any of its IDs. A `pre:send` handler can rename
   * a request; the chat keeps the original ID, and the host sees the new one.
   */
  requestKey(messageID: string) {
    for (const [key, request] of this.startedRequests) {
      if (request.id === messageID) {
        return key;
      }
    }
    return this.resolveRequestID(messageID);
  }

  /** The ID the host knows a request by: its current ID, which `pre:send` may have changed. */
  hostRequestID(key: string) {
    return this.startedRequests.get(key)?.id ?? key;
  }

  /** The responses still streaming for the request `key` names. */
  activeResponsesOf(key: string) {
    return [...this.activeResponses].filter(
      (responseID) => this.responseOwners.get(responseID) === key
    );
  }

  /** The requests that own a response still streaming. */
  activeResponseOwners() {
    const owners = new Set<string>();
    for (const responseID of this.activeResponses) {
      const owner = this.responseOwners.get(responseID);
      if (owner) {
        owners.add(owner);
      }
    }
    return owners;
  }

  /** The responses still streaming that no request owns, such as an upsert with no `request_id`. */
  ownerlessActiveResponses() {
    return [...this.activeResponses].filter(
      (responseID) => !this.responseOwners.get(responseID)
    );
  }

  isRequestStopped(requestID?: string) {
    return this.stoppedRequests.has(this.resolveRequestID(requestID));
  }

  responseRequestID(messageID: string) {
    return this.responseOwners.get(messageID);
  }

  isResponseOwnedByRequest(messageID: string, requestID: string) {
    return (
      this.responseOwners.has(messageID) &&
      this.responseOwners.get(messageID) === this.resolveRequestID(requestID)
    );
  }

  /** Explicit removal ends response ownership without reviving its old request. */
  responseRemoved(messageID: string) {
    this.activeResponses.delete(messageID);
    this.responseOwners.delete(messageID);
    this.stoppedResponses.delete(messageID);
  }

  responseStreaming(
    messageID: string,
    generation = this.generation,
    requestID?: string
  ) {
    if (
      !messageID ||
      !this.isCurrent(generation) ||
      this.isRequestStopped(requestID) ||
      this.stoppedResponses.has(messageID)
    ) {
      return undefined;
    }
    const owner = this.recordResponseOwner(messageID, requestID);
    if (this.stoppedRequests.has(owner)) {
      return undefined;
    }
    this.activeResponses.add(messageID);
    return {
      receivedRequest: this.responseReceived(messageID, generation, owner),
    };
  }

  responseReceived(
    messageID: string,
    generation = this.generation,
    requestID?: string
  ) {
    if (
      !this.isCurrent(generation) ||
      this.isRequestStopped(requestID) ||
      this.stoppedResponses.has(messageID)
    ) {
      return false;
    }
    const owner = this.recordResponseOwner(messageID, requestID);
    if (this.activeRequests.has(owner) && !this.stoppedRequests.has(owner)) {
      this.respondedRequests.add(owner);
      return true;
    }
    return false;
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
      return true;
    }
    return false;
  }

  responseFinished(messageID: string, generation = this.generation) {
    if (this.isCurrent(generation)) {
      this.activeResponses.delete(messageID);
      return true;
    }
    return false;
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
    return failure;
  }

  /** The current failure token, or `null`. */
  getFailure() {
    return this.failure;
  }

  hasFailureForRequest(messageID: string) {
    return Boolean(
      this.failure &&
      this.resolveRequestID(this.failure.messageID) ===
        this.resolveRequestID(messageID)
    );
  }

  clearFailure(failure: ReturnType<ConversationState['getFailure']>) {
    if (
      failure &&
      this.failure === failure &&
      this.isCurrent(failure.generation)
    ) {
      this.failure = null;
      return true;
    }
    return false;
  }

  getStatus(): ConversationStatus {
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

export { ConversationState };
