/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import {
  BusEventType,
  MessageSendSource,
  PageObjectId,
} from '@carbon/ai-chat/server';
import type { StructuredData } from '@carbon/ai-chat';
import type { Editor, Extension, Node } from '@tiptap/core';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type FileUploads from '@carbon/ai-chat-components/es/components/file-uploads/src/file-uploads.js';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  prepareDemoPage,
  waitForChatReady,
} from './utils';
import type {} from '../types/window';

interface NativeInputProbe {
  sends: { text: string; source: string }[];
  prompt?: PromptLineElement;
  editor?: Editor;
  extensions?: Editor['options']['extensions'];
  customExtension?: Extension;
  nodeView?: HTMLElement;
  nodeViewCreations: number;
  uploadCalls?: { name: string; aborted: boolean }[];
  rejectUpload?: () => void;
}

type ProbeWindow = Window & { nativeInputProbe: NativeInputProbe };

async function prepare(page: Page, framework: string) {
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepareDemoPage(page, {
    settings: {
      framework,
      layout: 'fullscreen',
      direction: framework === 'react' ? 'ltr' : 'rtl',
      writeableElements: 'false',
    },
  });
  await page.waitForFunction(
    () =>
      window.chatInstance?.serviceManager?.store.getState()
        .initialViewChangeComplete
  );
  await page.evaluate(() =>
    window.setChatConfig({
      openChatByDefault: true,
      homescreen: { isOn: false },
      header: { isOn: true },
      upload: { isOn: false },
      input: { expanded: false, isDisabled: false },
    })
  );
  await openChatWindow(page);
  await waitForChatReady(page);
  await expect(page.locator('cds-aichat-custom-element')).toHaveCount(
    framework === 'react' ? 0 : 1
  );
  await expect(page.locator('html')).toHaveAttribute(
    'dir',
    framework === 'react' ? 'ltr' : 'rtl'
  );
  await expect(page.locator('cds-aichat-chat-input')).toBeVisible();
  await page.evaluate(
    ({ preSend, inputSource }) => {
      const probe: NativeInputProbe = ((
        window as ProbeWindow
      ).nativeInputProbe = {
        sends: [],
        nodeViewCreations: 0,
      });
      window.chatInstance.on({
        type: preSend,
        handler: (event) => {
          if (event.source === inputSource) {
            probe.sends.push({
              text: event.data.input.text,
              source: event.source,
            });
          }
        },
      });
    },
    {
      preSend: BusEventType.PRE_SEND,
      inputSource: MessageSendSource.MESSAGE_INPUT,
    }
  );
}

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

