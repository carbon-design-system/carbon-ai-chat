/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { SendWorkflow } from './SendWorkflow';
import { TerminationWorkflow } from './TerminationWorkflow';
import { MessageLoadingManager } from '../../utils/messageServiceUtils';
import { consoleError } from '../../utils/miscUtils';
import type { PublicConfig } from '../../../types/config/PublicConfig';
import { coordinateSend } from './coordinateSend';
import type {
  MessagePresentationPort,
  StreamAnnouncementContent,
} from './presentationPort';
import type { MessageRequest } from '../../../types/messaging/Messages';
import type { MessageSendSource } from '../../../types/events/eventBusTypes';
import type {
  SendOptions,
  IncreaseOrDecrease,
} from '../../../types/instance/ChatInstance';
import actions from '../../store/actions';
import type { ServiceManager } from '../ServiceManager';
import { RequestQueue, type RequestToken } from './state/RequestQueue';
import type { PendingMessageRequest } from './pendingRequestTypes';
import { IncomingWriteLifetime } from './IncomingWriteLifetime';
import { ConversationState } from './state/ConversationState';

import { coordinateUserDefinedResponseItems } from './coordinateMessageEvents';
import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';
import type { Message } from '../../../types/messaging/Messages';
import type { MessageState } from '../../../types/config/MessagingConfig';

import * as messageEvents from './coordinateMessageEvents';
import type {
  GenericItem,
  MessageResponse,
  PartialOrCompleteItemChunk,
} from '../../../types/messaging/Messages';
import type { DeepPartial } from '../../../types/utilities/DeepPartial';
import type { AppStateMessages } from '../../../types/state/AppState';

import { coordinateReasoningEvents } from './coordinateReasoningEvents';
import { HeadlessReasoningObserver } from './HeadlessReasoningObserver';

import { FullResponseWorkflow } from './FullResponseWorkflow';
import type { UpsertStamp } from './incomingWriteTypes';
import type { MessageWriteOptions } from '../../store/messageWriteTypes';
import type { UpsertMessageUpdater } from '../../../types/config/MessagingConfig';

import { UpsertWorkflow } from './UpsertWorkflow';

import { ChunkWorkflow } from './ChunkWorkflow';
import type { StreamChunk, PauseItem } from '../../../types/messaging/Messages';
import type { AddMessageOptions } from '../../../types/config/MessagingConfig';

class MessageCoordinator {
  private chunkWorkflow?: ChunkWorkflow;

  private getChunkWorkflow() {
    return (this.chunkWorkflow ??= new ChunkWorkflow(this.serviceManager));
  }

  receiveChunk(
    chunk: StreamChunk,
    messageID?: string,
    options?: AddMessageOptions
  ) {
    return this.getChunkWorkflow().receiveChunk(chunk, messageID, options);
  }

  waitForPause(pause: PauseItem, initialRestartCount: number) {
    return this.getChunkWorkflow().waitForPause(pause, initialRestartCount);
  }

  trackChunkRequestErrors(requestID: string, signal: AbortSignal) {
    return this.getChunkWorkflow().trackRequestErrors(requestID, signal);
  }

  bumpChunkRestartGeneration() {
    return this.getChunkWorkflow().bumpRestartGeneration();
  }

  private upsertWorkflow?: UpsertWorkflow;

  private getUpsertWorkflow() {
    return (this.upsertWorkflow ??= new UpsertWorkflow(this.serviceManager));
  }

  trackIncomingWrite(messageID: string) {
    return this.incomingWriteLifetime.trackWrite(messageID);
  }

  markIncomingComplete(messageID: string | undefined) {
    return this.getUpsertWorkflow().markComplete(messageID);
  }

  markIncomingStreaming(messageID: string | undefined) {
    return this.getUpsertWorkflow().markStreaming(messageID);
  }

  getIncomingState(messageID: string) {
    return this.getUpsertWorkflow().getState(messageID);
  }

  hasIncomingStreamingMessages() {
    return this.getUpsertWorkflow().hasStreamingMessages();
  }

  endAllIncomingStreaming(reason?: string) {
    return this.getUpsertWorkflow().endAllStreaming(reason);
  }

  endIncomingStreamingForRequest(requestID: string, generation?: number) {
    return this.getUpsertWorkflow().endStreamingForRequest(
      requestID,
      generation
    );
  }

  endIncomingStreamingMessage(messageID: string, generation?: number) {
    return this.getUpsertWorkflow().endStreamingMessage(messageID, generation);
  }

  clearIncomingMessage(messageID: string) {
    return this.getUpsertWorkflow().clear(messageID);
  }

  invalidatePendingUpserts() {
    return this.getUpsertWorkflow().invalidatePendingUpserts();
  }

  clearAllIncomingWrites() {
    return this.getUpsertWorkflow().clearAll();
  }

