/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import { ChatContainer } from '../../../src/react/ChatContainer';
import '../../../src/web-components/cds-aichat-container';
import { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { WriteableElementName } from '../../../src/types/instance/WriteableElements';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import actions from '../../../src/chat/store/actions';
import {
  createBaseTestProps,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const customSlot = WriteableElementName.CUSTOM_PROMPT_LINE;
const query = (selector: string) => deepQuerySelector(document, selector);
const outlet = (name: WriteableElementName) => {
  const root = query('cds-aichat-react, cds-aichat-internal')?.shadowRoot;
  return root ? deepQuerySelector(root, `slot[name="${name}"]`) : null;
};
const prompt = () => query('cds-aichat-prompt-line');

type TestInstance = ChatInstance & { serviceManager: ServiceManager };

function manager(instance: TestInstance): ServiceManager {
  return (
    instance.serviceManager.actions as unknown as {
      serviceManager: ServiceManager;
    }
  ).serviceManager;
}

async function boot(
  host: string,
  content: React.ReactNode = <input aria-label="Custom message" />,
  config: Partial<ChatContainerProps> = {}
) {
  let instance: TestInstance;
  const onAfterRender = jest.fn();
  const props = {
    ...createBaseTestProps(),
    ...config,
    onAfterRender,
    onBeforeRender: (value: TestInstance) => {
      instance = value;
      if (host === 'web component' && content !== null) {
        const input = document.createElement('input');
        input.setAttribute('aria-label', 'Custom message');
        instance.writeableElements[customSlot].append(input);
      }
    },
  };
  if (host === 'React') {
    render(
      <ChatContainer
        {...props}
        renderWriteableElements={{ [customSlot]: content }}
      />
    );
  } else {
    const element = document.createElement('cds-aichat-container');
    Object.assign(element, {
      config: props,
      onBeforeRender: props.onBeforeRender,
      onAfterRender,
    });
    await act(async () => {
      document.body.append(element);
    });
  }
  await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
    timeout: 8000,
  });
  return { instance, onAfterRender };
}

