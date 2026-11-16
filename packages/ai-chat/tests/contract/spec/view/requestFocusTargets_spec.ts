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
  ButtonItemType,
  ChatInstance,
  GenericItem,
  MessageResponseTypes,
  PageObjectId,
  ViewType,
  WriteableElementName,
} from '../../../../src/aiChatEntry';
import {
  byRole,
  changeView,
  click,
  contractChat,
  contractSetup,
  getByTestId,
  isShownWithin,
  responseOf,
} from '../../helpers';

const RETURN_LABEL = 'Contract return';
const ACCEPT_LABEL = 'Contract accept';
const CUSTOM_LABEL = 'Contract custom action';
const TARGETS = [
  'disclaimer',
  'custom panel',
  'iframe panel',
  'view source panel',
  'response panel',
] as const;
type Target = (typeof TARGETS)[number];

/** The active element through the host's open shadow roots. */
function deepActiveElement(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/** jsdom has no layout for the panel's otherwise focusable return button. */
function giveButtonLayout(button: HTMLElement): void {
  if (button.getClientRects().length === 0) {
    jest
      .spyOn(button, 'getClientRects')
      .mockReturnValue([new DOMRect(0, 0, 100, 20)] as unknown as DOMRectList);
  }
}

async function addItem(instance: ChatInstance, item: GenericItem) {
  await act(() =>
    instance.messaging.addMessage(responseOf('focus-target', [item]))
  );
}

async function openTarget(
  instance: ChatInstance,
  target: Target
): Promise<HTMLElement> {
  if (target === 'disclaimer') {
    const button = getByTestId(PageObjectId.DISCLAIMER_ACCEPT_BUTTON);
    await waitFor(() =>
      expect(byRole('button', ACCEPT_LABEL).hasAttribute('disabled')).toBe(
        false
      )
    );
    return button;
  }
  if (target === 'custom panel') {
    const button = document.createElement('button');
    button.textContent = CUSTOM_LABEL;
    jest
      .spyOn(button, 'getClientRects')
      .mockReturnValue([new DOMRect(0, 0, 100, 20)] as unknown as DOMRectList);
    await act(async () => {
      instance.writeableElements[
        WriteableElementName.CUSTOM_PANEL_ELEMENT
      ].append(button);
      await instance.customPanels.getPanel().open();
    });
    return byRole('button', CUSTOM_LABEL);
  }
  if (target === 'iframe panel') {
    await addItem(instance, {
      response_type: MessageResponseTypes.IFRAME,
      source: 'https://example.com/embed',
      title: 'Contract frame',
    });
    await click(
      byRole('button', 'Contract frameexample.comhttps://example.com/embed')
    );
  } else if (target === 'view source panel') {
    await addItem(instance, {
      response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
      text: 'Contract answer',
      citations: [
        {
          title: 'Contract source',
          text: 'Contract excerpt',
          search_result_idx: 0,
        },
      ],
      search_results: [
        { body: 'Contract source document with Contract excerpt' },
      ],
    });
    await click(byRole('button', 'Contract sources'));
    await click(await waitFor(() => byRole('button', 'Contract source')));
  } else {
    await addItem(instance, {
      response_type: MessageResponseTypes.BUTTON,
      button_type: ButtonItemType.SHOW_PANEL,
      label: 'Contract open response',
      panel: {
        title: 'Contract response panel',
        body: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'Contract panel body',
          },
        ],
      },
    });
    await click(byRole('button', 'Contract open response'));
  }
  const button = byRole('button', RETURN_LABEL);
  giveButtonLayout(button);
  return button;
}

// @covers instance.requestFocus
describe('requestFocus for the current target', () => {
  contractSetup();
  afterEach(() => jest.restoreAllMocks());

  it.each(TARGETS)('returns true and moves focus to the %s', async (target) => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
      strings: {
        general_returnToAssistant: RETURN_LABEL,
        conversationalSearch_toggleCitations: 'Contract sources',
        disclaimer_acceptance_label: ACCEPT_LABEL,
      },
      ...(target === 'disclaimer'
        ? {
            disclaimer: {
              isOn: true,
              disclaimerHTML: '<p>Contract disclaimer</p>',
            },
          }
        : {}),
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    const destination = await openTarget(instance, target);
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    expect(deepActiveElement()).toBe(outside);
    let result: boolean | void;
    await act(async () => {
      result = instance.requestFocus();
    });
    await waitFor(() =>
      expect(isShownWithin(deepActiveElement(), destination)).toBe(true)
    );
    expect(result).toBe(true);
  });
});
