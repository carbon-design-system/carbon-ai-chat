/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import {
  addChunk,
  contractChat,
  contractSetup,
  outputTexts,
  finalChunk,
  textItem,
  partialText,
} from '../helpers/contract';

describe('public unread legacy snapshot', () => {
  contractSetup();

  it('keeps an unread message snapshot at its earlier text after the next real chunk', async () => {
    const mount = await contractChat({ messaging: { skipWelcome: true } });
    try {
      await addChunk(
        mount.instance,
        partialText('unread-legacy', 'text', 'Hello')
      );
      const retained = mount.instance.state.get();
      await addChunk(
        mount.instance,
        partialText('unread-legacy', 'text', ' world')
      );
      expect(
        mount.instance.state
          .get()
          .messages.flatMap((message) => outputTexts(message))
      ).toEqual(['Hello world']);
      // First access to retained.messages deliberately happens after the next
      // chunk. This is the legacy writer, not an invented SDK chunk method.
      expect(
        retained.messages.flatMap((message) => outputTexts(message))
      ).toEqual(['Hello']);
      expect(Object.isFrozen(retained.messages)).toBe(true);
      expect(Object.isFrozen(retained.messages[0])).toBe(true);
      await addChunk(
        mount.instance,
        finalChunk('unread-legacy', [textItem('Hello world', 'text')])
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
