/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { TextItem } from '../../types/messaging/Messages';
import type { LocalMessageItemStreamingState } from '../../types/messaging/LocalMessageItem';

export function streamingText(
  text: string,
  state?: LocalMessageItemStreamingState
): string {
  return state && !state.isDone
    ? state.chunks.map((chunk) => (chunk as Partial<TextItem>).text).join('')
    : text;
}
