/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The render callbacks and `markdown` of the two `cds-aichat-*` elements, and
 * the slots a host fills by hand when it leaves a callback off. Each callback
 * returns a DOM element; what a host checks is what it is called with and
 * that the element it returned shows in the conversation.
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventType,
  BusEventUserDefinedResponse,
  ChatInstance,
  GenericItem,
  MessageRequest,
  MessageResponseTypes,
  MessageState,
  PageObjectId,
  RenderCustomMessageFooterState,
  RenderCustomRequestFooterState,
  RenderUserDefinedInputNodeState,
  RenderUserDefinedState,
} from '../../../../src/aiChatEntry';
import {
  ELEMENT_TAGS,
  addChunk,
  contractSetup,
  fakeBackend,
  finalChunk,
  getByTestId,
  isShownWithin,
  mainPanelText,
  openElement,
  partialUserDefined,
  responseOf,
  textItem,
  userDefinedItem,
} from '../../helpers';

/** A span with this text, standing in for what a host renders. */
function span(text: string): HTMLElement {
  const element = document.createElement('span');
  element.textContent = text;
  return element;
}

/** Whether `node` shows in the chat's main panel. */
function shownInMainPanel(node: Node): boolean {
  return isShownWithin(node, getByTestId(PageObjectId.MAIN_PANEL));
}

const WIDGET: GenericItem = {
  response_type: MessageResponseTypes.USER_DEFINED,
  user_defined: { name: 'widget' },
} as GenericItem;

/** Adds a response with these items inside `act`. */
async function addResponse(
  instance: ChatInstance,
  id: string,
  items: GenericItem[]
) {
  await act(() => instance.messaging.addMessage(responseOf(id, items)));
}

// @covers element.cds-aichat-container.renderUserDefinedResponse element.cds-aichat-custom-element.renderUserDefinedResponse
describe.each(ELEMENT_TAGS)('renderUserDefinedResponse on %s', (tag) => {
  contractSetup();

  it('is called with the item, its message, its state, and the instance, and what it returns shows', async () => {
    const out = span('Rendered widget');
    const render = jest.fn((_state: RenderUserDefinedState) => out);
    const { instance } = await openElement(tag, {
      renderUserDefinedResponse: render,
    });
    await addResponse(instance, 'r-ud', [WIDGET]);
    await waitFor(() => expect(shownInMainPanel(out)).toBe(true));
    const [state, handed] = render.mock.calls[0] as unknown as [
      RenderUserDefinedState,
      ChatInstance,
    ];
    expect(state).toMatchObject({
      messageItem: WIDGET,
      fullMessage: { id: 'r-ud' },
      state: MessageState.COMPLETE,
    });
    expect(handed).toBe(instance);
  });

  it('is called again as a streamed item grows, and a new element replaces the one before', async () => {
    const shown: HTMLElement[] = [];
    const render = jest.fn((state: RenderUserDefinedState) => {
      const element = span(
        state.messageItem ? 'Complete widget' : 'Partial widget'
      );
      shown.push(element);
      return element;
    });
    const { instance } = await openElement(tag, {
      renderUserDefinedResponse: render,
    });
    await addChunk(instance, partialUserDefined('r-s', 'w1', { n: 1 }));
    await waitFor(() => expect(mainPanelText()).toContain('Partial widget'));
    await addChunk(
      instance,
      finalChunk('r-s', [userDefinedItem('w1', { n: 1 })])
    );
    await waitFor(() => expect(mainPanelText()).toContain('Complete widget'));
    expect(mainPanelText()).not.toContain('Partial widget');
    expect(shown.filter(shownInMainPanel)).toEqual([shown[shown.length - 1]]);
  });

  it('logs an error it throws, shows nothing for that item, and still shows the rest', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const failure = new Error('render failed');
      const { instance } = await openElement(tag, {
        renderUserDefinedResponse: () => {
          throw failure;
        },
      });
      error.mockClear();
      await addResponse(instance, 'r1', [WIDGET, textItem('Text after')]);
      await waitFor(() => expect(mainPanelText()).toContain('Text after'));
      await waitFor(() =>
        expect(error.mock.calls.some((args) => args.includes(failure))).toBe(
          true
        )
      );
    } finally {
      error.mockRestore();
    }
  });

  it('uses a callback set after the first render', async () => {
    const { instance, element } = await openElement(tag);
    const out = span('Late widget');
    const render = jest.fn(() => out);
    await act(async () => {
      element.renderUserDefinedResponse = render;
    });
    await addResponse(instance, 'r1', [WIDGET]);
    await waitFor(() => expect(shownInMainPanel(out)).toBe(true));
  });
});

