/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `onViewChange` and `onViewPreChange` are plain Lit properties, so each also
 * takes an HTML attribute. A string set through that attribute is not a
 * handler: the hosts must not offer it to the event bus, and the custom
 * element must keep its default visibility handler.
 */

import { waitFor } from '@testing-library/react';

import '../../../src/web-components/cds-aichat-container';
import '../../../src/web-components/cds-aichat-custom-element';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  BusEventType,
  BusEventViewChange,
  BusEventViewPreChange,
} from '../../../src/types/events/eventBusTypes';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

async function mountWithViewChangeAttributes(tagName: string) {
  let instance!: ChatInstance;
  const element = document.createElement(tagName);
  element.setAttribute('onviewprechange', 'notAHandler()');
  element.setAttribute('onviewchange', 'notAHandler()');
  const asHost = element as unknown as Record<string, unknown>;
  asHost.config = createBaseConfig();
  asHost.onBeforeRender = (chatInstance: ChatInstance) => {
    instance = chatInstance;
  };
  document.body.appendChild(element);
  await waitFor(() => expect(instance).toBeDefined(), { timeout: 8000 });
  expect(asHost.onViewChange).toBe('notAHandler()');
  return { element, instance };
}

function fireViewChange(instance: ChatInstance, mainWindow: boolean) {
  const viewState = { mainWindow, launcher: !mainWindow };
  const { eventBus } = instance.serviceManager;
  return Promise.all([
    eventBus.fire(
      {
        type: BusEventType.VIEW_PRE_CHANGE,
        oldViewState: viewState,
        newViewState: viewState,
      } as unknown as BusEventViewPreChange,
      instance
    ),
    eventBus.fire(
      {
        type: BusEventType.VIEW_CHANGE,
        oldViewState: viewState,
        newViewState: viewState,
      } as unknown as BusEventViewChange,
      instance
    ),
  ]);
}

describe('view-change attributes', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('does not offer an attribute string to the event bus', async () => {
    const consoleError = jest.spyOn(console, 'error');
    const { instance } = await mountWithViewChangeAttributes(
      'cds-aichat-container'
    );
    await expect(fireViewChange(instance, true)).resolves.toBeDefined();
    expect(
      consoleError.mock.calls.filter(([message]) =>
        String(message).includes('The event handler is not a function.')
      )
    ).toEqual([]);
  });

  it('keeps the custom element default visibility handler', async () => {
    const { element, instance } = await mountWithViewChangeAttributes(
      'cds-aichat-custom-element'
    );
    await expect(fireViewChange(instance, false)).resolves.toBeDefined();
    expect(element.classList.contains('cds-aichat--hidden')).toBe(true);
    await fireViewChange(instance, true);
    expect(element.classList.contains('cds-aichat--hidden')).toBe(false);
  });
});
