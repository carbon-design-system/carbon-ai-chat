/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The before/after render contract. `onBeforeRender` may return a promise, and
 * the host holds the shell and `onAfterRender` until it settles. A throw or
 * rejection leaves the shell gated for the rest of that mount. `onAfterRender`
 * fires once, after the first usable render, and never waits for history.
 * Nothing the host does inside `onAfterRender` can take the shell down.
 *
 * `surfaces` lists the hosts that hold the shell for `onBeforeRender` today.
 * The React wrappers don't await it yet, so they aren't in the list.
 *
 * Each case locates the chat by walking shadow roots for the render target
 * rather than naming a host tag, so the host topology can change without
 * touching these assertions.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';

import '../../../src/web-components/cds-aichat-container';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { PublicConfig } from '../../../src/types/config/PublicConfig';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  BusEventType,
  BusEventUserDefinedResponse,
} from '../../../src/types/events/eventBusTypes';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  mockCustomSendMessage,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

type Callback = (instance: ChatInstance) => Promise<void> | void;

interface MountOptions {
  config: PublicConfig;
  onBeforeRender: Callback;
  onAfterRender: Callback;
}

interface Surface {
  name: string;
  /** Mounts the host and returns a function that forces an unrelated update. */
  mount: (options: MountOptions) => () => Promise<void>;
}

function mountElement(tag: string, options: MountOptions) {
  const element = document.createElement(tag) as HTMLElement &
    MountOptions & {
      requestUpdate: () => void;
      updateComplete: Promise<boolean>;
    };
  element.config = options.config;
  element.onBeforeRender = options.onBeforeRender;
  element.onAfterRender = options.onAfterRender;
  document.body.appendChild(element);
  return async () => {
    element.requestUpdate();
    await element.updateComplete;
  };
}

const surfaces: Surface[] = [
  {
    name: 'cds-aichat-container',
    mount: (options) => mountElement('cds-aichat-container', options),
  },
];

/** The element the chat shell renders into, wherever the host placed it. */
function renderTarget(): Element | null {
  return deepQuerySelector(document, '.cds-aichat--react-app');
}

function shellRendered(): boolean {
  return (renderTarget()?.childElementCount ?? 0) > 0;
}

function inputPresent(): boolean {
  const target = renderTarget();
  return Boolean(
    target && deepQuerySelector(target, '[data-testid="input_field"]')
  );
}

/**
 * A promise that records whether anything chained it. `await` and `.then` on a
 * subclass both go through its `then`, so an unset flag means no handler.
 */
class TrackedPromise<T> extends Promise<T> {
  handled = false;

