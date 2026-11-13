/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * What `cds-aichat-container` does to itself. It positions its own float
 * chat, so it runs no visibility handler on the element; and host content
 * (writeable elements, render-callback output) sits in its light DOM, the
 * page's own DOM, where page CSS reaches it.
 *
 * MAIN-NOTES M108 (U57): only the container promises light-DOM placement.
 * `cds-aichat-custom-element` puts the same content in its shadow root
 * (`customElement_spec.ts`).
 */

import { act, waitFor } from '@testing-library/react';

import {
  GenericItem,
  MessageResponseTypes,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  changeView,
  contractElement,
  contractSetup,
  responseOf,
} from '../../helpers';

/** Connects a container with these properties and no welcome request. */
function mount(properties: Record<string, unknown> = {}) {
  return contractElement('cds-aichat-container', {
    properties: { messaging: { skipWelcome: true }, ...properties },
  });
}

describe('cds-aichat-container element', () => {
  contractSetup();

  // @covers element.cds-aichat-container.onViewChange
  it('never hides itself as the chat opens and closes', async () => {
    const { instance, element } = await mount();
    const hiding = () => ({
      hiddenClass: element.classList.contains('cds-aichat--hidden'),
      hidden: element.hasAttribute('hidden'),
      style: element.hasAttribute('style'),
    });
    const none = { hiddenClass: false, hidden: false, style: false };
    expect(hiding()).toEqual(none);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(hiding()).toEqual(none);
    await changeView(instance, ViewType.LAUNCHER);
    expect(hiding()).toEqual(none);
  });

  it('keeps its writeable elements in its own light DOM', async () => {
    const { instance, element } = await mount();
    const writeable = Object.values(instance.writeableElements);
    expect(writeable.length).toBeGreaterThan(0);
    expect(writeable.filter((node) => !element.contains(node))).toEqual([]);
  });

  // @covers element.cds-aichat-container.renderUserDefinedResponse
  it('keeps what renderUserDefinedResponse returns in its own light DOM', async () => {
    const out = document.createElement('span');
    const { instance, element } = await mount({
      renderUserDefinedResponse: () => out,
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    await act(() =>
      instance.messaging.addMessage(
        responseOf('r1', [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: {},
          } as GenericItem,
        ])
      )
    );
    await waitFor(() => expect(element.contains(out)).toBe(true));
  });
});