// With no `renderUserDefinedResponse`, the host listens for the event and
// writes its own content into the element under the event's slot name.
// @covers element.cds-aichat-container.renderUserDefinedResponse element.cds-aichat-custom-element.renderUserDefinedResponse
describe.each(ELEMENT_TAGS)('user_defined slots on %s', (tag) => {
  contractSetup();

  it('shows what the host slots into the element under the event’s slot', async () => {
    const { instance, element } = await openElement(tag);
    const out = span('Host slotted widget');
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: (event: BusEventUserDefinedResponse) => {
        out.slot = event.data.slot;
        element.appendChild(out);
      },
    });
    await addResponse(instance, 'r1', [WIDGET]);
    await waitFor(() => expect(shownInMainPanel(out)).toBe(true));
  });
});

/** A text item with a custom footer slot. */
function footerItem(slotName: string): GenericItem {
  return {
    ...textItem('With a footer'),
    message_item_options: {
      custom_footer_slot: {
        slot_name: slotName,
        additional_data: { key: 'value' },
      },
    },
  } as GenericItem;
}

// @covers element.cds-aichat-container.renderCustomMessageFooter element.cds-aichat-custom-element.renderCustomMessageFooter
describe.each(ELEMENT_TAGS)('renderCustomMessageFooter on %s', (tag) => {
  contractSetup();

  it('is called with the slot, message, item, and data, plus the instance, and what it returns shows', async () => {
    const out = span('Rendered footer');
    const render = jest.fn((_state: RenderCustomMessageFooterState) => out);
    const { instance } = await openElement(tag, {
      renderCustomMessageFooter: render,
    });
    const item = footerItem('footer-a');
    await addResponse(instance, 'r1', [item]);
    await waitFor(() => expect(shownInMainPanel(out)).toBe(true));
    const [state, handed] = render.mock.calls[0] as unknown as [
      RenderCustomMessageFooterState,
      ChatInstance,
    ];
    expect(state.slotName).toBe('footer-a');
    expect(state.message.id).toBe('r1');
    expect(state.messageItem).toEqual(item);
    expect(state.additionalData).toEqual({ key: 'value' });
    expect(handed).toBe(instance);
  });

  // With no callback, the host writes its footer into the element under the
  // item's own slot name.
  it('shows what the host slots under the item’s slot name when it is unset', async () => {
    const { instance, element } = await openElement(tag);
    const out = span('Host slotted footer');
    out.slot = 'footer-b';
    element.appendChild(out);
    await addResponse(instance, 'r1', [footerItem('footer-b')]);
    await waitFor(() => expect(shownInMainPanel(out)).toBe(true));
  });
});

// @covers element.cds-aichat-container.renderCustomRequestFooter element.cds-aichat-custom-element.renderCustomRequestFooter
describe.each(ELEMENT_TAGS)('renderCustomRequestFooter on %s', (tag) => {
  contractSetup();

  it('is called for a sent message with its slot and the message, plus the instance, and what it returns shows', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const out = span('Rendered request footer');
    const render = jest.fn((_state: RenderCustomRequestFooterState) => out);
    const { instance } = await openElement(tag, {
      renderCustomRequestFooter: render,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
    });
    await act(() => instance.send('Hello there'));
    await waitFor(() => expect(shownInMainPanel(out)).toBe(true));
    const [state, handed] = render.mock.calls[0] as unknown as [
      RenderCustomRequestFooterState,
      ChatInstance,
    ];
    expect(state.message.input.text).toBe('Hello there');
    expect(state.message.id).toBe(backend.requests[0].request.id);
    expect(typeof state.slotName).toBe('string');
    expect(handed).toBe(instance);
  });
});

