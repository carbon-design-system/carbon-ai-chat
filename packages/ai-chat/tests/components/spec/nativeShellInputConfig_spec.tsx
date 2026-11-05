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
import ChatInput from '../../../src/chat/components/input/ChatInput';
import type ChatShell from '../../../src/chat/components/shell/ChatShell';
import type { ChatViewState } from '../../../src/chat/services/chatViewState';
import * as customPromptLine from '../../../src/chat/utils/customPromptLine';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import { bootModuleLoader } from '../../../src/web-components/cds-aichat-container/cds-aichat-container';
import type { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { OnErrorType } from '../../../src/types/config/ErrorConfig';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';
import { chatStore } from '../../../src/chat/services/attachChatView';

const wrappers = [
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const;

async function boot(
  Wrapper: (typeof wrappers)[number][1],
  props: Partial<ChatContainerProps>
) {
  let instance: ChatInstance;
  const after = jest.fn((chat: ChatInstance) => props.onAfterRender?.(chat));
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

let restoreFrames: (() => void) | undefined;

function deepActiveElement(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/** Whether `node` sits inside `container`, crossing shadow roots. */
function composedWithin(container: Node | null, node: Node | null): boolean {
  let current = node;
  while (current && container) {
    if (current === container) {
      return true;
    }
    current =
      current.parentNode instanceof ShadowRoot
        ? current.parentNode.host
        : current.parentNode;
  }
  return false;
}

/**
 * Runs animation frames as microtasks, so a focus frame fires as early as it
 * can. afterEach restores the real functions.
 */
function framesAsMicrotasks() {
  const requestFrame = window.requestAnimationFrame;
  const cancelFrame = window.cancelAnimationFrame;
  const cancelled = new Set<number>();
  let frames = 0;
  window.requestAnimationFrame = (callback) => {
    const id = ++frames;
    queueMicrotask(() => {
      if (!cancelled.delete(id)) {
        callback(performance.now());
      }
    });
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    cancelled.add(id);
  };
  restoreFrames = () => {
    window.requestAnimationFrame = requestFrame;
    window.cancelAnimationFrame = cancelFrame;
  };
}

/** The service manager the shell itself registers handles on. */
function shellViewState(shell: ChatShell) {
  return (shell as unknown as { viewState: ChatViewState }).viewState;
}

// The first wrapper boot in a file loads the boot modules on demand. Load
// them once up front so that cost stays out of every case's after-render wait.
beforeAll(() => bootModuleLoader.loadBootModules());
beforeEach(setupBeforeEach);
afterEach(() => {
  restoreFrames?.();
  restoreFrames = undefined;
  setupAfterEach();
  jest.restoreAllMocks();
});

describe.each(wrappers)('input configuration through %s', (_name, Wrapper) => {
  it('publishes configured actions and mentions before the initial home after-render callback', async () => {
    const onClick = jest.fn();
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
    const onError = jest.fn();
    const onClick = jest.fn();
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
    jest
      .spyOn(ChatInput.prototype as any, 'willUpdate')
      .mockImplementation(function (this: ChatInput, ...args: unknown[]) {
        if (!firstUpdate.has(this)) {
          firstUpdate.set(this, this.inputActions);
        }
        return willUpdate.apply(this, args);
      });
    const onError = jest.fn();
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
            onClick: jest.fn(),
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

  describe('composer focus moves', () => {
    // jsdom has no layout, so tabbable would treat the composer as hidden and
    // skip it. Give the composer input a client rect, as a browser would.
    function reportsLayout(element: HTMLInputElement | null) {
      if (element) {
        element.getClientRects = () =>
          [{ width: 1, height: 1 }] as unknown as DOMRectList;
      }
    }

    function toggledComposer(initiallyVisible: boolean) {
      const control: { toggle?: () => void } = {};
      function Composer() {
        const [visible, setVisible] = React.useState(initiallyVisible);
        // A timer is not a discrete event, so React schedules this update.
        control.toggle = () => setTimeout(() => setVisible((v) => !v), 0);
        return visible ? (
          <input
            aria-label="Custom composer"
            data-testid="custom-composer"
            ref={reportsLayout}
          />
        ) : null;
      }
      return { control, element: <Composer /> };
    }

    async function bootWithComposer(initiallyVisible: boolean) {
      const composer = toggledComposer(initiallyVisible);
      const f = await boot(Wrapper, {
        renderWriteableElements: { customPromptLine: composer.element },
      });
      const shell = f.root.querySelector<ChatShell>('cds-aichat-chat-shell');
      const composerInput = () =>
        f.instance.writeableElements.customPromptLine.querySelector<HTMLInputElement>(
          '[data-testid="custom-composer"]'
        );
      const builtIn = () =>
        f.root.querySelector<ChatInput>('cds-aichat-chat-input');
      return {
        ...f,
        shell,
        toggle: composer.control.toggle,
        composerInput,
        builtIn,
      };
    }

    function outsideControl() {
      const outside = document.createElement('button');
      outside.textContent = 'Outside';
      document.body.appendChild(outside);
      return outside;
    }

    it('moves focus from a removed custom composer to the restored built-in input', async () => {
      framesAsMicrotasks();
      const f = await bootWithComposer(true);
      act(() => {
        f.composerInput().focus();
      });
      expect(document.activeElement).toBe(f.composerInput());

      f.toggle();
      await waitFor(() => expect(f.builtIn()).not.toBeNull());
      const input = f.builtIn();
      await waitFor(() =>
        expect(composedWithin(input, deepActiveElement())).toBe(true)
      );
      expect(deepActiveElement()).not.toBe(input);
      expect(
        composedWithin(
          f.shell.querySelector('cds-aichat-shell'),
          deepActiveElement()
        )
      ).toBe(true);
    });

    it('moves focus from the built-in input into an added custom composer', async () => {
      framesAsMicrotasks();
      const f = await bootWithComposer(false);
      const input = f.builtIn();
      expect(input).not.toBeNull();
      act(() => {
        shellViewState(f.shell).inputComponent.requestFocus();
      });
      await waitFor(() =>
        expect(composedWithin(input, deepActiveElement())).toBe(true)
      );

      f.toggle();
      await waitFor(() => expect(f.composerInput()).not.toBeNull());
      await waitFor(() =>
        expect(document.activeElement).toBe(f.composerInput())
      );
      expect(f.builtIn()).toBeNull();
    });

    it('moves no focus when the composers swap while neither had focus', async () => {
      framesAsMicrotasks();
      const f = await bootWithComposer(true);
      const outside = outsideControl();
      act(() => {
        outside.focus();
      });
      const requestFocus = jest.spyOn(customPromptLine, 'requestComposerFocus');

      f.toggle();
      await waitFor(() => expect(f.builtIn()).not.toBeNull());
      await expect(f.shell.whenReady()).resolves.toBe(true);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(document.activeElement).toBe(outside);
      expect(requestFocus).not.toHaveBeenCalled();
      outside.remove();
    });

    it('leaves focus on another control chosen while the restored input is not yet ready', async () => {
      framesAsMicrotasks();
      const f = await bootWithComposer(true);
      act(() => {
        f.composerInput().focus();
      });
      let release: (ready: boolean) => void;
      const blocked = new Promise<boolean>((resolve) => {
        release = resolve;
      });
      const readiness = jest
        .spyOn(f.shell, 'whenReady')
        .mockReturnValue(blocked);

      f.toggle();
      await waitFor(() => expect(f.builtIn()).not.toBeNull());
      await waitFor(() => expect(readiness).toHaveBeenCalled());
      const outside = outsideControl();
      act(() => {
        outside.focus();
      });
      await act(async () => {
        release(true);
        await blocked;
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(document.activeElement).toBe(outside);
      expect(composedWithin(f.builtIn(), deepActiveElement())).toBe(false);
      outside.remove();
    });
  });

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
