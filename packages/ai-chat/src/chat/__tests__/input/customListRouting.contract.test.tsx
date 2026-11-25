/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import {
  byRole,
  contractChat,
  contractSetup,
  isInFlatTree,
} from '../helpers/contract';

const LIST = 'Routed custom suggestions';
const ITEMS = [{ id: 'result', label: 'alpha beta result' }];

// @covers config.input.autocomplete
describe('public custom-list key routing', () => {
  contractSetup();

  it('renders a React custom list in page DOM and forwards each editor navigation key to it once', async () => {
    const keys: string[] = [];
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      input: {
        autocomplete: {
          items: ITEMS,
          minQueryLength: 1,
          renderCustomList: () => (
            <ul
              role="listbox"
              aria-label={LIST}
              onKeyDown={(event) => {
                keys.push(event.key);
              }}>
              <li role="option" aria-selected={false}>
                alpha beta result
              </li>
            </ul>
          ),
        },
      },
    });
    try {
      const editor = await act(() => mount.instance.input.getEditor());
      await act(async () => {
        editor.commands.focus();
        editor.commands.insertContent('alpha');
      });
      const list = await waitFor(() => byRole('listbox', LIST));
      // The list renders in page DOM, where page CSS reaches it.
      expect(list.getRootNode()).toBe(document);
      expect(isInFlatTree(list)).toBe(true);
      // Let the chat finish taking the rendered list before a key arrives.
      await act(async () => {});

      await act(async () => {
        for (const key of ['ArrowDown', 'ArrowUp']) {
          editor.view.dom.dispatchEvent(
            new KeyboardEvent('keydown', {
              key,
              bubbles: true,
              cancelable: true,
            })
          );
        }
      });

      expect(keys).toEqual(['ArrowDown', 'ArrowUp']);
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
