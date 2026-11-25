/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The messages list keeps the latest request pinned near the top while its
 * response streams, resizes, or completes, and leaves the reader's position
 * alone once they scroll. These cases read real scroll geometry frame by
 * frame, so they run in a browser.
 */

import { page, userEvent } from 'vitest/browser';

import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';

import { MessageState } from '../../../types/config/MessagingConfig';
import {
  type GenericItem,
  MessageResponseTypes,
} from '../../../types/messaging/Messages';
import { setupAfterEach, setupBeforeEach } from '../helpers/chat';
import { untilDom } from '../helpers/waits';
import {
  CODE,
  MARKDOWN,
  REASONING_STEPS,
  hasText,
  type Responder,
  type ScrollChat,
  SEND_MODES,
  type SendMode,
  mountScrollChat,
  nextFrame,
  sendAndReceive,
  sendResponse,
  settle,
  streamText,
  streamUserDefined,
  sendUserDefined,
} from '../helpers/browserScroll';

interface ScrollFrame {
  offset: number;
  scrollTop: number;
  scrollHeight: number;
  spacerHeight: number;
}

let chat: ScrollChat | undefined;

function spacer(list: HTMLElement) {
  return list.querySelector('#chat-bottom-spacer');
}

function lastRequest(list: HTMLElement) {
  const requests = list.querySelectorAll('.cds-aichat--message--request');
  return requests[requests.length - 1];
}

function readGeometry({ list, scroller }: ScrollChat): ScrollFrame {
  return {
    offset:
      lastRequest(list).getBoundingClientRect().top -
      scroller.getBoundingClientRect().top,
    scrollTop: scroller.scrollTop,
    scrollHeight: scroller.scrollHeight,
    spacerHeight: spacer(list).getBoundingClientRect().height,
  };
}

/**
 * Resizes the last custom response in the next frame and samples six frames
 * of geometry after it. `transient` collapses it first and forces a layout,
 * as a renderer that measures while replacing its contents does.
 */
function resizeCustomContent(
  scrollChat: ScrollChat,
  height: number,
  transient = false
) {
  const all = document.querySelectorAll<HTMLElement>('.external');
  const element = all[all.length - 1];
  return new Promise<ScrollFrame[]>((resolve) => {
    const frames: ScrollFrame[] = [];
    const sample = () => {
      frames.push(readGeometry(scrollChat));
      if (frames.length === 6) {
        resolve(frames);
      } else {
        requestAnimationFrame(sample);
      }
    };
    requestAnimationFrame(() => {
      if (transient) {
        element.style.height = '0px';
        element.getBoundingClientRect();
      }
      element.style.height = `${height}px`;
      element.style.overflow = 'hidden';
      requestAnimationFrame(sample);
    });
  });
}

/** The demo backend's answers, keyed by request text. */
function responder(mode: SendMode): Responder {
  return async (text, request, _options, instance) => {
    switch (text) {
      case 'text':
        return sendResponse(
          instance,
          {
            id: `text-${request.id}`,
            request_id: request.id,
            output: {
              generic: [
                { response_type: MessageResponseTypes.TEXT, text: MARKDOWN },
              ],
            },
          },
          mode
        );
      case 'user_defined':
        return sendUserDefined(instance, mode, request.id);
      case 'user_defined (stream)':
        return streamUserDefined(instance, mode, request.id);
      case 'text (stream)':
        return streamText(instance, mode, request.id, MARKDOWN);
      case 'text (stream) with reasoning steps':
        return streamText(
          instance,
          mode,
          request.id,
          MARKDOWN,
          REASONING_STEPS
        );
      case 'code (stream)':
        return streamText(instance, mode, request.id, CODE);
      default:
        return sendResponse(
          instance,
          {
            id: `welcome-${request.id}`,
            request_id: request.id,
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'Welcome to this example of a custom back-end.',
                },
              ],
            },
          },
          mode
        );
    }
  };
}

function maxDeviation(values: number[], from: number) {
  return Math.max(...values.map((value) => Math.abs(value - from)));
}

