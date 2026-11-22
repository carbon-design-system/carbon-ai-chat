/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Real chat-host message geometry and painted theme transitions in the demo. */
import {
  ButtonItemType,
  CarbonTheme,
  MessageResponseTypes,
  PageObjectId,
} from '@carbon/ai-chat/server';
import type {
  ChatInstance,
  MessageResponse,
  PublicConfig,
} from '@carbon/ai-chat';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { prepareDemoPage } from './utils';
import type {} from '../types/window';

type GeometryWindow = Window & {
  hostCompatibility?: { reactInstance?: ChatInstance };
};

const THEME_ACTION = 'Inspect the host theme';
const FIRST_COLOR = 'rgb(18, 52, 86)';
const SECOND_COLOR = 'rgb(101, 67, 33)';

test.use({ viewport: { width: 1280, height: 900 } });

test.beforeEach(async ({ page, baseURL }) => {
  if (!baseURL) {
    throw new Error(
      'The demo browser fixture requires its configured baseURL.'
    );
  }
  const origin = new URL(baseURL).origin;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort()
  );
});

test.afterEach(async ({ page }) => {
  try {
    await page.evaluate(async () => {
      const geometry = (window as GeometryWindow).hostCompatibility
        ?.reactInstance;
      const instances = [window.chatInstance, geometry].filter(
        (instance): instance is ChatInstance => Boolean(instance)
      );
      for (const instance of new Set(instances)) {
        await instance.destroySession();
      }
    });
  } finally {
    // Unload the owned React document after its public session has ended.
    await page.goto('about:blank');
  }
});

async function openGeometryHost(page: Page): Promise<void> {
  const layout = encodeURIComponent(
    JSON.stringify({ customProperties: { width: '600px' } })
  );
  await page.goto(
    `/host-compatibility.html?surface=react-container&layout=${layout}`
  );
  await page.waitForFunction(
    () =>
      (window as GeometryWindow).hostCompatibility?.reactInstance?.state.get()
        .status === 'ready'
  );
  await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();
  // Size only the content supplied by this host, through ordinary page CSS.
  await page.addStyleTag({
    content:
      '.page-styled[data-kind="user-defined-response"] { display: block; width: 100%; min-width: 0; }',
  });
  await page.evaluate(async () => {
    const instance = (window as GeometryWindow).hostCompatibility
      ?.reactInstance;
    if (!instance) {
      throw new Error('The owned geometry host has not mounted.');
    }
    await instance.messaging.clearConversation();
  });
}

async function writeGeometry(
  page: Page,
  response: MessageResponse
): Promise<void> {
  await page.evaluate(async (message) => {
    const instance = (window as GeometryWindow).hostCompatibility
      ?.reactInstance;
    if (!instance) {
      throw new Error('The owned geometry host has not mounted.');
    }
    await instance.messaging.addMessage(message);
  }, response);
}

async function measuredBox(locator: Locator) {
  let box:
    | {
        left: number;
        right: number;
        top: number;
        width: number;
        height: number;
      }
    | undefined;
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => {
      const sample = await locator.evaluate(async (element) => {
        await document.fonts.ready;
        const capture = () => {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          };
        };
        const before = capture();
        for (let frame = 0; frame < 2; frame++) {
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve())
          );
        }
        return { before, after: capture() };
      });
      const stable =
        sample.after.width > 0 &&
        sample.after.height > 0 &&
        (['left', 'right', 'top', 'width', 'height'] as const).every(
          (key) => Math.abs(sample.after[key] - sample.before[key]) < 0.5
        );
      if (stable) {
        box = sample.after;
      }
      return stable;
    })
    .toBe(true);
  if (!box) {
    throw new Error('The public surface did not settle to a real rectangle.');
  }
  return box;
}

async function configureTheme(
  page: Page,
  config: PublicConfig,
  inherit = false
): Promise<void> {
  await page.evaluate(
    async ({ next, inheritTheme }) => {
      const config = {
        ...next,
        aiEnabled: false,
        messaging: { skipWelcome: true, customSendMessage: () => undefined },
      };
      // Preserve the held regression's explicit null at the public JS config boundary.
      if (inheritTheme) {
        Object.assign(config, { injectCarbonTheme: null });
      }
      if (!window.setChatConfig) {
        throw new Error('The demo config control has not loaded.');
      }
      await window.setChatConfig(config);
    },
    { next: config, inheritTheme: inherit }
  );
  await page.waitForFunction(
    () => window.chatInstance?.state.get().status === 'ready'
  );
  await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();
}

async function themeAction(page: Page): Promise<Locator> {
  const response: MessageResponse = {
    id: 'host-theme-action',
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.BUTTON,
          button_type: ButtonItemType.URL,
          label: THEME_ACTION,
          url: `${new URL(page.url()).origin}/owned-theme-action`,
        },
      ],
    },
  };
  await page.evaluate(async (message) => {
    const instance = window.chatInstance;
    if (!instance) {
      throw new Error('The owned theme host has not mounted.');
    }
    await instance.messaging.addMessage(message);
  }, response);
  const action = page.getByRole('button', { name: THEME_ACTION });
  await expect(action).toBeVisible();
  await expect
    .poll(() => paintedBackground(action))
    .not.toBe('rgba(0, 0, 0, 0)');
  return action;
}

function paintedBackground(locator: Locator): Promise<string> {
  return locator.evaluate(
    (element) => getComputedStyle(element).backgroundColor
  );
}

