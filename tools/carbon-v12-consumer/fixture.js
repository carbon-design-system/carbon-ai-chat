/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import '@carbon/ai-chat-components/TREE/components/toolbar/index.js';
import ChatContainer from '@carbon/ai-chat/dist/TREE/web-components/cds-aichat-container/index.js';
import ChatCustomElement from '@carbon/ai-chat/dist/TREE/web-components/cds-aichat-custom-element/index.js';
import Close16 from '@carbon/icons/es/close/16.js';

window.consumerState = { ready: false, actions: 0, sent: [] };

window.consumerState.hosts = [
  ['PREFIX-aichat-container', ChatContainer],
  ['PREFIX-aichat-custom-element', ChatCustomElement],
].map(([tag, constructor]) => {
  const attributes = constructor.observedAttributes;
  return {
    tag,
    attributes,
    defaultExportRegistered: customElements.get(tag) === constructor,
    properties: Array.from(constructor.elementProperties.entries())
      .filter(([, options]) => !options.state)
      .map(([name, options]) => ({
        name,
        attribute: options.attribute ?? true,
      })),
  };
});

async function mount() {
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

  const chat = document.createElement('PREFIX-aichat-container');
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
  document.body.append(chat);
}

void mount();
