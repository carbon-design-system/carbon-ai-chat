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
 */

import { act, waitFor } from '@testing-library/react';
import { html, nothing, render } from 'lit';

import {
  ChatInstance,
  GenericItem,
  MessageRequest,
  MessageResponseTypes,
  PageObjectId,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  changeView,
  contractElement,
  contractSetup,
  fakeBackend,
  getByTestId,
  isShownWithin,
  pause,
  responseOf,
  textItem,
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

  // @covers element.cds-aichat-container.renderUserDefinedInputNode element.cds-aichat-container.markdown
  it('keeps input-node and markdown renderer output when a Lit host clears its last child part', async () => {
    const chip = document.createElement('span');
    chip.textContent = 'Rendered chip';
    const renderUserDefinedInputNode = () => chip;
    const code = document.createElement('pre');
    code.textContent = 'Custom code';
    const markdown = { customRenderers: { codeBlock: () => code } };
    const backend = fakeBackend({ autoResolve: true });
    const messaging = {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
    };
    let instance: ChatInstance | null = null;
    const onAfterRender = (handed: ChatInstance) => {
      instance = handed;
    };
    const root = document.body.appendChild(document.createElement('div'));
    // No whitespace before the closing tag, so the banner's part runs to the
    // end of the element's children, and clearing it clears everything after.
    const view = (banner: boolean) =>
      html`<cds-aichat-container
        .openChatByDefault=${true}
        .messaging=${messaging}
        .markdown=${markdown}
        .renderUserDefinedInputNode=${renderUserDefinedInputNode}
        .onAfterRender=${onAfterRender}
        >${banner ? html`<p>Banner</p>` : nothing}</cds-aichat-container
      >`;
    await act(async () => {
      render(view(true), root);
    });
    await waitFor(() => expect(instance).not.toBeNull(), { timeout: 10000 });
    await act(() =>
      instance.send({
        input: {
          text: 'custom',
          display_content: {
            type: 'doc',
            content: [{ type: 'custom', attrs: { label: 'fallback' } }],
          },
        },
      } as MessageRequest)
    );
    await act(() =>
      instance.messaging.addMessage(
        responseOf('r1', [textItem('```js\nlet x = 1;\n```')])
      )
    );
    const panel = () => getByTestId(PageObjectId.MAIN_PANEL);
    await waitFor(() => expect(isShownWithin(chip, panel())).toBe(true));
    await waitFor(() => expect(isShownWithin(code, panel())).toBe(true));

    await act(async () => {
      render(view(false), root);
    });
    await pause();

    expect(root.textContent).not.toContain('Banner');
    expect(isShownWithin(chip, panel())).toBe(true);
    expect(isShownWithin(code, panel())).toBe(true);
  });
});
