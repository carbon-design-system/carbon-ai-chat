/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import {
  addChunk,
  byRole,
  contractChat,
  contractSetup,
  finalChunk,
  partialText,
  textItem,
  textResponse,
} from '../helpers/contract';

function politeRegions(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('*')).flatMap((node) => [
    ...(node.getAttribute('aria-live') === 'polite' ? [node] : []),
    ...(node.shadowRoot ? politeRegions(node.shadowRoot) : []),
  ]);
}

describe('public legacy stream disclosure', () => {
  contractSetup();

  it('keeps reasoning open for blank chunks and announces the response when real text arrives', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: {
        messages_reasoningStart: 'Utility reasoning started',
        messages_streamingStart: 'Utility response started',
        reasoningSteps_mainLabelOpen: 'Utility hide reasoning',
        reasoningSteps_mainLabelClosed: 'Utility show reasoning',
      },
    });
    const deliveries: string[] = [];
    await waitFor(() => expect(politeRegions().length).toBeGreaterThan(0));
    const observers = politeRegions().map((region) => {
      const observer = new MutationObserver(() => {
        const value = region.textContent?.trim();
        if (value) {
          deliveries.push(value);
        }
      });
      observer.observe(region, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      return observer;
    });
    const starts = () =>
      deliveries.filter((value) => value.includes('Utility response started'))
        .length;
    try {
      await addChunk(mount.instance, {
        ...partialText('disclosure-owner', 'text', ''),
        partial_response: {
          message_options: {
            reasoning: {
              steps: [
                { title: 'Utility step', content: 'Thinking before text' },
              ],
            },
          },
        },
      });
      await waitFor(() =>
        expect(byRole('button', 'Utility hide reasoning')).toHaveAttribute(
          'aria-expanded',
          'true'
        )
      );
      await addChunk(
        mount.instance,
        partialText('disclosure-owner', 'text', ' \n ')
      );
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Utility blank delivery barrier', 'blank-barrier')
        )
      );
      await waitFor(() =>
        expect(
          deliveries.some((value) =>
            value.includes('Utility blank delivery barrier')
          )
        ).toBe(true)
      );
      expect(starts()).toBe(0);
      expect(byRole('button', 'Utility hide reasoning')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      await addChunk(
        mount.instance,
        partialText('disclosure-owner', 'text', 'Visible utility answer')
      );
      await waitFor(() => expect(starts()).toBe(1));
      await waitFor(() =>
        expect(byRole('button', 'Utility show reasoning')).toHaveAttribute(
          'aria-expanded',
          'false'
        )
      );
      await addChunk(
        mount.instance,
        partialText('disclosure-owner', 'text', ' more')
      );
      await addChunk(
        mount.instance,
        finalChunk('disclosure-owner', [
          textItem('Visible utility answer more', 'text'),
        ])
      );
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Utility final delivery barrier', 'final-barrier')
        )
      );
      await waitFor(() =>
        expect(
          deliveries.some((value) =>
            value.includes('Utility final delivery barrier')
          )
        ).toBe(true)
      );
      expect(starts()).toBe(1);
    } finally {
      observers.forEach((observer) => observer.disconnect());
      await act(async () => mount.unmount());
    }
  });
});
