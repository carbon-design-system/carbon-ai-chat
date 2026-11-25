/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { type ChatInstance, PageObjectId } from '../../../aiChatEntry';
import {
  byRole,
  contractSetup,
  getByTestId,
  isShownWithin,
  mainPanelText,
  openElement,
  pause,
  textResponse,
} from '../helpers/contract';

const TABLE = '| a | b |\n| --- | --- |\n| 1 | 2 |';

function shownInMainPanel(node: Node): boolean {
  return isShownWithin(node, getByTestId(PageObjectId.MAIN_PANEL));
}

describe('public chat element move', () => {
  contractSetup();

  it('keeps a table renderer’s element, its typed value and the running chat through a same-task move of cds-aichat-custom-element', async () => {
    let renders = 0;
    const table = () => {
      renders += 1;
      const field = document.createElement('input');
      field.setAttribute('aria-label', 'Retained table field');
      return field;
    };
    const handed: ChatInstance[] = [];
    const destination = document.body.appendChild(
      document.createElement('div')
    );
    const mount = await openElement('cds-aichat-custom-element', {
      homescreen: { isOn: false },
      markdown: { customRenderers: { table } },
      onBeforeRender: (instance: ChatInstance) => {
        handed.push(instance);
      },
    });
    const { element, instance } = mount;
    try {
      await act(() =>
        instance.messaging.addMessage(textResponse(TABLE, 'moved-table'))
      );
      const field = await waitFor(() => {
        const shown = byRole('textbox', 'Retained table field');
        expect(shownInMainPanel(shown)).toBe(true);
        return shown as HTMLInputElement;
      });
      field.value = 'Typed before the move';
      // The renderer's calls are settled before the move.
      await pause();
      const rendersBefore = renders;
      expect(byRole('textbox', 'Retained table field')).toBe(field);

      // One task: the element disconnects and reconnects before any microtask.
      await act(async () => {
        destination.appendChild(element);
      });
      // A short wait gives a restarted chat or a second render time to show.
      await pause();

      expect(element.parentElement).toBe(destination);
      expect(handed).toHaveLength(1);
      expect(handed[0]).toBe(instance);
      expect(byRole('textbox', 'Retained table field')).toBe(field);
      expect(field.isConnected).toBe(true);
      expect(field.value).toBe('Typed before the move');
      expect(shownInMainPanel(field)).toBe(true);
      expect(renders).toBe(rendersBefore);
      // The moved chat still runs.
      await act(() =>
        instance.messaging.addMessage(
          textResponse('Answered after the move', 'after-move')
        )
      );
      await waitFor(() =>
        expect(mainPanelText()).toContain('Answered after the move')
      );
    } finally {
      await act(async () => mount.remove());
    }
  });
});