  upsertMessage(
    messageID: string,
    nextState: MessageState,
    updater: UpsertMessageUpdater,
    options?: MessageWriteOptions
  ) {
    return this.getUpsertWorkflow().upsert(
      messageID,
      nextState,
      updater,
      options
    );
  }

  private fullResponseWorkflow?: FullResponseWorkflow;

  private getFullResponseWorkflow() {
    return (this.fullResponseWorkflow ??= new FullResponseWorkflow(
      this.serviceManager
    ));
  }

  isIncomingWriteStale(stamp: UpsertStamp, requestID?: string): boolean {
    return (
      !stamp.isCurrent() ||
      stamp.generation !== this.incomingWriteLifetime.state.generation ||
      stamp.restartCount !== this.serviceManager.restartCount ||
      this.isRequestFromPreviousConversation(requestID)
    );
  }

  receive(
    message: MessageResponse,
    isLatestWelcomeNode = false,
    requestMessage?: MessageRequest,
    origin: 'addMessage' | 'chunk' = 'addMessage',
    isCallerCurrent: () => boolean = () => true
  ) {
    return this.getFullResponseWorkflow().receive(
      message,
      isLatestWelcomeNode,
      requestMessage,
      origin,
      isCallerCurrent
    );
  }

  runReceivedWrite(
    messageID: string,
    updater: UpsertMessageUpdater,
    options: MessageWriteOptions,
    stamp: UpsertStamp
  ) {
    return this.getFullResponseWorkflow().runReceivedWrite(
      messageID,
      updater,
      options,
      stamp
    );
  }

  handleConnectToHumanAgent(
    localMessageItem: LocalMessageItem,
    fullMessage: MessageResponse,
    isCurrent: () => boolean = () => true,
    options: { identity?: string; deduplicateByLocalID?: boolean } = {}
  ) {
    return this.getFullResponseWorkflow().handleConnectToHumanAgent(
      localMessageItem,
      fullMessage,
      isCurrent,
      options
    );
  }

  retainAgentItemPositions(messageID: string, identities: Set<string>) {
    return this.getFullResponseWorkflow().retainAgentItemPositions(
      messageID,
      identities
    );
  }

  clearProcessedAgentItems() {
    return this.getFullResponseWorkflow().clearProcessedAgentItems();
  }

  removeMessages(messageIDs: string[]) {
    return this.getFullResponseWorkflow().removeMessages(messageIDs);
  }

  incomingAgentItemIdentity(message: MessageResponse, index: number) {
    return this.getFullResponseWorkflow().agentItemIdentity(message, index);
  }

  readonly incomingWriteLifetime = new IncomingWriteLifetime(
    () => this.serviceManager.restartCount
  );
  getMessagesScrollBottom() {
    return this.presentation?.getMessagesScrollBottom?.();
  }

  restoreMessagesScroll(scrollBottom: number | undefined) {
    this.presentation?.restoreMessagesScroll?.(scrollBottom);
  }

  announceSendFailure() {
    this.presentation?.announceSendFailure?.();
  }

  announceStreamStarts(messageID: string, content: StreamAnnouncementContent) {
    this.presentation?.announceStreamStarts?.(messageID, content);
  }

  private reasoningObserver?: HeadlessReasoningObserver;

  onInstanceReady() {
    this.reasoningObserver?.observe();
  }

  disposeReasoningObserver() {
    this.reasoningObserver?.dispose();
  }

  notifyReasoning(
    session: Set<string>,
    message: Message,
    isCurrent?: () => boolean
  ) {
    coordinateReasoningEvents(
      session,
      message,
      async (local, full) =>
        this.handleUserDefinedResponseItems(
          local,
          full,
          undefined,
          undefined,
          isCurrent
        ),
      isCurrent
    );
  }

  handleUserDefinedResponseItemsChunk(
    messageID: string,
    chunk: PartialOrCompleteItemChunk,
    item: DeepPartial<GenericItem>,
    isCurrent?: () => boolean
  ) {
    return messageEvents.handleUserDefinedResponseItemsChunk(
      this.serviceManager,
      this.presentation,
      messageID,
      chunk,
      item,
      isCurrent
    );
  }

  handleCustomFooterSlot(
    local: LocalMessageItem,
    message: MessageResponse,
    isCurrent?: () => boolean
  ) {
    return messageEvents.handleCustomFooterSlot(
      this.serviceManager,
      local,
      message,
      isCurrent
    );
  }

  handleCustomRequestFooterSlot(
    local: LocalMessageItem,
    message: MessageRequest
  ) {
    return messageEvents.handleCustomRequestFooterSlot(
      this.serviceManager,
      local,
      message
    );
  }

  createElementsForUserDefinedResponses(messages: AppStateMessages) {
    return messageEvents.createElementsForUserDefinedResponses(
      this.serviceManager,
      this.presentation,
      messages
    );
  }

