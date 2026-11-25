/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import { WriteableElementName, type ChatInstance } from '../../../aiChatEntry';
import { contractChat, contractSetup } from '../helpers/contract';

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

type EditorLookup = ReturnType<ChatInstance['input']['getEditor']>;
type LookupOutcome =
  { status: 'resolved' } | { status: 'rejected'; error: unknown };

function observe(lookup: EditorLookup): Promise<LookupOutcome> {
  return lookup.then(
    () => ({ status: 'resolved' as const }),
    (error: unknown) => ({ status: 'rejected' as const, error })
  );
}

describe('public editor ownership', () => {
  contractSetup();

  it('rejects a cold editor lookup after custom content takes ownership and accepts a fresh lookup after release', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    let lookup: EditorLookup;
    let outcome: Promise<LookupOutcome>;
    try {
      const slot =
        mount.instance.writeableElements[
          WriteableElementName.CUSTOM_PROMPT_LINE
        ];
      await act(async () => {
        lookup = mount.instance.input.getEditor();
        outcome = observe(lookup);
        slot.append(document.createElement('input'));
      });
      expect(
        await bounded(outcome, 'Interrupted custom editor lookup')
      ).toMatchObject({
        status: 'rejected',
        error: { message: 'Input is not currently rendered' },
      });
      await act(async () => slot.replaceChildren());
      const editor = await act(() =>
        bounded(mount.instance.input.getEditor(), 'Fresh editor lookup')
      );
      expect(editor.isDestroyed).toBe(false);
      await act(async () => {
        editor.commands.setContent({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Fresh owned editor' }],
            },
          ],
        });
      });
      expect(mount.instance.state.get().input.rawValue).toBe(
        'Fresh owned editor'
      );
    } finally {
      await act(async () => mount.unmount());
      if (lookup) {
        await bounded(Promise.allSettled([lookup]), 'Owned editor cleanup');
      }
    }
  });

  it('rejects a new editor lookup immediately after its live public host unmounts', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    let lookup: EditorLookup;
    let outcome: Promise<LookupOutcome>;
    let mounted = true;
    try {
      const liveEditor = await act(() =>
        bounded(mount.instance.input.getEditor(), 'Live editor control')
      );
      expect(liveEditor.isDestroyed).toBe(false);
      await act(async () => {
        mount.unmount();
        mounted = false;
        lookup = mount.instance.input.getEditor();
        outcome = observe(lookup);
      });
      expect(await bounded(outcome, 'Unmounted editor lookup')).toMatchObject({
        status: 'rejected',
        error: { message: 'Input is not currently rendered' },
      });
    } finally {
      if (mounted) {
        await act(async () => mount.unmount());
      }
      if (lookup) {
        await bounded(Promise.allSettled([lookup]), 'Owned editor cleanup');
      }
    }
  });
});
