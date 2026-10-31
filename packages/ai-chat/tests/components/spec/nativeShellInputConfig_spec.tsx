/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import type { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { OnErrorType } from '../../../src/types/config/ErrorConfig';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const wrappers = [
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const;

async function boot(
  Wrapper: (typeof wrappers)[number][1],
  props: Partial<ChatContainerProps>
) {
  let instance: ChatInstance;
  const after = jest.fn();
  render(
    React.createElement(Wrapper, {
      ...createBaseConfig(),
      className: '',
      openChatByDefault: true,
      shouldTakeFocusIfOpensAutomatically: false,
      homescreen: { isOn: false },
      ...props,
      onBeforeRender: (chat: ChatInstance) => {
        instance = chat;
      },
      onAfterRender: after,
    })
  );
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
  const container = deepQuerySelector(
    document,
    'cds-aichat-container'
  ) as HTMLElement;
  return { instance, root: container.shadowRoot };
}

beforeEach(setupBeforeEach);
afterEach(() => {
  setupAfterEach();
  jest.restoreAllMocks();
});

describe.each(wrappers)('input configuration through %s', (_name, Wrapper) => {
  it('reports an icon conversion failure through onError and keeps the configured error panel available', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('Input action icon failed');
    const renderIcon = jest.fn(() => {
      throw failure;
    });
    const Icon = React.forwardRef<SVGSVGElement>(renderIcon);
    const onError = jest.fn();
    const f = await boot(Wrapper, {
      onError,
      input: { actions: [{ id: 'broken', text: 'Broken action', icon: Icon }] },
    });

    expect(renderIcon).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        errorType: OnErrorType.RENDER,
        catastrophicErrorType: true,
        otherData: expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining(failure.message),
          }),
        }),
      })
    );
    expect(
      f.instance.serviceManager.store.getState().catastrophicErrorType
    ).toBe(true);
    expect(f.root.querySelector('cds-aichat-chat-shell')).not.toBeNull();
    const attempts = renderIcon.mock.calls.length;
    act(() => {
      f.instance.updateCatastrophicErrorPanel({
        isOpen: true,
        title: 'Chat unavailable',
        bodyText: 'The host can still configure the error panel.',
      });
    });
    await waitFor(() =>
      expect(
        f.root.querySelector('.cds-aichat--catastrophic-error__error-heading')
          ?.textContent
      ).toBe('Chat unavailable')
    );
    const panel = f.root
      .querySelector('.cds-aichat--catastrophic-error')
      .closest('cds-aichat-panel') as HTMLElement & { open: boolean };
    expect(panel.open).toBe(true);
    expect(renderIcon).toHaveBeenCalledTimes(attempts);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('does not invoke an unused input icon when custom prompt content replaces the built-in input', async () => {
    const renderIcon = jest.fn(() => {
      throw new Error('The built-in input is not active');
    });
    const Icon = React.forwardRef<SVGSVGElement>(renderIcon);
    const onError = jest.fn();
    const f = await boot(Wrapper, {
      onError,
      input: { actions: [{ id: 'unused', text: 'Unused action', icon: Icon }] },
      renderWriteableElements: {
        customPromptLine: <button type="button">Custom composer</button>,
      },
    });

    expect(f.root.querySelector('cds-aichat-chat-input')).toBeNull();
    const customPrompt = f.instance.writeableElements.customPromptLine;
    expect(customPrompt.textContent).toBe('Custom composer');
    expect(customPrompt.assignedSlot).not.toBeNull();
    expect(renderIcon).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
