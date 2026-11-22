/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Server-side browser commands for the components browser project. They run
// Playwright's real mouse, keyboard and media emulation, as the
// `@web/test-runner-commands` plugins did under web-test-runner.
//
// Vitest runs each test file in an iframe, while web-test-runner ran it as
// the top-level page. Tests pass coordinates in the test document's CSS
// pixels, so every position is translated into page coordinates through the
// iframe's box, including any scaling.

import type {} from '@vitest/browser-playwright';
import type { BrowserCommand, BrowserCommandContext } from 'vitest/node';

type Position = [number, number];
type MouseButton = 'left' | 'middle' | 'right';

export interface SendMousePayload {
  type: 'move' | 'click' | 'down' | 'up';
  position?: Position;
  button?: MouseButton;
}

export type SendKeysPayload =
  { press: string } | { type: string } | { down: string } | { up: string };

export interface EmulateMediaPayload {
  media?: 'screen' | 'print' | null;
  colorScheme?: 'light' | 'dark' | 'no-preference' | null;
  reducedMotion?: 'reduce' | 'no-preference' | null;
  forcedColors?: 'active' | 'none' | null;
}

function playwrightOf(context: BrowserCommandContext) {
  if (context.provider.name !== 'playwright') {
    throw new Error('Browser input commands require the Playwright provider');
  }
  return context;
}

function requirePosition(position: unknown): Position {
  if (
    !Array.isArray(position) ||
    position.length !== 2 ||
    !position.every(Number.isInteger)
  ) {
    throw new Error(
      'You must provide a position option as a [x, y] tuple where x and y are integers.'
    );
  }
  return position as Position;
}

async function toPage(
  context: BrowserCommandContext,
  [x, y]: Position
): Promise<Position> {
  const { frame } = playwrightOf(context) as BrowserCommandContext & {
    frame(): Promise<import('playwright').Frame>;
  };
  const element = await (await frame()).frameElement();
  const box = await element.boundingBox();
  const metrics = await element.evaluate((iframe: HTMLIFrameElement) => ({
    width: iframe.offsetWidth,
    height: iframe.offsetHeight,
    left: iframe.clientLeft,
    top: iframe.clientTop,
  }));
  if (!box || !metrics.width || !metrics.height) {
    throw new Error('The test iframe has no visible box');
  }
  const scaleX = box.width / metrics.width;
  const scaleY = box.height / metrics.height;
  return [
    box.x + (metrics.left + x) * scaleX,
    box.y + (metrics.top + y) * scaleY,
  ];
}

const caicSendMouse: BrowserCommand<[payload: SendMousePayload], void> = async (
  context,
  payload
) => {
  const { page } = playwrightOf(context) as BrowserCommandContext & {
    page: import('playwright').Page;
  };
  switch (payload?.type) {
    case 'move': {
      const [x, y] = await toPage(context, requirePosition(payload.position));
      await page.mouse.move(x, y);
      return;
    }
    case 'click': {
      const [x, y] = await toPage(context, requirePosition(payload.position));
      await page.mouse.click(x, y, { button: payload.button });
      return;
    }
    case 'down':
      await page.mouse.down({ button: payload.button });
      return;
    case 'up':
      await page.mouse.up({ button: payload.button });
      return;
    default:
      throw new Error('You must provide a `SendMousePayload` object');
  }
};

const caicResetMouse: BrowserCommand<[], void> = async (context) => {
  const { page } = playwrightOf(context) as BrowserCommandContext & {
    page: import('playwright').Page;
  };
  await page.mouse.up({ button: 'left' });
  await page.mouse.up({ button: 'middle' });
  await page.mouse.up({ button: 'right' });
  // web-test-runner moved to the test document's top-left corner.
  const [x, y] = await toPage(context, [0, 0]);
  await page.mouse.move(x, y);
};

const caicSendKeys: BrowserCommand<[payload: SendKeysPayload], void> = async (
  context,
  payload
) => {
  const { page } = playwrightOf(context) as BrowserCommandContext & {
    page: import('playwright').Page;
  };
  if (payload && 'press' in payload) {
    return page.keyboard.press(payload.press);
  }
  if (payload && 'type' in payload) {
    return page.keyboard.type(payload.type);
  }
  if (payload && 'down' in payload) {
    return page.keyboard.down(payload.down);
  }
  if (payload && 'up' in payload) {
    return page.keyboard.up(payload.up);
  }
  throw new Error('You must provide a `SendKeysPayload` object');
};

const caicEmulateMedia: BrowserCommand<
  [payload: EmulateMediaPayload],
  void
> = async (context, payload) => {
  const { page } = playwrightOf(context) as BrowserCommandContext & {
    page: import('playwright').Page;
  };
  await page.emulateMedia(payload);
};

export const browserCommands = {
  caicSendMouse,
  caicResetMouse,
  caicSendKeys,
  caicEmulateMedia,
};