  replayFooterSlots(messages: AppStateMessages) {
    return messageEvents.replayFooterSlots(this.serviceManager, messages);
  }

  handleUserDefinedResponseItems(
    localMessage: LocalMessageItem,
    originalMessage: Message,
    messageState?: MessageState,
    localItemsByID?: Record<string, LocalMessageItem>,
    isCurrent?: () => boolean
  ) {
    return coordinateUserDefinedResponseItems(
      this.serviceManager,
      this.presentation,
      localMessage,
      originalMessage,
      messageState,
      localItemsByID,
      isCurrent
    );
  }

  private state = new ConversationState();
  private terminationWorkflow: TerminationWorkflow;
  private sendWorkflow?: SendWorkflow;
  private loadingManager?: MessageLoadingManager;
  private requestGenerations = new Map<string, number>();
  private processedMessageID: string | null = null;
  public timeoutMS: number;
  private requestQueue = new RequestQueue();
  private requests = new WeakMap<RequestToken, PendingMessageRequest>();

  constructor(
    private serviceManager: ServiceManager,
    private presentation?: MessagePresentationPort
  ) {
    this.terminationWorkflow = new TerminationWorkflow(serviceManager);
    if (!presentation) {
      this.reasoningObserver = new HeadlessReasoningObserver(
        serviceManager,
        (session, message, isCurrent) =>
          this.notifyReasoning(session, message, isCurrent)
      );
    }
  }

  /**
   * Sends the given message to the assistant. Fires `pre:send` then `send` on
   * the event bus before delegating to `customSendMessage`. Resolves when
   * `customSendMessage` completes or when the turn is stopped; rejects when
   * `customSendMessage` throws, when the send path fails terminally, or when a
   * file upload is still in progress.
   *
   * @param message The message to send.
   * @param source The source of the message.
   * @param options Options for the sent message.
   * @param [ignoreHydration=false]
   */
  send(
    message: MessageRequest | string,
    source: MessageSendSource,
    options: SendOptions = {},
    ignoreHydration = false
  ) {
    return coordinateSend(
      this.serviceManager,
      this.presentation,
      message,
      source,
      options,
      ignoreHydration
    );
  }

  requestStopFromInput(markPending: () => void): Promise<void> {
    return this.terminationWorkflow.requestStopFromInput(markPending);
  }

  get inboundStreaming() {
    return this.terminationWorkflow.inboundStreaming;
  }
  get currentRequestID() {
    return this.terminationWorkflow.currentRequestID;
  }
  registerMessageController(messageID: string, controller: AbortController) {
    this.terminationWorkflow.registerMessageController(messageID, controller);
  }
  enqueueMessage(
    message: MessageRequest<any>,
    source: MessageSendSource,
    localMessageID?: string,
    options?: SendOptions
  ) {
    return this.getSendWorkflow().enqueueMessage(
      message,
      source,
      localMessageID,
      options
    );
  }
  cancelAllMessageRequests(reason?: string) {
    return this.terminationWorkflow.cancelAllMessageRequests(reason);
  }
  markCurrentMessageAsStreaming(messageID?: string, itemID?: string) {
    return this.terminationWorkflow.markCurrentMessageAsStreaming(
      messageID,
      itemID
    );
  }
  finalizeStreamingMessage(messageID: string) {
    return this.terminationWorkflow.finalizeStreamingMessage(messageID);
  }
  markStreamingResponseError(messageID: string) {
    return this.terminationWorkflow.markStreamingResponseError(messageID);
  }
  finishFailedStreamingResponse(request: PendingMessageRequest) {
    return this.terminationWorkflow.finishFailedStreamingResponse(request);
  }
  getCurrentMessageController() {
    return this.terminationWorkflow.getCurrentMessageController();
  }
  isAnyMessageStreaming() {
    return this.terminationWorkflow.isAnyMessageStreaming();
  }
  hideStopStreamingButtonIfIdle() {
    return this.terminationWorkflow.hideStopStreamingButtonIfIdle();
  }
  updateStreamingCancellation(messageID: string, cancellable?: boolean) {
    return this.terminationWorkflow.updateStreamingCancellation(
      messageID,
      cancellable
    );
  }
  clearStreamingCancellation(messageID: string) {
    return this.terminationWorkflow.clearStreamingCancellation(messageID);
  }
  clearAllStreamingCancellation() {
    return this.terminationWorkflow.clearAllStreamingCancellation();
  }
  hideStopStreamingButtonIfNoUpsertStreaming() {
    return this.terminationWorkflow.hideStopStreamingButtonIfNoUpsertStreaming();
  }
  cancelCurrentMessageRequest(reason?: string) {
    return this.terminationWorkflow.cancelCurrentMessageRequest(reason);
  }
  cancelMessageRequestByID(
    messageID: string,
    logError: boolean,
    reason?: string
  ) {
    return this.terminationWorkflow.cancelMessageRequestByID(
      messageID,
      logError,
      reason
    );
  }

