/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

class ConversationLifecycleService {
  // Async work captures its generation so a restart can invalidate late callbacks.
  private generation = 0;
  private activeResponses = new Map<string, string | undefined>();
  // Keep stopped IDs until restart so late chunks cannot revive a canceled request.
  private stoppedRequests = new Set<string>();

  get currentGeneration() {
    return this.generation;
  }

  isCurrent(generation: number) {
    return generation === this.generation;
  }

  restart() {
    this.generation++;
    this.activeResponses.clear();
    this.stoppedRequests.clear();
    return this.generation;
  }

  requestStopped(requestID: string, generation = this.generation) {
    if (!this.isCurrent(generation)) {
      return [];
    }
    const responseIDs: string[] = [];
    this.stoppedRequests.add(requestID);
    for (const [responseID, owningRequestID] of this.activeResponses) {
      if (owningRequestID === requestID) {
        responseIDs.push(responseID);
        this.activeResponses.delete(responseID);
      }
    }
    return responseIDs;
  }

  isRequestStopped(requestID: string | undefined) {
    return this.stoppedRequests.has(requestID);
  }

  responseRequestID(messageID: string) {
    return this.activeResponses.get(messageID);
  }

  responseStreaming(
    messageID: string,
    generation = this.generation,
    requestID?: string
  ) {
    if (
      messageID &&
      this.isCurrent(generation) &&
      !this.stoppedRequests.has(requestID)
    ) {
      // The first write owns cancellation, even when later writes supply another request ID.
      if (!this.activeResponses.has(messageID)) {
        this.activeResponses.set(messageID, requestID);
      }
    }
  }

  responseFinished(messageID: string, generation = this.generation) {
    if (this.isCurrent(generation)) {
      this.activeResponses.delete(messageID);
    }
  }
}

export { ConversationLifecycleService };
