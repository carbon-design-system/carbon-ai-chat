/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The lifecycle and view-change callbacks, and the base `config` object, of
 * the two `cds-aichat-*` elements: when each runs, with what, and what a
 * host sees when it sets one before or after the element connects. Remounts
 * are in `lifecycle/remount_spec.ts`.
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventViewChange,
  BusEventViewPreChange,
  ChatInstance,
  PageObjectId,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  ContractElementTag,
  ELEMENT_TAGS,
  byTestId,
  changeView,
  contractElement,
  contractSetup,
  deferred,
  headerTitle,
  pause,
} from '../../helpers';

type Element = HTMLElement & Record<string, unknown>;

/** Builds an element with these properties, not yet connected. */
function build(
  tag: ContractElementTag,
  properties: Record<string, unknown> = {}
): Element {
  const element = document.createElement(tag) as Element;
  Object.assign(element, { messaging: { skipWelcome: true } }, properties);
  return element;
}

/** Connects an element without waiting for it to render. */
async function connect(element: Element): Promise<void> {
  await act(async () => {
    document.body.appendChild(element);
  });
}

const CLOSED = { launcher: true, mainWindow: false };
const OPEN = { launcher: false, mainWindow: true };

describe.each(ELEMENT_TAGS)('onBeforeRender and onAfterRender on %s', (tag) => {
  contractSetup();

  // @covers element.cds-aichat-container.onBeforeRender element.cds-aichat-custom-element.onBeforeRender
  // @covers element.cds-aichat-container.onAfterRender element.cds-aichat-custom-element.onAfterRender
  it('calls onBeforeRender before the chat draws anything, then onAfterRender once it has, each once with the same instance', async () => {
    const calls: string[] = [];
    const before = jest.fn(() => {
      calls.push(
        `before, launcher drawn: ${!!byTestId(PageObjectId.LAUNCHER)}`
      );
    });
    const after = jest.fn(() => {
      calls.push(`after, launcher drawn: ${!!byTestId(PageObjectId.LAUNCHER)}`);
    });
    const element = build(tag, {
      onBeforeRender: before,
      onAfterRender: after,
    });
    await connect(element);
    await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([
      'before, launcher drawn: false',
      'after, launcher drawn: true',
    ]);
    const [handed] = before.mock.calls[0] as unknown as [ChatInstance];
    expect(after.mock.calls[0]).toEqual([handed]);
    expect(handed.getState().viewState).toEqual(CLOSED);
  });

  // @covers element.cds-aichat-container.onBeforeRender element.cds-aichat-custom-element.onBeforeRender
  it('holds the first render until a promise onBeforeRender returns settles', async () => {
    const gate = deferred();
    const after = jest.fn();
    await connect(
      build(tag, { onBeforeRender: () => gate.promise, onAfterRender: after })
    );
    await pause(100);
    expect(after).not.toHaveBeenCalled();
    expect(byTestId(PageObjectId.LAUNCHER)).toBeNull();
    await act(async () => {
      gate.resolve();
    });
    await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
    expect(byTestId(PageObjectId.LAUNCHER)).not.toBeNull();
  });

  // @covers element.cds-aichat-container.onBeforeRender element.cds-aichat-custom-element.onBeforeRender
  // @covers element.cds-aichat-container.onAfterRender element.cds-aichat-custom-element.onAfterRender
  it('logs a rejected onBeforeRender, stays unrendered, skips onAfterRender, and does not retry on a property change', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const failure = new Error('host failed');
      const before = jest.fn(() => Promise.reject(failure));
      const after = jest.fn();
      const element = build(tag, {
        onBeforeRender: before,
        onAfterRender: after,
      });
      error.mockClear();
      await connect(element);
      await waitFor(() =>
        expect(error.mock.calls.some((args) => args.includes(failure))).toBe(
          true
        )
      );
      await act(async () => {
        element.header = { title: 'Changed' };
      });
      await pause(100);
      expect(before).toHaveBeenCalledTimes(1);
      expect(after).not.toHaveBeenCalled();
      expect(byTestId(PageObjectId.LAUNCHER)).toBeNull();
    } finally {
      error.mockRestore();
    }
  });

  // @covers element.cds-aichat-container.onBeforeRender element.cds-aichat-custom-element.onBeforeRender
  // @covers element.cds-aichat-container.onAfterRender element.cds-aichat-custom-element.onAfterRender
  it('calls neither again on a property change, nor a new one set after the first render', async () => {
    const before = jest.fn();
    const after = jest.fn();
    const { instance, element } = await contractElement(tag, {
      properties: {
        messaging: { skipWelcome: true },
        onBeforeRender: before,
        onAfterRender: after,
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    const lateBefore = jest.fn();
    const lateAfter = jest.fn();
    await act(async () => {
      element.onBeforeRender = lateBefore;
      element.onAfterRender = lateAfter;
      element.header = { title: 'Changed' };
    });
    await waitFor(() => expect(headerTitle()).toBe('Changed'));
    await pause(100);
    expect(before).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
    expect(lateBefore).not.toHaveBeenCalled();
    expect(lateAfter).not.toHaveBeenCalled();
  });
});

describe.each(ELEMENT_TAGS)('onViewPreChange and onViewChange on %s', (tag) => {
  contractSetup();

  // @covers element.cds-aichat-container.onViewPreChange element.cds-aichat-custom-element.onViewPreChange
  // @covers element.cds-aichat-container.onViewChange element.cds-aichat-custom-element.onViewChange
  it('calls onViewPreChange, then onViewChange with the instance, for each open and close', async () => {
    const calls: string[] = [];
    const pre = jest.fn((event: BusEventViewPreChange) => {
      calls.push(`pre ${event.newViewState.mainWindow}`);
    });
    const change = jest.fn((event: BusEventViewChange) => {
      calls.push(`change ${event.newViewState.mainWindow}`);
    });
    const { instance } = await contractElement(tag, {
      properties: {
        messaging: { skipWelcome: true },
        onViewPreChange: pre,
        onViewChange: change,
      },
    });
    calls.length = 0;
    pre.mockClear();
    change.mockClear();
    await changeView(instance, ViewType.MAIN_WINDOW);
    await changeView(instance, ViewType.LAUNCHER);
    expect(calls).toEqual([
      'pre true',
      'change true',
      'pre false',
      'change false',
    ]);
    const [preEvent] = pre.mock.calls[0];
    expect(preEvent.oldViewState).toEqual(CLOSED);
    expect(preEvent.newViewState).toEqual(OPEN);
    const [changeEvent, handed] = change.mock.calls[0] as unknown as [
      BusEventViewChange,
      ChatInstance,
    ];
    expect(changeEvent.oldViewState).toEqual(CLOSED);
    expect(changeEvent.newViewState).toEqual(OPEN);
    expect(handed).toBe(instance);
  });

  // @covers element.cds-aichat-container.onViewPreChange element.cds-aichat-custom-element.onViewPreChange
  // @covers element.cds-aichat-container.onViewChange element.cds-aichat-custom-element.onViewChange
  // MAIN-NOTES M107: the JSDoc says these run when the chat opens or closes;
  // they also run for the mount's own move to the launcher.
  it('calls both once at mount, for the move from all closed to the launcher', async () => {
    const pre = jest.fn();
    const change = jest.fn();
    await contractElement(tag, {
      properties: {
        messaging: { skipWelcome: true },
        onViewPreChange: pre,
        onViewChange: change,
      },
    });
    const ALL_CLOSED = { launcher: false, mainWindow: false };
    expect(
      pre.mock.calls.map(([event]) => [event.oldViewState, event.newViewState])
    ).toEqual([[ALL_CLOSED, CLOSED]]);
    expect(
      change.mock.calls.map(([event]) => [
        event.oldViewState,
        event.newViewState,
      ])
    ).toEqual([[ALL_CLOSED, CLOSED]]);
  });

  // @covers element.cds-aichat-container.onViewPreChange element.cds-aichat-custom-element.onViewPreChange
  it('waits for a promise onViewPreChange returns before the view changes', async () => {
    const gate = deferred();
    let holding = false;
    const change = jest.fn();
    const { instance } = await contractElement(tag, {
      properties: {
        messaging: { skipWelcome: true },
        // The mount's own initial view change runs through it too, so it
        // holds only the change this test makes.
        onViewPreChange: () => (holding ? gate.promise : undefined),
        onViewChange: change,
      },
    });
    change.mockClear();
    holding = true;
    let opened: Promise<void>;
    await act(async () => {
      opened = instance.changeView(ViewType.MAIN_WINDOW);
    });
    await pause(100);
    expect(instance.getState().viewState).toEqual(CLOSED);
    expect(change).not.toHaveBeenCalled();
    await act(async () => {
      gate.resolve();
      await opened;
    });
    expect(instance.getState().viewState).toEqual(OPEN);
    expect(change).toHaveBeenCalledTimes(1);
  });

  // @covers element.cds-aichat-container.onViewPreChange element.cds-aichat-custom-element.onViewPreChange
  // @covers element.cds-aichat-container.onViewChange element.cds-aichat-custom-element.onViewChange
  // MAIN-NOTES M107: the elements read view callbacks once, at the first
  // render. The custom element's JSDoc says so; the container's doesn't.
  it('ignores view callbacks set after the first render', async () => {
    const { instance, element } = await contractElement(tag, {
      properties: { messaging: { skipWelcome: true } },
    });
    const pre = jest.fn();
    const change = jest.fn();
    await act(async () => {
      element.onViewPreChange = pre;
      element.onViewChange = change;
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(instance.getState().viewState).toEqual(OPEN);
    expect(pre).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  // @covers element.cds-aichat-container.onViewPreChange element.cds-aichat-custom-element.onViewPreChange
  // @covers element.cds-aichat-container.onViewChange element.cds-aichat-custom-element.onViewChange
  it('ignores a view callback written as an HTML attribute, and opens without an error', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { instance } = await contractElement(tag, {
        properties: { messaging: { skipWelcome: true } },
        attributes: {
          onviewprechange: 'notAHandler()',
          onviewchange: 'notAHandler()',
        },
      });
      error.mockClear();
      await changeView(instance, ViewType.MAIN_WINDOW);
      expect(instance.getState().viewState).toEqual(OPEN);
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});

// @covers element.cds-aichat-container.config element.cds-aichat-custom-element.config
describe.each(ELEMENT_TAGS)('config on %s', (tag) => {
  contractSetup();

  it('reaches the chat when set before connect', async () => {
    const { instance } = await contractElement(tag, {
      properties: {
        config: {
          header: { title: 'From config' },
          messaging: { skipWelcome: true },
        },
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(headerTitle()).toBe('From config');
    expect(instance.getState().messages).toEqual([]);
  });

  it('applies a new config set after connect', async () => {
    const { instance, element } = await contractElement(tag, {
      properties: {
        config: {
          header: { title: 'First' },
          messaging: { skipWelcome: true },
        },
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    await act(async () => {
      element.config = {
        header: { title: 'Second' },
        messaging: { skipWelcome: true },
      };
    });
    await waitFor(() => expect(headerTitle()).toBe('Second'));
  });
});
