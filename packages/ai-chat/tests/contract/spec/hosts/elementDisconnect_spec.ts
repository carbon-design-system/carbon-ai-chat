/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * What the two `cds-aichat-*` elements do when they leave the page. A move
 * (out and back in within one task) keeps the running chat; a removal that
 * outlasts the task retires it. Mounting again after that is in
 * `lifecycle/remount_spec.ts`.
 */

import { act, waitFor } from '@testing-library/react';

import {
  GenericItem,
  MessageResponseTypes,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  ContractElementTag,
  changeView,
  contractElement,
  contractSetup,
  mainPanelText,
  pause,
  responseOf,
  textResponse,
} from '../../helpers';

const TAGS: ContractElementTag[] = [
  'cds-aichat-container',
  'cds-aichat-custom-element',
];

const WIDGET: GenericItem = {
  response_type: MessageResponseTypes.USER_DEFINED,
  user_defined: {},
} as GenericItem;

describe.each(TAGS)('taking %s off the page', (tag) => {
  contractSetup();

  // @covers element.cds-aichat-container.onBeforeRender element.cds-aichat-custom-element.onBeforeRender
  it('keeps the running chat through a move within one task', async () => {
    const before = jest.fn();
    const { instance, element } = await contractElement(tag, {
      properties: { messaging: { skipWelcome: true }, onBeforeRender: before },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    await act(() => instance.messaging.addMessage(textResponse('Kept', 'r1')));
    await act(async () => {
      element.remove();
      document.body.appendChild(element);
    });
    // The element decides after the task's microtasks; wait a full task.
    await pause();
    expect(before).toHaveBeenCalledTimes(1);
    await act(() =>
      instance.messaging.addMessage(textResponse('Still here', 'r2'))
    );
    await waitFor(() => expect(mainPanelText()).toContain('Still here'));
    expect(mainPanelText()).toContain('Kept');
  });

  // @covers element.cds-aichat-container.onViewPreChange element.cds-aichat-custom-element.onViewPreChange
  // @covers element.cds-aichat-container.onViewChange element.cds-aichat-custom-element.onViewChange
  it('stops calling its view callbacks once removed for longer than a task', async () => {
    const pre = jest.fn();
    const change = jest.fn();
    const { instance, element } = await contractElement(tag, {
      properties: {
        messaging: { skipWelcome: true },
        onViewPreChange: pre,
        onViewChange: change,
      },
    });
    await act(async () => {
      element.remove();
    });
    await pause();
    pre.mockClear();
    change.mockClear();
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(pre).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  // @covers element.cds-aichat-container.renderUserDefinedResponse element.cds-aichat-custom-element.renderUserDefinedResponse
  it('stops calling renderUserDefinedResponse once removed for longer than a task', async () => {
    const render = jest.fn(() => document.createElement('span'));
    const { instance, element } = await contractElement(tag, {
      properties: {
        messaging: { skipWelcome: true },
        renderUserDefinedResponse: render,
      },
    });
    await act(async () => {
      element.remove();
    });
    await pause();
    await act(() => instance.messaging.addMessage(responseOf('r1', [WIDGET])));
    await pause();
    expect(render).not.toHaveBeenCalled();
  });

  it('takes its writeable elements back out once removed for longer than a task', async () => {
    const { instance, element } = await contractElement(tag, {
      properties: { messaging: { skipWelcome: true } },
    });
    const writeable = Object.values(instance.writeableElements);
    expect(writeable.length).toBeGreaterThan(0);
    expect(writeable.every((node) => node.isConnected)).toBe(true);
    await act(async () => {
      element.remove();
    });
    await pause();
    expect(writeable.filter((node) => node.parentNode !== null)).toEqual([]);
  });
});
