/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { autoUpdate, computePosition } from '@floating-ui/dom';
import { createOverflowHandler } from '@carbon/utilities';
import {
  connectInputActionsMenu,
  connectInputActionsOverflow,
} from '../../../src/chat/utils/inputActionsLayout';

jest.mock('@floating-ui/dom', () => ({
  autoUpdate: jest.fn(),
  computePosition: jest.fn(),
  offset: jest.fn(),
  flip: jest.fn(),
}));
jest.mock('@carbon/utilities', () => ({ createOverflowHandler: jest.fn() }));

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
function flushFrame() {
  const pending = [...frames];
  frames.clear();
  pending.forEach(([, callback]) => callback(0));
}

beforeEach(() => {
  frames = new Map();
  nextFrame = 0;
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((frame) => {
    frames.delete(frame);
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  document.body.innerHTML = '';
});

it('measures before revealing and releases the handler and pending frames', () => {
  const order: string[] = [];
  const disconnect = jest.fn();
  jest.mocked(createOverflowHandler).mockImplementation((options) => {
    order.push('setup');
    requestAnimationFrame(() => {
      order.push('measure');
      options.onChange([document.createElement('button')], []);
    });
    return { disconnect };
  });
  const hidden = jest.fn();
  const release = connectInputActionsOverflow(
    document.createElement('div'),
    3,
    hidden,
    (measuring) => order.push(measuring ? 'hide' : 'reveal'),
    jest.fn()
  );
  expect(order).toEqual(['hide']);
  flushFrame();
  expect(order).toEqual(['hide', 'setup']);
  flushFrame();
  expect(order).toEqual(['hide', 'setup', 'measure', 'reveal']);
  expect(hidden).toHaveBeenCalledWith(2);
  release();
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(frames.size).toBe(0);
});

it('cancels setup before an overflow owner exists and ignores callbacks after release', () => {
  const hidden = jest.fn();
  const measuring = jest.fn();
  const release = connectInputActionsOverflow(
    document.createElement('div'),
    1,
    hidden,
    measuring,
    jest.fn()
  );
  release();
  flushFrame();
  expect(createOverflowHandler).not.toHaveBeenCalled();
  expect(measuring).toHaveBeenCalledTimes(1);
});

it('disconnects between overflow setup and reveal', () => {
  const disconnect = jest.fn();
  jest.mocked(createOverflowHandler).mockReturnValue({ disconnect });
  const measuring = jest.fn();
  const release = connectInputActionsOverflow(
    document.createElement('div'),
    1,
    jest.fn(),
    measuring,
    jest.fn()
  );
  flushFrame();
  release();
  flushFrame();
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(measuring.mock.calls).toEqual([[true]]);
});

function menuFixture() {
  const trigger = document.createElement('button');
  const menu = Object.assign(document.createElement('div'), {
    updateComplete: Promise.resolve(),
  });
  const surface = document.createElement('ul');
  surface.setAttribute('role', 'menu');
  menu.attachShadow({ mode: 'open' }).appendChild(surface);
  document.body.append(trigger, menu);
  return { trigger, menu, surface };
}

it('waits for the menu surface and cancels an open that closes before its update completes', async () => {
  const { trigger, menu } = menuFixture();
  let complete: () => void;
  menu.updateComplete = new Promise((resolve) => {
    complete = resolve;
  });
  const release = connectInputActionsMenu(trigger, menu, jest.fn());
  release();
  complete();
  await Promise.resolve();
  expect(autoUpdate).not.toHaveBeenCalled();
});

it('places the visible surface, then rejects a late position write after cleanup', async () => {
  const { trigger, menu, surface } = menuFixture();
  let completePosition: (
    value: Awaited<ReturnType<typeof computePosition>>
  ) => void;
  jest.mocked(computePosition).mockReturnValue(
    new Promise((resolve) => {
      completePosition = resolve;
    })
  );
  const disconnect = jest.fn();
  jest.mocked(autoUpdate).mockImplementation((_anchor, _surface, update) => {
    update();
    return disconnect;
  });
  const release = connectInputActionsMenu(trigger, menu, jest.fn());
  await Promise.resolve();
  expect(autoUpdate).toHaveBeenCalledWith(
    trigger,
    surface,
    expect.any(Function)
  );
  expect(computePosition).toHaveBeenCalledWith(
    trigger,
    surface,
    expect.objectContaining({ strategy: 'fixed', placement: 'top-start' })
  );
  release();
  completePosition({
    x: 12,
    y: 34,
    placement: 'top-start',
    strategy: 'fixed',
    middlewareData: {},
  });
  await Promise.resolve();
  expect(surface.style.position).toBe('');
  expect(disconnect).toHaveBeenCalledTimes(1);
});

it('applies live positions and reports only failures from the live menu', async () => {
  const { trigger, menu, surface } = menuFixture();
  jest.mocked(computePosition).mockResolvedValue({
    x: 12,
    y: 34,
    placement: 'top-start',
    strategy: 'fixed',
    middlewareData: {},
  });
  const disconnect = jest.fn();
  let update: () => void;
  jest.mocked(autoUpdate).mockImplementation((_anchor, _surface, callback) => {
    update = callback;
    callback();
    return disconnect;
  });
  const error = jest.fn();
  const release = connectInputActionsMenu(trigger, menu, error);
  await Promise.resolve();
  await Promise.resolve();
  expect(surface.style.position).toBe('fixed');
  expect(surface.style.left).toBe('12px');
  expect(surface.style.top).toBe('34px');
  jest.mocked(computePosition).mockRejectedValue(new Error('position failed'));
  update();
  await Promise.resolve();
  await Promise.resolve();
  expect(error).toHaveBeenCalledTimes(1);
  release();
  update();
  await Promise.resolve();
  await Promise.resolve();
  expect(error).toHaveBeenCalledTimes(1);
});