for (const framework of ['react', 'web-component']) {
  for (const runtime of ['textarea', 'rich']) {
    test(`${framework} ${runtime} input releases focus when disabled and restores its default placeholder when enabled`, async ({
      page,
    }) => {
      await prepare(page, framework);
      const prompt = page.locator(
        'cds-aichat-chat-input cds-aichat-prompt-line'
      );
      const input = page.getByTestId(PageObjectId.INPUT);
      if (runtime === 'rich') {
        await page.evaluate(async () => {
          await window.chatInstance.input.getEditor();
        });
        await expect(input).toHaveAttribute('contenteditable', 'true');
      } else {
        await expect(input).toHaveJSProperty('tagName', 'TEXTAREA');
      }
      const placeholder = await prompt.evaluate(
        (element: PromptLineElement) => element.placeholder
      );
      expect(placeholder).not.toBe('');
      await input.focus();
      await expect(input).toBeFocused();
      await page.evaluate(() =>
        window.setChatConfig({ input: { isDisabled: true } })
      );
      await expect(prompt).toHaveJSProperty('disabled', true);
      await expect(prompt).toHaveJSProperty('placeholder', '');
      if (runtime === 'rich') {
        await expect(input).toHaveAttribute('contenteditable', 'false');
        const paragraph = input.locator('p.is-editor-empty').first();
        await expect(paragraph).toHaveAttribute('data-placeholder', '');
        expect(
          await paragraph.evaluate(
            (element) => getComputedStyle(element, '::before').content
          )
        ).not.toContain(placeholder);
      } else {
        await expect(input).toBeDisabled();
        await expect(input).toHaveAttribute('placeholder', '');
        await expect(input).toHaveJSProperty('placeholder', '');
      }
      await expect(input).not.toBeFocused();
      await input.evaluate((element: HTMLElement) => element.focus());
      await expect(input).not.toBeFocused();
      await page.keyboard.press('Tab');
      await expect(input).not.toBeFocused();
      await page.keyboard.type('Blocked');
      expect(
        await page.evaluate(() => window.chatInstance.getState().input.rawValue)
      ).toBe('');

      await page.evaluate(() =>
        window.setChatConfig({ input: { isDisabled: false } })
      );
      await expect(prompt).toHaveJSProperty('disabled', false);
      await expect(prompt).toHaveJSProperty('placeholder', placeholder);
      if (runtime === 'rich') {
        await expect(input).toHaveAttribute('contenteditable', 'true');
        const paragraph = input.locator('p.is-editor-empty').first();
        await expect(paragraph).toHaveAttribute(
          'data-placeholder',
          placeholder
        );
        await expect(paragraph).toBeVisible();
        expect(
          await paragraph.evaluate(
            (element) => getComputedStyle(element, '::before').content
          )
        ).toContain(placeholder);
      } else {
        await expect(input).toBeEnabled();
        await expect(input).toHaveAttribute('placeholder', placeholder);
        expect(
          await input.evaluate((element) =>
            element.matches(':placeholder-shown')
          )
        ).toBe(true);
      }
      await input.fill('Enabled again');
      await expect(input).toBeFocused();
      await expect
        .poll(() =>
          page.evaluate(() => window.chatInstance.getState().input.rawValue)
        )
        .toBe('Enabled again');
      expect(
        await page.evaluate(
          () => (window as ProbeWindow).nativeInputProbe.sends
        )
      ).toEqual([]);
    });
  }

  test(`${framework} native input keeps direct slots and distinguishes modified Enter from a trimmed send`, async ({
    page,
  }) => {
    await prepare(page, framework);
    const view = page.locator('cds-aichat-chat-input');
    expect(
      await view.evaluate((element) => ({
        slot: element.slot,
        parent: element.parentElement.localName,
        shellParent:
          element.querySelector('cds-aichat-prompt-line-shell')
            .parentElement === element,
        editorParent: element.querySelector('cds-aichat-prompt-line')
          .parentElement.localName,
        sendParent: element.querySelector('cds-aichat-input-send-control')
          .parentElement.localName,
      }))
    ).toEqual({
      slot: 'input',
      parent: 'cds-aichat-shell',
      shellParent: true,
      editorParent: 'cds-aichat-prompt-line-shell',
      sendParent: 'cds-aichat-prompt-line-shell',
    });
    const input = view.getByTestId(PageObjectId.INPUT);
    await expect(input).toHaveJSProperty('tagName', 'TEXTAREA');
    await input.fill('  First line');
    await input.press('Shift+Enter');
    await input.pressSequentially('Second line  ');
    await expect(input).toHaveValue('  First line\nSecond line  ');
    expect(
      await page.evaluate(() => (window as ProbeWindow).nativeInputProbe.sends)
    ).toEqual([]);
    await input.press('Enter');
    await expect
      .poll(() =>
        page.evaluate(() => (window as ProbeWindow).nativeInputProbe.sends)
      )
      .toEqual([
        {
          text: 'First line\nSecond line',
          source: MessageSendSource.MESSAGE_INPUT,
        },
      ]);
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await expect(
      page
        .getByTestId(PageObjectId.MAIN_PANEL)
        .getByRole('heading', { name: 'First line Second line', exact: true })
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => window.chatInstance.getState().input.rawValue)
      )
      .toBe('');
    expect(
      await page.evaluate(() => (window as ProbeWindow).nativeInputProbe.sends)
    ).toHaveLength(1);
  });

  test(`${framework} public editor upgrade keeps the draft and selection and retains configured node views on unrelated config`, async ({
    page,
  }) => {
    await prepare(page, framework);
    const prompt = page.locator('cds-aichat-chat-input cds-aichat-prompt-line');
    const input = page.getByTestId(PageObjectId.INPUT);
    await expect(input).toHaveJSProperty('tagName', 'TEXTAREA');
    expect(
      await prompt.evaluate(
        (element: PromptLineElement) => element.getEditor() === null
      )
    ).toBe(true);
    await input.fill('Typed draft');
    await input.evaluate((element: HTMLTextAreaElement) => {
      element.focus();
      element.setSelectionRange(2, 7);
    });
    await prompt.evaluate((element: PromptLineElement) => {
      (window as ProbeWindow).nativeInputProbe.prompt = element;
    });
    expect(
      await page.evaluate(async () => {
        const probe = (window as ProbeWindow).nativeInputProbe;
        const editor = await window.chatInstance.input.getEditor();
        probe.editor = editor;
        probe.extensions = editor.options.extensions;
        return {
          text: editor.getText(),
          from: editor.state.selection.from,
          to: editor.state.selection.to,
          focused: editor.isFocused,
        };
      })
    ).toEqual({ text: 'Typed draft', from: 3, to: 8, focused: true });
    await expect(input).toHaveAttribute('contenteditable', 'true');
    await expect(input).toBeFocused();
    await page.evaluate(() =>
      window.setChatConfig({
        header: { title: 'Unrelated lazy-editor update' },
      })
    );
    await expect(
      page.locator('cds-aichat-header-view').getByTestId('header_title')
    ).toHaveText('Unrelated lazy-editor update');
    expect(
      await prompt.evaluate(async (element: PromptLineElement) => {
        const probe = (window as ProbeWindow).nativeInputProbe;
        return {
          samePrompt: element === probe.prompt,
          sameEditor:
            (await window.chatInstance.input.getEditor()) === probe.editor,
          sameExtensions:
            element.getEditor().options.extensions === probe.extensions,
          text: element.getEditor().getText(),
          selection: [
            element.getEditor().state.selection.from,
            element.getEditor().state.selection.to,
          ],
        };
      })
    ).toEqual({
      samePrompt: true,
      sameEditor: true,
      sameExtensions: true,
      text: 'Typed draft',
      selection: [3, 8],
    });

    await page.evaluate(async () => {
      const probe = (window as ProbeWindow).nativeInputProbe;
      const paragraph = probe.editor.extensionManager.extensions.find(
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
            probe.nodeViewCreations += 1;
            probe.nodeView = dom;
            return { dom };
          };
        },
      });
      probe.customExtension = chip as unknown as Extension;
      await window.setChatConfig({
        input: { tiptap: { extensions: [probe.customExtension] } },
      });
    });
    await expect
      .poll(() =>
        page.evaluate(async () =>
          Boolean(
            (await window.chatInstance.input.getEditor()).schema.nodes
              .nativeInputChip
          )
        )
      )
      .toBe(true);
    await page.evaluate(async () => {
      const probe = (window as ProbeWindow).nativeInputProbe;
      await window.chatInstance.input.updateContent(() => ({
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
      }));
      probe.editor = await window.chatInstance.input.getEditor();
      probe.extensions = probe.editor.options.extensions;
    });
    await expect(page.locator('[data-native-input-chip]')).toHaveText(
      'Native chip'
    );
    expect(
      await page.evaluate(() => {
        const probe = (window as ProbeWindow).nativeInputProbe;
        return {
          creations: probe.nodeViewCreations,
          configuredExtension: probe.editor.options.extensions.includes(
            probe.customExtension
          ),
          publicContent: window.chatInstance.getState().input.content,
        };
      })
    ).toEqual({
      creations: 1,
      configuredExtension: true,
      publicContent: {
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
      },
    });
    await page.evaluate(() =>
      window.setChatConfig({
        header: { title: 'Unrelated custom-node update' },
      })
    );
    await expect(
      page.locator('cds-aichat-header-view').getByTestId('header_title')
    ).toHaveText('Unrelated custom-node update');
    expect(
      await prompt.evaluate(async (element: PromptLineElement) => {
        const probe = (window as ProbeWindow).nativeInputProbe;
        return {
          prompt: element === probe.prompt,
          editor:
            (await window.chatInstance.input.getEditor()) === probe.editor,
          extensions:
            element.getEditor().options.extensions === probe.extensions,
          nodeView:
            element
              .getEditor()
              .view.dom.querySelector('[data-native-input-chip]') ===
            probe.nodeView,
          creations: probe.nodeViewCreations,
        };
      })
    ).toEqual({
      prompt: true,
      editor: true,
      extensions: true,
      nodeView: true,
      creations: 1,
    });
  });

  test(`${framework} length and upload failure keep separate accessible live regions`, async ({
    page,
  }) => {
    await prepare(page, framework);
    const reason = 'The test upload was rejected.';
    await page.evaluate(async (reason) => {
      const probe = (window as ProbeWindow).nativeInputProbe;
      probe.uploadCalls = [];
      await window.setChatConfig({
        input: { expanded: true, maxInputCharacters: 5 },
        upload: {
          isOn: true,
          accept: '.txt',
          maxFiles: 1,
          onFileUpload: (file, signal) => {
            probe.uploadCalls.push({
              name: file.name,
              aborted: signal.aborted,
            });
            return new Promise<StructuredData>((_resolve, reject) => {
              probe.rejectUpload = () => reject(new Error(reason));
            });
          },
        },
      });
    }, reason);
    const view = page.locator('cds-aichat-chat-input');
    const chooser = page.waitForEvent('filechooser');
    await view
      .getByRole('button', { name: 'Add files to upload', exact: true })
      .click();
    const filename = `${framework}-failure.txt`;
    await (
      await chooser
    ).setFiles({
      name: filename,
      mimeType: 'text/plain',
      buffer: Buffer.from('An editable text attachment'),
    });
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as ProbeWindow).nativeInputProbe.uploadCalls
        )
      )
      .toEqual([{ name: filename, aborted: false }]);
    await expect
      .poll(() =>
        page.evaluate(
          () => window.chatInstance.getState().input.hasInFlightUploads
        )
      )
      .toBe(true);
    const input = view.getByTestId(PageObjectId.INPUT);
    await input.fill('Too long');
    const field = view.locator('[slot="field-messaging"]');
    const lengthRegion = field.locator('[aria-live="polite"]');
    const lengthError = lengthRegion.locator('cds-aichat-error-message');
    await expect(lengthError).toContainText(
      'Error: Max character count exceeded'
    );
    await lengthError
      .getByRole('button', { name: 'Expand error message', exact: true })
      .click();
    await expect(lengthError).toContainText(
      'Maximum character count of 5 exceeded. 8 characters, currently.'
    );
    await page.evaluate(() =>
      (window as ProbeWindow).nativeInputProbe.rejectUpload()
    );
    const uploads = view.locator('cds-aichat-file-uploads');
    await expect
      .poll(() =>
        uploads.evaluate((element: FileUploads) =>
          element.uploads.map((upload) => ({
            isError: upload.isError,
            errorMessage: upload.errorMessage,
          }))
        )
      )
      .toEqual([{ isError: true, errorMessage: reason }]);
    await expect
      .poll(() =>
        page.evaluate(
          () => window.chatInstance.getState().input.hasInFlightUploads
        )
      )
      .toBe(false);
    await expect(lengthRegion).toHaveAttribute('aria-live', 'polite');
    await expect(lengthError).toContainText(
      'Error: Max character count exceeded'
    );
    await expect(lengthError).toContainText(
      'Maximum character count of 5 exceeded. 8 characters, currently.'
    );
    const failureRegion = uploads
      .locator('[aria-live="assertive"]')
      .filter({ hasText: reason });
    await expect(failureRegion).toHaveCount(1);
    await expect(failureRegion).toHaveText(
      `File upload error. ${reason} Remove the attachment and try again.`
    );
    await expect(
      uploads.getByRole('button', { name: `Remove ${filename}`, exact: true })
    ).toBeVisible();
    const accessible = await view.ariaSnapshot();
    expect(accessible).toContain('Error: Max character count exceeded');
    expect(accessible).toContain(
      'Maximum character count of 5 exceeded. 8 characters, currently.'
    );
    expect(accessible).toContain(reason);
    expect(accessible).toContain('Remove the attachment and try again.');

    await input.fill('Fine');
    await expect(lengthRegion).toHaveCount(0);
    const uploadError = field.locator(
      '[aria-live="off"] cds-aichat-error-message'
    );
    await expect(uploadError).toHaveCount(1);
    await expect(uploadError).toHaveJSProperty(
      'title',
      `File upload error: ${filename}`
    );
    await expect(uploadError).toHaveJSProperty(
      'description',
      `${reason} Remove the attachment and try again.`
    );
    await expect(uploadError).toHaveJSProperty('collapsible', false);
    await expect(uploadError).toContainText(`File upload error: ${filename}`);
    await expect(uploadError).toContainText(reason);
    await expect(uploadError).toContainText(
      'Remove the attachment and try again.'
    );
    await expect(
      uploadError.getByRole('button', {
        name: 'Expand error message',
        exact: true,
      })
    ).toHaveCount(0);
    expect(await view.ariaSnapshot()).toContain(
      `File upload error: ${filename}`
    );
    expect(
      await page.evaluate(() => (window as ProbeWindow).nativeInputProbe.sends)
    ).toEqual([]);
  });
}
