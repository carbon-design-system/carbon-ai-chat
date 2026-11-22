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
import Edit from '@carbon/icons-react/es/Edit';
import ChatInput from '../../chat/components/input/ChatInput';
import { ChatContainer } from '../ChatContainer';
import { ChatCustomElement } from '../ChatCustomElement';
import { bootModuleLoader } from '../../web-components/cds-aichat-container/cds-aichat-container';
import type { ChatContainerProps } from '../../types/component/ChatContainer';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import { OnErrorType } from '../../types/config/ErrorConfig';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';
import { chatStore } from '../../chat/services/attachChatView';

const wrappers = [
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const;

async function boot(
  Wrapper: (typeof wrappers)[number][1],
  props: Partial<ChatContainerProps>
) {
  let instance: ChatInstance;
  const after = vi.fn((chat: ChatInstance) => props.onAfterRender?.(chat));
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
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 5000,
  });
  const container = deepQuerySelector(
    document,
    'cds-aichat-container'
  ) as HTMLElement;
  return { instance, root: container.shadowRoot };
}

// The first wrapper boot in a file loads the boot modules on demand. Load
// them once up front so that cost stays out of every case's after-render wait.
beforeAll(() => bootModuleLoader.loadBootModules());
beforeEach(setupBeforeEach);
afterEach(() => {
  setupAfterEach();
  vi.restoreAllMocks();
});

describe.each(wrappers)('input configuration through %s', (_name, Wrapper) => {
  it('publishes configured actions and mentions before the initial home after-render callback', async () => {
    const onClick = vi.fn();
    let observed: {
      actions: ChatInput['inputActions'];
      mention: ChatInput['mention'];
      action: HTMLElement;
      home: Element;
    };
    await boot(Wrapper, {
      homescreen: { isOn: true, greeting: 'Welcome' },
      input: {
        expanded: true,
        actions: [
          {
            id: 'edit',
            text: 'Edit',
            icon: Edit,
            fixed: true,
            testId: 'configured-action',
            onClick,
          },
        ],
        mention: {
          trigger: '@',
          items: [{ id: 'person', label: 'Person', avatar: Edit }],
        },
      },
      onAfterRender: () => {
        const container = deepQuerySelector(
          document,
          'cds-aichat-container'
        ) as HTMLElement;
        const input = container.shadowRoot.querySelector<ChatInput>(
          'cds-aichat-chat-input'
        );
        observed = {
          actions: input?.inputActions,
          mention: input?.mention,
          action: input?.querySelector<HTMLElement>(
            '[data-testid="configured-action"]'
          ),
          home: container.shadowRoot.querySelector('cds-aichat-home-screen'),
        };
      },
    });

    expect(observed.home).not.toBeNull();
    expect(observed.actions).toEqual([
      expect.objectContaining({
        id: 'edit',
        icon: expect.objectContaining({ elem: 'svg', size: 16 }),
      }),
    ]);
    expect(observed.mention).toEqual(
      expect.objectContaining({
        trigger: '@',
        items: [
          expect.objectContaining({
            id: 'person',
            avatar: expect.objectContaining({ elem: 'svg', size: 16 }),
          }),
        ],
      })
    );
    expect(observed.action).not.toBeNull();
    observed.action.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('enables configured input when a mounted custom composer later returns null', async () => {
    let removeComposer: () => void;
    function Composer() {
      const [visible, setVisible] = React.useState(true);
      removeComposer = () => setVisible(false);
      return visible ? <button type="button">Custom composer</button> : null;
    }
    const onError = vi.fn();
    const onClick = vi.fn();
    const f = await boot(Wrapper, {
      onError,
      input: {
        expanded: true,
        actions: [
          {
            id: 'edit',
            text: 'Edit',
            icon: Edit,
            fixed: true,
            testId: 'restored-action',
            onClick,
          },
        ],
      },
      renderWriteableElements: { customPromptLine: <Composer /> },
    });
    expect(f.root.querySelector('cds-aichat-chat-input')).toBeNull();
    act(() => removeComposer());
    await waitFor(() =>
      expect(
        f.root.querySelector('[data-testid="restored-action"]')
      ).not.toBeNull()
    );
    const input = f.root.querySelector<ChatInput>('cds-aichat-chat-input');
    expect(input.inputActions).toEqual([
      expect.objectContaining({
        id: 'edit',
        icon: expect.objectContaining({ elem: 'svg', size: 16 }),
      }),
    ]);
    input.querySelector<HTMLElement>('[data-testid="restored-action"]').click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('renders the restored built-in input with configured actions on its first update when the composer is removed outside an event', async () => {
    let removeComposer: () => void;
    function Composer() {
      const [visible, setVisible] = React.useState(true);
      // A timer is not a discrete event, so React schedules this update
      // instead of flushing it synchronously.
      removeComposer = () => setTimeout(() => setVisible(false), 0);
      return visible ? <button type="button">Custom composer</button> : null;
    }
    const firstUpdate = new Map<ChatInput, ChatInput['inputActions']>();
    const willUpdate = (ChatInput.prototype as any).willUpdate;
    vi.spyOn(ChatInput.prototype as any, 'willUpdate').mockImplementation(
      function (this: ChatInput, ...args: unknown[]) {
        if (!firstUpdate.has(this)) {
          firstUpdate.set(this, this.inputActions);
        }
        return willUpdate.apply(this, args);
      }
    );
    const onError = vi.fn();
    const f = await boot(Wrapper, {
      onError,
      input: {
        expanded: true,
        actions: [
          {
            id: 'edit',
            text: 'Edit',
            icon: Edit,
            fixed: true,
            testId: 'restored-action',
            onClick: vi.fn(),
          },
        ],
      },
      renderWriteableElements: { customPromptLine: <Composer /> },
    });
    expect(f.root.querySelector('cds-aichat-chat-input')).toBeNull();
    expect(firstUpdate.size).toBe(0);

    removeComposer();
    await waitFor(() =>
      expect(
        f.root.querySelector('[data-testid="restored-action"]')
      ).not.toBeNull()
    );
    const input = f.root.querySelector<ChatInput>('cds-aichat-chat-input');
    expect(firstUpdate.has(input)).toBe(true);
    expect(firstUpdate.get(input)).toEqual([
      expect.objectContaining({
        id: 'edit',
        icon: expect.objectContaining({ elem: 'svg', size: 16 }),
      }),
    ]);
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports an icon conversion failure through onError and keeps the configured error panel available', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('Input action icon failed');
    const renderIcon = vi.fn(() => {
      throw failure;
    });
    const Icon = React.forwardRef<SVGSVGElement>(renderIcon);
    const onError = vi.fn();
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
      chatStore(f.instance.serviceManager).getState().view.catastrophicErrorType
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
    const renderIcon = vi.fn(() => {
      throw new Error('The built-in input is not active');
    });
    const Icon = React.forwardRef<SVGSVGElement>(renderIcon);
    const onError = vi.fn();
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
