/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import '@carbon/ai-chat-components/TREE/components/toolbar/index.js';
import Close16 from '@carbon/icons/es/close/16.js';

window.consumerState = { ready: false, actions: 0, sent: [] };

async function mount() {
  const customElement =
    new URLSearchParams(window.location.search).get('host') ===
    'custom-element';
  const { default: constructor } = customElement
    ? await import('@carbon/ai-chat/dist/TREE/web-components/cds-aichat-custom-element/index.js')
    : await import('@carbon/ai-chat/dist/TREE/web-components/cds-aichat-container/index.js');
  const tag = customElement
    ? 'PREFIX-aichat-custom-element'
    : 'PREFIX-aichat-container';
  if (constructor.is !== tag) {
    throw new Error(`Host static is must match its registered tag: ${tag}`);
  }
  const attributes = constructor.observedAttributes;
  window.consumerState.hosts = [
    {
      tag,
      attributes,
      defaultExportRegistered: customElements.get(tag) === constructor,
      properties: Array.from(constructor.elementProperties.entries())
        .filter(([, options]) => !options.state)
        .map(([name, options]) => ({
          name,
          attribute: options.attribute ?? true,
        })),
    },
  ];
  const toolbar = document.createElement('PREFIX-aichat-toolbar');
  toolbar.id = 'consumer-toolbar';
  toolbar.titleText = 'Packed consumer';
  toolbar.actions = [
    {
      text: 'Run action',
      icon: Close16,
      onClick() {
        window.consumerState.actions += 1;
      },
    },
  ];
  document.body.append(toolbar);
  await toolbar.updateComplete;

  function createChat() {
    const chat = document.createElement(tag);
    if (customElement) {
      chat.style.inlineSize = '600px';
      chat.style.blockSize = '600px';
    }
    chat.openChatByDefault = true;
    chat.launcher = { isOn: false };
    chat.messaging = {
      customSendMessage(message) {
        window.consumerState.sent.push(message);
      },
    };
    chat.onAfterRender = () => {
      window.consumerState.ready = true;
    };
    return chat;
  }
  let chat = createChat();
  document.body.append(chat);
  window.consumerState.remountHost = () => {
    chat.remove();
    window.consumerState.ready = false;
    chat = createChat();
    document.body.append(chat);
  };
}

void mount();
