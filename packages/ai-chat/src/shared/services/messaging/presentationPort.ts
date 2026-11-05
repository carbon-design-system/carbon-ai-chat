/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { DeepPartial } from '../../../types/utilities/DeepPartial';
import type { ResponseUserProfile } from '../../../types/messaging/Messages';

interface StreamAnnouncementContent {
  hasReasoning: boolean;
  hasDisplayableContent: boolean;
  responseUserProfile?: DeepPartial<ResponseUserProfile>;
}

import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';

/** A language-pack message for screen readers, with plain string values. */
interface PortAnnouncement {
  messageID: string;
  messageValues?: Record<string, string>;
}

/** How a loading counter changes. With no direction, only its text changes. */
type LoadingDirection = 'increase' | 'decrease' | 'reset' | undefined;

interface MessagePresentationPort {
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
  requestComposerFocus(): void;
  closeHomeScreenIfOpen(): void;
  closeResponsePanelIfOpen(): void;
  closeHomeScreen(): void;
  announce?(message: PortAnnouncement): void;
  changeMessageLoadingCounter?(amount: number): void;
  updateMessageLoadingCounter?(
    direction: LoadingDirection,
    message?: string
  ): void;
  changeChatLoadingCounter?(amount: number): void;
  updateChatLoadingCounter?(direction: LoadingDirection): void;
}

export type {
  LoadingDirection,
  MessagePresentationPort,
  PortAnnouncement,
  StreamAnnouncementContent,
};
