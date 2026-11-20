/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Contract test for `PromptLineWriteableSlot`. The slot lives inside the input
 * composer's flex rows and doubles as a `data-floating-menu-container`, so when
 * it has no content it must collapse out of the flex flow (rendered `hidden`)
 * rather than occupy a track and shift the prompt line / send button. With no
 * slotted content it stays hidden while still emitting the marked wrapper and
 * the named catch `<slot>` so content can later be projected into it.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

import PromptLineWriteableSlot from '../../../src/chat/components/input/PromptLineWriteableSlot';
import type PromptLineSlot from '../../../src/chat/components/input/native/PromptLineSlot';
import { WriteableElementName } from '../../../src/types/instance/WriteableElements';

describe('PromptLineWriteableSlot', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });
  it('renders a marked, hidden floating-menu container around the named catch slot when empty', async () => {
    const { container } = render(
      <PromptLineWriteableSlot
        slotName={WriteableElementName.PROMPT_LINE_ACTIONS_END}
        wrapperSlot="message-actions"
      />
    );

    await waitFor(() =>
      expect(
        container.querySelector('[data-prompt-line-slot] slot')
      ).not.toBeNull()
    );
    const wrapper = container.querySelector('[data-prompt-line-slot]');
    expect(wrapper).not.toBeNull();
    // Projects into the prompt-line-shell `message-actions` slot.
    await waitFor(() =>
      expect(wrapper?.getAttribute('slot')).toBe('message-actions')
    );
    // Stays a real (positioning) box for Carbon tooltip/popover anchoring.
    expect(wrapper?.hasAttribute('data-floating-menu-container')).toBe(true);
    // No content yet -> collapsed so it adds no flex gap before the prompt line.
    expect(wrapper?.hasAttribute('hidden')).toBe(true);

    const slot = wrapper?.querySelector('slot');
    expect(slot?.getAttribute('name')).toBe('promptLineActionsEnd');
  });

  it('keeps the native wrapper directly slotted and the same borrowed content through reconnect', async () => {
    const container = document.createElement('div');
    const shadow = container.attachShadow({ mode: 'open' });
    const shell = document.createElement('div');
    const shellSlot = document.createElement('slot');
    shellSlot.name = 'send-control';
    shell.attachShadow({ mode: 'open' }).appendChild(shellSlot);
    const native = document.createElement(
      'cds-aichat-prompt-line-slot'
    ) as PromptLineSlot;
    native.slotName = WriteableElementName.PROMPT_LINE_SEND_BUTTON_START;
    native.wrapperSlot = 'send-control';
    shell.appendChild(native);
    shadow.appendChild(shell);
    const content = document.createElement('div');
    content.slot = WriteableElementName.PROMPT_LINE_SEND_BUTTON_START;
    container.appendChild(content);
    document.body.appendChild(container);
    await native.updateComplete;
    expect(native.parentElement).toBe(shell);
    expect(native.shadowRoot).toBe(null);
    expect(native.assignedSlot).toBe(shellSlot);
    expect(native.hidden).toBe(true);
    const button = document.createElement('button');
    const clicked = jest.fn();
    button.addEventListener('click', clicked);
    content.appendChild(button);
    await Promise.resolve();
    expect(native.hidden).toBe(false);
    expect(content.firstChild).toBe(button);
    expect(content.assignedSlot?.parentElement).toBe(native);
    shell.appendChild(native);
    await native.updateComplete;
    expect(native.hidden).toBe(false);
    button.click();
    expect(clicked).toHaveBeenCalledTimes(1);
    native.remove();
    content.textContent = '';
    await Promise.resolve();
    shell.appendChild(native);
    await native.updateComplete;
    expect(native.hidden).toBe(true);
  });
});