async function hostColors(
  page: Page,
  background: string,
  button: string
): Promise<void> {
  await page.evaluate(
    ({ background, button }) => {
      document.documentElement.style.setProperty(
        '--cds-background',
        background
      );
      document.documentElement.style.setProperty(
        '--cds-button-primary',
        button
      );
    },
    { background, button }
  );
}

test('a long iframe preview URL stays as contained as a short preview', async ({
  page,
}) => {
  await openGeometryHost(page);
  const origin = new URL(page.url()).origin;
  await writeGeometry(page, {
    id: 'host-frame-contrast',
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.IFRAME,
          title: 'Layout short frame',
          source: `${origin}/owned-frame`,
        },
        {
          response_type: MessageResponseTypes.IFRAME,
          title: 'Layout long frame',
          source: `${origin}/${'unbroken'.repeat(160)}`,
        },
      ],
    },
  });
  const short = await measuredBox(
    page.getByRole('button', { name: /Layout short frame/ })
  );
  const long = await measuredBox(
    page.getByRole('button', { name: /Layout long frame/ })
  );
  const panel = await measuredBox(page.getByTestId(PageObjectId.MAIN_PANEL));
  expect(Math.abs(long.width - short.width)).toBeLessThanOrEqual(1);
  expect(long.left).toBeGreaterThanOrEqual(panel.left - 1);
  expect(long.right).toBeLessThanOrEqual(panel.right + 1);
  expect(
    await page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .evaluate((element) => element.scrollWidth <= element.clientWidth + 1)
  ).toBe(true);
});

test('a configured Carbon token override paints the action while its theme stays forced', async ({
  page,
}) => {
  await prepareDemoPage(page, {
    setChatConfig: true,
    settings: { framework: 'react', layout: 'float' },
  });
  await hostColors(page, '#ffffff', '#654321');
  await page.evaluate(() =>
    document.documentElement.style.setProperty('--cds-text-primary', '#765432')
  );
  const config: PublicConfig = {
    namespace: 'host-forced-override',
    openChatByDefault: true,
    injectCarbonTheme: CarbonTheme.G100,
    layout: { customProperties: { width: '600px' } },
  };
  await configureTheme(page, config);
  const action = await themeAction(page);
  const text = 'Forced theme foreground witness';
  const response: MessageResponse = {
    id: 'host-forced-text',
    output: { generic: [{ response_type: MessageResponseTypes.TEXT, text }] },
  };
  await page.evaluate(async (message) => {
    await window.chatInstance.messaging.addMessage(message);
  }, response);
  const foreground = page
    .getByTestId(PageObjectId.MAIN_PANEL)
    .getByText(text, { exact: true });
  await expect(foreground).toBeVisible();
  const original = await page.evaluateHandle(() => window.chatInstance);
  try {
    const before = await paintedBackground(action);
    const forcedText = await foreground.evaluate(
      (element) => getComputedStyle(element).color
    );
    expect(forcedText).not.toBe('rgb(118, 84, 50)');
    expect(forcedText).not.toBe('rgba(0, 0, 0, 0)');
    expect(before).not.toBe(SECOND_COLOR);
    expect(before).not.toBe(FIRST_COLOR);
    await configureTheme(page, {
      ...config,
      layout: {
        customProperties: { width: '600px', '$button-primary': '#123456' },
      },
    });
    await expect.poll(() => paintedBackground(action)).toBe(FIRST_COLOR);
    await expect
      .poll(() =>
        foreground.evaluate((element) => getComputedStyle(element).color)
      )
      .toBe(forcedText);
    expect(
      await page.evaluate(
        (instance) => window.chatInstance === instance,
        original
      )
    ).toBe(true);
    expect(await paintedBackground(action)).not.toBe(before);
  } finally {
    await original.dispose();
  }
});

test('an explicit-to-null update inherits two host colors on the same chat', async ({
  page,
}) => {
  await prepareDemoPage(page, {
    setChatConfig: true,
    settings: { framework: 'react', layout: 'float' },
  });
  await hostColors(page, '#ffffff', '#123456');
  const config: PublicConfig = {
    namespace: 'host-theme-inherit',
    openChatByDefault: true,
    injectCarbonTheme: CarbonTheme.G90,
    layout: { customProperties: { width: '600px' } },
  };
  await configureTheme(page, config);
  const action = await themeAction(page);
  const original = await page.evaluateHandle(() => window.chatInstance);
  try {
    expect(await paintedBackground(action)).not.toBe(FIRST_COLOR);
    await configureTheme(page, config, true);
    await expect.poll(() => paintedBackground(action)).toBe(FIRST_COLOR);
    expect(
      await page.evaluate(
        (instance) => window.chatInstance === instance,
        original
      )
    ).toBe(true);
    await hostColors(page, '#161616', '#654321');
    await expect.poll(() => paintedBackground(action)).toBe(SECOND_COLOR);
    await configureTheme(page, {
      header: { title: 'Inherited theme remains live' },
    });
    await expect(
      page
        .getByTestId(PageObjectId.CHAT_HEADER)
        .getByTestId(PageObjectId.HEADER_TITLE)
    ).toHaveText('Inherited theme remains live');
    await expect.poll(() => paintedBackground(action)).toBe(SECOND_COLOR);
    expect(
      await page.evaluate(
        (instance) => window.chatInstance === instance,
        original
      )
    ).toBe(true);
  } finally {
    await original.dispose();
  }
});
