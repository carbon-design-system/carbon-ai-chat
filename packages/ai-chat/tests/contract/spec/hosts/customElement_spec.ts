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

import { act, waitFor } from '@testing-library/react';
import { html, nothing, render } from 'lit';

import {
  BusEventViewChange,
  ChatInstance,
  GenericItem,
  MessageResponseTypes,
  PageObjectId,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  changeView,
  contractElement,
  contractSetup,
  getByTestId,
  isInFlatTree,
  isShownWithin,
  pause,
  responseOf,
  userDefinedItem,
} from '../../helpers';

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

// MAIN-NOTES M108 (2.0.0): callback output and writeables stay in the shadow root; manual slots stay in page DOM.
// @covers element.cds-aichat-custom-element.renderUserDefinedResponse instance.writeableElements
describe('cds-aichat-custom-element host content', () => {
  contractSetup();

  it('keeps renderUserDefinedResponse output inside its shadow root', async () => {
    const out = document.createElement('span');
    const { instance, element } = await mount({
      openChatByDefault: true,
      renderUserDefinedResponse: () => out,
    });
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
    await waitFor(() => expect(out.isConnected).toBe(true));
    expect(out.getRootNode()).toBe(element.shadowRoot);
    expect(element.shadowRoot.contains(out)).toBe(true);
    expect(isShownWithin(out, getByTestId(PageObjectId.MAIN_PANEL))).toBe(true);
  });

  it('keeps its writeable elements inside its shadow root', async () => {
    const { instance, element } = await mount({ openChatByDefault: true });
    const writeable = Object.values(instance.writeableElements);
    expect(writeable.length).toBeGreaterThan(0);
    expect(
      writeable.filter(
        (node) =>
          node.getRootNode() !== element.shadowRoot ||
          !element.shadowRoot.contains(node)
      )
    ).toEqual([]);
    expect(isInFlatTree(instance.writeableElements.footerElement)).toBe(true);
  });

  it('keeps response output and writeable elements when a Lit host clears its last child part', async () => {
    const out = document.createElement('span');
    const renderUserDefinedResponse = () => out;
    const messaging = { skipWelcome: true };
    let instance: ChatInstance | null = null;
    const onAfterRender = (handed: ChatInstance) => {
      instance = handed;
    };
    const root = document.body.appendChild(document.createElement('div'));
    // No whitespace before the closing tag, so the banner's part runs to the
    // end of the element's children, and clearing it clears everything after.
    const view = (banner: boolean) =>
      html`<cds-aichat-custom-element
        .openChatByDefault=${true}
        .messaging=${messaging}
        .renderUserDefinedResponse=${renderUserDefinedResponse}
        .onAfterRender=${onAfterRender}
        >${banner ? html`<p>Banner</p>` : nothing}</cds-aichat-custom-element
      >`;
    await act(async () => {
      render(view(true), root);
    });
    await waitFor(() => expect(instance).not.toBeNull(), { timeout: 10000 });
    await act(() =>
      instance.messaging.addMessage(
        responseOf('r1', [userDefinedItem('u1', {})])
      )
    );
    await waitFor(() => expect(out.isConnected).toBe(true));

    await act(async () => {
      render(view(false), root);
    });
    await pause();

    expect(root.textContent).not.toContain('Banner');
    expect(out.isConnected).toBe(true);
    expect(isShownWithin(out, getByTestId(PageObjectId.MAIN_PANEL))).toBe(true);
    expect(
      Object.values(instance.writeableElements).filter(
        (node) => !node.isConnected
      )
    ).toEqual([]);
    expect(isInFlatTree(instance.writeableElements.footerElement)).toBe(true);
  });

  it('keeps response output in the order the responses arrived', async () => {
    const outputs = new Map<string, HTMLElement>();
    const { instance } = await mount({
      openChatByDefault: true,
      renderUserDefinedResponse: ({
        messageItem,
      }: {
        messageItem: GenericItem;
      }) => {
        const { name } = messageItem.user_defined as { name: string };
        if (!outputs.has(name)) {
          const output = document.createElement('span');
          output.textContent = name;
          outputs.set(name, output);
        }
        return outputs.get(name);
      },
    });
    await act(() =>
      instance.messaging.addMessage(
        responseOf('r1', [userDefinedItem('u1', { name: 'first' })])
      )
    );
    await act(() =>
      instance.messaging.addMessage(
        responseOf('r2', [userDefinedItem('u2', { name: 'second' })])
      )
    );
    await waitFor(() => expect(outputs.get('second')?.isConnected).toBe(true));
    const shown = [...outputs.values()].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
    expect(shown.map((output) => output.textContent)).toEqual([
      'first',
      'second',
    ]);
  });
});
