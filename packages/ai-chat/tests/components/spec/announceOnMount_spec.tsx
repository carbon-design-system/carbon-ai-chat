/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `AnnounceOnMount` is kept mounted while something else owns the announcement —
 * `Input` does that for upload failures, because swapping the element out would
 * remount it and re-announce. These tests pin what the instance owes once that
 * other owner lets go.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

import { AnnounceOnMount } from '../../../src/chat/components/helpers/AnnounceOnMount/AnnounceOnMount';
import { AriaAnnouncerContext } from '../../../src/chat/contexts/AriaAnnouncerContext';

interface WrapperProps {
  announceOnce?: string;
  live?: boolean;
}

function renderWrapper(props: WrapperProps) {
  const announcer = jest.fn();

  const markup = (next: WrapperProps) => (
    <AriaAnnouncerContext.Provider value={announcer}>
      <AnnounceOnMount {...next}>
        <span>error</span>
      </AnnounceOnMount>
    </AriaAnnouncerContext.Provider>
  );

  const { rerender } = render(markup(props));

  return {
    announcer,
    update: (next: WrapperProps) => rerender(markup(next)),
  };
}

describe('AnnounceOnMount', () => {
  it('announces its message on mount', async () => {
    const { announcer } = renderWrapper({ announceOnce: 'Too long.' });

    await waitFor(() => expect(announcer).toHaveBeenCalledWith('Too long.'));
  });

  it('says nothing while another owner has the announcement', async () => {
    const { announcer } = renderWrapper({
      announceOnce: 'Upload failed.',
      live: false,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(announcer).not.toHaveBeenCalled();
  });

  it('announces a message it was silent for once it goes live', async () => {
    const { announcer, update } = renderWrapper({ live: false });

    update({ announceOnce: 'Too long.', live: true });

    // The instance is reused rather than remounted, so componentDidMount will
    // not run again — a latch spent on the silent mount would lose this.
    await waitFor(() => expect(announcer).toHaveBeenCalledWith('Too long.'));
    expect(announcer).toHaveBeenCalledTimes(1);
  });

  it('announces once across later updates', async () => {
    const { announcer, update } = renderWrapper({ announceOnce: 'Too long.' });

    await waitFor(() => expect(announcer).toHaveBeenCalledTimes(1));

    update({ announceOnce: 'Still too long.' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(announcer).toHaveBeenCalledTimes(1);
  });
});