describe.each(['React', 'web component'])(
  'custom prompt line on %s',
  (host) => {
    beforeEach(setupBeforeEach);
    afterEach(setupAfterEach);

    it.each([true, false])(
      'replaces the built-in composer (home: %s)',
      async (home) => {
        const { instance, onAfterRender } = await boot(host, undefined, {
          homescreen: { isOn: home },
        });
        await act(async () => {
          manager(instance).store.dispatch(actions.setHomeScreenIsOpen(home));
        });
        await waitFor(() => {
          expect(outlet(customSlot)).not.toBeNull();
          expect(prompt()).toBeNull();
          expect(
            instance.writeableElements[customSlot].querySelector('input')
          ).not.toBeNull();
          expect(manager(instance).inputComponent).toBeFalsy();
          expect(manager(instance).getInputFunctionsRef()).toBeNull();
        });
        await act(async () => {
          await instance.messaging.addMessage({
            id: 'custom-composer-response',
            output: { generic: [] },
          });
        });
        expect(onAfterRender).toHaveBeenCalledTimes(1);
      }
    );

    it('keeps fallback for null content, whitespace, and comments and tracks text edits', async () => {
      const { instance } = await boot(host, null);
      await waitFor(() => expect(prompt()).not.toBeNull());
      const wrapper = instance.writeableElements[customSlot];
      const text = document.createTextNode('   ');
      await act(async () => {
        wrapper.append(text, document.createComment('empty'));
      });
      expect(prompt()).not.toBeNull();
      await act(async () => {
        text.data = 'Host text composer';
      });
      await waitFor(() => expect(prompt()).toBeNull());
      await act(async () => {
        text.data = '  ';
      });
      await waitFor(() => expect(prompt()).not.toBeNull());
      await act(async () => {
        wrapper.append(document.createElement('input'));
      });
      await waitFor(() => expect(prompt()).toBeNull());
      await act(async () => {
        wrapper.replaceChildren();
      });
      await waitFor(() => {
        expect(prompt()).not.toBeNull();
        expect(manager(instance).inputComponent).not.toBeNull();
        expect(manager(instance).getInputFunctionsRef()).not.toBeNull();
      });
    });

    it('honors visibility overrides while preserving hidden host content', async () => {
      const { instance } = await boot(host, undefined, {
        input: { isVisible: false },
      });
      const wrapper = instance.writeableElements[customSlot];
      const input = wrapper.querySelector('input');
      expect(outlet(customSlot)).toBeNull();
      expect(prompt()).toBeNull();
      await act(async () => {
        instance.updateInputFieldVisibility(true);
      });
      await waitFor(() => expect(outlet(customSlot)).not.toBeNull());
      expect(wrapper.querySelector('input')).toBe(input);
      await act(async () => {
        instance.updateInputFieldVisibility(false);
      });
      await waitFor(() => expect(outlet(customSlot)).toBeNull());
      expect(wrapper.querySelector('input')).toBe(input);
      expect(manager(instance).getInputFunctionsRef()).toBeNull();
    });

    it('uses the active human-agent visibility override above the config baseline', async () => {
      const { instance } = await boot(host, undefined, {
        input: { isVisible: false },
      });
      const wrapper = instance.writeableElements[customSlot];
      const input = wrapper.querySelector('input');
      await act(async () => {
        instance.updateInputFieldVisibility(true);
      });
      await waitFor(() => expect(outlet(customSlot)).not.toBeNull());
      await act(async () => {
        manager(instance).store.dispatch(
          actions.changeState({
            persistedToBrowserStorage: {
              humanAgentState: { isConnected: true },
            },
          })
        );
      });
      await waitFor(() => expect(outlet(customSlot)).toBeNull());
      expect(prompt()).toBeNull();
      await act(async () => {
        manager(instance).store.dispatch(
          actions.updateInputState({ fieldVisible: true }, true)
        );
      });
      await waitFor(() => expect(outlet(customSlot)).not.toBeNull());
      await act(async () => {
        manager(instance).store.dispatch(
          actions.updateInputState({ fieldVisible: false }, true)
        );
      });
      await waitFor(() => expect(outlet(customSlot)).toBeNull());
      expect(wrapper.querySelector('input')).toBe(input);
      expect(prompt()).toBeNull();
      await act(async () => {
        manager(instance).store.dispatch(
          actions.changeState({
            persistedToBrowserStorage: {
              humanAgentState: { isConnected: false },
            },
          })
        );
      });
      await waitFor(() => expect(outlet(customSlot)).not.toBeNull());
    });
  }
);

describe('custom prompt line slot composition', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it.each([true, false])(
    'omits nested outlets and keeps adjacent outlets (home: %s)',
    async (home) => {
      const slots = [
        WriteableElementName.PROMPT_LINE_ACTIONS_END,
        WriteableElementName.PROMPT_LINE_SEND_BUTTON_START,
        WriteableElementName.BEFORE_INPUT_ELEMENT,
        WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT,
        WriteableElementName.AFTER_INPUT_ELEMENT,
      ];
      const { instance } = await boot('web component', undefined, {
        homescreen: { isOn: true },
        input: { expanded: true },
      });
      await act(async () => {
        for (const name of slots) {
          const content = document.createElement('button');
          content.textContent = name;
          instance.writeableElements[name].append(content);
        }
        manager(instance).store.dispatch(actions.setHomeScreenIsOpen(home));
      });
      await waitFor(() => {
        expect(outlet(WriteableElementName.PROMPT_LINE_ACTIONS_END)).toBeNull();
        expect(
          outlet(WriteableElementName.PROMPT_LINE_SEND_BUTTON_START)
        ).toBeNull();
        expect(outlet(WriteableElementName.AFTER_INPUT_ELEMENT)).not.toBeNull();
        expect(
          outlet(
            home
              ? WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT
              : WriteableElementName.BEFORE_INPUT_ELEMENT
          )
        ).not.toBeNull();
        expect(
          outlet(
            home
              ? WriteableElementName.BEFORE_INPUT_ELEMENT
              : WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT
          )
        ).toBeNull();
      });
    }
  );
});
