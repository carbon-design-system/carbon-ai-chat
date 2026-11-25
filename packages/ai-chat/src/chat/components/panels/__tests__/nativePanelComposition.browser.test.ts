/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { fixture, flush, setupNativePanelFixture } from './nativePanelFixture';
import { ScreenShareState } from '../../../../types/config/ServiceDeskConfig';

setupNativePanelFixture();

// tabbable needs real layout to find a focus target, so these cases run in a
// real browser rather than under a stubbed getClientRects.
describe('native panel composition', () => {
  it("focuses the frame's own body slot, not a body slot nested in its header", async () => {
    const f = await fixture();
    await f.commit();
    f.view.inputs = {
      ...f.view.inputs,
      customPanelState: { ...f.view.inputs.customPanelState, isOpen: true },
    };
    await flush(f.view);
    const frame = f.panel('custom');
    const header = frame.querySelector(':scope > [slot="header"]');
    const nested = document.createElement('div');
    nested.slot = 'body';
    const nestedButton = document.createElement('button');
    nested.append(nestedButton);
    header.prepend(nested);
    const body = f.hosts.panelTargetFor('custom-body');
    expect(body.parentElement).toBe(frame);
    const bodyButton = document.createElement('button');
    body.append(bodyButton);

    expect(f.view.requestPanelFocus('custom')).toBe(true);
    const focusChain: Element[] = [];
    for (
      let active: Element | null = document.activeElement;
      active;
      active = active.shadowRoot?.activeElement ?? null
    ) {
      focusChain.push(active);
    }
    expect(focusChain).toContain(bodyButton);
    expect(focusChain).not.toContain(nestedButton);
  });

  it('uses native prompt buttons, focuses and announces once, and cancels Escape without bubbling', async () => {
    const f = await fixture();
    await f.commit();
    f.view.inputs = { ...f.view.inputs, showScreenShareRequest: true };
    await flush(f.view);
    const frame = f.panel('screenShare');
    const footer = frame.querySelector('[slot="footer"]');
    const buttons = footer.querySelectorAll('cds-button');
    const focusChain: Element[] = [];
    for (
      let active: Element | null = document.activeElement;
      active;
      active = active.shadowRoot?.activeElement ?? null
    ) {
      focusChain.push(active);
    }
    expect(focusChain).toContain(buttons[0]);
    (buttons[0] as HTMLElement).click();
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenLastCalledWith(
      ScreenShareState.DECLINED
    );
    (buttons[1] as HTMLElement).click();
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenLastCalledWith(
      ScreenShareState.ACCEPTED
    );
    expect(f.callbacks.announce).toHaveBeenCalledTimes(1);
    frame.dispatchEvent(
      new CustomEvent('openend', { detail: { isReactivation: true } })
    );
    expect(f.callbacks.announce).toHaveBeenCalledTimes(1);
    const bubbled = vi.fn();
    f.view.addEventListener('keydown', bubbled);
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    frame.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(bubbled).not.toHaveBeenCalled();
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenLastCalledWith(
      ScreenShareState.DECLINED
    );
  });
});