  private getSendWorkflow() {
    return (this.sendWorkflow ??= new SendWorkflow(this.serviceManager));
  }

  get messageLoadingManager() {
    return (this.loadingManager ??= new MessageLoadingManager());
  }

  configureMessageTimeout(publicConfig: PublicConfig) {
    const timeoutOverride = publicConfig.messaging?.messageTimeoutSecs;
    this.timeoutMS =
      timeoutOverride || timeoutOverride === 0
        ? timeoutOverride * 1000
        : 150 * 1000;
  }

  get lastProcessedMessageID() {
    return this.processedMessageID;
  }

  recordProcessedMessageID(messageID: string) {
    this.processedMessageID = messageID;
  }

  runQueueIfReady() {
    return this.getSendWorkflow().runQueueIfReady();
  }

  advanceRequestQueue() {
    this.clearCurrentRequest();
    this.runQueueIfReady();
  }

  rejectFinalErrorOnMessage(request: PendingMessageRequest, text?: string) {
    this.getSendWorkflow().rejectFinalErrorOnMessage(request, text);
  }

  resolveCancelledMessage(request: PendingMessageRequest) {
    this.getSendWorkflow().resolveCancelledMessage(request);
  }

  public registerRequestGeneration(
    requestID: string,
    restartGeneration: number
  ) {
    this.requestGenerations.set(requestID, restartGeneration);
  }

  public isRequestFromPreviousConversation(
    requestID: string | undefined
  ): boolean {
    const restartGeneration = this.requestGenerations.get(requestID);
    return (
      restartGeneration !== undefined &&
      restartGeneration !== this.serviceManager.restartCount
    );
  }

  updateIsMessageLoadingCounter(
    direction: IncreaseOrDecrease,
    message?: string
  ): void {
    const { store } = this.serviceManager;

    if (direction === 'reset') {
      store.dispatch(actions.resetIsLoadingCounter());
    } else if (direction === 'increase') {
      store.dispatch(actions.addIsLoadingCounter(1, message));
    } else if (direction === 'decrease') {
      if (store.getState().assistantMessageState.isMessageLoadingCounter <= 0) {
        return;
      }
      store.dispatch(actions.addIsLoadingCounter(-1, message));
    } else if (!direction && message) {
      store.dispatch(actions.addIsLoadingCounter(0, message));
    } else if (direction) {
      consoleError(
        `[updateIsMessageLoadingCounter] Invalid direction: ${direction}. Valid values are undefined (with loading message), "reset", "increase" and "decrease".`
      );
    }
  }

  updateIsChatLoadingCounter(direction: string): void {
    const { store } = this.serviceManager;

    if (direction === 'reset') {
      store.dispatch(actions.resetIsHydratingCounter());
    } else if (direction === 'increase') {
      store.dispatch(actions.addIsHydratingCounter(1));
    } else if (direction === 'decrease') {
      if (store.getState().assistantMessageState.isHydratingCounter <= 0) {
        return;
      }
      store.dispatch(actions.addIsHydratingCounter(-1));
    } else {
      consoleError(
        `[updateIsChatLoadingCounter] Invalid direction: ${direction}. Valid values are "reset", "increase" and "decrease".`
      );
    }
  }

  enqueueRequest(request: PendingMessageRequest) {
    const token = Object.freeze({ identity: Symbol() });
    this.requests.set(token, request);
    this.requestQueue.enqueue(token);
  }

  getCurrentRequest() {
    const token = this.requestQueue.getCurrent();
    return token ? this.requests.get(token) : null;
  }

  getWaitingRequestCount() {
    return this.requestQueue.getWaitingCount();
  }

  getFirstWaitingRequest() {
    const token = this.requestQueue.getWaitingAt(0);
    return token ? this.requests.get(token) : undefined;
  }

  takeNextRequest() {
    const token = this.requestQueue.takeNext();
    return token ? this.requests.get(token) : null;
  }

  clearCurrentRequest() {
    this.requestQueue.clearCurrent();
  }

  removeWaitingRequest(messageID: string) {
    // Match the original findIndex scan: ID getters can reenter cancellation.
    const count = this.requestQueue.getWaitingCount();
    for (let index = 0; index < count; index++) {
      const token = this.requestQueue.getWaitingAt(index);
      const request = this.requests.get(token);
      if (request.message.id === messageID) {
        // Remove the entry now at this index, after the ID getter has run.
        return this.requests.get(this.requestQueue.removeWaitingAt(index));
      }
    }
    return undefined;
  }

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

export { MessageCoordinator };
