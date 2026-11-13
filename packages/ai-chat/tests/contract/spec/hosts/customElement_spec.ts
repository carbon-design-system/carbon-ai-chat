/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * What `cds-aichat-custom-element` does to itself. The host sizes it with its
 * own CSS; with no `onViewChange`, the element adds the `cds-aichat--hidden`
 * class while the main window is closed (its class JSDoc names the class),
 * which collapses it to 0x0. jsdom applies none of the element's styles, so
 * the class is what a host can check here.
 */

import { act } from '@testing-library/react';

import { BusEventViewChange, ViewType } from '../../../../src/aiChatEntry';
import { changeView, contractElement, contractSetup } from '../../helpers';

const HIDDEN = 'cds-aichat--hidden';

/** Connects a custom element with these properties and attributes. */
function mount(
  properties: Record<string, unknown> = {},
  attributes: Record<string, string> = {}
) {
  return contractElement('cds-aichat-custom-element', {
    properties: { messaging: { skipWelcome: true }, ...properties },
    attributes,
  });
}

// @covers element.cds-aichat-custom-element.onViewChange
describe('cds-aichat-custom-element visibility', () => {
  contractSetup();

  it('is hidden while the main window is closed, and not while it is open', async () => {
    const { instance, element } = await mount();
    expect(element.classList.contains(HIDDEN)).toBe(true);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(element.classList.contains(HIDDEN)).toBe(false);
    await changeView(instance, ViewType.LAUNCHER);
    expect(element.classList.contains(HIDDEN)).toBe(true);
  });

  it('starts not hidden when it opens by default', async () => {
    const { element } = await mount({ openChatByDefault: true });
    expect(element.classList.contains(HIDDEN)).toBe(false);
  });

  it('keeps the classes the host gave it', async () => {
    const { instance, element } = await mount();
    await act(async () => {
      element.classList.add('host-chat');
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    await changeView(instance, ViewType.LAUNCHER);
    expect([...element.classList].sort()).toEqual([HIDDEN, 'host-chat']);
  });

  it('leaves its classes to the host when onViewChange is set', async () => {
    const change = jest.fn((_event: BusEventViewChange): void => undefined);
    const { instance, element } = await mount({ onViewChange: change });
    await changeView(instance, ViewType.MAIN_WINDOW);
    await changeView(instance, ViewType.LAUNCHER);
    expect(element.classList.contains(HIDDEN)).toBe(false);
    expect(change.mock.calls.map(([event]) => event.newViewState)).toEqual([
      { launcher: true, mainWindow: false },
      { launcher: false, mainWindow: true },
      { launcher: true, mainWindow: false },
    ]);
  });

  // @covers element.cds-aichat-custom-element.onViewPreChange
  it('still hides itself when only onViewPreChange is set', async () => {
    const { instance, element } = await mount({ onViewPreChange: jest.fn() });
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(element.classList.contains(HIDDEN)).toBe(false);
    await changeView(instance, ViewType.LAUNCHER);
    expect(element.classList.contains(HIDDEN)).toBe(true);
  });

  it('still hides itself when onviewchange is written as an HTML attribute', async () => {
    const { instance, element } = await mount(
      {},
      { onviewchange: 'notAHandler()' }
    );
    expect(element.classList.contains(HIDDEN)).toBe(true);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(element.classList.contains(HIDDEN)).toBe(false);
  });
});
