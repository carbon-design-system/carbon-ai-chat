/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from '../../store/actions';
import type { ServiceManager } from '../ServiceManager';
import { ConversationState } from './state/ConversationState';

class ConversationLifecycleService {
  private state = new ConversationState();

  constructor(private serviceManager: ServiceManager) {}

  get currentGeneration() {
    return this.state.currentGeneration;
  }

  isCurrent(generation: number) {
    return this.state.isCurrent(generation);
  }

  restart(skipHydration: boolean) {
    this.state.restart(skipHydration);
    this.publish();
    return this.currentGeneration;
  }

  hydrationStarted() {
    this.state.hydrationStarted();
    this.publish();
    return this.currentGeneration;
  }

  hydrationFinished(generation: number) {
    if (this.state.hydrationFinished(generation)) {
      this.publish();
    }
  }

  requestStarted(
    messageID: string,
    generation = this.currentGeneration,
    request: { id?: string } = { id: messageID }
  ) {
    if (this.state.requestStarted(messageID, generation, request)) {
      this.publish();
    }
  }

  requestFinished(messageID: string, generation = this.currentGeneration) {
    if (this.state.requestFinished(messageID, generation)) {
      this.publish();
    }
  }

  requestStopped(messageID: string, generation = this.currentGeneration) {
    const responseIDs = this.state.requestStopped(messageID, generation);
    if (responseIDs === undefined) {
      return [];
    }
    this.publish();
    return responseIDs;
  }

  isRequestStopped(requestID?: string) {
    return this.state.isRequestStopped(requestID);
  }

  responseRequestID(messageID: string) {
    return this.state.responseRequestID(messageID);
  }

  isResponseOwnedByRequest(messageID: string, requestID: string) {
    return this.state.isResponseOwnedByRequest(messageID, requestID);
  }

  responseRemoved(messageID: string) {
    this.state.responseRemoved(messageID);
    this.publish();
  }

  responseStreaming(
    messageID: string,
    generation = this.currentGeneration,
    requestID?: string
  ) {
    const result = this.state.responseStreaming(
      messageID,
      generation,
      requestID
    );
    if (!result) {
      return;
    }
    // Receipt subscribers can change lifecycle state before streaming publishes again.
    if (result.receivedRequest) {
      this.publish();
    }
    this.publish();
  }

  responseReceived(
    messageID: string,
    generation = this.currentGeneration,
    requestID?: string
  ) {
    if (this.state.responseReceived(messageID, generation, requestID)) {
      this.publish();
    }
  }

  responseStopped(messageID: string, generation = this.currentGeneration) {
    if (this.state.responseStopped(messageID, generation)) {
      this.publish();
    }
  }

  responseFinished(messageID: string, generation = this.currentGeneration) {
    if (this.state.responseFinished(messageID, generation)) {
      this.publish();
    }
  }

  fail(error: { messageID?: string }, generation = this.currentGeneration) {
    const failure = this.state.fail(error, generation);
    if (failure) {
      this.publish();
    }
    return failure;
  }

  hasFailureForRequest(messageID: string) {
    return this.state.hasFailureForRequest(messageID);
  }

  clearFailure(failure: ReturnType<ConversationState['fail']>) {
    if (this.state.clearFailure(failure)) {
      this.publish();
    }
  }

  private publish() {
    const status = this.state.getStatus();
    const state = this.serviceManager.store.getState();
    if (state.conversationStatus !== status) {
      this.serviceManager.store.dispatch(
        actions.setConversationLifecycle(status)
      );
    }
  }
}

export { ConversationLifecycleService };