/** The focused element, through shadow roots. */
function deepActiveElement() {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/** Whether the stop button shows, as the accessibility tree sees it. */
function stopButtonShown() {
  return (
    page.getByRole('button', { name: 'Stop response', exact: true }).query() !==
    null
  );
}

/**
 * Starts a long answer for the reading-position cases: one earlier message,
 * a pending request, and a streaming response whose final write the test
 * controls.
 */
async function startReadingStream(mode: SendMode) {
  chat = await mountScrollChat(() => new Promise<void>(() => {}), {
    config: { messaging: { skipWelcome: true } },
  });
  const { instance, list } = chat;
  await instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: 'Earlier conversation',
        },
      ],
    },
  });
  void instance.messaging.send('Read this answer');
  await expect
    .poll(() => hasText(lastRequest(list), 'Read this answer'))
    .toBe(true);
  const text = Array.from(
    { length: 40 },
    (_, index) =>
      `Reading marker ${index}. This paragraph stays in the same place when the answer completes.`
  ).join('\n\n');
  const item = {
    response_type: MessageResponseTypes.TEXT,
    text,
    streaming_metadata: { id: 'reading-item' },
  } as GenericItem;
  const response = { id: 'reading-response', output: { generic: [item] } };
  let finalWrite = Promise.resolve();
  const stream = {
    beginFinal() {
      finalWrite = stream.write('final', true, true);
    },
    finishFinal: () => finalWrite,
    write: async (
      stage: 'stream' | 'item' | 'final',
      extra: boolean,
      delayed = false
    ) => {
      const generic: GenericItem[] = extra
        ? [
            item,
            ...(delayed
              ? [
                  {
                    response_type: MessageResponseTypes.PAUSE,
                    time: 1500,
                    typing: true,
                  } as GenericItem,
                ]
              : []),
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Final extra item',
            },
          ]
        : [item];
      if (mode === 'upsertMessage') {
        await instance.messaging.upsertMessage(
          response.id,
          stage === 'stream' ? MessageState.STREAMING : MessageState.COMPLETE,
          () => ({ ...response, output: { generic } })
        );
      } else if (stage === 'final') {
        await instance.messaging.addMessageChunk({
          final_response: { ...response, output: { generic } },
        });
      } else {
        await instance.messaging.addMessageChunk({
          streaming_metadata: { response_id: response.id },
          ...(stage === 'item'
            ? { complete_item: item }
            : { partial_item: item }),
        });
      }
    },
  };
  await stream.write('stream', false);
  await expect.poll(() => findText(list, 'Reading marker 39.')).not.toBeNull();
  await document.fonts.ready;
  return stream;
}

/** The deepest element under `root` whose text includes `text`. */
function findText(root: ParentNode, text: string): Element | null {
  const locator = page
    .elementLocator(root as Element)
    .getByText(text, { exact: false });
  return locator.query();
}

function sampleReadingFrames({ list, scroller }: ScrollChat) {
  const frames: { scrollTop: number; spacerHeight: number }[] = [];
  let active = true;
  const sample = () => {
    frames.push({
      scrollTop: scroller.scrollTop,
      spacerHeight: spacer(list).getBoundingClientRect().height,
    });
    if (active) {
      requestAnimationFrame(sample);
    }
  };
  sample();
  return {
    finish: async () => {
      for (let frame = 0; frame < 12; frame++) {
        await nextFrame();
      }
      active = false;
      return frames;
    },
  };
}

/**
 * Waits for a ResizeObserver delivery whose message-row size includes `item`.
 *
 * The chat corrects scrollTop from its own ResizeObserver on message rows, one
 * frame after a row grows. It creates that observer when the message list
 * connects, before this one exists. Observers deliver in creation order within
 * a frame, so the correction for the item's layout has run when this resolves.
 */
