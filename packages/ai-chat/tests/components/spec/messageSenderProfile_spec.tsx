/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { act, fireEvent, waitFor } from '@testing-library/react';
import {
  createBaseConfig,
  getChatShadowRoot,
  renderChatAndGetInstance,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';
import {
  MessageRequest,
  MessageResponseTypes,
  RequestUserProfile,
  UserType,
} from '../../../src/types/messaging/Messages';

const profile: RequestUserProfile = {
  id: 'jane',
  nickname: '  Jane Doe  ',
  profile_picture_url: 'https://example.com/jane.png',
};

function request(id: string, userProfile?: RequestUserProfile): MessageRequest {
  return {
    id,
    input: { text: `Message from ${id}` },
    history: { user_profile: userProfile },
  };
}

async function insertRequest(instance: ChatInstance, message: MessageRequest) {
  await instance.messaging.insertHistory([
    { message, time: '2024-01-01T12:00:00.000Z' },
  ]);
}

function messages() {
  return Array.from(
    getChatShadowRoot().querySelectorAll<HTMLElement>(
      '.cds-aichat--message--request'
    )
  );
}

function label(message: HTMLElement) {
  return message.querySelector('.cds-aichat--message__label').textContent;
}

describe('request sender attribution', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('uses trimmed names, timestamps, and translated hidden and focused attribution', async () => {
    const instance = await renderChatAndGetInstance({
      ...createBaseConfig(),
      strings: {
        message_labelUser: 'Sender {actorName} at {timestamp}',
        messages_userSaid: '{actorName} wrote',
        message_labelYou: 'Viewer at {timestamp}',
        messages_youSaid: 'Viewer wrote',
      },
    });
    await act(async () => {
      await instance.messaging.insertHistory([
        { message: request('viewer'), time: '2024-01-01T12:00:00.000Z' },
        { message: request('jane', profile), time: '2024-01-01T12:01:00.000Z' },
        { message: request('viewer-again'), time: '2024-01-01T12:02:00.000Z' },
      ]);
    });

    const [viewer, jane, viewerAgain] = messages();
    expect(jane).toHaveClass('cds-aichat--message--named-request');
    expect(viewer).not.toHaveClass('cds-aichat--message--named-request');
    expect(viewerAgain).not.toHaveClass('cds-aichat--message--named-request');
    expect(label(viewerAgain)).toMatch(/^Viewer at .+/);
    expect(label(viewer)).toMatch(/^Viewer at .+/);
    expect(label(jane)).toMatch(/^Sender Jane Doe at .+/);
    expect(jane.textContent).toContain('Jane Doe wrote');
    expect(viewer.textContent).toContain('Viewer wrote');
    await waitFor(() => {
      expect(
        jane.querySelector('cds-aichat-markdown')?.shadowRoot?.textContent
      ).toContain('Message from jane');
    });
    const viewerHandle = viewer.querySelector('[role="button"]');
    const janeHandle = jane.querySelector('[role="button"]');
    fireEvent.keyDown(viewerHandle, { key: 'ArrowDown' });
    expect(janeHandle.getAttribute('aria-label')).toContain('Jane Doe wrote');
    expect(janeHandle.getAttribute('aria-label')).toContain(
      'Message from jane'
    );
    fireEvent.keyDown(janeHandle, { key: 'ArrowUp' });
    expect(viewerHandle.getAttribute('aria-label')).toContain('Viewer wrote');
  });

  it.each([undefined, null, '', '   ', 42])(
    'retains You and suppresses pictures for unusable nickname %p',
    async (nickname) => {
      const instance = await renderChatAndGetInstance(createBaseConfig());
      const userProfile =
        nickname === undefined
          ? undefined
          : ({ ...profile, nickname } as unknown as RequestUserProfile);
      await act(async () => {
        await insertRequest(instance, request('fallback', userProfile));
      });
      const [message] = messages();
      expect(label(message)).toMatch(/^You /);
      expect(message).not.toHaveClass('cds-aichat--message--named-request');
      expect(message.textContent).toContain('You said');
      expect(message.querySelector('img')).toBeNull();
    }
  );

  it('retains You for a null profile', async () => {
    const instance = await renderChatAndGetInstance(createBaseConfig());
    await act(async () => {
      await insertRequest(instance, request('null-profile', null));
    });
    expect(label(messages()[0])).toMatch(/^You /);
    expect(messages()[0]).not.toHaveClass('cds-aichat--message--named-request');
    expect(messages()[0].textContent).toContain('You said');
    expect(messages()[0].querySelector('img')).toBeNull();
  });

  it('renders nickname markup as literal text', async () => {
    const instance = await renderChatAndGetInstance(createBaseConfig());
    await act(async () => {
      await insertRequest(
        instance,
        request('markup', {
          id: 'markup',
          nickname: '<b>Jane</b>',
        })
      );
    });
    expect(label(messages()[0])).toContain('<b>Jane</b>');
    expect(
      messages()[0].querySelector('.cds-aichat--message__label b')
    ).toBeNull();
  });

  it('renders a decorative picture and removes a failed image without losing attribution', async () => {
    const instance = await renderChatAndGetInstance(createBaseConfig());
    await act(async () => {
      await insertRequest(instance, request('picture', profile));
    });
    const [message] = messages();
    const image = message.querySelector('img');
    expect(image.getAttribute('src')).toBe(profile.profile_picture_url);
    expect(image.getAttribute('alt')).toBe('');
    fireEvent.error(image);
    expect(message.querySelector('img')).toBeNull();
    expect(label(message)).toMatch(/^Jane Doe /);
  });

  it.each([true, false])(
    'keeps the name with hideAvatar=%p and no picture URL',
    async (hideAvatar) => {
      const instance = await renderChatAndGetInstance({
        ...createBaseConfig(),
        hideAvatar,
      });
      await act(async () => {
        await insertRequest(
          instance,
          request('no-picture', {
            id: 'jane',
            nickname: 'Jane Doe',
          })
        );
        if (hideAvatar) {
          await insertRequest(instance, request('hidden-picture', profile));
        }
      });
      for (const message of messages()) {
        expect(label(message)).toMatch(/^Jane Doe /);
        expect(message.querySelector('img')).toBeNull();
      }
    }
  );

  it('preserves assistant and human-agent attribution', async () => {
    const instance = await renderChatAndGetInstance({
      ...createBaseConfig(),
      assistantName: 'Test assistant',
      strings: { message_labelAssistant: 'From {actorName} at {timestamp}' },
    });
    await act(async () => {
      await instance.messaging.addMessage({
        id: 'assistant',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Assistant reply',
            },
          ],
        },
      });
      await instance.messaging.addMessage({
        id: 'human',
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'Human reply' },
          ],
        },
        message_options: {
          response_user_profile: {
            user_type: UserType.HUMAN,
            nickname: 'Support agent',
            id: 'support',
          },
        },
      });
    });
    const root = getChatShadowRoot();
    expect(root.textContent).toContain('Support agent');
    expect(root.textContent).toContain('Test assistant said');
    const responseLabels = Array.from(
      root.querySelectorAll(
        '.cds-aichat--message--response .cds-aichat--message__label'
      )
    ).map((element) => element.textContent);
    expect(responseLabels).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^From Test assistant at /),
        expect.stringMatching(/^From Support agent at /),
      ])
    );
  });
});