// @covers element.cds-aichat-container.renderUserDefinedInputNode element.cds-aichat-custom-element.renderUserDefinedInputNode
describe.each(ELEMENT_TAGS)('renderUserDefinedInputNode on %s', (tag) => {
  contractSetup();

  it('is called for a custom node in a sent message, and what it returns shows in page DOM', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const chip = span('Rendered chip');
    const render = jest.fn((_state: RenderUserDefinedInputNodeState) => chip);
    const { instance } = await openElement(tag, {
      renderUserDefinedInputNode: render,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
    });
    const node = { type: 'custom', attrs: { label: 'fallback' } };
    await act(() =>
      instance.send({
        input: {
          text: 'custom',
          display_content: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [node] }],
          },
        },
      } as MessageRequest)
    );
    await waitFor(() => expect(shownInMainPanel(chip)).toBe(true));
    // Its JSDoc puts the returned element in light DOM so page CSS reaches it.
    expect(chip.getRootNode()).toBe(document);
    const [state, handed] = render.mock.calls[0] as unknown as [
      RenderUserDefinedInputNodeState,
      ChatInstance,
    ];
    expect(state.node).toEqual(node);
    expect(state.message.input.text).toBe('custom');
    expect(handed).toBe(instance);
  });
});

// @covers element.cds-aichat-container.markdown element.cds-aichat-custom-element.markdown
describe.each(ELEMENT_TAGS)('markdown.customRenderers on %s', (tag) => {
  contractSetup();

  it('shows the element codeBlock returns in place of the code block, in the element’s own light DOM', async () => {
    const out = document.createElement('pre');
    out.textContent = 'Custom code';
    const codeBlock = jest.fn(
      (_args: { language: string; code: string }) => out
    );
    const { instance, element } = await openElement(tag, {
      markdown: { customRenderers: { codeBlock } },
    });
    await addResponse(instance, 'r1', [
      textItem('Before\n\n```js\nlet x = 1;\n```\n\nafter'),
    ]);
    await waitFor(() => expect(shownInMainPanel(out)).toBe(true));
    expect(mainPanelText()).toContain('BeforeCustom codeafter');
    expect(mainPanelText()).not.toContain('let x = 1;');
    // The element hosts it in its light DOM, so page CSS reaches it.
    expect(element.contains(out)).toBe(true);
    expect(codeBlock.mock.calls[0][0]).toMatchObject({
      language: 'js',
      code: 'let x = 1;\n',
      isStreaming: false,
    });
  });
});

// `cds-aichat-container`'s markdownItPlugins are in config/markdown_spec.ts.
// @covers element.cds-aichat-custom-element.markdown
describe('markdown.markdownItPlugins on cds-aichat-custom-element', () => {
  contractSetup();

  it('runs a plugin on assistant text', async () => {
    const rewrite = (md: {
      core: { ruler: { push: (name: string, rule: unknown) => void } };
    }) => {
      md.core.ruler.push(
        'contract_rewrite',
        (state: {
          tokens: { children?: { type: string; content: string }[] }[];
        }) => {
          for (const token of state.tokens) {
            for (const child of token.children ?? []) {
              if (child.type === 'text') {
                child.content = child.content
                  .split('PLUGIN_ME')
                  .join('Plugin ran');
              }
            }
          }
        }
      );
    };
    const { instance } = await openElement('cds-aichat-custom-element', {
      markdown: { markdownItPlugins: [rewrite] },
    });
    await addResponse(instance, 'r1', [textItem('Before PLUGIN_ME after')]);
    await waitFor(() =>
      expect(mainPanelText()).toContain('Before Plugin ran after')
    );
  });
});
