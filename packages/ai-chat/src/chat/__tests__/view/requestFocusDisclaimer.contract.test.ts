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
  ChatInstance,
  PageObjectId,
  PublicConfig,
  ViewType,
  WriteableElementName,
} from '../../../aiChatEntry';
import {
  byRole,
  changeView,
  contractChat,
  contractSetup,
  deepActiveElement,
  focusHostButton,
  getByTestId,
  isShownWithin,
  pause,
} from '../helpers/contract';

const ACCEPT_LABEL = 'Contract accept';
const LINK_LABEL = 'Contract terms';

/** Mounts a chat whose disclaimer shows, and opens its main window unless told not to. */
async function mountDisclaimer(
  config: Partial<PublicConfig> = {},
  open = true
): Promise<ChatInstance> {
  const { instance } = await contractChat({
    messaging: { skipWelcome: true },
    strings: { disclaimer_acceptance_label: ACCEPT_LABEL },
    disclaimer: {
      isOn: true,
      disclaimerHTML: `<p>Contract disclaimer <a href="#terms">${LINK_LABEL}</a></p>`,
    },
    ...config,
  });
  if (open) {
    await changeView(instance, ViewType.MAIN_WINDOW);
  }
  return instance;
}

/** The disclaimer's accept button, through its public test ID. */
function acceptButton(): HTMLElement {
  return getByTestId(PageObjectId.DISCLAIMER_ACCEPT_BUTTON);
}

/** Waits until the accept button can be pressed, as it can once the text is read. */
async function waitForAcceptEnabled(): Promise<void> {
  await waitFor(() =>
    expect(byRole('button', ACCEPT_LABEL).hasAttribute('disabled')).toBe(false)
  );
}

/** Calls requestFocus the way a host would, and returns its result. */
async function requestFocus(instance: ChatInstance): Promise<boolean | void> {
  let result: boolean | void;
  await act(async () => {
    result = instance.requestFocus();
  });
  await pause();
  return result;
}

/** Whether focus is on the accept button, through its shadow root. */
function focusIsOnAccept(): boolean {
  return isShownWithin(deepActiveElement(), acceptButton());
}

// @covers instance.requestFocus config.disclaimer
describe('requestFocus while the disclaimer shows', () => {
  contractSetup();
  afterEach(() => vi.restoreAllMocks());

  it('returns false and leaves focus where it is before the accept button can be pressed', async () => {
    // happy-dom has no layout. Make the disclaimer text overflow, unread, so the
    // accept button stays disabled. happy-dom keeps clientHeight on HTMLElement.
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
    const instance = await mountDisclaimer();
    // Outlast the chat's checks of whether the text was read.
    await pause(600);
    expect(byRole('button', ACCEPT_LABEL).hasAttribute('disabled')).toBe(true);
    const button = focusHostButton();
    expect(await requestFocus(instance)).toBe(false);
    expect(deepActiveElement()).toBe(button);
  });

  it('returns true and keeps focus when the accept button already has it', async () => {
    const instance = await mountDisclaimer();
    await waitForAcceptEnabled();
    focusHostButton();
    await requestFocus(instance);
    expect(focusIsOnAccept()).toBe(true);
    expect(await requestFocus(instance)).toBe(true);
    expect(focusIsOnAccept()).toBe(true);
  });

  it('returns true and moves focus from a link in the disclaimer text to the accept button', async () => {
    const instance = await mountDisclaimer();
    await waitForAcceptEnabled();
    const link = byRole('link', LINK_LABEL);
    link.focus();
    expect(deepActiveElement()).toBe(link);
    expect(await requestFocus(instance)).toBe(true);
    expect(focusIsOnAccept()).toBe(true);
  });

  it('returns true and focuses the accept button, not an open custom panel', async () => {
    const instance = await mountDisclaimer();
    await waitForAcceptEnabled();
    const panelButton = document.createElement('button');
    panelButton.textContent = 'Contract panel action';
    vi.spyOn(panelButton, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 100, 20),
    ] as unknown as DOMRectList);
    await act(async () => {
      instance.writeableElements[
        WriteableElementName.CUSTOM_PANEL_ELEMENT
      ].append(panelButton);
      await instance.customPanels.getPanel().open();
    });
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
    focusHostButton();
    expect(await requestFocus(instance)).toBe(true);
    expect(focusIsOnAccept()).toBe(true);
  });

  it('returns true and focuses the accept button with the home screen turned on', async () => {
    const instance = await mountDisclaimer({
      homescreen: { isOn: true, greeting: 'Contract greeting' },
    });
    await waitForAcceptEnabled();
    focusHostButton();
    expect(await requestFocus(instance)).toBe(true);
    expect(focusIsOnAccept()).toBe(true);
  });

  it('returns false when the page moves focus away from the accept button', async () => {
    const instance = await mountDisclaimer();
    await waitForAcceptEnabled();
    const button = focusHostButton();
    // A page focus trap that sends focus back to its own button.
    let trapped = 0;
    const trap = (event: FocusEvent) => {
      if (event.target !== button) {
        trapped += 1;
        button.focus();
      }
    };
    document.addEventListener('focusin', trap);
    try {
      expect(await requestFocus(instance)).toBe(false);
      expect(trapped).toBe(1);
      expect(deepActiveElement()).toBe(button);
    } finally {
      document.removeEventListener('focusin', trap);
    }
  });

  it('returns false and leaves focus where it is with shouldTakeFocusIfOpensAutomatically false', async () => {
    const instance = await mountDisclaimer({
      shouldTakeFocusIfOpensAutomatically: false,
    });
    await waitForAcceptEnabled();
    const button = focusHostButton();
    expect(await requestFocus(instance)).toBe(false);
    expect(deepActiveElement()).toBe(button);
  });

  it('returns false and leaves focus where it is while the main window is closed', async () => {
    const instance = await mountDisclaimer({}, false);
    const button = focusHostButton();
    expect(await requestFocus(instance)).toBe(false);
    expect(deepActiveElement()).toBe(button);
  });
});
