/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';

import { PageObjectId } from '../../../testing/PageObjectId';
import { byTestId, contractSetup, shownText } from '../helpers/contract';
import { isVisible, mountPanelHost } from '../helpers/browserPanels';

function disclaimerShown(): boolean {
  return isVisible(byTestId(PageObjectId.DISCLAIMER_PANEL));
}

describe('disclaimer', () => {
  contractSetup();

  it('disclaimer enable and disable', async () => {
    const host = await mountPanelHost('react', 'float', {
      disclaimer: { isOn: true, disclaimerHTML: 'Test disclaimer message' },
      header: { title: 'With Disclaimer' },
    });
    await waitFor(() => expect(disclaimerShown()).toBe(true));
    expect(shownText(byTestId(PageObjectId.DISCLAIMER_PANEL))).toContain(
      'Test disclaimer message'
    );

    await host.update({
      disclaimer: { isOn: false, disclaimerHTML: 'This should not be shown' },
      header: { title: 'No Disclaimer' },
    });
    await waitFor(() =>
      expect(isVisible(byTestId(PageObjectId.MAIN_PANEL))).toBe(true)
    );
    expect(disclaimerShown()).toBe(false);
    expect(
      shownText(byTestId(PageObjectId.CHAT_WIDGET) ?? document.body)
    ).not.toContain('This should not be shown');

    await host.update({
      disclaimer: { isOn: true, disclaimerHTML: 'Disclaimer is back!' },
      header: { title: 'Disclaimer Enabled Again' },
    });
    await waitFor(() => expect(disclaimerShown()).toBe(true));
    expect(shownText(byTestId(PageObjectId.DISCLAIMER_PANEL))).toContain(
      'Disclaimer is back!'
    );
    await host.unmount();
  });
});
