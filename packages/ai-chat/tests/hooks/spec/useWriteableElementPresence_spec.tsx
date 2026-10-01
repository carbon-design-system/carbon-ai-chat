/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useWriteableElementPresence } from '../../../src/chat/hooks/useWriteableElementPresence';
import { WriteableElementName } from '../../../src/types/instance/WriteableElements';

function Presence({
  node,
  hint = false,
}: {
  node: HTMLElement;
  hint?: boolean;
}) {
  const present = useWriteableElementPresence(
    WriteableElementName.CUSTOM_PROMPT_LINE,
    { [WriteableElementName.CUSTOM_PROMPT_LINE]: node },
    hint
  );
  return <output>{present ? 'custom' : 'default'}</output>;
}

it('reconciles an empty hinted slot before paint', () => {
  render(<Presence node={document.createElement('div')} hint />);
  expect(screen.getByRole('status')).toHaveTextContent('default');
});

it('tracks text edits, element insertion, and removal on the same host', async () => {
  const host = document.createElement('div');
  const text = document.createTextNode(' ');
  host.append(text, document.createComment('empty'));
  const { unmount } = render(<Presence node={host} />);
  expect(screen.getByRole('status')).toHaveTextContent('default');
  await act(async () => {
    text.data = 'Custom composer';
  });
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('custom')
  );
  await act(async () => {
    text.data = ' ';
  });
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('default')
  );
  await act(async () => {
    host.append(document.createElement('input'));
  });
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('custom')
  );
  await act(async () => {
    host.replaceChildren();
  });
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('default')
  );
  const disconnect = jest.spyOn(MutationObserver.prototype, 'disconnect');
  unmount();
  expect(disconnect).toHaveBeenCalled();
  disconnect.mockRestore();
});
