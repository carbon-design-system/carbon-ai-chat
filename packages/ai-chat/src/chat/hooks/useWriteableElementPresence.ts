/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useState, useEffect } from 'react';
import {
  WriteableElementName,
  WriteableElements,
} from '../../types/instance/WriteableElements';

/**
 * Returns `true` when the writeable-element host node for `name` contains
 * meaningful host content, `false` otherwise. "Meaningful content" mirrors
 * `SlotObserver.hasSlotContent`: an empty wrapper div, a whitespace-only text node,
 * and comments all read as no content. Reacts to content arriving or leaving
 * post-boot via a `MutationObserver`.
 */
export function useWriteableElementPresence(
  name: WriteableElementName,
  writeableElements: Partial<WriteableElements>
): boolean {
  const node = writeableElements[name];

  const [present, setPresent] = useState(
    () => node !== undefined && hasMeaningfulContent(node)
  );

  useEffect(() => {
    if (!node) {
      return undefined;
    }

    // Re-check synchronously in case content arrived between the lazy-init and mount.
    setPresent(hasMeaningfulContent(node));

    const observer = new MutationObserver(() => {
      setPresent(hasMeaningfulContent(node));
    });

    observer.observe(node, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [node]);

  return present;
}

/**
 * Returns true when `node` contains at least one non-comment,
 * non-whitespace-only child — matching the rules in
 * `SlotObserver.hasSlotContent`.
 */
function hasMeaningfulContent(node: HTMLElement): boolean {
  return Array.from(node.childNodes).some((child) => {
    if (child.nodeType === Node.COMMENT_NODE) {
      return false;
    }
    if (child.nodeType === Node.TEXT_NODE) {
      return Boolean(child.textContent?.trim());
    }
    // Any element node counts as content.
    return child.nodeType === Node.ELEMENT_NODE;
  });
}
