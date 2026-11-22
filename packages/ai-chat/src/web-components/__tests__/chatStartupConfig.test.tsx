/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Config changes reach a running chat through `cds-aichat-container`, the same
 * way from both host surfaces, without restarting it. A change made
 * while `onBeforeRender` is still pending waits for the gate and then applies
 * to the original instance. A change with no new content leaves the store
 * untouched, and no change drops the conversation.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import frLocaleData from 'dayjs/locale/fr.js';

import '../cds-aichat-container';
import { ChatContainer } from '../../react/ChatContainer';
import { resolvablePromise } from '../../sdk/utils/resolvablePromise';
import { localeLoaders } from '../../sdk/utils/languageUtils';
import actions from '../../sdk/store/actions';
import { useIntl } from '../../chat/hooks/useIntl';
import { ChatInstance } from '../../types/instance/ChatInstance';
import { PublicConfig } from '../../types/config/PublicConfig';
import {
  addUserDefinedResponse,
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';
import { chatStore } from '../../chat/services/attachChatView';

type ContainerElement = HTMLElement & {
  config: PublicConfig;
  markdown?: PublicConfig['markdown'];
  onBeforeRender: (instance: ChatInstance) => Promise<void> | void;
  onAfterRender: (instance: ChatInstance) => void;
  updateComplete: Promise<boolean>;
};

function storeOf(instance: ChatInstance) {
  return chatStore(instance.serviceManager);
}

interface Surface {
  name: string;
  /** Boots the chat and returns a function that sets config fields on it. */
  boot: (
    onBeforeRender: (instance: ChatInstance) => Promise<void> | void,
    onAfterRender: (instance: ChatInstance) => void,
    initial?: PublicConfig
  ) => (fields: Partial<PublicConfig>) => Promise<void>;
}

const base = createBaseConfig();

const reactSurface: Surface = {
  name: 'React ChatContainer',
  boot: (onBeforeRender, onAfterRender, initial = base) => {
    let fields: Partial<PublicConfig> = {};
    const view = render(
      <ChatContainer
        {...initial}
        onBeforeRender={onBeforeRender}
        onAfterRender={onAfterRender}
      />
    );
    return async (next) => {
      fields = { ...fields, ...next };
      view.rerender(
        <ChatContainer
          {...initial}
          {...fields}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
        />
      );
    };
  },
};

const webComponentSurface: Surface = {
  name: 'cds-aichat-container',
  boot: (onBeforeRender, onAfterRender, initial = base) => {
    const element = document.createElement(
      'cds-aichat-container'
    ) as ContainerElement;
    element.config = initial;
    element.onBeforeRender = onBeforeRender;
    element.onAfterRender = onAfterRender;
    document.body.appendChild(element);
    return async (next) => {
      Object.assign(element, next);
      await element.updateComplete;
    };
  },
};

describe.each([reactSurface, webComponentSurface])(
  'config updates through $name',
  (surface) => {
    beforeEach(setupBeforeEach);
    afterEach(setupAfterEach);

    it('applies changes made during onBeforeRender to the original instance once the gate opens', async () => {
      const gate = resolvablePromise();
      const onBeforeRender = vi.fn((_instance: ChatInstance) => gate);
      const onAfterRender = vi.fn();
      const set = surface.boot(onBeforeRender, onAfterRender);
      await waitFor(() => expect(onBeforeRender).toHaveBeenCalled(), {
        timeout: 5000,
      });
      const instance: ChatInstance = onBeforeRender.mock.calls[0][0];

      await set({ assistantName: 'First' });
      await set({ assistantName: 'Second', isReadonly: true });
      expect(storeOf(instance).getState().config.public.assistantName).toBe(
        'watsonx'
      );

      gate.doResolve();
      await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
        timeout: 5000,
      });
      await waitFor(() =>
        expect(storeOf(instance).getState().config.public.assistantName).toBe(
          'Second'
        )
      );
      expect(storeOf(instance).getState().config.public.isReadonly).toBe(true);
      expect(onBeforeRender).toHaveBeenCalledTimes(1);
    });
  }
);

// The remaining cases exercise one code path in `cds-aichat-container`; only
// how config reaches the element differs between surfaces, which the case
// above covers.
describe('config updates after startup', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('shows a new locale once its data loads, with no other update', async () => {
    const localeGate = resolvablePromise<ILocale>();
    const loadFrench = vi
      .spyOn(localeLoaders, 'fr')
      .mockReturnValueOnce(localeGate);
    function LocaleProbe() {
      return <span data-testid="locale">{useIntl().locale}</span>;
    }
    const renderUserDefinedResponse = () => <LocaleProbe />;
    let instance: ChatInstance;
    const onAfterRender = vi.fn();
    const chat = (locale: string) => (
      <ChatContainer
        {...base}
        locale={locale}
        onBeforeRender={(next) => {
          instance = next;
        }}
        onAfterRender={onAfterRender}
        renderUserDefinedResponse={renderUserDefinedResponse}
      />
    );

    try {
      const view = render(chat('en'));
      await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
        timeout: 5000,
      });
      await addUserDefinedResponse(instance, 'locale-probe');
      const probe = await screen.findByTestId('locale');
      expect(probe).toHaveTextContent('en');

      view.rerender(chat('fr'));
      await waitFor(() => expect(loadFrench).toHaveBeenCalled());
      expect(probe).toHaveTextContent('en');

      // Only the load finishing may change the view: the store records the
      // loaded locale and nothing else is sent.
      const dispatch = vi.spyOn(storeOf(instance), 'dispatch');
      await act(async () => {
        localeGate.doResolve(frLocaleData);
        await localeGate;
      });

      await waitFor(() => expect(probe).toHaveTextContent('fr'));
      expect(dispatch.mock.calls).toEqual([
        [actions.setAppStateValue('loadedLocale', 'fr')],
      ]);
    } finally {
      dayjs.locale('en');
    }
  });
});
