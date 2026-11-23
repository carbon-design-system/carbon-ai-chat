/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { DeepPartial } from '../../../../types/utilities/DeepPartial';
import type { ResponseUserProfile } from '../../../../types/messaging/Messages';

interface StreamAnnouncementCapabilities {
  announceStreamStart(
    messageID: string,
    languageKey: 'messages_streamingStart' | 'messages_reasoningStart',
    responseUserProfile: DeepPartial<ResponseUserProfile> | undefined
  ): void;
}

class StreamAnnouncerService {
  /**
   * Tracks which message IDs have had their "streaming start" announced.
   * Prevents duplicate announcements for the same streaming message.
   */
  private announcedStreamingStarts = new Set<string>();

  /**
   * Tracks which message IDs have had their "reasoning start" announced.
   * Prevents duplicate announcements for the same reasoning message.
   */
  private announcedReasoningStarts = new Set<string>();

  constructor(private capabilities: StreamAnnouncementCapabilities) {}

  /**
   * Clears all announcement tracking. Called on restart so announcements
   * fire fresh for the new conversation.
   */
  clearAll() {
    this.announcedStreamingStarts.clear();
    this.announcedReasoningStarts.clear();
  }

  /**
   * Announces that reasoning has started, then that streaming has started, each at most
   * once per message ID. Streaming start waits for displayable content, which is when the
   * UI closes the reasoning steps. Both `addMessageChunk` and a streaming `upsertMessage`
   * call this, so a message streamed through both is announced once.
   *
   * @param messageID - The ID of the message being streamed
   * @param content - What the latest write for the message carries
   * @param content.hasReasoning - Whether it carries reasoning steps
   * @param content.hasDisplayableContent - Whether it has content the UI shows
   * @param content.responseUserProfile - Names the speaker when the message is not in the
   * store yet
   */
  announceStreamStarts(
    messageID: string,
    content: {
      hasReasoning: boolean;
      hasDisplayableContent: boolean;
      responseUserProfile?: DeepPartial<ResponseUserProfile>;
    }
  ) {
    if (content.hasReasoning && !this.announcedReasoningStarts.has(messageID)) {
      this.announcedReasoningStarts.add(messageID);
      this.announceStreamStart(
        messageID,
        'messages_reasoningStart',
        content.responseUserProfile
      );
    }

    if (
      content.hasDisplayableContent &&
      !this.announcedStreamingStarts.has(messageID)
    ) {
      this.announcedStreamingStarts.add(messageID);
      this.announceStreamStart(
        messageID,
        'messages_streamingStart',
        content.responseUserProfile
      );
    }
  }

  /**
   * Announces that the assistant has started reasoning or responding, which gives screen
   * reader users immediate feedback.
   */
  private announceStreamStart(
    messageID: string,
    languageKey: 'messages_streamingStart' | 'messages_reasoningStart',
    responseUserProfile: DeepPartial<ResponseUserProfile> | undefined
  ) {
    this.capabilities.announceStreamStart(
      messageID,
      languageKey,
      responseUserProfile
    );
  }
}

export { StreamAnnouncerService };
