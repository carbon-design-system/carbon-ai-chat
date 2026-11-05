/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { Message, GenericItem } from '../../../types/messaging/Messages';
import { MessageResponseTypes } from '../../../types/messaging/Messages';
import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';
import { isResponse } from '../../utils/messageUtils';
import { synthesizeReasoningLocalMessageItem } from '../../utils/reasoningContent';
import { prepareReasoningMessageEvent } from './nativeMessageEvents';

export function coordinateReasoningEvents(
  session: Set<string>,
  message: Message,
  deliver: (localItem: LocalMessageItem, message: Message) => Promise<void>,
  isCurrent?: () => boolean
) {
  if (!isResponse(message)) {
    return;
  }
  const reasoning = message.message_options?.reasoning;
  if (!reasoning) {
    return;
  }

  const fireForArray = (
    content: string | GenericItem[] | undefined,
    slotKey: string
  ) => {
    if (!Array.isArray(content)) {
      return;
    }
    content.forEach((item, itemIndex) => {
      if (isCurrent && !isCurrent()) {
        return;
      }
      if (item.response_type !== MessageResponseTypes.USER_DEFINED) {
        return;
      }
      const stableId = `${message.id}-reasoning-${slotKey}-item-${itemIndex}`;
      if (session.has(stableId)) {
        return;
      }
      session.add(stableId);
      const localItem = synthesizeReasoningLocalMessageItem(
        item,
        message.id,
        stableId
      );
      const event = prepareReasoningMessageEvent(message, localItem);
      void deliver(event.localItem, event.message);
    });
  };

  fireForArray(reasoning.content, 'intro');
  reasoning.steps?.forEach((step, index) => {
    fireForArray(step.content, `step-${index}`);
  });
}
