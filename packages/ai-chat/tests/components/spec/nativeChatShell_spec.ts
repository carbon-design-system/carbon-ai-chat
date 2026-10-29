/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { LitElement } from 'lit';
import { act, render, waitFor } from '@testing-library/react';
import ChatShell from '../../../src/chat/components/shell/ChatShell';
import type ChatInput from '../../../src/chat/components/input/ChatInput';
import { ChatContainer } from '../../../src/react/ChatContainer';
import actions from '../../../src/chat/store/actions';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import { OnErrorType } from '../../../src/types/config/ErrorConfig';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

class PendingConsumer extends LitElement {
  get updateComplete(): Promise<boolean> {
    return new Promise(() => {});
  }
}
customElements.define('test-shell-pending-consumer', PendingConsumer);

async function boot(props: Partial<ChatContainerProps> = {}) {
  let instance: ChatInstance;
  const after = jest.fn();
  const tree = (key: string) =>
    React.createElement(ChatContainer, {
      ...createBaseConfig(),
      openChatByDefault: true,
      shouldTakeFocusIfOpensAutomatically: false,
      homescreen: { isOn: false },
      ...props,
      key,
      onBeforeRender: (chat) => {
        instance = chat;
      },
      onAfterRender: after,
    });
  const mounted = render(tree('first'));
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 5000,
  });
  const root = document.querySelector('cds-aichat-container').shadowRoot;
  const view = root.querySelector<ChatShell>('cds-aichat-chat-shell');
  expect(view).not.toBeNull();
  return { instance, after, root, view, mounted, tree };
}

beforeEach(setupBeforeEach);
afterEach(() => {
  setupAfterEach();
  jest.restoreAllMocks();
});

describe('native shell readiness and lifetime', () => {
  it('does not wait for unrelated Lit content within the retained message target', async () => {
    const f = await boot();
    f.view
      .querySelector('.cds-aichat--shell-messages-target')
      .appendChild(document.createElement('test-shell-pending-consumer'));
    await expect(f.view.whenReady()).resolves.toBe(true);
  });

  it('waits for the matching React message commit before reporting the native layout ready', async () => {
    const f = await boot({ homescreen: { isOn: true, greeting: 'Welcome' } });
    const commits = jest
      .spyOn(f.view, 'commitMessages')
      .mockImplementation(() => {});
    act(() => {
      f.instance.serviceManager.store.dispatch(
        actions.setHomeScreenIsOpen(false)
      );
    });
    await waitFor(() => expect(commits).toHaveBeenCalled());
    const [target, generation] =
      commits.mock.calls[commits.mock.calls.length - 1];
    expect(target.isConnected).toBe(true);
    expect(target.querySelector('.cds-aichat--messages')).not.toBeNull();
    const ready = jest.fn();
    const pending = f.view.whenReady().then(ready);
    ChatShell.prototype.commitMessages.call(f.view, target, generation - 1);
    await act(async () => {
      await Promise.resolve();
    });
    expect(ready).not.toHaveBeenCalled();
    ChatShell.prototype.commitMessages.call(f.view, target, generation);
    await pending;
    expect(ready).toHaveBeenCalledWith(true);
  });

  it('keeps native targets and pending readiness through a same-task DOM move', async () => {
    const f = await boot();
    const widget = f.view.querySelector('cds-aichat-shell');
    const messages = f.view.querySelector('.cds-aichat--shell-messages-target');
    const input = f.view.querySelector<ChatInput>('cds-aichat-chat-input');
    let releaseInput: () => void;
    const blocked = new Promise<void>((resolve) => {
      releaseInput = resolve;
    });
    jest.spyOn(input, 'ready', 'get').mockReturnValue(blocked);
    const pending = f.view.whenReady();
    await Promise.resolve();
    const parent = f.view.parentNode;
    act(() => {
      parent.appendChild(f.view);
    });
    releaseInput();
    await expect(pending).resolves.toBe(true);
    expect(f.view.querySelector('cds-aichat-shell')).toBe(widget);
    expect(f.view.querySelector('.cds-aichat--shell-messages-target')).toBe(
      messages
    );
    expect(f.view.querySelector('cds-aichat-chat-input')).toBe(input);
  });

  it('cancels pending readiness on a true detach even if an input child never finishes', async () => {
    const f = await boot();
    const input = f.view.querySelector<ChatInput>('cds-aichat-chat-input');
    jest.spyOn(input, 'ready', 'get').mockReturnValue(new Promise(() => {}));
    const pending = f.view.whenReady();
    await Promise.resolve();
    const parent = f.view.parentNode;
    act(() => {
      f.view.remove();
    });
    await expect(pending).resolves.toBe(false);
    act(() => {
      parent.appendChild(f.view);
    });
  });
});

