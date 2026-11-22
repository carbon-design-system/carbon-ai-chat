/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { PageObjectId, type ChatInstance } from '../../../aiChatEntry';
import {
  ELEMENT_TAGS,
  getByTestId,
  contractSetup,
  openElement,
} from '../helpers/contract';

describe.each(ELEMENT_TAGS)('public AI-theme precedence on %s', (tag) => {
  contractSetup();

  it('forwards ai-disabled precedence to the shared shell theme and restores it on the same chat', async () => {
    const instances: ChatInstance[] = [];
    const mount = await openElement(tag, {
      aiEnabled: true,
      onBeforeRender: (instance: ChatInstance) => {
        instances.push(instance);
      },
    });
    try {
      await waitFor(() =>
        expect(getByTestId(PageObjectId.CHAT_WIDGET)).toHaveAttribute(
          'ai-enabled'
        )
      );
      await act(async () => mount.element.setAttribute('ai-disabled', ''));
      await waitFor(() =>
        expect(getByTestId(PageObjectId.CHAT_WIDGET)).not.toHaveAttribute(
          'ai-enabled'
        )
      );
      await act(async () => mount.element.removeAttribute('ai-disabled'));
      await waitFor(() =>
        expect(getByTestId(PageObjectId.CHAT_WIDGET)).toHaveAttribute(
          'ai-enabled'
        )
      );
      expect(instances).toEqual([mount.instance]);
      expect(mount.instance.state.get().viewState.mainWindow).toBe(true);
    } finally {
      await act(async () => mount.remove());
    }
  });
});
