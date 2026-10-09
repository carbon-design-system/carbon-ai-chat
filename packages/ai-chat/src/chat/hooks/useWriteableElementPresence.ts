/*
 *  Copyright IBM Corp. 2025, 2026
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
import {
  hasMeaningfulContent,
  observeWriteableElementPresence,
} from '../utils/writeableElementPresence';

export function useWriteableElementPresence(
  name: WriteableElementName,
  writeableElements: Partial<WriteableElements>,
  initialPresence = false
): boolean {
  const node = writeableElements[name];
  const [present, setPresent] = useState(
    () => initialPresence || hasMeaningfulContent(node)
  );
  useLayoutEffect(
    () => observeWriteableElementPresence(node, setPresent),
    [node]
  );
  return present;
}
