/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { page, userEvent } from 'vitest/browser';

import {
  BusEventSend,
  BusEventType,
  MessageSendSource,
  PageObjectId,
} from '../../../aiChatEntry';
import { byRole, byTestId } from '../helpers/contract';
import {
  HOSTS,
  cleanupChat,
  hasFocus,
  isVisible,
  openChat,
} from '../helpers/browserFocus';

afterEach(cleanupChat);

for (const framework of HOSTS) {
  for (const keyboard of [false, true]) {
    it(`${framework} home starters and back navigation with ${keyboard ? 'keyboard' : 'mouse'}`, async () => {
      if (framework === 'web-component') {
        await page.viewport(672, 800);
      }
      const instance = await openChat(
        framework,
        framework === 'react' ? 'ltr' : 'rtl',
        {
          homescreen: {
            isOn: true,
            greeting: 'Choose a topic',
            starters: {
              isOn: true,
              buttons: [{ label: 'Start conversation' }],
            },
          },
        }
      );
      const sends: { text: string; source: MessageSendSource }[] = [];
      instance.on({
        type: BusEventType.SEND,
        handler: (event: BusEventSend) =>
          sends.push({ text: event.data.input.text, source: event.source }),
      });
      const homePanel = () => byTestId(PageObjectId.HOME_SCREEN_PANEL);

      const starter = byRole('button', 'Start conversation');
      if (keyboard) {
        starter.focus();
        await userEvent.keyboard('{Enter}');
      } else {
        await userEvent.click(starter);
      }
      await expect
        .poll(() => sends)
        .toEqual([
          {
            text: 'Start conversation',
            source: MessageSendSource.HOME_SCREEN_STARTER,
          },
        ]);
      await expect.poll(() => isVisible(homePanel())).toBe(false);
      await expect
        .poll(() => hasFocus(byTestId(PageObjectId.INPUT)))
        .toBe(true);

      await userEvent.click(byRole('button', 'Return to the home screen'));
      await expect.poll(() => isVisible(homePanel())).toBe(true);
      const back = byRole('button', 'Return to conversation');
      if (keyboard) {
        back.focus();
        await userEvent.keyboard('[Space]');
      } else {
        await userEvent.click(back);
      }
      await expect.poll(() => isVisible(homePanel())).toBe(false);
      // The return button leaves with the home screen; focus moves to the input.
      await expect
        .poll(() => hasFocus(byTestId(PageObjectId.INPUT)))
        .toBe(true);
      expect(sends).toHaveLength(1);
    });
  }
}
