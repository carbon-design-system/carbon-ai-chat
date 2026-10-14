/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

class ConversationLifecycleService {
  private generation = 0;
  private activeResponses = new Map<string, string | undefined>();
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

  requestStopped(messageID: string, generation = this.generation) {
    if (!this.isCurrent(generation)) {
      return [];
    }
    const responseIDs: string[] = [];
    this.stoppedRequests.add(messageID);
    for (const [responseID, requestID] of this.activeResponses) {
      if (requestID === messageID) {
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
