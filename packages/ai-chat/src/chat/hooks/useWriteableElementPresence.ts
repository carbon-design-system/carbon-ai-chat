/*
 *  Copyright IBM Corp. 2025, 2026
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
import {
  hasMeaningfulContent,
  observeWriteableElementPresence,
} from '../utils/writeableElementPresence';

export function useWriteableElementPresence(
  name: WriteableElementName,
  writeableElements: Partial<WriteableElements>
): boolean {
  const node = writeableElements[name];
  const [present, setPresent] = useState(() => hasMeaningfulContent(node));
  useEffect(() => observeWriteableElementPresence(node, setPresent), [node]);
  return present;
}
