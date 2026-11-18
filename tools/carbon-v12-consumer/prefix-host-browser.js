/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function collect(root) {
  const descendants = Array.from(root.querySelectorAll('*')).flatMap(
    (element) => [
      element,
      ...(element.shadowRoot ? collect(element.shadowRoot) : []),
    ]
  );
  return root.shadowRoot
    ? [...descendants, ...collect(root.shadowRoot)]
    : descendants;
}

export function mountHost({ prefix, label }) {
  window.prefixStates = {};
  const state = { prefix, ready: false, sent: [] };
  window.prefixStates[label] = state;
  const section = document.createElement('section');
  section.id = label;
  const chat = document.createElement(`${prefix}-aichat-custom-element`);
  chat.id = `${label}-chat`;
  chat.style.cssText = 'inline-size:600px;block-size:700px;display:block;';
  chat.openChatByDefault = true;
  chat.launcher = { isOn: false };
  chat.messaging = {
    customSendMessage(message) {
      state.sent.push(message);
    },
  };
  chat.onBeforeRender = (instance) => {
    state.instance = instance;
  };
  chat.onAfterRender = () => {
    state.ready = true;
  };
  section.append(chat);
  document.body.append(section);
  window.describeHost = () => ({
    ready: state.ready,
    callbacks: state.sent,
    state: state.instance?.getState(),
    tags: [chat, ...collect(chat)]
      .filter((element) => element.localName.includes('-'))
      .map((element) => {
        const constructor = customElements.get(element.localName);
        return {
          tag: element.localName,
          defined: !!constructor,
          upgraded: !!constructor && element instanceof constructor,
          shadow: !!element.shadowRoot,
        };
      }),
  });
}