function waitForRowLayoutWith(item: Element) {
  return new Promise<void>((resolve, reject) => {
    let row: Element | null | undefined = item;
    while (row && !row.classList.contains('cds-aichat--message')) {
      row =
        (row as HTMLElement).assignedSlot ??
        row.parentElement ??
        ((row.getRootNode() as ShadowRoot).host as Element | undefined);
    }
    if (!row) {
      reject(new Error('The item is not in a message row'));
      return;
    }
    const target = row;
    const observer = new ResizeObserver(([entry]) => {
      const itemBottom =
        item.getBoundingClientRect().bottom -
        target.getBoundingClientRect().top;
      // An entry measured before the item laid out doesn't reach it.
      if (entry.borderBoxSize[0].blockSize >= itemBottom - 1) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(target, { box: 'border-box' });
  });
}

beforeEach(async () => {
  setupBeforeEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
  // The demo's page size, which the fixed chat host fits inside.
  await page.viewport(1280, 720);
});

afterEach(() => {
  chat?.unmount();
  chat = undefined;
  setupAfterEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe.each(SEND_MODES)('auto-scroll resize through %s', (mode) => {
  const mount = async () => {
    chat = await mountScrollChat(responder(mode));
    return chat;
  };

  it('keeps the pin through completed custom content resizes and respects scroll-away', async () => {
    const scrollChat = await mount();
    const { scroller } = scrollChat;
    await sendAndReceive(scrollChat, 'text');
    await sendAndReceive(scrollChat, 'user_defined (stream)');
    await expect
      .poll(() =>
        Boolean(
          Array.from(document.querySelectorAll('.external'))
            .slice(-1)[0]
            ?.checkVisibility()
        )
      )
      .toBe(true);
    const baseline = readGeometry(scrollChat);
    expect(baseline.scrollTop).toBeGreaterThan(100);
    for (const height of [1000, 1000, 0, 300, 1, 900, 20]) {
      const frames = await resizeCustomContent(
        scrollChat,
        height,
        height === 1000
      );
      expect(
        maxDeviation(
          frames.map((frame) => frame.offset),
          baseline.offset
        ),
        JSON.stringify(frames)
      ).toBeLessThanOrEqual(2);
    }
    // A wheel scroll can still be moving when it passes the threshold, since
    // Linux WebKit animates it. Read where the reader stopped once it settles.
    await userEvent.wheel(scroller, { delta: { y: -150 } });
    await expect
      .poll(() => readGeometry(scrollChat).scrollTop)
      .toBeLessThan(baseline.scrollTop - 50);
    await settle(() => scroller.scrollTop);
    const away = readGeometry(scrollChat);
    expect(away.scrollTop).toBeLessThan(baseline.scrollTop - 50);
    for (const height of [1000, 0, 400]) {
      const frames = await resizeCustomContent(
        scrollChat,
        height,
        height === 1000
      );
      expect(
        frames.every((frame) => frame.scrollTop <= away.scrollTop + 2),
        JSON.stringify(frames)
      ).toBe(true);
    }
    await resizeCustomContent(scrollChat, 1400);
    await userEvent.wheel(scroller, { delta: { y: 400 } });
    await expect
      .poll(() => readGeometry(scrollChat).scrollTop)
      .toBeGreaterThan(baseline.scrollTop + 50);
    await settle(() => scroller.scrollTop);
    const belowPin = readGeometry(scrollChat);
    expect(belowPin.scrollTop).toBeGreaterThan(baseline.scrollTop + 50);
    for (const height of [1600, 1200]) {
      const frames = await resizeCustomContent(scrollChat, height);
      expect(
        maxDeviation(
          frames.map((frame) => frame.scrollTop),
          belowPin.scrollTop
        ),
        JSON.stringify(frames)
      ).toBeLessThanOrEqual(2);
    }
  });

  it('keeps the latest request pinned when older custom content resizes', async () => {
    const scrollChat = await mount();
    await sendAndReceive(scrollChat, 'user_defined');
    await sendAndReceive(scrollChat, 'text');
    const baseline = readGeometry(scrollChat);
    for (const height of [350, 50, 800, 0, 300]) {
      const frames = await resizeCustomContent(scrollChat, height);
      expect(
        maxDeviation(
          frames.map((frame) => frame.offset),
          baseline.offset
        ),
        JSON.stringify(frames)
      ).toBeLessThanOrEqual(2);
    }
  });

  it.each([
    'text (stream)',
    'text (stream) with reasoning steps',
    'code (stream)',
  ])('keeps the request pinned for %s', async (response) => {
    const scrollChat = await mount();
    const { list, root } = scrollChat;
    const sending = sendAndReceive(scrollChat, response);
    await expect.poll(() => hasText(lastRequest(list), response)).toBe(true);
    await expect
      .poll(() => readGeometry(scrollChat).scrollTop)
      .toBeGreaterThan(0);
    const baseline = readGeometry(scrollChat);
    const pin = lastRequest(list);
    const offsets: number[] = [];
    let active = true;
    const sample = () => {
      offsets.push(
        pin.getBoundingClientRect().top -
          scrollChat.scroller.getBoundingClientRect().top
      );
      if (active) {
        requestAnimationFrame(sample);
      }
    };
    sample();
    await sending;
    if (response === 'code (stream)') {
      await expect
        .poll(() => deepQuerySelector(root, '.cm-editor'))
        .not.toBeNull();
      await document.fonts.ready;
    }
    if (response.includes('reasoning')) {
      await expect
        .poll(() => deepQuerySelector(root, 'cds-aichat-reasoning-steps'))
        .not.toBeNull();
      const reasoning = deepQuerySelector(root, 'cds-aichat-reasoning-steps');
      for (const open of [true, false, true, false]) {
        await new Promise<void>((resolve) => {
          reasoning.addEventListener(
            'reasoning-animation-end',
            () => resolve(),
            { once: true }
          );
          reasoning.toggleAttribute('open', open);
        });
      }
    }
    active = false;
    expect(maxDeviation(offsets, baseline.offset)).toBeLessThanOrEqual(2);
    expect(
      Math.abs(readGeometry(scrollChat).offset - baseline.offset)
    ).toBeLessThanOrEqual(2);
  });

  describe('reading position', () => {
    it.each([
      [30, false],
      [30, true],
      [200, false],
      [200, true],
    ])(
      'preserves reading position at pin + %ipx on completion (extra item: %s)',
      async (distance, extra) => {
        const stream = await startReadingStream(mode);
        const scrollChat = chat;
        const { list, scroller } = scrollChat;
        await expect
          .poll(() => readGeometry(scrollChat).scrollTop)
          .toBeGreaterThan(0);
        const pin = readGeometry(scrollChat).scrollTop;
        scroller.scrollTop += distance;
        await expect
          .poll(() => readGeometry(scrollChat).scrollTop)
          .toBeGreaterThanOrEqual(pin + distance - 2);
        const marker = findText(list, 'Reading marker 5.');
        const input = await page.getByRole('textbox').element();
        (input as HTMLElement).focus();
        const before = marker.getBoundingClientRect();
        const top = readGeometry(scrollChat).scrollTop;
        const samples = sampleReadingFrames(scrollChat);
        if (extra && mode === 'addMessage') {
          await stream.write('item', false);
        }
        await stream.write('final', extra);
        await expect.poll(() => stopButtonShown()).toBe(false);
        if (extra) {
          await expect
            .poll(() => findText(list, 'Final extra item'))
            .not.toBeNull();
        }
        const frames = await samples.finish();
        expect(
          maxDeviation(
            frames.map((frame) => frame.scrollTop),
            top
          ),
          JSON.stringify(frames)
        ).toBeLessThanOrEqual(2);
        await expect
          .poll(() => Math.abs(readGeometry(scrollChat).scrollTop - top))
          .toBeLessThanOrEqual(2);
        expect(
          Math.abs(
            findText(list, 'Reading marker 5.').getBoundingClientRect().y -
              before.y
          )
        ).toBeLessThanOrEqual(2);
        expect(
          frames.slice(-5).every((frame) => frame.spacerHeight <= 2),
          JSON.stringify(frames)
        ).toBe(true);
        expect(deepActiveElement()).toBe(input);
      }
    );
  });

  it.each(['wheel', 'keyboard'] as const)(
    'respects a newer %s scroll during final rendering',
    async (input) => {
      const stream = await startReadingStream(mode);
      const scrollChat = chat;
      const { list, scroller } = scrollChat;
      const handle = await page
        .elementLocator(list)
        .getByRole('button', { name: 'Select message', exact: true })
        .first()
        .element();
      (handle as HTMLElement).focus();
      const pin = readGeometry(scrollChat).scrollTop;
      scroller.scrollTop += 200;
      await expect
        .poll(() => readGeometry(scrollChat).scrollTop)
        .toBeGreaterThan(pin + 150);
      const samples = sampleReadingFrames(scrollChat);
      stream.beginFinal();
      expect(findText(list, 'Final extra item')).toBeNull();
      if (input === 'wheel') {
        await userEvent.wheel(scroller, { delta: { y: -150 } });
      } else {
        await userEvent.keyboard('{PageUp}');
      }
      await expect
        .poll(() => readGeometry(scrollChat).scrollTop)
        .toBeLessThan(pin + 100);
      await stream.finishFinal();
      // In chunk mode the final write resolves before the pause ends, so wait
      // for the item itself.
      await untilDom(list, () =>
        expect(findText(list, 'Final extra item')).not.toBeNull()
      );
      await waitForRowLayoutWith(findText(list, 'Final extra item'));
      expect(readGeometry(scrollChat).scrollTop).toBeLessThan(pin + 100);
      const latest = readGeometry(scrollChat).scrollTop;
      const frames = await samples.finish();
      expect(
        frames
          .slice(-10)
          .every((frame) => Math.abs(frame.scrollTop - latest) <= 2),
        JSON.stringify(frames)
      ).toBe(true);
      expect(deepActiveElement()).toBe(handle);
    }
  );
});
