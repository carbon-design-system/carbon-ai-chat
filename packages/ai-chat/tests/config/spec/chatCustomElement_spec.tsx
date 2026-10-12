/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Coverage for `ChatCustomElement`'s prop split. It forwards flattened
 * `PublicConfig` fields to the inner `ChatContainer` (which reconstructs the
 * config) while leaving arbitrary DOM attributes on the wrapper element. Both
 * sides are driven by the shared `FLATTENED_PUBLIC_CONFIG_FIELDS` table, so a
 * newly-added config field cannot be silently dropped or leaked onto the host.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { BusEventViewPreChange } from '../../../src/types/events/eventBusTypes';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { ViewType } from '../../../src/types/instance/apiTypes';
import { createBaseTestProps } from '../../test_helpers';
import { AppState } from '../../../src/types/state/AppState';
import { enLanguagePack } from '../../../src/types/config/LanguagePack';

describe('ChatCustomElement prop forwarding', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('forwards flattened config to the chat and DOM attributes to the wrapper element', async () => {
    let capturedInstance: any = null;

    render(
      React.createElement(ChatCustomElement, {
        ...createBaseTestProps(),
        className: 'my-custom-chat',
        id: 'custom-chat-id',
        // Flattened PublicConfig fields — must reach the chat through the inner
        // ChatContainer's shared reconstruction.
        namespace: 'custom-ns',
        strings: { input_placeholder: 'Custom element placeholder' },
        // An arbitrary DOM attribute — must stay on the wrapper element.
        'aria-label': 'custom chat region',
        onBeforeRender: (instance: any) => {
          capturedInstance = instance;
        },
      })
    );

    await waitFor(() => expect(capturedInstance).not.toBeNull(), {
      timeout: 5000,
    });

    const state: AppState = capturedInstance.serviceManager.store.getState();
    // Flattened config fields reached the chat.
    expect(state.config.public.namespace).toBe('custom-ns');
    expect(state.languagePack.input_placeholder).toBe(
      'Custom element placeholder'
    );
    // An unspecified string keeps its default (config folded, not replaced).
    expect(state.languagePack.launcher_isOpen).toBe(
      enLanguagePack.launcher_isOpen
    );

    // className, id, and the arbitrary DOM attribute landed on the wrapper
    // element — not swallowed into config, not pushed onto the inner host.
    const wrapper = document.querySelector('[aria-label="custom chat region"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.tagName).toBe('DIV');
    expect(wrapper?.classList.contains('my-custom-chat')).toBe(true);
    expect(wrapper?.id).toBe('custom-chat-id');
  });

  it('delivers DOM event props with the outer div as the current target', async () => {
    let capturedInstance: any = null;
    const onClick = jest.fn(
      (event: React.MouseEvent<HTMLDivElement>) => event.currentTarget
    );

    render(
      React.createElement(ChatCustomElement, {
        ...createBaseTestProps(),
        className: 'event-host',
        onClick,
        onBeforeRender: (instance: any) => {
          capturedInstance = instance;
        },
      })
    );
    await waitFor(() => expect(capturedInstance).not.toBeNull(), {
      timeout: 5000,
    });

    const host = document.querySelector<HTMLDivElement>('.event-host');
    fireEvent.click(host.firstElementChild ?? host);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.results[0].value).toBe(host);
    expect(capturedInstance.serviceManager.customHostElement).toBe(host);
  });

  it.each([
    ['omitted', undefined, true],
    ['supplied', jest.fn(), false],
  ])(
    'hides the outer div by default only when onViewChange is %s',
    async (_label, onViewChange, hidesByDefault) => {
      let capturedInstance: any = null;

      render(
        React.createElement(ChatCustomElement, {
          ...createBaseTestProps(),
          className: 'view-host',
          onViewChange,
          onBeforeRender: (instance: any) => {
            capturedInstance = instance;
          },
        })
      );
      await waitFor(() => expect(capturedInstance).not.toBeNull(), {
        timeout: 5000,
      });

      const host = document.querySelector<HTMLDivElement>('.view-host');
      await act(async () => {
        await capturedInstance.changeView('mainWindow');
      });
      expect(host.classList.contains('cds-aichat--hidden')).toBe(false);

      await act(async () => {
        await capturedInstance.changeView('launcher');
      });
      expect(host.classList.contains('cds-aichat--hidden')).toBe(
        hidesByDefault
      );
      if (onViewChange) {
        expect(onViewChange).toHaveBeenCalled();
      }
    }
  );

  it('waits for an async onViewPreChange before hiding the outer div', async () => {
    let capturedInstance: ChatInstance | null = null;
    const closing = resolvablePromise();
    // Only the close under test waits; the chat's own startup view change
    // must not.
    let holdClose = false;
    const onViewPreChange = jest.fn((event: BusEventViewPreChange) =>
      holdClose && !event.newViewState.mainWindow ? closing : undefined
    );
    const onAfterRender = jest.fn();

    render(
      React.createElement(ChatCustomElement, {
        ...createBaseTestProps(),
        className: 'pre-change-host',
        onViewPreChange,
        onBeforeRender: (instance: ChatInstance) => {
          capturedInstance = instance;
        },
        onAfterRender,
      })
    );
    await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
      timeout: 5000,
    });

    const host = document.querySelector<HTMLDivElement>('.pre-change-host');
    await act(async () => {
      await capturedInstance.changeView(ViewType.MAIN_WINDOW);
    });
    expect(host.classList.contains('cds-aichat--hidden')).toBe(false);

    holdClose = true;
    let closed: Promise<void>;
    act(() => {
      closed = capturedInstance.changeView(ViewType.LAUNCHER);
    });
    await waitFor(() =>
      expect(onViewPreChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          newViewState: expect.objectContaining({ mainWindow: false }),
        }),
        capturedInstance
      )
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(host.classList.contains('cds-aichat--hidden')).toBe(false);

    await act(async () => {
      closing.doResolve();
      await closed;
    });
    expect(host.classList.contains('cds-aichat--hidden')).toBe(true);
  });
});
