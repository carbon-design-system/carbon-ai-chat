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
} from '../inputActionsLayout';

vi.mock('@floating-ui/dom', () => ({
  autoUpdate: vi.fn(),
  computePosition: vi.fn(),
  offset: vi.fn(),
  flip: vi.fn(),
}));
vi.mock('@carbon/utilities', () => ({ createOverflowHandler: vi.fn() }));

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
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frame) => {
    frames.delete(frame);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

it('cancels setup before an overflow owner exists and ignores callbacks after release', () => {
  const hidden = vi.fn();
  const measuring = vi.fn();
  const release = connectInputActionsOverflow(
    document.createElement('div'),
    1,
    hidden,
    measuring,
    vi.fn()
  );
  release();
  flushFrame();
  expect(createOverflowHandler).not.toHaveBeenCalled();
  expect(measuring).toHaveBeenCalledTimes(1);
});

it('disconnects between overflow setup and reveal', () => {
  const disconnect = vi.fn();
  vi.mocked(createOverflowHandler).mockReturnValue({ disconnect });
  const measuring = vi.fn();
  const release = connectInputActionsOverflow(
    document.createElement('div'),
    1,
    vi.fn(),
    measuring,
    vi.fn()
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
  const release = connectInputActionsMenu(trigger, menu, vi.fn());
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
  vi.mocked(computePosition).mockReturnValue(
    new Promise((resolve) => {
      completePosition = resolve;
    })
  );
  const disconnect = vi.fn();
  vi.mocked(autoUpdate).mockImplementation((_anchor, _surface, update) => {
    update();
    return disconnect;
  });
  const release = connectInputActionsMenu(trigger, menu, vi.fn());
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
