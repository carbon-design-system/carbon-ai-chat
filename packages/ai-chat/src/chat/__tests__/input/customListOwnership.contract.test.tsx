/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useState } from 'react';
import { act, waitFor } from '@testing-library/react';
import {
  OnErrorType,
  PageObjectId,
  type CustomListProps,
  type OnErrorData,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  getByTestId,
  shownText,
} from '../helpers/contract';

const BORROWED = 'The borrowed autocomplete control';
const DISMISS = 'Dismiss the replacement list';
const ITEMS = [{ id: 'result', label: 'alpha beta result' }];
const LATE_FAILURE = new Error(
  'The owned custom list failed after its first commit'
);

function LaterFailureList() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    throw LATE_FAILURE;
  }
  return (
    <button type="button" onClick={() => setFailed(true)}>
      Fail the committed custom list
    </button>
  );
}

describe('public custom-list DOM ownership', () => {
  contractSetup();

  it('leaves an adopted custom-list element and its listener with its consumer after replacement and dismissal', async () => {
    const parked = document.createElement('section');
    const borrowed = document.createElement('button');
    borrowed.type = 'button';
    borrowed.textContent = BORROWED;
    let clicks = 0;
    borrowed.addEventListener('click', () => {
      clicks += 1;
    });
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = DISMISS;
    let current: CustomListProps;
    dismiss.addEventListener('click', () => current.onDismiss());
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      input: {
        autocomplete: {
          items: ITEMS,
          minQueryLength: 1,
          renderCustomList: (props: CustomListProps) => {
            current = props;
            return props.query === 'alpha' ? borrowed : dismiss;
          },
        },
      },
    });
    try {
      document.body.append(parked);
      const editor = await act(() => mount.instance.input.getEditor());
      await act(async () => {
        editor.commands.focus();
        editor.commands.insertContent('alpha');
      });
      await click(await waitFor(() => byRole('button', BORROWED)));
      expect(clicks).toBe(1);
      parked.append(borrowed);
      await act(async () => {
        editor.commands.focus();
        editor.commands.clearContent();
        editor.commands.insertContent('beta');
      });
      await click(await waitFor(() => byRole('button', DISMISS)));
      await waitFor(() => expect(allByRole('button', DISMISS)).toEqual([]));
      expect(borrowed.parentElement).toBe(parked);
      expect(borrowed.isConnected).toBe(true);
      await click(borrowed);
      expect(clicks).toBe(2);
    } finally {
      try {
        await act(async () => mount.unmount());
      } finally {
        parked.remove();
      }
    }
  });

  it('reports a later React custom-list failure and retires its rendered control while retaining the configured error surface', async () => {
    const errors: OnErrorData[] = [];
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      onError: (error) => {
        errors.push(error);
      },
      input: {
        autocomplete: {
          items: ITEMS,
          minQueryLength: 1,
          renderCustomList: () => <LaterFailureList />,
        },
      },
    });
    try {
      const editor = await act(() => mount.instance.input.getEditor());
      await act(async () => {
        editor.commands.focus();
        editor.commands.insertContent('alpha');
      });
      await click(
        await waitFor(() => byRole('button', 'Fail the committed custom list'))
      );
      await waitFor(() => expect(errors).toHaveLength(1));
      expect(errors[0]).toMatchObject({
        errorType: OnErrorType.RENDER,
        otherData: {
          error: { message: expect.stringContaining(LATE_FAILURE.message) },
        },
      });
      await waitFor(() =>
        expect(allByRole('button', 'Fail the committed custom list')).toEqual(
          []
        )
      );
      await act(async () =>
        mount.instance.updateCatastrophicErrorPanel({
          isOpen: true,
          title: 'The custom list could not continue',
          bodyText: 'The host can still explain the failed suggestion list.',
        })
      );
      await waitFor(() =>
        expect(
          shownText(getByTestId(PageObjectId.CATASTROPHIC_PANEL))
        ).toContain('The host can still explain the failed suggestion list.')
      );
      expect(errors).toHaveLength(1);
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
