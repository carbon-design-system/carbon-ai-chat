/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type {
  MessagePresentationPort,
  StreamAnnouncementContent,
} from '../../shared/services/messaging/presentationPort';

import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';

interface MessagePresentationCapabilities {
  openHomeScreen?(): void;
  openHistoryResponsePanel?(local: LocalMessageItem): void;
  getMessagesScrollBottom?(): number | undefined;
  restoreMessagesScroll?(scrollBottom: number | undefined): void;
  announceSendFailure?(): void;
  announceStreamStarts?(
    messageID: string,
    content: StreamAnnouncementContent
  ): void;
  getUserDefinedResponseSlot?(messageItemID: string): string | undefined;
  hasCustomPromptLine(): boolean;
  announceSending(): void;
  requestComposerFocus(): boolean;
  isHomeScreenOpen(): boolean;
  closeHomeScreen(): void;
  isResponsePanelOpen(): boolean;
  closeResponsePanel(): void;
}

class MessagePresentationAdapter implements MessagePresentationPort {
  constructor(private capabilities: MessagePresentationCapabilities) {}

  getUserDefinedResponseSlot(messageItemID: string) {
    return this.capabilities.getUserDefinedResponseSlot?.(messageItemID);
  }

  getMessagesScrollBottom() {
    return this.capabilities.getMessagesScrollBottom?.();
  }

  restoreMessagesScroll(scrollBottom: number | undefined) {
    this.capabilities.restoreMessagesScroll?.(scrollBottom);
  }

  announceSendFailure() {
    this.capabilities.announceSendFailure?.();
  }

  announceStreamStarts(messageID: string, content: StreamAnnouncementContent) {
    this.capabilities.announceStreamStarts?.(messageID, content);
  }

  openHomeScreen() {
    this.capabilities.openHomeScreen?.();
  }
  openHistoryResponsePanel(local: LocalMessageItem) {
    this.capabilities.openHistoryResponsePanel?.(local);
  }

  hasCustomPromptLine() {
    return this.capabilities.hasCustomPromptLine();
  }

  announceSending() {
    this.capabilities.announceSending();
  }

  requestComposerFocus() {
    this.capabilities.requestComposerFocus();
  }

  closeHomeScreenIfOpen() {
    if (this.capabilities.isHomeScreenOpen()) {
      this.capabilities.closeHomeScreen();
    }
  }

  closeResponsePanelIfOpen() {
    if (this.capabilities.isResponsePanelOpen()) {
      this.capabilities.closeResponsePanel();
    }
  }

  closeHomeScreen() {
    this.capabilities.closeHomeScreen();
  }
}

export { MessagePresentationAdapter };