  then<A = T, B = never>(
    onFulfilled?: ((value: T) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null
  ): Promise<A | B> {
    this.handled = true;
    return super.then(onFulfilled, onRejected);
  }
}

/** Lets pending boot work run, so a gate that leaks has the chance to. */
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

describe('onBeforeRender and onAfterRender across host surfaces', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    setupBeforeEach();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    setupAfterEach();
  });

  describe.each(surfaces)('$name', (surface) => {
    it.each([
      { mode: 'on-demand editor', input: undefined },
      {
        mode: 'preconfigured rich editor',
        input: {
          mention: { trigger: '@', items: [{ id: 'person', label: 'Person' }] },
        },
      },
    ])(
      'awaits before-render and resolves editor access in onAfterRender ($mode)',
      async ({ input }) => {
        const gate = resolvablePromise();
        const order: string[] = [];
        const onBeforeRender = jest.fn(() => {
          order.push('before');
          return gate;
        });
        const onAfterRender = jest.fn(async (instance: ChatInstance) => {
          order.push(shellRendered() ? 'after:shell' : 'after:no-shell');
          expect(instance.getState().viewState.mainWindow).toBe(false);
          const editor = await instance.input.getEditor();
          editor.commands.insertContent('editor ready');
          expect(instance.getState().viewState.mainWindow).toBe(false);
          order.push('after:editor');
        });

        surface.mount({
          config: { ...createBaseConfig(), openChatByDefault: false, input },
          onBeforeRender,
          onAfterRender,
        });

        await waitFor(() => expect(onBeforeRender).toHaveBeenCalledTimes(1), {
          timeout: 5000,
        });
        await settle();
        expect(shellRendered()).toBe(false);
        expect(onAfterRender).not.toHaveBeenCalled();

        gate.doResolve();

        await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
          timeout: 5000,
        });
        await onAfterRender.mock.results[0].value;
        expect(shellRendered()).toBe(true);
        expect(order).toEqual(['before', 'after:shell', 'after:editor']);
        const instance = onAfterRender.mock.calls[0][0];
        expect((await instance.input.getEditor()).getText()).toBe(
          'editor ready'
        );

        await settle();
        expect(onAfterRender).toHaveBeenCalledTimes(1);
      }
    );

    it.each([
      [
        'throws',
        (error: Error) => () => {
          throw error;
        },
      ],
      ['rejects', (error: Error) => () => Promise.reject(error)],
    ])(
      'stays gated when onBeforeRender %s, including after an unrelated update',
      async (_label, makeCallback) => {
        const error = new Error('before-render failed');
        const onBeforeRender = jest.fn(makeCallback(error));
        const onAfterRender = jest.fn();

        const update = surface.mount({
          config: createBaseConfig(),
          onBeforeRender,
          onAfterRender,
        });

        await waitFor(
          () =>
            expect(consoleError).toHaveBeenCalledWith(
              'Error initializing chat:',
              error
            ),
          { timeout: 5000 }
        );
        await settle();
        expect(shellRendered()).toBe(false);
        expect(onAfterRender).not.toHaveBeenCalled();

        await update();
        await settle();
        expect(shellRendered()).toBe(false);
        expect(onAfterRender).not.toHaveBeenCalled();
        expect(onBeforeRender).toHaveBeenCalledTimes(1);
      }
    );

    it('runs onAfterRender once without waiting for history to load', async () => {
      const history = resolvablePromise<never>();
      const base = createBaseConfig();
      const onAfterRender = jest.fn();

      surface.mount({
        config: {
          ...base,
          openChatByDefault: true,
          messaging: { ...base.messaging, customLoadHistory: () => history },
        },
        onBeforeRender: jest.fn(),
        onAfterRender,
      });

      await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });
      expect(history.isComplete).toBeFalsy();
      await waitFor(() => expect(inputPresent()).toBe(true), {
        timeout: 5000,
      });

      await settle();
      expect(onAfterRender).toHaveBeenCalledTimes(1);
    });

    // The chat calls onAfterRender from a zero-delay timer and neither catches
    // nor logs what it does, so a failure surfaces the way any timer's would.
    describe('when onAfterRender misbehaves', () => {
      let timerErrors: unknown[];
      const onTimerError = (event: ErrorEvent) => {
        timerErrors.push(event.error);
        event.preventDefault();
      };

      beforeEach(() => {
        timerErrors = [];
        window.addEventListener('error', onTimerError);
      });

      afterEach(() => {
        window.removeEventListener('error', onTimerError);
      });

      const thrown = new Error('after-render threw');
      const rejected = new Error('after-render rejected');
      const rows: Array<{
        label: string;
        onAfterRender: Callback;
        timerErrors: Error[];
      }> = [
        {
          label: 'throws',
          onAfterRender: () => {
            throw thrown;
          },
          timerErrors: [thrown],
        },
        {
          label: 'rejects',
          onAfterRender: () => TrackedPromise.reject(rejected),
          timerErrors: [],
        },
        {
          label: 'never settles',
          onAfterRender: () => new TrackedPromise<void>(() => {}),
          timerErrors: [],
        },
      ];

      it.each(rows)(
        'keeps the shell interactive when onAfterRender $label',
        async (row) => {
          const onBeforeRender = jest.fn();
          const onAfterRender = jest.fn(row.onAfterRender);

          surface.mount({
            config: { ...createBaseConfig(), openChatByDefault: true },
            onBeforeRender,
            onAfterRender,
          });

          await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
            timeout: 5000,
          });
          await settle();
          expect(timerErrors).toEqual(row.timerErrors);
          // Nothing awaited or chained the returned promise, so a rejection
          // stays unhandled.
          const returned = onAfterRender.mock.results[0].value;
          if (returned instanceof TrackedPromise) {
            expect(returned.handled).toBe(false);
            returned.catch(() => {});
          }

          const instance: ChatInstance = onBeforeRender.mock.calls[0][0];
          await act(() => instance.send('still interactive'));
          expect(
            mockCustomSendMessage.mock.calls.map(
              ([request]) => request.input.text
            )
          ).toContain('still interactive');
          await waitFor(() =>
            expect(
              deepQuerySelector(renderTarget(), '.cds-aichat--message--request')
            ).not.toBeNull()
          );
        }
      );
    });
  });
});

describe('extension content emitted during startup', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('keeps extension content the host emits from onBeforeRender', async () => {
    const onAfterRender = jest.fn();
    render(
      <ChatContainer
        {...createBaseConfig()}
        openChatByDefault
        onBeforeRender={async (instance) => {
          const event: BusEventUserDefinedResponse = {
            type: BusEventType.USER_DEFINED_RESPONSE,
            data: {
              slot: 'emitted-early',
              message: {
                response_type: MessageResponseTypes.USER_DEFINED,
                user_defined: {},
              },
              fullMessage: { id: 'early', output: { generic: [] } },
            },
          };
          await instance.serviceManager.eventBus.fire(event, instance);
        }}
        onAfterRender={onAfterRender}
        renderUserDefinedResponse={() => <p data-probe="early">early</p>}
      />
    );

    await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
      timeout: 5000,
    });
    expect(document.querySelector('[data-probe="early"]')).not.toBeNull();
  });
});
