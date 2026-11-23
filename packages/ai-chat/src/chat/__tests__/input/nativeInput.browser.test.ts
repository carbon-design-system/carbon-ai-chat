/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import type { Editor, Extension, Node } from '@tiptap/core';
import { page, userEvent } from 'vitest/browser';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';

import {
  BusEventType,
  MessageSendSource,
  PageObjectId,
  type BusEventPreSend,
} from '../../../aiChatEntry';
import {
  byTestId,
  contractSetup,
  deepActiveElement,
} from '../helpers/contract';
import {
  INPUT_HOSTS,
  mountInputHost,
  resetInputHostPage,
  type InputMount,
} from '../helpers/browserInput';

afterEach(resetInputHostPage);

/** Records each send from the message input. */
function recordSends(mount: InputMount) {
  const sends: { text: string; source: string }[] = [];
  mount.instance.on({
    type: BusEventType.PRE_SEND,
    handler: (event: BusEventPreSend) => {
      if (event.source === MessageSendSource.MESSAGE_INPUT) {
        sends.push({ text: event.data.input.text, source: event.source });
      }
    },
  });
  return sends;
}

function headerTitle(mount: InputMount) {
  return byTestId('header_title', mount.root)?.textContent?.trim();
}

describe.each(INPUT_HOSTS)('%s native input', (host) => {
  contractSetup();

  it.each(['textarea', 'rich'] as const)(
    `${host} %s input releases focus when disabled and restores its default placeholder when enabled`,
    async (runtime) => {
      const mount = await mountInputHost(host);
      const { instance, root } = mount;
      const sends = recordSends(mount);
      const prompt = root.querySelector<PromptLineElement>(
        'cds-aichat-chat-input cds-aichat-prompt-line'
      );
      const input = () => byTestId(PageObjectId.INPUT, root);
      if (runtime === 'rich') {
        await act(async () => {
          await instance.input.getEditor();
        });
        await waitFor(() =>
          expect(input()).toHaveAttribute('contenteditable', 'true')
        );
      } else {
        expect(input().tagName).toBe('TEXTAREA');
      }
      const { placeholder } = prompt;
      expect(placeholder).not.toBe('');
      act(() => input().focus());
      expect(deepActiveElement()).toBe(input());

      await mount.update({ input: { isDisabled: true } });
      await waitFor(() => expect(prompt.disabled).toBe(true));
      await waitFor(() => expect(prompt.placeholder).toBe(''));
      const emptyParagraph = () =>
        input().querySelector<HTMLElement>('p.is-editor-empty');
      if (runtime === 'rich') {
        await waitFor(() =>
          expect(input()).toHaveAttribute('contenteditable', 'false')
        );
        await waitFor(() =>
          expect(emptyParagraph()).toHaveAttribute('data-placeholder', '')
        );
        expect(
          getComputedStyle(emptyParagraph(), '::before').content
        ).not.toContain(placeholder);
      } else {
        const textarea = input() as HTMLTextAreaElement;
        await waitFor(() => expect(textarea).toBeDisabled());
        expect(textarea).toHaveAttribute('placeholder', '');
        expect(textarea.placeholder).toBe('');
      }
      await waitFor(() => expect(deepActiveElement()).not.toBe(input()));
      act(() => input().focus());
      expect(deepActiveElement()).not.toBe(input());
      await userEvent.keyboard('{Tab}');
      expect(deepActiveElement()).not.toBe(input());
      await userEvent.keyboard('Blocked');
      expect(instance.getState().input.rawValue).toBe('');

      await mount.update({ input: { isDisabled: false } });
      await waitFor(() => expect(prompt.disabled).toBe(false));
      await waitFor(() => expect(prompt.placeholder).toBe(placeholder));
      if (runtime === 'rich') {
        await waitFor(() =>
          expect(input()).toHaveAttribute('contenteditable', 'true')
        );
        await waitFor(() =>
          expect(emptyParagraph()).toHaveAttribute(
            'data-placeholder',
            placeholder
          )
        );
        expect(emptyParagraph()).toBeVisible();
        expect(
          getComputedStyle(emptyParagraph(), '::before').content
        ).toContain(placeholder);
      } else {
        const textarea = input() as HTMLTextAreaElement;
        await waitFor(() => expect(textarea).toBeEnabled());
        expect(textarea).toHaveAttribute('placeholder', placeholder);
        expect(textarea.matches(':placeholder-shown')).toBe(true);
      }
      await userEvent.fill(input(), 'Enabled again');
      expect(deepActiveElement()).toBe(input());
      await waitFor(() =>
        expect(instance.getState().input.rawValue).toBe('Enabled again')
      );
      expect(sends).toEqual([]);
      mount.unmount();
    }
  );

  it(`${host} native input keeps direct slots and distinguishes modified Enter from a trimmed send`, async () => {
    const mount = await mountInputHost(host);
    const sends = recordSends(mount);
    const view = mount.root.querySelector<HTMLElement>('cds-aichat-chat-input');
    expect({
      slot: view.slot,
      parent: view.parentElement.localName,
      shellParent:
        view.querySelector('cds-aichat-prompt-line-shell').parentElement ===
        view,
      editorParent: view.querySelector('cds-aichat-prompt-line').parentElement
        .localName,
      sendParent: view.querySelector('cds-aichat-input-send-control')
        .parentElement.localName,
    }).toEqual({
      slot: 'input',
      parent: 'cds-aichat-shell',
      shellParent: true,
      editorParent: 'cds-aichat-prompt-line-shell',
      sendParent: 'cds-aichat-prompt-line-shell',
    });
    const input = byTestId(PageObjectId.INPUT, view) as HTMLTextAreaElement;
    expect(input.tagName).toBe('TEXTAREA');
    await userEvent.fill(input, '  First line');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    await userEvent.keyboard('Second line  ');
    expect(input.value).toBe('  First line\nSecond line  ');
    expect(sends).toEqual([]);
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(sends).toEqual([
        {
          text: 'First line\nSecond line',
          source: MessageSendSource.MESSAGE_INPUT,
        },
      ])
    );
    await waitFor(() => expect(input.value).toBe(''));
    expect(deepActiveElement()).toBe(input);
    await expect
      .element(
        page
          .getByTestId(PageObjectId.MAIN_PANEL)
          .getByRole('heading', { name: 'First line Second line', exact: true })
      )
      .toBeVisible();
    await waitFor(() =>
      expect(mount.instance.getState().input.rawValue).toBe('')
    );
    expect(sends).toHaveLength(1);
    mount.unmount();
  });

  it(`${host} public editor upgrade keeps the draft and selection and retains configured node views on unrelated config`, async () => {
    const mount = await mountInputHost(host);
    const { instance, root } = mount;
    const prompt = root.querySelector<PromptLineElement>(
      'cds-aichat-chat-input cds-aichat-prompt-line'
    );
    const input = () => byTestId(PageObjectId.INPUT, root);
    expect(input().tagName).toBe('TEXTAREA');
    expect(prompt.getEditor()).toBeNull();
    await userEvent.fill(input(), 'Typed draft');
    act(() => {
      const textarea = input() as HTMLTextAreaElement;
      textarea.focus();
      textarea.setSelectionRange(2, 7);
    });
    let editor: Editor;
    await act(async () => {
      editor = await instance.input.getEditor();
    });
    let extensions = editor.options.extensions;
    expect({
      text: editor.getText(),
      from: editor.state.selection.from,
      to: editor.state.selection.to,
      focused: editor.isFocused,
    }).toEqual({ text: 'Typed draft', from: 3, to: 8, focused: true });
    await waitFor(() =>
      expect(input()).toHaveAttribute('contenteditable', 'true')
    );
    expect(deepActiveElement()).toBe(input());
    await mount.update({ header: { title: 'Unrelated lazy-editor update' } });
    await waitFor(() =>
      expect(headerTitle(mount)).toBe('Unrelated lazy-editor update')
    );
    expect(
      root.querySelector('cds-aichat-chat-input cds-aichat-prompt-line')
    ).toBe(prompt);
    expect(await instance.input.getEditor()).toBe(editor);
    expect(prompt.getEditor().options.extensions).toBe(extensions);
    expect(prompt.getEditor().getText()).toBe('Typed draft');
    expect([
      prompt.getEditor().state.selection.from,
      prompt.getEditor().state.selection.to,
    ]).toEqual([3, 8]);

    let nodeView: HTMLElement;
    let nodeViewCreations = 0;
    const paragraph = editor.extensionManager.extensions.find(
      (extension) => extension.name === 'paragraph'
    ) as Node;
    const chip = paragraph.extend({
      name: 'nativeInputChip',
      group: 'inline',
      inline: true,
      atom: true,
      content: '',
      parseHTML: () => [{ tag: 'span[data-native-input-chip]' }],
      renderHTML: () => [
        'span',
        { 'data-native-input-chip': '' },
        'Native chip',
      ],
      addNodeView() {
        return () => {
          const dom = document.createElement('span');
          dom.dataset.nativeInputChip = '';
          dom.textContent = 'Native chip';
          nodeViewCreations += 1;
          nodeView = dom;
          return { dom };
        };
      },
    });
    const customExtension = chip as unknown as Extension;
    await mount.update({
      input: {
        expanded: false,
        isDisabled: false,
        tiptap: { extensions: [customExtension] },
      },
    });
    await waitFor(async () =>
      expect(
        Boolean((await instance.input.getEditor()).schema.nodes.nativeInputChip)
      ).toBe(true)
    );
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Kept ' },
            { type: 'nativeInputChip' },
          ],
        },
      ],
    };
    await act(async () => {
      await instance.input.updateContent(() => content);
      editor = await instance.input.getEditor();
    });
    extensions = editor.options.extensions;
    await waitFor(() =>
      expect(root.querySelector('[data-native-input-chip]')?.textContent).toBe(
        'Native chip'
      )
    );
    expect({
      creations: nodeViewCreations,
      configuredExtension: editor.options.extensions.includes(customExtension),
      publicContent: instance.getState().input.content,
    }).toEqual({
      creations: 1,
      configuredExtension: true,
      publicContent: content,
    });
    await mount.update({ header: { title: 'Unrelated custom-node update' } });
    await waitFor(() =>
      expect(headerTitle(mount)).toBe('Unrelated custom-node update')
    );
    expect({
      prompt:
        root.querySelector('cds-aichat-chat-input cds-aichat-prompt-line') ===
        prompt,
      editor: (await instance.input.getEditor()) === editor,
      extensions: prompt.getEditor().options.extensions === extensions,
      nodeView:
        prompt
          .getEditor()
          .view.dom.querySelector('[data-native-input-chip]') === nodeView,
      creations: nodeViewCreations,
    }).toEqual({
      prompt: true,
      editor: true,
      extensions: true,
      nodeView: true,
      creations: 1,
    });
    mount.unmount();
  });
});
