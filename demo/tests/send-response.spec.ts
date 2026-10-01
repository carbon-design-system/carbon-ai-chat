/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import {
  type BusEventType,
  MessageState,
  PageObjectId,
} from '@carbon/ai-chat/server';
import type { Page } from '@playwright/test';

import {
  isPreReleaseDemo,
  usesUpsertMessage,
} from '../src/customSendMessage/sendResponse';
import { test, expect } from './fixtures';
import { destroyChatSession, openChatWindow, sendChatMessage } from './utils';

// Import types for window.chatInstance without emitting runtime code
import type {} from '../types/window';

const toLocation = (href: string) => {
  const { hostname, pathname, search } = new URL(href);
  return { hostname, pathname, search };
};

const DEMO_HOST = 'https://chat.carbondesignsystem.com';

// [url, isPreReleaseDemo, usesUpsertMessage]
const MODE_CASES: [string, boolean, boolean][] = [
  ['http://localhost:3000/', true, false],
  [`${DEMO_HOST}/tag/next/demo/index.html`, true, false],
  [`${DEMO_HOST}/tag/alpha/demo/index.html`, true, false],
  [`${DEMO_HOST}/tag/latest/demo/index.html`, false, false],
  [`${DEMO_HOST}/version/v1.19.0/demo/index.html`, false, false],
  // The flag is ignored outside pre-release builds.
  [`${DEMO_HOST}/tag/latest/demo/index.html?useUpsertMessage`, false, false],
  [
    `${DEMO_HOST}/version/v1.19.0/demo/index.html?useUpsertMessage`,
    false,
    false,
  ],
  ['http://localhost:3000/?useUpsertMessage', true, true],
  ['http://127.0.0.1:3001/?settings=%7B%7D&useUpsertMessage=', true, true],
  ['http://[::1]:3000/?useUpsertMessage', true, true],
  [`${DEMO_HOST}/tag/next/demo/index.html?useUpsertMessage`, true, true],
  [`${DEMO_HOST}/tag/nextgen/demo/index.html?useUpsertMessage`, false, false],
];

test.describe('demo send mode', () => {
  for (const [href, preRelease, upsertMode] of MODE_CASES) {
    test(`resolves the mode for ${href}`, () => {
      expect(isPreReleaseDemo(toLocation(href))).toBe(preRelease);
      expect(usesUpsertMessage(toLocation(href))).toBe(upsertMode);
    });
  }
});

type MessagingMethod = 'addMessage' | 'addMessageChunk' | 'upsertMessage';

/**
 * Wraps the instance's write methods so the test sees which one the mock
 * backend called. With `holdFinal`, the call that ends a stream waits until
 * the returned `releaseFinal` runs, which keeps the message streaming while
 * the test looks at it.
 */
const spyOnMessaging = async (page: Page, { holdFinal = false } = {}) => {
  const calls: MessagingMethod[] = [];
  let release: () => void = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let finalReached: () => void = () => {};
  const finalHeld = new Promise<void>((resolve) => {
    finalReached = resolve;
  });

  await page.exposeFunction('recordMessagingCall', (name: MessagingMethod) => {
    calls.push(name);
  });
  await page.exposeFunction('waitForFinalRelease', () => {
    finalReached();
    return released;
  });

  await page.evaluate(
    ({ hold, completeState }) => {
      const spyWindow = window as typeof window & {
        recordMessagingCall: (name: string) => void;
        waitForFinalRelease: () => Promise<void>;
      };
      const messaging = window.chatInstance!.messaging;
      const { addMessage, addMessageChunk, upsertMessage } = messaging;

      messaging.addMessage = (message) => {
        spyWindow.recordMessagingCall('addMessage');
        return addMessage(message);
      };
      messaging.addMessageChunk = async (chunk) => {
        spyWindow.recordMessagingCall('addMessageChunk');
        if (hold && 'final_response' in chunk) {
          await spyWindow.waitForFinalRelease();
        }
        return addMessageChunk(chunk);
      };
      messaging.upsertMessage = async (messageID, state, updater) => {
        spyWindow.recordMessagingCall('upsertMessage');
        if (hold && state === completeState) {
          await spyWindow.waitForFinalRelease();
        }
        return upsertMessage(messageID, state, updater);
      };
    },
    { hold: holdFinal, completeState: MessageState.COMPLETE }
  );

  return { calls, finalHeld, releaseFinal: release };
};

const openDemoChat = async (page: Page) => {
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());
  await page.goto('/?settings=%7B%22layout%22%3A%22float%22%7D');
  await openChatWindow(page);
  await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();
};

test.describe('demo send mode in the chat', () => {
  test.afterEach(async ({ page }) => {
    await destroyChatSession(page);
  });

  test('text (stream) goes through the API the mode selects', async ({
    page,
    useAddMessage,
  }) => {
    test.slow();
    await openDemoChat(page);
    const { calls } = await spyOnMessaging(page);

    await sendChatMessage(page, 'text (stream)');

    if (useAddMessage) {
      // chromium-add-message project: ?useUpsertMessage is set.
      expect(calls).toContain('upsertMessage');
      expect(calls).not.toContain('addMessageChunk');
    } else {
      expect(calls).toContain('addMessageChunk');
      expect(calls).not.toContain('upsertMessage');
    }
    expect(calls).not.toContain('addMessage');
  });

  test('card (stream) renders mid-stream before the final response', async ({
    page,
    useAddMessage,
  }, testInfo) => {
    test.skip(
      !useAddMessage,
      'card (stream) only exists in the response map when ?useUpsertMessage is set.'
    );
    test.skip(
      testInfo.project.name !== 'chromium-add-message',
      'The chromium-add-message project owns this case.'
    );
    test.slow();
    await openDemoChat(page);
    const { calls, finalHeld, releaseFinal } = await spyOnMessaging(page, {
      holdFinal: true,
    });

    const received = page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          window.chatInstance!.once({
            type: 'receive' as BusEventType,
            handler: () => resolve(),
          });
        })
    );
    await page.evaluate(() => {
      void window.chatInstance!.send('card (stream)');
    });

    await finalHeld;
    const cardBody = page.getByText('This card arrived as a complete item');
    const cardFooter = page.getByText('View Carbon Docs');
    // upsertMessage renders the card mid-stream, before final_response.
    await expect(cardBody).toBeVisible();
    await expect(cardFooter).toBeVisible();

    releaseFinal();
    await received;
    await expect(cardBody).toBeVisible();
    await expect(cardFooter).toBeVisible();
    expect(calls).toContain('upsertMessage');
  });
});

test.describe('demo send mode toggle', () => {
  test('sets and clears useUpsertMessage, reloading each time', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'The default Chromium project owns the toggle case.'
    );
    test.slow();
    await page.route(/.*ibm-common\.js$/, (route) => route.abort());
    await page.goto('/');

    const toggle = page.getByRole('checkbox', { name: 'Use upsertMessage' });
    await page.getByRole('button', { name: 'Chat Configuration' }).click();
    await expect(toggle).not.toBeChecked();

    await page.getByText('Use upsertMessage').click();
    await page.waitForURL((url) => url.searchParams.has('useUpsertMessage'));
    await expect(toggle).toBeChecked();

    await page.getByText('Use upsertMessage').click();
    await page.waitForURL((url) => !url.searchParams.has('useUpsertMessage'));
    await expect(toggle).not.toBeChecked();
  });
});
