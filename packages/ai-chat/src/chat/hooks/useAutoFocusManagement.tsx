/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect, useState } from "react";
import { usePrevious } from "./usePrevious";
import { arrayLastValue } from "../utils/lang/arrayUtils";
import type { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import type { Message } from "../../types/messaging/Messages";

interface UseAutoFocusManagementProps {
  shouldTakeFocusIfOpensAutomatically: boolean | undefined;
  hasSentNonWelcomeMessage: boolean;
  localMessageIDs: string[];
  allMessageItemsByID: Record<string, LocalMessageItem>;
  allMessagesByID: Record<string, Message>;
  requestFocus: () => void;
}

interface UseAutoFocusManagementReturn {
  shouldAutoFocus: boolean;
}

/**
 * Custom hook to manage auto-focus behavior based on message state changes
 */
export function useAutoFocusManagement({
  shouldTakeFocusIfOpensAutomatically,
  hasSentNonWelcomeMessage,
  localMessageIDs,
  allMessageItemsByID,
  allMessagesByID,
  requestFocus,
}: UseAutoFocusManagementProps): UseAutoFocusManagementReturn {
  const [shouldAutoFocus, setShouldAutoFocus] = useState(
    shouldTakeFocusIfOpensAutomatically ?? true,
  );

  const prevHasSentNonWelcomeMessage = usePrevious(hasSentNonWelcomeMessage);
  const prevMessageIDs = usePrevious(localMessageIDs);
  const lastMessageItemID = arrayLastValue(localMessageIDs);
  const prevLastMessageItemID = usePrevious(lastMessageItemID);

  // Update shouldAutoFocus when shouldTakeFocusIfOpensAutomatically changes
  useEffect(() => {
    const shouldTakeFocus = shouldTakeFocusIfOpensAutomatically ?? true;
    setShouldAutoFocus(shouldTakeFocus);
  }, [shouldTakeFocusIfOpensAutomatically]);

  // Update shouldAutoFocus based on message count changes
  useEffect(() => {
    // Default to true if undefined
    const shouldTakeFocus = shouldTakeFocusIfOpensAutomatically ?? true;

    if (!shouldTakeFocus) {
      return;
    }

    const prevMessageCount = prevMessageIDs?.length ?? localMessageIDs.length;
    const currentMessageCount = localMessageIDs.length;
    const previouslySentNonWelcome =
      prevHasSentNonWelcomeMessage ?? hasSentNonWelcomeMessage;

    if (
      !previouslySentNonWelcome &&
      hasSentNonWelcomeMessage &&
      !shouldAutoFocus
    ) {
      setShouldAutoFocus(true);
    } else if (prevMessageCount > currentMessageCount && shouldAutoFocus) {
      setShouldAutoFocus(false);
    } else if (prevMessageCount < currentMessageCount && !shouldAutoFocus) {
      setShouldAutoFocus(true);
    }
  }, [
    localMessageIDs,
    hasSentNonWelcomeMessage,
    prevHasSentNonWelcomeMessage,
    prevMessageIDs,
    shouldTakeFocusIfOpensAutomatically,
    shouldAutoFocus,
  ]);

  // Request focus when new message arrives (not from history)
  useEffect(() => {
    if (
      lastMessageItemID &&
      lastMessageItemID !== prevLastMessageItemID &&
      shouldAutoFocus
    ) {
      const lastMessageItem = allMessageItemsByID[lastMessageItemID];
      const lastMessage = allMessagesByID[lastMessageItem?.fullMessageID];
      if (!lastMessage?.ui_state_internal?.from_history) {
        requestFocus();
      }
    }
  }, [
    allMessageItemsByID,
    allMessagesByID,
    lastMessageItemID,
    prevLastMessageItemID,
    requestFocus,
    shouldAutoFocus,
  ]);

  return {
    shouldAutoFocus,
  };
}

// Made with Bob
