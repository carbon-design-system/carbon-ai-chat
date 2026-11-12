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

interface MessagePresentationPort {
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
}

export type { MessagePresentationPort, StreamAnnouncementContent };