describe('native shell failure surface', () => {
  it('keeps the configured error surface available when the root fails while connecting', async () => {
    const failure = new Error('Native shell connection failed');
    jest
      .spyOn(ChatShell.prototype as any, 'onViewConnected')
      .mockImplementationOnce(() => {
        throw failure;
      });
    const onError = jest.fn();
    const f = await boot({ onError });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        errorType: OnErrorType.RENDER,
        otherData: expect.objectContaining({ error: failure }),
      })
    );
    expect(f.view.querySelector('cds-aichat-shell')).not.toBeNull();
    expect(f.view.querySelector('cds-aichat-native-panels')).not.toBeNull();
    act(() => {
      f.instance.updateCatastrophicErrorPanel({
        isOpen: true,
        title: 'Connection unavailable',
        bodyText: 'The host can still configure the error panel.',
      });
    });
    await waitFor(() =>
      expect(
        f.root.querySelector('.cds-aichat--catastrophic-error__error-heading')
          ?.textContent
      ).toBe('Connection unavailable')
    );
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it.each(['renderView', 'updated'])(
    'preserves the shell and React error target after a %s failure and accepts later error-panel configuration',
    async (method) => {
      const onError = jest.fn();
      const f = await boot({ onError });
      const widget = f.view.querySelector('cds-aichat-shell');
      const panels = f.view.querySelector('cds-aichat-native-panels');
      const reactTarget = f.root.querySelector('.cds-aichat--react-app');
      const errorOccurred = jest.spyOn(
        f.instance.serviceManager.actions,
        'errorOccurred'
      );
      const failure = new Error('Native shell failed');
      jest.spyOn(f.view as any, method).mockImplementationOnce(() => {
        throw failure;
      });
      act(() => {
        f.view.requestUpdate();
      });
      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: OnErrorType.RENDER,
          catastrophicErrorType: true,
          otherData: expect.objectContaining({ error: failure }),
        })
      );
      expect(errorOccurred).toHaveBeenCalledTimes(1);
      expect(
        f.instance.serviceManager.store.getState().catastrophicErrorType
      ).toBe(true);
      await expect(f.view.whenReady()).resolves.toBe(false);
      act(() => {
        f.instance.updateCatastrophicErrorPanel({
          isOpen: true,
          title: 'Chat unavailable',
          bodyText: 'The host configured this error panel after the failure.',
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
      expect(
        f.root.querySelectorAll('.cds-aichat--catastrophic-error')
      ).toHaveLength(1);
      expect(f.view.querySelector('cds-aichat-shell')).toBe(widget);
      expect(f.view.querySelector('cds-aichat-native-panels')).toBe(panels);
      expect(f.root.querySelector('.cds-aichat--react-app')).toBe(reactTarget);
      expect(
        f.view.querySelector('.cds-aichat--shell-messages-target')
      ).toBeNull();
      const connect = jest.spyOn(f.view as any, 'onViewConnected');
      act(() => {
        f.instance.updateCatastrophicErrorPanel({
          isOpen: true,
          title: 'Still unavailable',
        });
        f.view.requestUpdate();
      });
      await waitFor(() =>
        expect(
          f.root.querySelector('.cds-aichat--catastrophic-error__error-heading')
            ?.textContent
        ).toBe('Still unavailable')
      );
      expect(connect).not.toHaveBeenCalled();
      expect(errorOccurred).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);

      f.mounted.rerender(f.tree('replacement'));
      await waitFor(() => expect(f.after).toHaveBeenCalledTimes(2));
      const current = document.querySelector('cds-aichat-container').shadowRoot;
      expect(
        current.querySelector('.cds-aichat--shell-messages-target')
      ).not.toBeNull();
      act(() => {
        f.view.requestUpdate();
      });
      await f.view.updateComplete;
      expect(f.view.isConnected).toBe(false);
      expect(onError).toHaveBeenCalledTimes(1);
    }
  );

  it('does not report a second error or retry when the failure surface itself throws', async () => {
    const onError = jest.fn();
    const f = await boot({ onError });
    const input = f.view.querySelector<ChatInput>('cds-aichat-chat-input');
    jest.spyOn(input, 'ready', 'get').mockReturnValue(new Promise(() => {}));
    const pending = f.view.whenReady();
    await Promise.resolve();
    jest.spyOn(f.view as any, 'renderView').mockImplementationOnce(() => {
      throw new Error('Native shell failed');
    });
    jest.spyOn(f.view as any, 'renderFailedView').mockImplementation(() => {
      throw new Error('Error surface failed');
    });
    act(() => {
      f.view.requestUpdate();
    });
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    await expect(pending).resolves.toBe(false);
    await f.view.updateComplete;
    const renderFailedView = (f.view as any).renderFailedView as jest.Mock;
    const attempts = renderFailedView.mock.calls.length;
    await act(async () => {
      await Promise.resolve();
    });
    expect(renderFailedView).toHaveBeenCalledTimes(attempts);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
