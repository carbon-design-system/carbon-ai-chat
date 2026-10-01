/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useState, useLayoutEffect } from 'react';
import {
  WriteableElementName,
  WriteableElements,
} from '../../types/instance/WriteableElements';
import { hasMeaningfulContent } from '../utils/writeableElementPresence';

export function useWriteableElementPresence(
  name: WriteableElementName,
  writeableElements: Partial<WriteableElements>,
  initialPresence = false
): boolean {
  const node = writeableElements[name];
  const [present, setPresent] = useState(
    () => initialPresence || hasMeaningfulContent(node)
  );

  useLayoutEffect(() => {
    setPresent(hasMeaningfulContent(node));
    if (!node) {
      return undefined;
    }
    const update = () => setPresent(hasMeaningfulContent(node));
    const observer = new MutationObserver(update);
    const target = node.parentElement ?? node;
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['slot'],
    });
    target.addEventListener('slotchange', update);
    return () => {
      observer.disconnect();
      target.removeEventListener('slotchange', update);
    };
  }, [node]);

  return present;
}
